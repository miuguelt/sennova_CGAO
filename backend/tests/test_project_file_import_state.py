"""Preservación de información, regeneración y controles de la importación."""

import asyncio
import io
import json
from pathlib import Path
from zipfile import ZipFile

import pytest
from fastapi import HTTPException, UploadFile
from sqlalchemy import inspect

from test_project_evidence_file import evidence_context  # noqa: F401
from test_project_file_import import analyze, confirm
from app.documentation_models import ProjectDocumentation, ProjectDocumentDraft
from app.models import Documento, Proyecto
from app.routers import project_file_import as routes
from app.services.project_file_import.data import apply_detected_data, merge_form
from app.services.project_file_import.export import export_path
from app.services.project_file_import.models import ProjectFileBatch, ProjectImportedFile
from app.services.project_file_import.schema import downgrade_file_import_schema, upgrade_file_import_schema


def test_schema_is_idempotent_reversible_and_protects_existing_records(evidence_context):
    db, owner, project, *_ = evidence_context
    engine = db.get_bind()
    db.rollback()
    assert downgrade_file_import_schema(engine) == ["project_imported_files", "project_file_batches"]
    assert downgrade_file_import_schema(engine) == []
    assert upgrade_file_import_schema(engine) == ["project_file_batches", "project_imported_files"]
    assert upgrade_file_import_schema(engine) == []
    db.add(ProjectFileBatch(proyecto_id=project.id, carpetas=["Carpeta"], created_by=owner.id))
    db.commit()
    with pytest.raises(ValueError, match="existen carpetas"):
        downgrade_file_import_schema(engine)
    assert "project_imported_files" in inspect(engine).get_table_names()
    assert db.query(Proyecto).filter_by(id=project.id).one().nombre


def test_registered_data_survives_reload_and_generates_a_new_document(evidence_context):
    from app.services.documentation_commands import generate_version
    from app.services.documentation_renderers import render_document
    from app.services.documentation_state import project_context
    from app.services.project_evidence_service import document_bytes
    from test_project_documentation import field_value
    from app.services.documentation_catalog import COMMON_FIELDS, DOCUMENT_DEFINITIONS
    db, _, project, *_ = evidence_context
    project.objetivo_general = "Organizar los registros de investigación."
    db.commit()
    common_data = {field["key"]: field_value(field) for field in COMMON_FIELDS
                   if field["key"] not in {"inconsistencias_fuente", "aclaraciones_fuente"}}
    draft_data = {field["key"]: field_value(field) for field in DOCUMENT_DEFINITIONS["acta_inicio"]["fields"]}
    context = project_context(project)
    original, mime = render_document("acta_inicio", context, common_data, draft_data)
    files = [("files", ("acta_inicio.docx", original, mime))]
    preview = analyze(evidence_context, files, tipo="acta_inicio")
    assert preview.status_code == 200, preview.text
    result = confirm(evidence_context, preview.json(), files, tipo="acta_inicio")
    assert result.status_code == 201, result.text
    assert result.json()["campos_registrados"] > 5
    db.expire_all()
    common = db.get(ProjectDocumentation, project.id)
    draft = db.query(ProjectDocumentDraft).filter_by(proyecto_id=project.id, clave="acta_inicio").one()
    assert common.datos["ciudad"] == common_data["ciudad"]
    assert draft.datos["lugar"] == draft_data["lugar"]
    generated = generate_version(project, db, evidence_context[1], "acta_inicio", draft.revision, common.revision)
    document = db.get(Documento, generated["documento_id"])
    assert document.nombre_archivo == "acta_inicio_v1.docx"
    assert generated["estado"] == "borrador"
    with ZipFile(io.BytesIO(document_bytes(document))) as archive:
        assert common.datos["ciudad"].encode() in archive.read("word/document.xml")


def test_import_without_filling_fields_can_later_fill_them_without_duplicating_file(evidence_context):
    files = [("files", ("datos.txt", b"Ciudad: Velez", "text/plain"))]
    ctx = evidence_context
    preview = analyze(ctx, files).json()
    selection = [{"ruta": row["ruta"], "sha256": row["sha256"], "importar_datos": False} for row in preview["archivos"]]
    result = ctx[-1].post(f"/proyectos/{ctx[2].id}/expediente/importar-archivos", files=files,
                         data={"seleccion": json.dumps(selection)})
    assert result.status_code == 201
    assert ctx[0].query(ProjectDocumentation).count() == 0
    assert confirm(ctx, preview, files).json()["campos_registrados"] == 1
    assert ctx[0].query(Documento).count() == 1
    assert ctx[0].get(ProjectDocumentation, ctx[2].id).datos["ciudad"] == "Velez"


