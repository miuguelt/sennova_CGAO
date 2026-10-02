"""Contrato de la estructura institucional y de su primer despliegue."""

import asyncio
import os
import secrets
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET", secrets.token_urlsafe(32))

from app.database import Base
from app.models import (
    Aprendiz,
    Grupo,
    Proyecto,
    Semillero,
    User,
    grupo_integrantes,
    semillero_investigadores,
)
from app.research_catalog import (
    CANONICAL_GROUP_NAME,
    RESEARCH_SEEDBED_CATALOG,
    ResearchCatalogError,
    ensure_research_catalog,
)
from app.services.research_structure_migration import downgrade_legacy_groups


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


def add_user(db, *, role="admin", active=True, email="admin@example.com"):
    user = User(
        email=email,
        nombre="Usuario de prueba",
        password_hash="example",
        rol=role,
        is_active=active,
    )
    db.add(user)
    db.commit()
    return user


def bootstrap_settings():
    return SimpleNamespace(
        DEBUG=False,
        INITIAL_ADMIN_EMAIL="admin@example.com",
        INITIAL_ADMIN_PASSWORD=secrets.token_urlsafe(24),
        INITIAL_ADMIN_NOMBRE="Administrador",
        INITIAL_ADMIN_DOCUMENTO="",
        INITIAL_ADMIN_SEDE="CGAO",
        SEED_INITIAL_DATA=False,
    )


def test_first_setup_creates_one_group_and_seedbed_catalog(database):
    _, sessions, db = database
    admin = add_user(db)

    result = ensure_research_catalog(db)

    assert result.group_created is True
    assert result.created == len(RESEARCH_SEEDBED_CATALOG)
    with sessions() as persisted:
        groups = persisted.query(Grupo).all()
        semilleros = persisted.query(Semillero).all()
        assert len(groups) == 1
        assert groups[0].nombre == CANONICAL_GROUP_NAME
        assert str(groups[0].owner_id) == str(admin.id)
        assert len(semilleros) == len(RESEARCH_SEEDBED_CATALOG)
        assert {s.sigla: s.nombre for s in semilleros} == dict(RESEARCH_SEEDBED_CATALOG)
        assert {str(s.grupo_id) for s in semilleros} == {str(groups[0].id)}

    repeated = ensure_research_catalog(db)
    assert repeated.group_created is False
    assert repeated.created == 0
    assert db.query(Grupo).count() == 1
    assert db.query(Semillero).count() == len(RESEARCH_SEEDBED_CATALOG)


def test_legacy_groups_move_to_seedbeds_and_keep_members_and_projects(database):
    engine, _, db = database
    admin = add_user(db)
    researcher = add_user(db, role="investigador", email="investigador@example.com")
    learner = add_user(db, role="aprendiz", email="aprendiz@example.com")
    with engine.begin() as connection:
        connection.execute(text("DROP INDEX IF EXISTS uq_grupos_singleton"))
    legacy = Grupo(
        nombre="SEMIPROVEL",
        nombre_completo="SEMIPROVEL (Sistemas y Programación)",
        descripcion_grupo="Descripción anterior",
        owner_id=admin.id,
    )
    db.add(legacy)
    db.flush()
    db.execute(grupo_integrantes.insert().values(
        grupo_id=legacy.id, user_id=researcher.id, rol_en_grupo="Investigador"
    ))
    db.execute(grupo_integrantes.insert().values(
        grupo_id=legacy.id, user_id=learner.id, rol_en_grupo="Aprendiz Semillero"
    ))
    project = Proyecto(
        nombre="Proyecto heredado",
        grupo_id=legacy.id,
        owner_id=researcher.id,
    )
    db.add(project)
    db.commit()
    original_project_id = str(project.id)
    original_group_id = str(legacy.id)

    result = ensure_research_catalog(db)

    assert result.groups_migrated == 1
    assert db.query(Grupo).count() == 1
    central_group = db.query(Grupo).one()
    assert central_group.nombre == CANONICAL_GROUP_NAME
    migrated = db.query(Semillero).filter_by(sigla="SEMIPROVEL").one()
    assert migrated.nombre == "Sistemas y Programación"
    assert migrated.descripcion == "Descripción anterior"
    assert str(migrated.grupo_id) == str(central_group.id)
    project = db.query(Proyecto).filter_by(id=original_project_id).one()
    assert str(project.grupo_id) == str(central_group.id)
    assert str(project.semillero_id) == str(migrated.id)
    assert str(project.grupo_id) != original_group_id
    members = {
        str(row.user_id): row.rol_en_grupo
        for row in db.execute(grupo_integrantes.select()).all()
    }
    assert members == {str(researcher.id): "Investigador"}
    profile = db.query(Aprendiz).filter_by(user_id=learner.id).one()
    assert str(profile.semillero_id) == str(migrated.id)
    researchers = db.execute(
        semillero_investigadores.select().where(
            semillero_investigadores.c.semillero_id == migrated.id
        )
    ).all()
    assert [str(row.user_id) for row in researchers] == [str(researcher.id)]


