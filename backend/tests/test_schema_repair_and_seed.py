"""Pruebas aisladas para la reparación de esquema y el semillado."""

import os
import random
from unittest.mock import Mock

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from app.research_catalog import CANONICAL_GROUP_NAME

from db_support import db_path_for, sqlite_url_for


# Asegura que importar los módulos del script no inicialice un motor PostgreSQL.
os.environ["DATABASE_URL"] = sqlite_url_for(
    db_path_for("test_schema_repair_and_seed_import.db")
)


def test_fix_schema_adds_document_description_and_is_idempotent(monkeypatch):
    from scripts import fix_db_schema

    engine = create_engine("sqlite://")
    try:
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE documentos (id INTEGER PRIMARY KEY)"))
        monkeypatch.setattr(fix_db_schema, "engine", engine)

        fix_db_schema.fix_schema()
        fix_db_schema.fix_schema()

        columns = {column["name"] for column in inspect(engine).get_columns("documentos")}
        assert columns == {"id", "descripcion", "periodo_bimestre"}
    finally:
        engine.dispose()


def test_seed_database_uses_only_supported_roles_and_labels_group_members(monkeypatch, tmp_path):
    from scripts import seed_database

    engine = create_engine(
        sqlite_url_for(str(tmp_path / "seed.db")),
        connect_args={"check_same_thread": False},
    )
    sessions = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    monkeypatch.setattr(seed_database, "engine", engine)
    monkeypatch.setattr(seed_database, "SessionLocal", sessions)
    monkeypatch.setattr(seed_database, "get_password_hash", lambda _password: "hash-de-prueba")
    monkeypatch.setenv("DEV_SEED_PASSWORD", "fixture-password")
    previous_random_state = random.getstate()
    random.seed(731)

    try:
        from sqlalchemy import text

        from app.database import Base

        Base.metadata.create_all(bind=engine)
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE proyectos ADD COLUMN formato_bitacora_path TEXT"))
            connection.execute(text("ALTER TABLE proyectos ADD COLUMN formato_seguimiento_path TEXT"))
            connection.execute(
                text("CREATE TABLE bitacora_entries (id INTEGER PRIMARY KEY, contenido TEXT NOT NULL)")
            )
            connection.execute(text("INSERT INTO bitacora_entries VALUES (1, 'legado')"))

        assert seed_database.seed_database(verbose=False) is True

        assert "bitacora_entries" not in inspect(engine).get_table_names()
        project_columns = {column["name"] for column in inspect(engine).get_columns("proyectos")}
        assert "formato_bitacora_path" not in project_columns
        assert "formato_seguimiento_path" not in project_columns

        with sessions() as db:
            users = db.query(seed_database.User).all()
            roles = {user.rol for user in users}
            instructor_profile = db.query(seed_database.User).filter_by(
                email="c.lopez@sena.edu.co"
            ).one()
        group_rows = db.execute(seed_database.grupo_integrantes.select()).all()
        group_roles = {row.rol_en_grupo for row in group_rows}
        group_count = db.query(seed_database.Grupo).count()
        group_name = db.query(seed_database.Grupo).one().nombre
        seedbed_count = db.query(seed_database.Semillero).count()
        member_roles = {
            db.query(seed_database.User).filter_by(id=row.user_id).one().rol
            for row in group_rows
        }

        assert len(users) == 32
        assert roles == {"admin", "investigador", "aprendiz"}
        assert instructor_profile.rol == "investigador"
        assert group_count == 1
        assert group_name == CANONICAL_GROUP_NAME
        assert seedbed_count >= 20
        assert group_roles == {"Investigador"}
        assert member_roles == {"investigador"}
    finally:
        from app.database import Base

        Base.metadata.drop_all(bind=engine)
        engine.dispose()
        random.setstate(previous_random_state)


def test_seed_database_refuses_to_touch_database_without_configured_password(monkeypatch):
    from scripts import seed_database

    monkeypatch.delenv("INITIAL_ADMIN_PASSWORD", raising=False)
    monkeypatch.delenv("DEV_SEED_PASSWORD", raising=False)
    initialize_schema = Mock()
    session_factory = Mock()
    monkeypatch.setattr(seed_database, "initialize_schema", initialize_schema)
    monkeypatch.setattr(seed_database, "SessionLocal", session_factory)

    assert seed_database.seed_database(verbose=False) is False
    initialize_schema.assert_not_called()
    session_factory.assert_not_called()


def test_demo_seed_refuses_to_touch_database_without_configured_password(monkeypatch):
    from scripts import seed_demo_data

    monkeypatch.delenv("INITIAL_ADMIN_PASSWORD", raising=False)
    monkeypatch.delenv("DEV_SEED_PASSWORD", raising=False)
    initialize_schema = Mock()
    session_factory = Mock()
    monkeypatch.setattr(seed_demo_data, "initialize_schema", initialize_schema)
    monkeypatch.setattr(seed_demo_data, "SessionLocal", session_factory)

    assert seed_demo_data.seed_data() is False
    initialize_schema.assert_not_called()
    session_factory.assert_not_called()


def test_mass_seed_refuses_to_touch_database_without_configured_password(monkeypatch):
    from scripts import seed_mass

    monkeypatch.delenv("INITIAL_ADMIN_PASSWORD", raising=False)
    monkeypatch.delenv("DEV_SEED_PASSWORD", raising=False)
    session_factory = Mock()
    monkeypatch.setattr(seed_mass, "SessionLocal", session_factory)

    assert seed_mass.seed_data() is False
    session_factory.assert_not_called()


def test_init_new_tables_uses_shared_schema_initialization(monkeypatch):
    from scripts import init_new_tables

    initialize_schema = Mock()
    monkeypatch.setattr(init_new_tables, "initialize_schema", initialize_schema)

    init_new_tables.init_tables()

    initialize_schema.assert_called_once_with(init_new_tables.engine)


def test_demo_and_mass_seeds_migrate_before_opening_the_database(monkeypatch):
    from scripts import seed_demo_data, seed_mass

    class StopBeforeSeeding(Exception):
        pass

    for module in (seed_demo_data, seed_mass):
        steps = []
        monkeypatch.setattr(module, "initialize_schema", lambda _engine, steps=steps: steps.append("schema"))

        def stop_session():
            steps.append("session")
            raise StopBeforeSeeding

        monkeypatch.setattr(module, "SessionLocal", stop_session)
        monkeypatch.setenv("DEV_SEED_PASSWORD", "fixture-password")

        with pytest.raises(StopBeforeSeeding):
            module.seed_data()
        assert steps == ["schema", "session"]


def test_dev_user_seed_runs_migrations_before_opening_the_database(monkeypatch):
    import importlib

    monkeypatch.setenv("DEV_SEED_PASSWORD", "fixture-password")
    import seed_dev_users

    importlib.reload(seed_dev_users)
    from app import database
    from app.services import database_startup

    class StopBeforeSeeding(Exception):
        pass

    steps = []
    monkeypatch.setattr(
        database_startup,
        "initialize_schema",
        lambda _engine: steps.append("schema"),
    )

    def stop_session():
        steps.append("session")
        raise StopBeforeSeeding

    monkeypatch.setattr(database, "SessionLocal", stop_session)

    with pytest.raises(StopBeforeSeeding):
        seed_dev_users.seed()

    assert steps == ["schema", "session"]
