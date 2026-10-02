"""Migración documental incremental y reversión restringida a tablas vacías."""

from sqlalchemy import inspect, literal, select, text

from app.documentation_models import ProjectDocumentation, ProjectDocumentDraft, ProjectDocumentVersion

DOCUMENTATION_TABLES = (
    ProjectDocumentation.__table__,
    ProjectDocumentDraft.__table__,
    ProjectDocumentVersion.__table__,
)
SCHEMA_LOCK_KEY = int.from_bytes(b"SENNODOC", "big")


def _lock_schema(connection):
    """Serializa migraciones; el bloqueo termina al confirmar o revertir."""
    if connection.dialect.name == "postgresql":
        connection.execute(text("SELECT pg_advisory_xact_lock(:lock_key)"), {"lock_key": SCHEMA_LOCK_KEY})
    elif connection.dialect.name == "sqlite":
        # También hace transaccional el DDL y evita inserciones concurrentes
        # entre la comprobación de tablas vacías y su eliminación.
        connection.exec_driver_sql("BEGIN IMMEDIATE")


def upgrade_documentation_schema(target_engine):
    """Crea las tres tablas ausentes y añade únicamente el snapshot de la fuente."""
    with target_engine.begin() as connection:
        _lock_schema(connection)
        existing = set(inspect(connection).get_table_names())
        missing = [table for table in DOCUMENTATION_TABLES if table.name not in existing]
        for table in missing:
            table.create(connection, checkfirst=False)
        added = []
        columns = {column["name"] for column in inspect(connection).get_columns("project_documentation")}
        if "fuente_snapshot" not in columns:
            column_type = "JSONB" if connection.dialect.name == "postgresql" else "JSON"
            connection.execute(text(f"ALTER TABLE project_documentation ADD COLUMN fuente_snapshot {column_type}"))
            added.append("project_documentation.fuente_snapshot")
        return {"created_tables": [table.name for table in missing], "added_columns": added}


def downgrade_documentation_schema(target_engine):
    """Retira solo las tres tablas documentales cuando ninguna contiene registros."""
    with target_engine.begin() as connection:
        _lock_schema(connection)
        existing = set(inspect(connection).get_table_names())
        tables = [table for table in reversed(DOCUMENTATION_TABLES) if table.name in existing]
        if tables and connection.dialect.name == "postgresql":
            names = ", ".join(connection.dialect.identifier_preparer.quote(table.name) for table in tables)
            connection.execute(text(f"LOCK TABLE {names} IN ACCESS EXCLUSIVE MODE"))
        populated = [table.name for table in tables if connection.execute(select(literal(1)).select_from(table).limit(1)).first()]
        if populated:
            raise ValueError("No se puede revertir el esquema documental: las tablas contienen datos: " + ", ".join(populated))
        for table in tables:
            table.drop(connection, checkfirst=False)
        return [table.name for table in tables]
