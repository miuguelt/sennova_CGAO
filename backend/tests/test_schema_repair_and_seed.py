"""Pruebas aisladas para la reparación de esquema y el semillado."""

import os
import random
from unittest.mock import Mock

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
    monkeypatch.setattr(seed_database, "fix_schema", lambda: None)
    monkeypatch.setattr(seed_database, "get_password_hash", lambda _password: "hash-de-prueba")
    monkeypatch.setenv("DEV_SEED_PASSWORD", "fixture-password")
    previous_random_state = random.getstate()
    random.seed(731)

    try:
        assert seed_database.seed_database(verbose=False) is True

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
        seed_database.Base.metadata.drop_all(bind=engine)
        engine.dispose()
        random.setstate(previous_random_state)


def test_seed_database_refuses_to_touch_database_without_configured_password(monkeypatch):
    from scripts import seed_database

    monkeypatch.delenv("INITIAL_ADMIN_PASSWORD", raising=False)
    monkeypatch.delenv("DEV_SEED_PASSWORD", raising=False)
    create_all = Mock()
    session_factory = Mock()
    monkeypatch.setattr(seed_database.Base.metadata, "create_all", create_all)
    monkeypatch.setattr(seed_database, "SessionLocal", session_factory)

    assert seed_database.seed_database(verbose=False) is False
    create_all.assert_not_called()
    session_factory.assert_not_called()


def test_demo_seed_refuses_to_touch_database_without_configured_password(monkeypatch):
    from scripts import seed_demo_data

    monkeypatch.delenv("INITIAL_ADMIN_PASSWORD", raising=False)
    monkeypatch.delenv("DEV_SEED_PASSWORD", raising=False)
    create_all = Mock()
    session_factory = Mock()
    monkeypatch.setattr(seed_demo_data.Base.metadata, "create_all", create_all)
    monkeypatch.setattr(seed_demo_data, "SessionLocal", session_factory)

    assert seed_demo_data.seed_data() is False
    create_all.assert_not_called()
    session_factory.assert_not_called()


def test_mass_seed_refuses_to_touch_database_without_configured_password(monkeypatch):
    from scripts import seed_mass

    monkeypatch.delenv("INITIAL_ADMIN_PASSWORD", raising=False)
    monkeypatch.delenv("DEV_SEED_PASSWORD", raising=False)
    session_factory = Mock()
    monkeypatch.setattr(seed_mass, "SessionLocal", session_factory)

    assert seed_mass.seed_data() is False
    session_factory.assert_not_called()
