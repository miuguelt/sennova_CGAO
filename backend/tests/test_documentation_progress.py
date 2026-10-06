"""El avance del proyecto representa requisitos y versiones documentales guardados."""

import base64
import hashlib

import pytest

from app.auth import get_current_user
from app.documentation_models import ProjectDocumentation, ProjectDocumentDraft, ProjectDocumentVersion
from app.main import app
from app.models import Documento, User
from app.services.documentation_catalog import DOCUMENT_DEFINITIONS
from app.services.documentation_state import current_snapshot, document_slots
from test_project_documentation import complete_forms
from test_project_documentation import documentation_context as documentation_context


def expected_required_count(project):
    common = {key for definition in DOCUMENT_DEFINITIONS.values() for key in definition["required_common"]}
    specific = sum(sum(field["required"] for field in DOCUMENT_DEFINITIONS[slot["tipo"]]["fields"]) for slot in document_slots(project))
    return len(common) + 4 + specific


def persistent_versions(ctx, *, reviewed=False):
    """Guarda versiones sintéticas en la base de prueba sin generar archivos del usuario."""
    db, user, project, *_ = ctx
    common = db.query(ProjectDocumentation).filter_by(proyecto_id=project.id).one()
    slots = {slot["clave"]: slot for slot in document_slots(project)}
    for draft in db.query(ProjectDocumentDraft).filter_by(proyecto_id=project.id).all():
        content = ("Contenido de prueba de " + draft.clave).encode()
        document = Documento(entidad_tipo="proyecto", entidad_id=str(project.id), tipo=draft.tipo,
                             nombre_archivo=draft.clave + ".docx", data_base64=base64.b64encode(content).decode(), owner_id=user.id)
        db.add(document)
        db.flush()
        db.add(ProjectDocumentVersion(borrador_id=draft.id, documento_id=document.id, version=1,
                                     revision_comunes=common.revision, revision_borrador=draft.revision,
                                     snapshot=current_snapshot(project, slots[draft.clave], common.datos, draft.datos),
                                     sha256=hashlib.sha256(content).hexdigest(), created_by=user.id,
                                     estado="revisado" if reviewed else "borrador"))
    db.commit()
    db.expire_all()


def test_empty_documentation_and_finalized_status_have_zero_progress(documentation_context):
    db, _, project, product, _, client = documentation_context
    project.objetivo_general, project.objetivos_especificos, project.vigencia = None, [], None
    project.estado = "Finalizado"
    db.delete(product)
    db.commit()
    db.expire_all()
    progress = client.get(f"/proyectos/{project.id}/documentacion").json()["avance_documental"]
    assert progress["porcentaje"] == 0
    assert progress["porcentaje_captura"] == 0
    assert progress["campos_completados"] == 0
    assert progress["campos_totales"] == expected_required_count(project)
    assert progress["documentos_totales"] == len(document_slots(project))
    assert progress["documentos_listos"] == progress["documentos_generados"] == progress["documentos_revisados"] == 0
    detail = client.get(f"/proyectos/{project.id}").json()
    assert detail["avance_porcentaje"] == 0
    assert detail["avance_documental"] == progress


def test_saved_fields_count_common_once_and_tables_only_when_every_row_is_complete(documentation_context):
    _, _, project, _, _, client = documentation_context
    base = f"/proyectos/{project.id}/documentacion"
    initial = client.get(base).json()["avance_documental"]
    payload = {"centro": "CGAO", "presupuesto": [{"rubro": "Materiales", "valor_planeado": 0, "uso": "", "fecha_ejecucion": "Mes 1"}]}
    saved = client.put(base + "/comunes", json={"revision": 0, "datos": payload})
    assert saved.status_code == 200
    partial = client.get(base).json()["avance_documental"]
    assert partial["campos_completados"] == initial["campos_completados"] + 1
    assert partial["campos_totales"] == initial["campos_totales"] == expected_required_count(project)
    payload["presupuesto"][0]["uso"] = "Compra confirmada"
    assert client.put(base + "/comunes", json={"revision": 1, "datos": payload}).status_code == 200
    completed = client.get(base).json()["avance_documental"]
    assert completed["campos_completados"] == partial["campos_completados"] + 1
    payload["presupuesto"].append(dict(payload["presupuesto"][0], rubro="Servicios"))
    assert client.put(base + "/comunes", json={"revision": 2, "datos": payload}).status_code == 200
    expanded = client.get(base).json()["avance_documental"]
    assert expanded == completed