def test_legacy_group_migration_can_be_rolled_back(database):
    engine, _, db = database
    admin = add_user(db)
    researcher = add_user(db, role="investigador", email="rollback@example.com")
    with engine.begin() as connection:
        connection.execute(text("DROP INDEX IF EXISTS uq_grupos_singleton"))
    legacy = Grupo(nombre="Grupo anterior", owner_id=admin.id)
    db.add(legacy)
    db.flush()
    db.execute(grupo_integrantes.insert().values(
        grupo_id=legacy.id,
        user_id=researcher.id,
        rol_en_grupo="Investigador",
    ))
    project = Proyecto(
        nombre="Proyecto para reversión",
        grupo_id=legacy.id,
        owner_id=researcher.id,
    )
    db.add(project)
    db.commit()
    group_id = str(legacy.id)
    project_id = str(project.id)

    ensure_research_catalog(db)
    restored = downgrade_legacy_groups(db)

    assert restored == 1
    assert db.query(Grupo).filter_by(id=group_id).one().nombre == "Grupo anterior"
    assert db.query(Grupo).filter_by(nombre=CANONICAL_GROUP_NAME).count() == 1
    restored_project = db.query(Proyecto).filter_by(id=project_id).one()
    assert str(restored_project.grupo_id) == group_id
    assert restored_project.semillero_id is None
    restored_member = db.execute(grupo_integrantes.select().where(
        grupo_integrantes.c.grupo_id == group_id
    )).one()
    assert str(restored_member.user_id) == str(researcher.id)


def test_no_active_admin_means_no_partial_structure(database):
    _, _, db = database
    add_user(db, role="investigador")

    with pytest.raises(ResearchCatalogError, match="administrador activo"):
        ensure_research_catalog(db)

    assert db.query(Grupo).count() == 0
    assert db.query(Semillero).count() == 0


def test_database_rejects_a_second_group(database):
    _, _, db = database
    admin = add_user(db)
    ensure_research_catalog(db)

    db.add(Grupo(nombre="Otro grupo", owner_id=admin.id))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
    assert db.query(Grupo).count() == 1


def configure_bootstrap(monkeypatch, database):
    from scripts import bootstrap_initial_data, fix_db_schema

    engine, sessions, _ = database
    settings = bootstrap_settings()
    monkeypatch.setattr(bootstrap_initial_data, "get_settings", lambda: settings)
    monkeypatch.setattr(bootstrap_initial_data, "engine", engine)
    monkeypatch.setattr(bootstrap_initial_data, "SessionLocal", sessions)
    monkeypatch.setattr(fix_db_schema, "engine", engine)
    return bootstrap_initial_data, settings


def test_container_bootstrap_creates_one_group_and_catalog_without_duplicates(database, monkeypatch):
    bootstrap_module, _ = configure_bootstrap(monkeypatch, database)
    _, _, db = database

    assert bootstrap_module.bootstrap() == 0
    password_hash = db.query(User).one().password_hash
    assert db.query(Grupo).count() == 1
    assert db.query(Grupo).one().nombre == CANONICAL_GROUP_NAME
    assert db.query(Semillero).count() == len(RESEARCH_SEEDBED_CATALOG)
    assert bootstrap_module.bootstrap() == 0
    assert db.query(Grupo).count() == 1
    assert db.query(Semillero).count() == len(RESEARCH_SEEDBED_CATALOG)
    assert db.query(User).count() == 1
    assert db.query(User).one().password_hash == password_hash


