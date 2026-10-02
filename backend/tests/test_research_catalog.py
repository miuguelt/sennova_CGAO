"""Contrato del catálogo institucional y del primer arranque, con persistencia real."""

import asyncio
import os
import secrets
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET", secrets.token_urlsafe(32))

from app.database import Base
from app.models import Grupo, User
from app.research_catalog import (
    RESEARCH_GROUP_CATALOG,
    ResearchCatalogError,
    ensure_research_catalog,
)


EXPECTED_GROUPS = {
    "SEMIPROVEL": "Sistemas y Programación",
    "SIAMB": "Ambiental",
    "SIACF": "Contabilidad y Finanzas",
    "SENAGRO2": "Agropecuaria y Agroindustria",
    "SISSTYSIG": "Seguridad y Salud en el Trabajo y SG Integ",
    "SIDECI": "Deporte y Ciencia",
    "FORMARTE": "Investigación Pedagógica",
    "SINVESCON": "Construcción",
    "SIADM": "Administración",
    "SEMITEC": "Motos y Mecánica",
    "SITURISMO": "Turismo y cultura",
    "SIASA": "Salud",
}


@pytest.fixture()
def database():
    engine = create_engine(
        "sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )
    with engine.begin() as connection:
        connection.execute(text("PRAGMA foreign_keys=ON"))
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, autoflush=False)
    with sessions() as db:
        yield engine, sessions, db
    engine.dispose()


def add_admin(db, *, rol="admin", active=True, email="admin@example.com"):
    user = User(
        email=email, nombre="Administrador de prueba", password_hash="example",
        rol=rol, is_active=active,
    )
    db.add(user)
    db.commit()
    return user


def bootstrap_settings():
    return SimpleNamespace(
        DEBUG=False, INITIAL_ADMIN_EMAIL="admin@example.com",
        INITIAL_ADMIN_PASSWORD=secrets.token_urlsafe(24),
        INITIAL_ADMIN_NOMBRE="Administrador", INITIAL_ADMIN_DOCUMENTO="",
        INITIAL_ADMIN_SEDE="CGAO", SEED_INITIAL_DATA=False,
    )


def test_catálogo_corresponde_a_los_doce_grupos_de_la_imagen(database):
    _, sessions, db = database
    admin = add_admin(db)
    result = ensure_research_catalog(db)

    assert dict(RESEARCH_GROUP_CATALOG) == EXPECTED_GROUPS
    assert result.created == 12
    assert result.existing == 0
    with sessions() as persisted:
        groups = persisted.query(Grupo).all()
        assert {g.nombre for g in groups} == set(EXPECTED_GROUPS)
        for group in groups:
            assert group.nombre_completo == f"{group.nombre} ({EXPECTED_GROUPS[group.nombre]})"
            assert str(group.owner_id) == str(admin.id)
            assert group.is_publico is True
            assert group.estado == "activo"
            assert group.codigo_gruplac is None
            assert group.clasificacion is None
            assert group.gruplac_url is None
            assert group.lineas_investigacion == []


def test_redespliegue_conserva_identidades_datos_y_grupos_adicionales(database):
    _, _, db = database
    admin = add_admin(db)
    ensure_research_catalog(db)
    original_ids = {group.nombre: group.id for group in db.query(Grupo).all()}
    group = db.query(Grupo).filter_by(nombre="SEMIPROVEL").one()
    group.nombre = "Nombre actualizado por su investigador"
    group.descripcion_grupo = "Misión registrada por el equipo"
    group.codigo_gruplac = "example"
    group.estado = "inactivo"
    db.add(Grupo(nombre="Grupo adicional", owner_id=admin.id))
    db.commit()

    result = ensure_research_catalog(db)

    assert result.created == 0
    assert result.existing == 12
    assert db.query(Grupo).count() == 13
    assert group.id == original_ids["SEMIPROVEL"]
    assert group.nombre == "Nombre actualizado por su investigador"
    assert group.descripcion_grupo == "Misión registrada por el equipo"
    assert group.codigo_gruplac == "example"
    assert group.estado == "inactivo"


