"""Escenario CAP-14 completo con UUID, JSONB y archivos en PostgreSQL real."""

import json
import uuid
from pathlib import Path
from zipfile import ZipFile

from test_project_evidence_postgres import postgres_context
from app.models import Proyecto
from app.services.cap14_reference_completion import complete_cap14_reference
from app.services.documentation_commands import generate_version
from app.services.documentation_state import documentation_view
from app.services.project_evidence_service import build_project_file_zip
from app.services.project_timeline import project_timeline_data
from app.services.reference_documentation_import import import_reference_data


def test_complete_and_generate_reference_with_native_postgres_types(postgres_context):
    _, db, owner, _, _, _ = postgres_context
    owner.rol = "admin"
    db.commit()
    source = Path(__file__).parents[1] / "tests/fixtures/cap14_reference_validation.json"
    imported = import_reference_data(db, owner, json.loads(source.read_text(encoding="utf-8")))
    complete_cap14_reference(db, owner, imported["proyecto_id"])
    project = db.get(Proyecto, uuid.UUID(imported["proyecto_id"]))
    view = documentation_view(project, db)
    assert all(item["generable"] for item in view["documentos"])
    assert len(project_timeline_data(project)["entregables"]) == 6
    for item in view["documentos"]:
        result = generate_version(project, db, owner, item["clave"], item["revision"], view["revision"])
        assert result["estado"] == "borrador"
    with build_project_file_zip(project, db) as output:
        with ZipFile(output) as archive:
            assert len([name for name in archive.namelist() if name.endswith((".docx", ".pptx"))]) == 13
            report = json.loads(archive.read("expediente.json"))
            assert not report["completo"] and report["pendientes"]