def test_complete_captured_documentation_is_eighty_percent_until_generated_and_reviewed(documentation_context):
    ctx = documentation_context
    view = complete_forms(ctx)
    progress = view["avance_documental"]
    assert progress["campos_completados"] == progress["campos_totales"] == expected_required_count(ctx[2])
    assert progress["porcentaje_captura"] == 100
    assert progress["porcentaje"] == 80
    assert progress["documentos_listos"] == progress["documentos_totales"]
    assert progress["documentos_generados"] == progress["documentos_revisados"] == 0
    persistent_versions(ctx)
    generated = ctx[-1].get(f"/proyectos/{ctx[2].id}/documentacion").json()["avance_documental"]
    assert generated["porcentaje"] == 90
    assert generated["documentos_generados"] == generated["documentos_totales"]
    assert generated["documentos_revisados"] == 0
    ctx[0].query(ProjectDocumentVersion).update({"estado": "revisado"})
    ctx[0].commit()
    ctx[0].expire_all()
    reviewed = ctx[-1].get(f"/proyectos/{ctx[2].id}/documentacion").json()["avance_documental"]
    assert reviewed["porcentaje"] == 100
    assert reviewed["documentos_revisados"] == reviewed["documentos_totales"]
    assert "80" in reviewed["descripcion"] and "10" in reviewed["descripcion"]


@pytest.mark.parametrize("change", ["common", "draft", "project", "missing", "altered", "consistency"])
def test_obsolete_unavailable_or_inconsistent_versions_cannot_report_complete_progress(documentation_context, change):
    ctx = documentation_context
    complete_forms(ctx)
    persistent_versions(ctx, reviewed=True)
    db, _, project, *_ = ctx
    base = f"/proyectos/{project.id}/documentacion"
    if change == "common":
        row = db.query(ProjectDocumentation).one()
        row.revision += 1
        row.datos = dict(row.datos, ciudad="Municipio actualizado")
    elif change == "draft":
        row = db.query(ProjectDocumentDraft).filter_by(clave="acta_inicio").one()
        row.revision += 1
        row.datos = dict(row.datos, temas="Contenido actualizado")
    elif change == "project":
        project.nombre = "Nombre actualizado del proyecto"
    elif change in {"missing", "altered"}:
        row = db.query(Documento).first()
        row.data_base64 = "" if change == "missing" else base64.b64encode(b"Contenido alterado").decode()
    else:
        project.presupuesto_total = 999
    db.commit()
    db.expire_all()
    progress = ctx[-1].get(base).json()["avance_documental"]
    assert progress["porcentaje"] < 100
    assert progress["documentos_revisados"] < progress["documentos_totales"]
    if change in {"common", "project", "consistency"}:
        assert progress["documentos_revisados"] == 0
    if change in {"missing", "altered", "draft"}:
        assert progress["documentos_revisados"] == progress["documentos_totales"] - 1


def test_persisted_invalid_values_do_not_count_as_valid_requirements(documentation_context):
    ctx = documentation_context
    complete_forms(ctx)
    db, _, project, *_ = ctx
    common = db.query(ProjectDocumentation).one()
    common.datos = dict(common.datos, fecha_inicio="2026-12-31", fecha_fin="2026-01-01")
    draft = db.query(ProjectDocumentDraft).filter_by(clave="acta_cierre").one()
    draft.datos = dict(draft.datos, tipo_cierre="opcion_inexistente", balance=[{"rubro": "Rubro", "valor_planeado": -1}])
    db.commit()
    progress = ctx[-1].get(f"/proyectos/{project.id}/documentacion").json()["avance_documental"]
    assert progress["campos_completados"] == progress["campos_totales"] - 4
    assert progress["documentos_listos"] < progress["documentos_totales"]
    assert progress["porcentaje_captura"] < 100