@pytest.mark.parametrize("existing_name", [
    " siamb ", "SIAMB (Ambiental)", "2 SIAMB (Ambiental)", "2SIAMB (Ambiental)",
])
def test_semillado_conserva_grupo_preexistente_y_su_responsable(database, existing_name):
    _, _, db = database
    add_admin(db)
    researcher = add_admin(db, rol="investigador", email="researcher@example.com")
    group = Grupo(nombre=existing_name, nombre_completo="Nombre vigente",
                  owner_id=researcher.id, codigo_gruplac="example")
    db.add(group)
    db.commit()
    original_id = group.id

    result = ensure_research_catalog(db)

    assert result.created == 11
    assert result.existing == 1
    assert db.query(Grupo).count() == 12
    assert group.id == original_id
    assert group.nombre == existing_name
    assert group.owner_id == researcher.id
    assert group.nombre_completo == "Nombre vigente"
    assert group.codigo_gruplac == "example"


@pytest.mark.parametrize("rol,active", [("investigador", True), ("admin", False)])
def test_sin_administrador_activo_no_inventa_un_propietario(database, rol, active):
    _, _, db = database
    add_admin(db, rol=rol, active=active)
    with pytest.raises(ResearchCatalogError, match="administrador activo"):
        ensure_research_catalog(db)
    assert db.query(Grupo).count() == 0


def test_error_real_de_persistencia_revierte_todo_el_catálogo(database):
    engine, _, db = database
    add_admin(db)
    with engine.begin() as connection:
        connection.execute(text(
            "CREATE TRIGGER reject_catalog BEFORE INSERT ON grupos "
            "WHEN NEW.nombre = 'SIACF' BEGIN SELECT RAISE(ABORT, 'example'); END"
        ))

    with pytest.raises(ResearchCatalogError, match="catálogo"):
        ensure_research_catalog(db)

    assert db.query(Grupo).count() == 0
    with engine.begin() as connection:
        connection.execute(text("DROP TRIGGER reject_catalog"))
    assert ensure_research_catalog(db).created == 12


def configure_bootstrap(monkeypatch, database):
    from scripts import bootstrap_initial_data, fix_db_schema

    engine, sessions, _ = database
    settings = bootstrap_settings()
    monkeypatch.setattr(bootstrap_initial_data, "get_settings", lambda: settings)
    monkeypatch.setattr(bootstrap_initial_data, "engine", engine)
    monkeypatch.setattr(bootstrap_initial_data, "SessionLocal", sessions)
    monkeypatch.setattr(fix_db_schema, "engine", engine)
    return bootstrap_initial_data, settings


def test_entrypoint_crea_admin_y_catálogo_en_producción_y_no_duplica(database, monkeypatch):
    bootstrap_module, _ = configure_bootstrap(monkeypatch, database)
    _, _, db = database

    assert bootstrap_module.bootstrap() == 0
    ids = {group.id for group in db.query(Grupo).all()}
    password_hash = db.query(User).one().password_hash
    assert len(ids) == 12
    assert bootstrap_module.bootstrap() == 0
    assert {group.id for group in db.query(Grupo).all()} == ids
    assert db.query(User).count() == 1
    assert db.query(User).one().password_hash == password_hash


def test_entrypoint_sin_credencial_no_publica_catálogo(database, monkeypatch):
    bootstrap_module, settings = configure_bootstrap(monkeypatch, database)
    settings.INITIAL_ADMIN_PASSWORD = ""
    _, _, db = database
    assert bootstrap_module.bootstrap() == 1
    assert db.query(User).count() == 0
    assert db.query(Grupo).count() == 0


def test_entrypoint_falla_si_catálogo_no_se_puede_persistir(database, monkeypatch):
    bootstrap_module, _ = configure_bootstrap(monkeypatch, database)
    engine, _, db = database
    with engine.begin() as connection:
        connection.execute(text(
            "CREATE TRIGGER reject_catalog BEFORE INSERT ON grupos "
            "BEGIN SELECT RAISE(ABORT, 'example'); END"
        ))
    assert bootstrap_module.bootstrap() == 1
    assert db.query(Grupo).count() == 0


