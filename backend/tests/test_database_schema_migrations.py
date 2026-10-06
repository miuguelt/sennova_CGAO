import os

import asyncio
from types import SimpleNamespace

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from db_support import db_path_for, sqlite_url_for

os.environ.setdefault(
    "DATABASE_URL",
    sqlite_url_for(db_path_for("test_database_schema_migrations.db")),
)

from app.database import ensure_document_description_column, ensure_investigador_role


def test_adds_optional_document_description_to_existing_database():
    engine = create_engine("sqlite://")
    try:
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE documentos (id VARCHAR(36) PRIMARY KEY)"))

        assert ensure_document_description_column(engine) is True
        assert ensure_document_description_column(engine) is False
        columns = {column["name"] for column in inspect(engine).get_columns("documentos")}
        assert "descripcion" in columns
    finally:
        engine.dispose()


def test_does_not_fail_when_document_table_is_not_created_yet():
    engine = create_engine("sqlite://")
    try:
        assert ensure_document_description_column(engine) is False
    finally:
        engine.dispose()


def test_migrates_legacy_instructor_role_to_investigador_idempotently():
    engine = create_engine("sqlite://")
    try:
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE users (id INTEGER PRIMARY KEY, rol VARCHAR(50))"))
            connection.execute(text("INSERT INTO users (rol) VALUES ('instructor'), ('investigador'), ('aprendiz')"))

        assert ensure_investigador_role(engine) == 1
        assert ensure_investigador_role(engine) == 0
        with engine.connect() as connection:
            roles = connection.execute(text("SELECT rol FROM users ORDER BY id")).scalars().all()
        assert roles == ["investigador", "investigador", "aprendiz"]
    finally:
        engine.dispose()


def test_role_migration_is_safe_before_users_table_exists():
    engine = create_engine("sqlite://")
    try:
        assert ensure_investigador_role(engine) == 0
    finally:
        engine.dispose()


def test_role_migration_is_safe_when_users_table_has_no_role_column():
    engine = create_engine("sqlite://")
    try:
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE users (id INTEGER PRIMARY KEY)"))
        assert ensure_investigador_role(engine) == 0
    finally:
        engine.dispose()


def test_removes_retired_bitacora_schema_and_preserves_research_data_idempotently():
    from app.database import remove_retired_stage_productivity_schema

    engine = create_engine("sqlite://")
    try:
        with engine.begin() as connection:
            connection.execute(text(
                "CREATE TABLE proyectos ("
                "id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, "
                "formato_bitacora_path TEXT, formato_seguimiento_path TEXT, "
                "informe_final_path TEXT)"
            ))
            connection.execute(text(
                "INSERT INTO proyectos "
                "(id, nombre, formato_bitacora_path, formato_seguimiento_path, informe_final_path) "
                "VALUES (1, 'CAP de prueba', 'bitacora.docx', 'seguimiento.docx', 'informe.docx')"
            ))
            connection.execute(text(
                "CREATE TABLE bitacora_entries (id INTEGER PRIMARY KEY, contenido TEXT NOT NULL)"
            ))
            connection.execute(text(
                "INSERT INTO bitacora_entries (id, contenido) VALUES (1, 'Registro heredado')"
            ))
            connection.execute(text("CREATE TABLE audit_logs (id INTEGER PRIMARY KEY, endpoint TEXT)"))
            connection.execute(text("INSERT INTO audit_logs (id, endpoint) VALUES (1, '/proyectos')"))

        assert remove_retired_stage_productivity_schema(engine) == {
            "table_removed": True,
            "columns_removed": ("formato_bitacora_path", "formato_seguimiento_path"),
        }
        assert remove_retired_stage_productivity_schema(engine) == {
            "table_removed": False,
            "columns_removed": (),
        }

        inspector = inspect(engine)
        assert "bitacora_entries" not in inspector.get_table_names()
        assert "audit_logs" in inspector.get_table_names()
        columns = {column["name"] for column in inspector.get_columns("proyectos")}
        assert "formato_bitacora_path" not in columns
        assert "formato_seguimiento_path" not in columns
        assert "informe_final_path" in columns
        with engine.connect() as connection:
            project = connection.execute(text(
                "SELECT nombre, informe_final_path FROM proyectos WHERE id = 1"
            )).one()
            audit_count = connection.execute(text("SELECT COUNT(*) FROM audit_logs")).scalar_one()
        assert project == ("CAP de prueba", "informe.docx")
        assert audit_count == 1
    finally:
        engine.dispose()


def test_application_schema_initialization_retires_legacy_bitacora_schema():
    from app.models import Base
    from app.services.database_startup import initialize_schema

    engine = create_engine("sqlite://")
    try:
        Base.metadata.create_all(bind=engine)
        with engine.begin() as connection:
            project_columns = {
                column["name"] for column in inspect(engine).get_columns("proyectos")
            }
            for column_name in ("formato_bitacora_path", "formato_seguimiento_path"):
                if column_name not in project_columns:
                    connection.execute(text(
                        f"ALTER TABLE proyectos ADD COLUMN {column_name} TEXT"
                    ))
            if "bitacora_entries" not in inspect(engine).get_table_names():
                connection.execute(text(
                    "CREATE TABLE bitacora_entries (id INTEGER PRIMARY KEY, contenido TEXT NOT NULL)"
                ))

        initialize_schema(engine)

        inspector = inspect(engine)
        assert "bitacora_entries" not in inspector.get_table_names()
        columns = {column["name"] for column in inspector.get_columns("proyectos")}
        assert "formato_bitacora_path" not in columns
        assert "formato_seguimiento_path" not in columns
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def test_application_startup_migrates_existing_instructor_accounts(monkeypatch):
    from app import main
    from app.models import Base, User

    engine = create_engine("sqlite://")
    Base.metadata.create_all(bind=engine)
    sessions = sessionmaker(bind=engine)
    with sessions() as db:
        db.add(User(
            email="docente@sena.edu.co",
            password_hash="hash-de-prueba",
            nombre="Docente SENNOVA",
            rol="instructor",
        ))
        db.add(User(email="admin-migracion@example.com", nombre="Administrador de migración", password_hash="example", rol="admin", is_active=True))
        db.commit()

    monkeypatch.setattr(main, "engine", engine)
    monkeypatch.setattr(main, "SessionLocal", sessions)
    monkeypatch.setattr(main, "settings", SimpleNamespace(DEBUG=False, SEED_INITIAL_DATA=False))
    monkeypatch.setattr(main, "credentials_from_settings", lambda settings: None)
    monkeypatch.setattr(
        main,
        "ensure_initial_admin",
        lambda db, credentials, **kwargs: SimpleNamespace(detail="Administrador verificado"),
    )

    async def run_startup():
        async with main.lifespan(main.app):
            with sessions() as db:
                user = db.query(User).filter_by(email="docente@sena.edu.co").one()
                assert user.rol == "investigador"

    try:
        asyncio.run(run_startup())
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