def test_uploaded_support_and_approved_deliverables_do_not_count_as_generation(documentation_context):
    from datetime import date
    from app.models import Entregable

    db, user, project, _, _, client = documentation_context
    before = client.get(f"/proyectos/{project.id}/documentacion").json()["avance_documental"]
    db.add(Documento(entidad_tipo="proyecto", entidad_id=str(project.id), tipo="acta_inicio", nombre_archivo="Soporte.docx",
                     data_base64=base64.b64encode(b"Soporte adjunto").decode(), owner_id=user.id))
    db.add(Entregable(proyecto_id=project.id, fase="Fase I", titulo="Entrega aprobada", fecha_entrega=date(2026, 6, 30), estado="aprobado"))
    db.commit()
    after = client.get(f"/proyectos/{project.id}").json()
    assert after["entregables_aprobados"] == after["total_entregables"] == 1
    assert after["avance_documental"] == before
    assert after["avance_porcentaje"] == before["porcentaje"] < 100


def test_reviewed_state_with_current_snapshot_still_requires_consistent_source(documentation_context):
    ctx = documentation_context
    complete_forms(ctx)
    row = ctx[0].query(ProjectDocumentation).one()
    row.datos = dict(row.datos, inconsistencias_fuente="Código pendiente de conciliar con su soporte")
    ctx[0].commit()
    persistent_versions(ctx, reviewed=True)
    progress = ctx[-1].get(f"/proyectos/{ctx[2].id}/documentacion").json()["avance_documental"]
    assert progress["porcentaje"] == 90
    assert progress["porcentaje_captura"] == 100
    assert progress["documentos_generados"] == progress["documentos_totales"]
    assert progress["documentos_revisados"] == 0


def test_latest_generated_version_supersedes_previous_review(documentation_context):
    ctx = documentation_context
    complete_forms(ctx)
    persistent_versions(ctx, reviewed=True)
    db, user, project, *_ = ctx
    draft = db.query(ProjectDocumentDraft).filter_by(clave="acta_inicio").one()
    previous = draft.versiones[0]
    content = b"Nueva version vigente de prueba"
    document = Documento(entidad_tipo="proyecto", entidad_id=str(project.id), tipo=draft.tipo, nombre_archivo="Acta-v2.docx",
                         data_base64=base64.b64encode(content).decode(), owner_id=user.id)
    db.add(document)
    db.flush()
    db.add(ProjectDocumentVersion(borrador_id=draft.id, documento_id=document.id, version=2,
                                 revision_comunes=previous.revision_comunes, revision_borrador=previous.revision_borrador,
                                 snapshot=previous.snapshot, sha256=hashlib.sha256(content).hexdigest(), created_by=user.id))
    db.commit()
    db.expire_all()
    progress = ctx[-1].get(f"/proyectos/{project.id}/documentacion").json()["avance_documental"]
    assert progress["documentos_generados"] == progress["documentos_totales"]
    assert progress["documentos_revisados"] == progress["documentos_totales"] - 1
    assert progress["porcentaje"] < 100


def test_listing_detail_and_editor_share_progress_after_confirmed_writes(documentation_context):
    _, _, project, _, _, client = documentation_context
    base = f"/proyectos/{project.id}/documentacion"
    assert client.put(base + "/borradores/acta_inicio", json={"revision": 0, "datos": {"temas": "Acuerdos guardados"}}).status_code == 200
    editor = client.get(base).json()["avance_documental"]
    detail = client.get(f"/proyectos/{project.id}").json()
    listed = next(row for row in client.get("/proyectos").json() if row["id"] == str(project.id))
    assert detail["avance_documental"] == listed["avance_documental"] == editor
    assert detail["avance_porcentaje"] == listed["avance_porcentaje"] == editor["porcentaje"]


def test_documentary_progress_preserves_learner_read_and_write_permissions(documentation_context):
    db, user, project, _, _, client = documentation_context
    user.rol = "aprendiz"
    db.commit()
    base = f"/proyectos/{project.id}/documentacion"
    editor = client.get(base)
    assert editor.status_code == 200
    assert client.get(f"/proyectos/{project.id}").json()["avance_documental"] == editor.json()["avance_documental"]
    assert client.put(base + "/comunes", json={"revision": 0, "datos": {"centro": "CGAO"}}).status_code == 403
    outsider = User(email="otro-aprendiz-documental@example.com", nombre="Aprendiz externo", password_hash="example", rol="aprendiz")
    db.add(outsider)
    db.commit()
    app.dependency_overrides[get_current_user] = lambda: outsider
    assert client.get(base).status_code == 403
    assert client.get(f"/proyectos/{project.id}").status_code == 403
    assert client.get("/proyectos").json() == []
