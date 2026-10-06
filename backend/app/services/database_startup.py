"""Preparación común del esquema antes de exponer la API."""

from sqlalchemy.engine import Engine

from app import models as _models  # noqa: F401  # Registra todas las tablas del ORM.
from app.database import (
    Base,
    ensure_document_description_column,
    ensure_document_period_column,
    ensure_investigador_role,
    remove_retired_stage_productivity_schema,
)
from app.services.documentation_schema import upgrade_documentation_schema
from scripts.fix_db_schema import fix_schema


def initialize_schema(target_engine: Engine) -> None:
    """Crea tablas nuevas y repara columnas heredadas de forma idempotente."""
    Base.metadata.create_all(bind=target_engine)
    fix_schema(target_engine)
    remove_retired_stage_productivity_schema(target_engine)
    upgrade_documentation_schema(target_engine)
    ensure_document_description_column(target_engine)
    ensure_document_period_column(target_engine)
    ensure_investigador_role(target_engine)