def test_first_startup_migrates_legacy_groups_before_adding_singleton_index(database, monkeypatch):
    engine, sessions, db = database
    admin = add_user(db)
    researcher = add_user(db, role="investigador", email="legacy@example.com")
    with engine.begin() as connection:
        connection.execute(text("DROP INDEX IF EXISTS uq_grupos_singleton"))

    catalog_group = Grupo(nombre="SEMIPROVEL", owner_id=admin.id)
    legacy_group = Grupo(nombre="Grupo legado", owner_id=admin.id)
    db.add_all([catalog_group, legacy_group])
    db.flush()
    catalog_project = Proyecto(
        nombre="Proyecto catalogado",
        grupo_id=catalog_group.id,
        owner_id=researcher.id,
    )
    legacy_project = Proyecto(
        nombre="Proyecto legado",
        grupo_id=legacy_group.id,
        owner_id=researcher.id,
    )
    db.add_all([catalog_project, legacy_project])
    db.commit()
    catalog_project_id = str(catalog_project.id)
    legacy_project_id = str(legacy_project.id)

    bootstrap_module, _ = configure_bootstrap(monkeypatch, database)
    assert bootstrap_module.bootstrap() == 0

    with sessions() as persisted:
        central_group = persisted.query(Grupo).one()
        assert central_group.nombre == CANONICAL_GROUP_NAME
        assert persisted.query(Semillero).count() == len(RESEARCH_SEEDBED_CATALOG) + 1
        assert persisted.query(Semillero).filter_by(sigla="SEMIPROVEL").count() == 1
        catalog_seedbed = persisted.query(Semillero).filter_by(sigla="SEMIPROVEL").one()
        legacy_seedbed = persisted.query(Semillero).filter_by(nombre="Grupo legado").one()
        assert str(catalog_seedbed.grupo_id) == str(central_group.id)
        assert str(legacy_seedbed.grupo_id) == str(central_group.id)
        migrated_projects = {
            str(project.id): (str(project.grupo_id), str(project.semillero_id))
            for project in persisted.query(Proyecto).all()
        }
        assert migrated_projects[catalog_project_id] == (
            str(central_group.id), str(catalog_seedbed.id)
        )
        assert migrated_projects[legacy_project_id] == (
            str(central_group.id), str(legacy_seedbed.id)
        )
        with engine.connect() as connection:
            index_name = connection.execute(text(
                "SELECT name FROM sqlite_master "
                "WHERE type = 'index' AND name = 'uq_grupos_singleton'"
            )).scalar_one_or_none()
        assert index_name == "uq_grupos_singleton"


def test_container_bootstrap_without_admin_password_creates_no_structure(database, monkeypatch):
    bootstrap_module, settings = configure_bootstrap(monkeypatch, database)
    settings.INITIAL_ADMIN_PASSWORD = ""
    _, _, db = database

    assert bootstrap_module.bootstrap() == 1
    assert db.query(User).count() == 0
    assert db.query(Grupo).count() == 0
    assert db.query(Semillero).count() == 0


def test_lifespan_uses_the_same_idempotent_structure(database, monkeypatch):
    from app import main

    engine, sessions, db = database
    monkeypatch.setattr(main, "engine", engine)
    monkeypatch.setattr(main, "SessionLocal", sessions)
    monkeypatch.setattr(main, "settings", bootstrap_settings())

    async def start_twice():
        async with main.lifespan(main.app):
            assert db.query(Grupo).count() == 1
            assert db.query(Semillero).count() == len(RESEARCH_SEEDBED_CATALOG)
        async with main.lifespan(main.app):
            assert db.query(Grupo).count() == 1
            assert db.query(Semillero).count() == len(RESEARCH_SEEDBED_CATALOG)

    asyncio.run(start_twice())
    assert db.query(User).count() == 1


def test_real_container_script_installs_the_base_on_first_boot(tmp_path):
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
        [sys.executable, "scripts/bootstrap_initial_data.py"],
        cwd=backend,
        env=environment,
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=30,
    )

    assert result.returncode == 0, result.stderr
    engine = create_engine(environment["DATABASE_URL"])
    try:
        with engine.connect() as connection:
            assert connection.execute(text("SELECT count(*) FROM grupos")).scalar() == 1
            assert connection.execute(text("SELECT nombre FROM grupos")).scalar() == CANONICAL_GROUP_NAME
            assert connection.execute(text("SELECT count(*) FROM semilleros")).scalar() == len(RESEARCH_SEEDBED_CATALOG)
            assert connection.execute(text("SELECT rol FROM users")).scalar() == "admin"
    finally:
        engine.dispose()