def test_lifespan_local_crea_y_conserva_catálogo(database, monkeypatch):
    from app import main

    engine, sessions, db = database
    monkeypatch.setattr(main, "engine", engine)
    monkeypatch.setattr(main, "SessionLocal", sessions)
    monkeypatch.setattr(main, "settings", bootstrap_settings())
    # Estos auxiliares capturan el motor global al definirse; usan el mismo motor aislado.
    monkeypatch.setattr(main, "ensure_document_description_column", lambda _: False)
    monkeypatch.setattr(main, "ensure_investigador_role", lambda _: 0)

    async def start_twice():
        async with main.lifespan(main.app):
            assert db.query(Grupo).count() == 12
        async with main.lifespan(main.app):
            assert db.query(Grupo).count() == 12

    asyncio.run(start_twice())
    assert db.query(User).count() == 1


def test_lifespan_rechaza_error_real_del_catálogo(database, monkeypatch):
    from app import main

    engine, sessions, db = database
    monkeypatch.setattr(main, "engine", engine)
    monkeypatch.setattr(main, "SessionLocal", sessions)
    monkeypatch.setattr(main, "settings", bootstrap_settings())
    with engine.begin() as connection:
        connection.execute(text(
            "CREATE TRIGGER reject_catalog BEFORE INSERT ON grupos "
            "BEGIN SELECT RAISE(ABORT, 'example'); END"
        ))

    async def start():
        async with main.lifespan(main.app):
            pytest.fail("La aplicación no debe atender tráfico sin el catálogo persistido")

    with pytest.raises(ResearchCatalogError):
        asyncio.run(start())
    assert db.query(Grupo).count() == 0


def test_script_real_del_contenedor_crea_el_catálogo_con_salida_exitosa(tmp_path):
    backend = Path(__file__).resolve().parents[1]
    database_file = tmp_path / "first-deployment.db"
    environment = {
        **os.environ,
        "DATABASE_URL": "sqlite:///" + database_file.as_posix(),
        "DEBUG": "true",
        "JWT_SECRET": secrets.token_urlsafe(32),
        "INITIAL_ADMIN_EMAIL": "admin@example.com",
        "INITIAL_ADMIN_PASSWORD": secrets.token_urlsafe(24),
        "INITIAL_ADMIN_DOCUMENTO": "",
        "PYTHONIOENCODING": "utf-8",
    }
    result = subprocess.run(
        [sys.executable, "scripts/bootstrap_initial_data.py"], cwd=backend,
        env=environment, capture_output=True, text=True, encoding="utf-8", timeout=30,
    )

    assert result.returncode == 0, result.stderr
    assert "12 creados" in result.stdout
    engine = create_engine(environment["DATABASE_URL"])
    try:
        with engine.connect() as connection:
            assert connection.execute(text("SELECT count(*) FROM grupos")).scalar() == 12
            assert connection.execute(text("SELECT rol FROM users")).scalar() == "admin"
    finally:
        engine.dispose()


def test_bloqueo_del_catálogo_usa_un_identificador_compartido(database, monkeypatch):
    engine, _, db = database
    add_admin(db)
    locks = []
    # SQLite ejecuta la misma consulta mediante una función escalar de prueba.
    # La persistencia del catálogo continúa usando sesiones y tablas reales.
    raw_connection = engine.raw_connection()
    raw_connection.create_function("pg_advisory_xact_lock", 1, lambda key: locks.append(key) or 1)
    raw_connection.close()
    monkeypatch.setattr(engine.dialect, "name", "postgresql")

    assert ensure_research_catalog(db).created == 12
    assert ensure_research_catalog(db).created == 0
    assert locks == [53454, 53454]
    assert db.query(Grupo).count() == 12
