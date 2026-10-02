"""Migración documental idempotente y reversión protegida contra pérdida de datos."""

import json
import os
import secrets

import pytest
from sqlalchemy import create_engine, event, inspect, text

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", secrets.token_urlsafe(40))

from app.services.documentation_schema import upgrade_documentation_schema, downgrade_documentation_schema

TABLES = {"project_documentation", "project_document_drafts", "project_document_versions"}


@pytest.fixture
def engine(tmp_path):
    target = create_engine(f"sqlite:///{(tmp_path / 'esquema-documental.db').as_posix()}")
    yield target
    target.dispose()


def test_upgrade_creates_only_documentation_tables_with_optional_source_snapshot(engine):
    result = upgrade_documentation_schema(engine)
    assert set(inspect(engine).get_table_names()) == TABLES
    assert set(result["created_tables"]) == TABLES
    assert result["added_columns"] == []
    columns = {column["name"]: column for column in inspect(engine).get_columns("project_documentation")}
    assert "fuente_snapshot" in columns
    assert columns["fuente_snapshot"]["nullable"] is True
    assert str(columns["fuente_snapshot"]["type"]) == "JSON"


def test_upgrade_is_idempotent_and_preserves_unrelated_tables(engine):
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE tabla_ajena (id INTEGER PRIMARY KEY, texto TEXT)"))
        connection.execute(text("INSERT INTO tabla_ajena VALUES (1, 'Conservar este dato')"))
    upgrade_documentation_schema(engine)
    assert upgrade_documentation_schema(engine) == {"created_tables": [], "added_columns": []}
    with engine.connect() as connection:
        assert connection.execute(text("SELECT texto FROM tabla_ajena")).scalar_one() == "Conservar este dato"
    assert set(inspect(engine).get_table_names()) == TABLES | {"tabla_ajena"}


def test_upgrade_adds_source_snapshot_to_legacy_table_without_replacing_data(engine):
    legacy_data = {"centro": "Centro sintético", "codigo_cap": "CAP-EJEMPLO"}
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE project_documentation (proyecto_id TEXT PRIMARY KEY, revision INTEGER NOT NULL, datos JSON NOT NULL, updated_by TEXT NOT NULL, updated_at DATETIME NOT NULL)"))
        connection.execute(text("INSERT INTO project_documentation VALUES (:id, 4, :datos, :user, '2026-10-01 08:00:00')"),
                           {"id": "proyecto-sintetico", "datos": json.dumps(legacy_data), "user": "usuario-sintetico"})
    result = upgrade_documentation_schema(engine)
    assert set(result["created_tables"]) == TABLES - {"project_documentation"}
    assert result["added_columns"] == ["project_documentation.fuente_snapshot"]
    with engine.connect() as connection:
        row = connection.execute(text("SELECT revision, datos, fuente_snapshot FROM project_documentation")).one()
        assert row.revision == 4
        assert json.loads(row.datos) == legacy_data
        assert row.fuente_snapshot is None
    assert upgrade_documentation_schema(engine) == {"created_tables": [], "added_columns": []}


def test_downgrade_removes_only_empty_documentation_tables_and_is_idempotent(engine):
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE tabla_ajena (id INTEGER PRIMARY KEY)"))
        connection.execute(text("INSERT INTO tabla_ajena VALUES (1)"))
    upgrade_documentation_schema(engine)
    removed = downgrade_documentation_schema(engine)
    assert removed == ["project_document_versions", "project_document_drafts", "project_documentation"]
    assert inspect(engine).get_table_names() == ["tabla_ajena"]
    with engine.connect() as connection:
        assert connection.execute(text("SELECT id FROM tabla_ajena")).scalar_one() == 1
    assert downgrade_documentation_schema(engine) == []
    assert set(upgrade_documentation_schema(engine)["created_tables"]) == TABLES


@pytest.mark.parametrize("populated", sorted(TABLES))
def test_downgrade_refuses_any_populated_table_and_preserves_all_records(engine, populated):
    # Se conserva una tabla heredada reducida para comprobar la compuerta sin
    # depender de las columnas de la versión actual del modelo.
    with engine.begin() as connection:
        for table_name in sorted(TABLES):
            connection.execute(text(f"CREATE TABLE {table_name} (id INTEGER PRIMARY KEY, contenido TEXT)"))
        connection.execute(text(f"INSERT INTO {populated} VALUES (1, 'Registro que debe conservarse')"))
    with pytest.raises(ValueError) as error:
        downgrade_documentation_schema(engine)
    assert "contienen datos" in str(error.value)
    assert populated in str(error.value)
    assert set(inspect(engine).get_table_names()) == TABLES
    with engine.connect() as connection:
        assert connection.execute(text(f"SELECT contenido FROM {populated}")).scalar_one() == "Registro que debe conservarse"


def test_downgrade_accepts_partial_empty_legacy_schema(engine):
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE project_documentation (proyecto_id TEXT PRIMARY KEY, datos JSON)"))
    assert downgrade_documentation_schema(engine) == ["project_documentation"]
    assert inspect(engine).get_table_names() == []


def test_upgrade_rolls_back_created_tables_if_a_later_statement_fails(engine):
    def fail_on_draft_creation(connection, cursor, statement, parameters, context, executemany):
        if "CREATE TABLE project_document_drafts" in statement:
            raise RuntimeError("Fallo de DDL simulado")

    event.listen(engine, "before_cursor_execute", fail_on_draft_creation)
    try:
        with pytest.raises(RuntimeError, match="Fallo de DDL simulado"):
            upgrade_documentation_schema(engine)
    finally:
        event.remove(engine, "before_cursor_execute", fail_on_draft_creation)
    assert inspect(engine).get_table_names() == []
    assert set(upgrade_documentation_schema(engine)["created_tables"]) == TABLES


def test_downgrade_rolls_back_earlier_drops_if_a_later_drop_fails(engine):
    upgrade_documentation_schema(engine)

    def fail_on_draft_drop(connection, cursor, statement, parameters, context, executemany):
        if "DROP TABLE project_document_drafts" in statement:
            raise RuntimeError("Fallo de DDL simulado")

    event.listen(engine, "before_cursor_execute", fail_on_draft_drop)
    try:
        with pytest.raises(RuntimeError, match="Fallo de DDL simulado"):
            downgrade_documentation_schema(engine)
    finally:
        event.remove(engine, "before_cursor_execute", fail_on_draft_drop)
    assert set(inspect(engine).get_table_names()) == TABLES
    assert set(downgrade_documentation_schema(engine)) == TABLES