def test_missing_original_is_recovered_and_other_project_is_unchanged(evidence_context):
    ctx = evidence_context
    other = Proyecto(nombre="Otro proyecto", owner_id=ctx[1].id)
    ctx[0].add(other)
    ctx[0].commit()
    files = [("files", ("notas.txt", b"Contenido", "text/plain"))]
    preview = analyze(ctx, files).json()
    assert confirm(ctx, preview, files).status_code == 201
    original = ctx[0].query(Documento).one()
    Path(original.file_path).unlink()
    assert confirm(ctx, preview, files).json()["archivos_importados"] == 1
    assert ctx[0].query(ProjectFileBatch).filter_by(proyecto_id=other.id).count() == 0
    assert other.nombre == "Otro proyecto"


def test_repeated_selection_and_nonreport_period_are_rejected(evidence_context):
    ctx = evidence_context
    files = [("files", ("notas.txt", b"Contenido", "text/plain"))]
    preview = analyze(ctx, files).json()
    entry = preview["archivos"][0]
    selected = {"ruta": entry["ruta"], "sha256": entry["sha256"]}
    path = f"/proyectos/{ctx[2].id}/expediente/importar-archivos"
    assert ctx[-1].post(path, files=files, data={"seleccion": json.dumps([selected, selected])}).status_code == 422
    assert ctx[-1].post(path, files=files, data={"seleccion": json.dumps([{**selected, "periodo_bimestre": 1}])}).status_code == 422
    assert analyze(ctx, [("files", ("archivo.zip", b"invalido", "application/zip"))]).status_code == 400
    assert ctx[0].query(Documento).count() == 0


def test_conflicting_form_values_and_invalid_combined_dates_are_preserved(evidence_context):
    db, owner, project, *_ = evidence_context
    row = ProjectDocumentation(proyecto_id=project.id, datos={"ciudad": "Bogotá", "fecha_fin": "2026-01-01"}, revision=3, updated_by=owner.id)
    warnings = []
    from app.services.documentation_catalog import COMMON_FIELDS
    assert merge_form(row, {"ciudad": "Vélez"}, COMMON_FIELDS, "fuente", warnings, owner) == 0
    assert row.datos["ciudad"] == "Bogotá"
    assert merge_form(row, {"fecha_inicio": "2026-02-01"}, COMMON_FIELDS, "fuente", warnings, owner) == 0
    assert "fecha_inicio" not in row.datos
    assert row.revision == 3 and len(warnings) == 2
    entry = {"ruta": "producto.docx", "tipo": "informe_bimensual", "propuesta": {"borrador": {"antecedentes": "Contenido fuente"}}}
    project.vigencia = None
    assert apply_detected_data(project, db, owner, entry, 2, warnings) == 0
    assert "configure la duración" in warnings[-1]


def test_import_fills_missing_identification_and_does_not_rewrite_existing_draft(evidence_context):
    db, owner, project, *_ = evidence_context
    project.objetivo_general, project.objetivos_especificos = None, []
    draft = ProjectDocumentDraft(proyecto_id=project.id, clave="formulacion_proyecto", tipo="formulacion_proyecto", revision=2,
                                 datos={"introduccion": "Redacción conservada"}, updated_by=owner.id)
    db.add(draft)
    db.flush()
    warnings = []
    entry = {"ruta": "formulacion.docx", "tipo": "formulacion_proyecto", "propuesta": {
        "proyecto": {"objetivo_general": "Organizar los registros.", "objetivos_especificos": "Revisar fuentes.\nValidar datos."},
        "borrador": {"introduccion": "Texto diferente", "justificacion": "Facilita la consulta."}}}
    assert apply_detected_data(project, db, owner, entry, None, warnings) == 3
    assert project.objetivos_especificos == ["Revisar fuentes.", "Validar datos."]
    assert draft.datos["introduccion"] == "Redacción conservada"
    assert draft.datos["justificacion"] == "Facilita la consulta."
    assert draft.revision == 3 and warnings


