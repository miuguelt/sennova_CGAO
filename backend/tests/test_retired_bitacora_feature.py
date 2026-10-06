"""Las rutas de la función de bitácoras ya no forman parte de la API."""

import os
from pathlib import Path


# Solo se inspecciona el registro de rutas; SQLite en memoria evita depender
# del driver o de una conexión a PostgreSQL durante la colección.
os.environ.setdefault("DATABASE_URL", "sqlite://")

from app.main import app  # noqa: E402


def test_bitacora_routes_are_not_registered():
    paths = [
        route.path.lower()
        for route in app.routes
        if getattr(route, "path", None)
    ]

    assert not [path for path in paths if "bitacora" in path]


def test_retired_storage_is_absent_and_current_data_model_is_documented():
    from app.models import Actividad, AuditLog, Base, Proyecto

    repository_root = Path(__file__).resolve().parents[2]
    architecture_document = repository_root / "docs" / "architecture" / "modelo-funcional-y-datos.md"
    readme_path = repository_root / "README.md"
    workflow_path = repository_root / "workflows.md"
    bootstrap_path = repository_root / "docs" / "architecture" / "bootstrap-despliegue-inicial.md"
    project_columns = set(Proyecto.__table__.columns.keys())

    assert "bitacora_entries" not in Base.metadata.tables
    assert "actividades" in Actividad.__table__.metadata.tables
    assert "audit_logs" in AuditLog.__table__.metadata.tables
    assert "formato_bitacora_path" not in project_columns
    assert "formato_seguimiento_path" not in project_columns
    assert "informe_final_path" in project_columns

    architecture_document_text = architecture_document.read_text(encoding="utf-8")
    readme_text = readme_path.read_text(encoding="utf-8")
    workflow_text = workflow_path.read_text(encoding="utf-8")
    bootstrap_text = bootstrap_path.read_text(encoding="utf-8")
    assert "PROYECTOS" in architecture_document_text
    assert "BITACORA_ENTRIES" not in architecture_document_text
    assert "modelo-funcional-y-datos.md" in readme_text
    assert "AssignPeerReviewUseCase" not in readme_text
    assert "RUBRO_PRESUPUESTAL" not in readme_text
    assert "se conserva por compatibilidad" not in workflow_text
    assert "elimina el esquema heredado" in workflow_text
    assert "initialize_schema" in bootstrap_text
