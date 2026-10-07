import json
import os
from pathlib import Path
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import get_settings

settings = get_settings()

# Configuración según el tipo de base de datos
if settings.DATABASE_URL.startswith("sqlite"):
    # SQLite - sin pool_pre_ping (no soportado)
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False
    )
else:
    # PostgreSQL u otros
    engine = create_engine(
        settings.DATABASE_URL,
        pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "5")),
        pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "10")),
        pool_pre_ping=True,
        pool_recycle=300,
        echo=False,
        connect_args={"connect_timeout": 10}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def safe_commit(db: Session):
    """Realiza commit seguro con rollback automático en caso de error."""
    try:
        db.commit()
    except Exception as err:
        import logging
        logging.getLogger(__name__).warning("DB Commit falló: %s", err)
        try:
            db.rollback()
        except Exception:
            pass
        raise


def ensure_document_description_column(target_engine=engine):
    """Añade la columna opcional de descripción a instalaciones existentes."""
    inspector = inspect(target_engine)
    if "documentos" not in inspector.get_table_names():
        return False
    columns = {column["name"] for column in inspector.get_columns("documentos")}
    if "descripcion" in columns:
        return False
    with target_engine.connect() as connection:
        connection.execute(text("ALTER TABLE documentos ADD COLUMN descripcion TEXT"))
    return True


def ensure_document_period_column(target_engine=engine):
    """Añade el bimestre sin atribuir períodos a documentos heredados."""
    inspector = inspect(target_engine)
    if "documentos" not in inspector.get_table_names():
        return False
    if "periodo_bimestre" in {column["name"] for column in inspector.get_columns("documentos")}:
        return False
    with target_engine.begin() as connection:
        connection.execute(text("ALTER TABLE documentos ADD COLUMN periodo_bimestre INTEGER"))
    return True


def ensure_investigador_role(target_engine=engine):
    """Unifica en investigador los registros que usaban el rol eliminado."""
    inspector = inspect(target_engine)
    if "users" not in inspector.get_table_names():
        return 0
    columns = {column["name"] for column in inspector.get_columns("users")}
    if "rol" not in columns:
        return 0
    with target_engine.begin() as connection:
        result = connection.execute(
            text("UPDATE users SET rol = 'investigador' WHERE rol = 'instructor'")
        )
    return result.rowcount or 0


def remove_retired_stage_productivity_schema(target_engine=engine, storage_root=None):
    """Elimina la bitácora retirada y rutas de formatos de etapa productiva.

    Elimina registros, notificaciones y soportes asociados exclusivamente a la
    bitácora, junto con los campos heredados de etapa productiva. Conserva la
    actividad, auditoría y documentación de proyectos de investigación.
    """
    inspector = inspect(target_engine)
    existing_tables = set(inspector.get_table_names())
    project_columns = (
        {column["name"] for column in inspector.get_columns("proyectos")}
        if "proyectos" in existing_tables
        else set()
    )
    columns_to_remove = tuple(
        column_name
        for column_name in ("formato_bitacora_path", "formato_seguimiento_path")
        if column_name in project_columns
    )
    table_removed = "bitacora_entries" in existing_tables
    retired_paths = []
    documents_removed = 0
    notifications_removed = 0

    with target_engine.connect().execution_options(isolation_level="AUTOCOMMIT") as connection:
        if table_removed:
            diary_columns = {
                column["name"] for column in inspector.get_columns("bitacora_entries")
            }
            if "adjuntos" in diary_columns:
                attachment_rows = connection.execute(
                    text("SELECT adjuntos FROM bitacora_entries WHERE adjuntos IS NOT NULL")
                ).fetchall()
                for (raw_value,) in attachment_rows:
                    try:
                        parsed_value = json.loads(raw_value) if isinstance(raw_value, (str, bytes)) else raw_value
                    except (TypeError, ValueError):
                        parsed_value = raw_value
                    pending_values = [parsed_value]
                    while pending_values:
                        value = pending_values.pop()
                        if isinstance(value, dict):
                            pending_values.extend(value.values())
                        elif isinstance(value, (list, tuple)):
                            pending_values.extend(value)
                        elif isinstance(value, (str, Path)) and str(value).strip():
                            retired_paths.append(str(value).strip())

        if "documentos" in existing_tables:
            document_columns = {
                column["name"] for column in inspector.get_columns("documentos")
            }
            if {"entidad_tipo", "tipo"}.issubset(document_columns):
                document_filter = (
                    "lower(entidad_tipo) IN ('bitacora', 'bitacoras') "
                    "OR lower(tipo) IN ('bitacora', 'bitacoras', 'evidencia_bitacora')"
                )
                if "file_path" in document_columns:
                    retired_paths.extend(
                        row[0]
                        for row in connection.execute(text(
                            f"SELECT file_path FROM documentos WHERE ({document_filter}) "
                            "AND file_path IS NOT NULL"
                        ))
                    )
                result = connection.execute(text(
                    f"DELETE FROM documentos WHERE {document_filter}"
                ))
                documents_removed = result.rowcount or 0

        if "notificaciones" in existing_tables:
            notification_columns = {
                column["name"] for column in inspector.get_columns("notificaciones")
            }
            if "entidad_tipo" in notification_columns:
                result = connection.execute(text(
                    "DELETE FROM notificaciones "
                    "WHERE lower(entidad_tipo) IN ('bitacora', 'bitacoras')"
                ))
                notifications_removed = result.rowcount or 0


    with target_engine.begin() as connection:
        if table_removed:
            connection.execute(text("DROP TABLE bitacora_entries"))
        for column_name in columns_to_remove:
            connection.execute(text(f"ALTER TABLE proyectos DROP COLUMN {column_name}"))

    root = Path(storage_root or settings.STORAGE_DIR).resolve()
    remaining_paths = set()
    if "documentos" in existing_tables:
        document_columns = {
            column["name"] for column in inspect(target_engine).get_columns("documentos")
        }
        if "file_path" in document_columns:
            active_documents_filter = ""
            if {"entidad_tipo", "tipo"}.issubset(document_columns):
                active_documents_filter = (
                    " AND NOT (lower(entidad_tipo) IN ('bitacora', 'bitacoras') "
                    "OR lower(tipo) IN ('bitacora', 'bitacoras', 'evidencia_bitacora'))"
                )
            with target_engine.connect() as connection:
                for (raw_path,) in connection.execute(text(
                    "SELECT file_path FROM documentos WHERE file_path IS NOT NULL"
                    f"{active_documents_filter}"
                )):
                    candidate = Path(raw_path)
                    candidates = (
                        (candidate.resolve(),)
                        if candidate.is_absolute()
                        else ((root / candidate).resolve(), (Path.cwd() / candidate).resolve())
                    )
                    remaining_paths.update(
                        resolved for resolved in candidates
                        if resolved != root and root in resolved.parents
                    )

    files_removed = 0
    for raw_path in set(retired_paths):
        candidate = Path(raw_path)
        candidates = (
            (candidate.resolve(),)
            if candidate.is_absolute()
            else ((root / candidate).resolve(), (Path.cwd() / candidate).resolve())
        )
        for resolved in candidates:
            if resolved == root or root not in resolved.parents or resolved in remaining_paths:
                continue
            try:
                if resolved.is_file():
                    resolved.unlink()
                    files_removed += 1
                    break
            except OSError:
                continue

    return {
        "table_removed": table_removed,
        "columns_removed": columns_to_remove,
        "documents_removed": documents_removed,
        "notifications_removed": notifications_removed,
        "files_removed": files_removed,
    }