def test_export_handles_reserved_paths_file_directory_collisions_and_unsafe_metadata():
    used = {"expediente.json", "carpeta/", "1_archivo.txt", "archivo.txt"}
    assert export_path("expediente.json", "id", used) == "id_expediente.json"
    assert export_path("carpeta", "id", used) == "id_carpeta"
    assert export_path("archivo.txt/anexo.txt", "id", used) == "Archivos_importados/id/archivo.txt/anexo.txt"
    assert export_path("../escape.txt", "id", used) == "7Borradoresyvarios/id_archivo"
    assert export_path("archivo.txt", "1", used) == "1_2_archivo.txt"


def test_request_limits_close_streams_and_fail_before_large_reads(monkeypatch):
    monkeypatch.setattr(routes, "MAX_FILE_SIZE", 3)
    upload = UploadFile(filename="notas.txt", file=io.BytesIO(b"cuatro"))
    with pytest.raises(HTTPException) as failure:
        asyncio.run(routes.read_files([upload]))
    assert failure.value.status_code == 413 and upload.file.closed
    with pytest.raises(HTTPException) as failure:
        asyncio.run(routes.read_files([]))
    assert failure.value.status_code == 422
    from app.middlewares.request_limits import FORMULATION_REQUEST_LIMITS
    assert FORMULATION_REQUEST_LIMITS["/expediente/importar-archivos"] == 201 * 1024 * 1024


def test_proxy_accepts_the_documented_package_limit():
    nginx = (Path(__file__).resolve().parents[2] / "frontend/nginx.conf").read_text(encoding="utf-8")
    assert "client_max_body_size 201m;" in nginx


def test_export_renames_folders_that_conflict_with_manifest_files(evidence_context):
    ctx = evidence_context
    stream = io.BytesIO()
    with ZipFile(stream, "w") as archive:
        archive.writestr("expediente.json/nota.txt", "Contenido")
        archive.writestr("pendientes.txt/vacia/", "")
    files = [("files", ("fuentes.zip", stream.getvalue(), "application/zip"))]
    result = confirm(ctx, analyze(ctx, files).json(), files)
    assert result.status_code == 201
    with ZipFile(io.BytesIO(ctx[-1].get(f"/proyectos/{ctx[2].id}/expediente/descargar").content)) as archive:
        assert "expediente.json/" not in archive.namelist()
        assert archive.read("Archivos_importados/expediente.json/nota.txt") == b"Contenido"
        assert "Archivos_importados/pendientes.txt/vacia/" in archive.namelist()
        archive.extractall(ctx[3] / "descarga_verificada")


def test_imported_duration_cannot_leave_a_report_outside_project_period(evidence_context):
    ctx = evidence_context
    ctx[2].vigencia = None
    ctx[0].commit()
    files = [("files", ("informe_bimensual.txt", b"Duracion en meses: 2\nBimestre: 3", "text/plain"))]
    preview = analyze(ctx, files).json()
    assert preview["archivos"][0]["periodo_bimestre"] == 3
    result = confirm(ctx, preview, files)
    assert result.status_code == 422
    assert ctx[0].query(Documento).count() == 0
    assert ctx[2].vigencia is None
    assert not list((ctx[3] / "documentos").glob("*"))


def test_exported_long_filename_versions_can_be_imported_again(evidence_context):
    from app.services.project_file_import.archive import read_uploads
    ctx = evidence_context
    name = "a" * 240 + ".json"
    for value in (b'{"version":1}', b'{"version":2}'):
        files = [("files", (name, value, "application/json"))]
        assert confirm(ctx, analyze(ctx, files).json(), files).status_code == 201
    exported = ctx[-1].get(f"/proyectos/{ctx[2].id}/expediente/descargar").content
    imported = read_uploads([("descarga.zip", exported)])
    assert {entry["content"] for entry in imported["files"] if entry["content"] in {b'{"version":1}', b'{"version":2}'}} == {b'{"version":1}', b'{"version":2}'}


def test_large_analysis_yields_control_to_other_requests(evidence_context, monkeypatch):
    import time
    ctx = evidence_context
    def slow_analysis(*args):
        time.sleep(0.08)
        return {"archivos": [], "proyecto_id": str(ctx[2].id)}
    monkeypatch.setattr(routes, "analyze_uploads", slow_analysis)
    async def observe():
        task = asyncio.create_task(routes.analyze_project_files(
            ctx[2].id, [UploadFile(filename="notas.txt", file=io.BytesIO(b"Contenido"))], "", "", ctx[1], ctx[0]))
        await asyncio.sleep(0.02)
        was_running = not task.done()
        result = await task
        assert was_running, "El análisis bloqueó el bucle de atención de solicitudes"
        assert result["proyecto_id"] == str(ctx[2].id)
    asyncio.run(observe())
