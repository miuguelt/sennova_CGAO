"""Pruebas aisladas para la reparación de esquema y el semillado."""

import os
import random

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

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
        assert columns == {"id", "descripcion"}
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
            group_roles = {
                row.rol_en_grupo
                for row in db.execute(seed_database.grupo_integrantes.select()).all()
            }

        assert len(users) == 32
        assert roles == {"admin", "investigador", "aprendiz"}
        assert instructor_profile.rol == "investigador"
        assert group_roles <= {"Líder", "Investigador", "Aprendiz Semillero"}
        assert "Investigador" in group_roles
        assert "Aprendiz Semillero" in group_roles
    finally:
        seed_database.Base.metadata.drop_all(bind=engine)
        engine.dispose()
        random.setstate(previous_random_state)
