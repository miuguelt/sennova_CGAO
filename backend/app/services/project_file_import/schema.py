"""Migración aditiva; la reversión protege cualquier procedencia ya registrada."""

from sqlalchemy import inspect, literal, select, text

from app.services.project_file_import.models import ProjectFileBatch, ProjectImportedFile

TABLES = (ProjectFileBatch.__table__, ProjectImportedFile.__table__)


def lock_schema(connection):
    if connection.dialect.name == "postgresql":
        connection.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": int.from_bytes(b"SENFILES", "big")})
    elif connection.dialect.name == "sqlite":
        connection.exec_driver_sql("BEGIN IMMEDIATE")


def upgrade_file_import_schema(engine):
    with engine.begin() as connection:
        lock_schema(connection)
        existing = set(inspect(connection).get_table_names())
        created = []
        for table in TABLES:
            if table.name not in existing:
                table.create(connection)
                created.append(table.name)
        return created


def downgrade_file_import_schema(engine):
    with engine.begin() as connection:
        lock_schema(connection)
        existing = set(inspect(connection).get_table_names())
        tables = [table for table in reversed(TABLES) if table.name in existing]
        if tables and connection.dialect.name == "postgresql":
            names = ", ".join(connection.dialect.identifier_preparer.quote(table.name) for table in tables)
            connection.execute(text(f"LOCK TABLE {names} IN ACCESS EXCLUSIVE MODE"))
        if any(connection.execute(select(literal(1)).select_from(table).limit(1)).first() for table in tables):
            raise ValueError("No se puede revertir la importación: existen carpetas o archivos registrados.")
        for table in tables:
            table.drop(connection)
        return [table.name for table in tables]
