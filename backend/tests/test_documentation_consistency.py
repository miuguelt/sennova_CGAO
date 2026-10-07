"""La generación exige fechas, horas y balances coherentes con el proyecto."""

import pytest

from app.documentation_models import ProjectDocumentation, ProjectDocumentDraft
from app.services.documentation_state import current_snapshot, generation_pending, version_is_current
from test_project_documentation import complete_forms, documentation_context as documentation_context


@pytest.mark.parametrize("history,coherence,phrase", [
    ([], [], "Genera el borrador"),
    ([{"vigente": True, "estado": "generado"}], [], "Revisa el borrador"),
    ([{"vigente": True, "estado": "revisado"}], [], "revisión documental está registrada"),
    ([{"vigente": True, "estado": "generado"}], [{"campo": "comunes.inconsistencias_fuente"}], "pendientes de coherencia"),
])
def test_completed_fields_offer_a_generation_or_review_action(documentation_context, history, coherence, phrase):
    from app.services.formulation_route import formulation_route
    ctx = documentation_context
    view = complete_forms(ctx)
    slot = next(item for item in view["documentos"] if item["clave"] == "formulacion_proyecto")
    slot = dict(slot, historial=history)
    route = formulation_route(ctx[2], view["comunes"], slot, coherence=coherence)
    assert route["resumen"]["campos_diligenciados"] is True
    assert phrase in route["siguiente_accion"]
    assert route["resumen"]["pendientes_coherencia"] == len(coherence)
    assert route["porcentaje"] == (100 if history else 90)


def test_new_relationship_guidance_keeps_existing_documents_generable(documentation_context):
    ctx = documentation_context
    view = complete_forms(ctx)
    assert view["revision_coherencia"]
    assert all(item["generable"] for item in view["documentos"])
    assert view["ruta_formulacion"]["resumen"]["campos_diligenciados"] is True


def test_relation_options_do_not_invalidate_existing_document_snapshots(documentation_context):
    from app.services.formulation_coherence import relation_options
    ctx = documentation_context
    view = complete_forms(ctx)
    slot = next(item for item in view["documentos"] if item["clave"] == "formulacion_proyecto")
    snapshot = current_snapshot(ctx[2], slot, view["comunes"], slot["datos"])
    before = relation_options(ctx[2], view["comunes"])
    ctx[2].owner.nombre = "Nuevo nombre del responsable"
    after = relation_options(ctx[2], view["comunes"])
    assert before["integrantes"] != after["integrantes"]
    assert snapshot == current_snapshot(ctx[2], slot, view["comunes"], slot["datos"])


def test_source_discrepancies_cannot_be_erased_to_remove_the_review_pending(documentation_context):
    ctx = documentation_context
    view = complete_forms(ctx)
    base = f"/proyectos/{ctx[2].id}/documentacion"
    original = "Dos fechas distintas; verificar el acta de inicio."
    common = dict(view["comunes"], inconsistencias_fuente=original)
    assert ctx[-1].put(base + "/comunes", json={"revision": 1, "datos": common}).status_code == 200
    response = ctx[-1].put(base + "/comunes", json={"revision": 2, "datos": dict(common, inconsistencias_fuente="")})
    assert response.status_code == 422
    assert "Conserva" in response.json()["detail"]
    after = ctx[-1].get(base).json()
    assert after["comunes"]["inconsistencias_fuente"] == original
    assert after["revision"] == 2
    assert any(item["campo"] == "comunes.aclaraciones_fuente" for item in after["revision_coherencia"])
    assert all(item["generable"] for item in after["documentos"])
    generated = ctx[-1].post(base + "/generar/acta_inicio", json={"revision": 1, "revision_comunes": 2})
    assert generated.status_code == 200
    assert ctx[-1].post(base + "/revisar/" + generated.json()["documento_id"], json={}).status_code == 422


def test_source_resolution_records_support_and_preserves_the_original(documentation_context):
    ctx = documentation_context
    view = complete_forms(ctx)
    base = f"/proyectos/{ctx[2].id}/documentacion"
    original = "Dos fechas distintas; verificar el acta de inicio."
    common = dict(view["comunes"], inconsistencias_fuente=original)
    assert ctx[-1].put(base + "/comunes", json={"revision": 1, "datos": common}).status_code == 200
    resolution = {"inconsistencia": original, "valor_confirmado": "La fecha confirmada es el 1 de marzo de 2026.",
                  "soporte": "Acta de inicio firmada, apartado 3, expediente del proyecto.",
                  "responsable": ctx[1].nombre, "fecha": "2026-06-30"}
    common["aclaraciones_fuente"] = [resolution]
    saved = ctx[-1].put(base + "/comunes", json={"revision": 2, "datos": common})
    assert saved.status_code == 200
    assert saved.json()["datos"]["inconsistencias_fuente"] == original
    assert saved.json()["datos"]["aclaraciones_fuente"] == [resolution]
    after = ctx[-1].get(base).json()
    assert not after["advertencias"]
    assert not any(item["campo"] in {"comunes.inconsistencias_fuente", "comunes.aclaraciones_fuente"} for item in after["revision_coherencia"])
    generated = ctx[-1].post(base + "/generar/acta_inicio", json={"revision": 1, "revision_comunes": 3})
    assert generated.status_code == 200
    reviewed = ctx[-1].post(base + "/revisar/" + generated.json()["documento_id"], json={"observacion": "Fecha contrastada con el acta referenciada."})
    assert reviewed.status_code == 200
    common["inconsistencias_fuente"] += "\nUna duración nueva sigue pendiente."
    assert ctx[-1].put(base + "/comunes", json={"revision": 3, "datos": common}).status_code == 200
    assert ctx[-1].get(base).json()["advertencias"]


@pytest.mark.parametrize("change", [
    {"inconsistencia": "Otro pendiente"}, {"valor_confirmado": ""}, {"soporte": ""}, {"fecha": ""},
])
def test_partial_or_unrelated_source_resolution_keeps_pending_and_generation_available(documentation_context, change):
    ctx = documentation_context
    view = complete_forms(ctx)
    base = f"/proyectos/{ctx[2].id}/documentacion"
    original = "Fecha pendiente de confirmar."
    resolution = dict(inconsistencia=original, valor_confirmado="Fecha 1 de marzo de 2026", soporte="Acta de inicio, página 2",
                      responsable=ctx[1].nombre, fecha="2026-06-30", **{})
    resolution.update(change)
    common = dict(view["comunes"], inconsistencias_fuente=original, aclaraciones_fuente=[resolution])
    saved = ctx[-1].put(base + "/comunes", json={"revision": 1, "datos": common})
    assert saved.status_code == 200
    after = ctx[-1].get(base).json()
    assert after["advertencias"]
    assert all(item["generable"] for item in after["documentos"])


def test_source_resolution_rejects_a_verifier_not_assigned_to_the_project(documentation_context):
    ctx = documentation_context
    view = complete_forms(ctx)
    original = "Fecha pendiente de confirmar."
    resolution = {"inconsistencia": original, "valor_confirmado": "Fecha 1 de marzo de 2026", "soporte": "Acta de inicio, página 2",
                  "responsable": "Persona ajena al proyecto", "fecha": "2026-06-30"}
    common = dict(view["comunes"], inconsistencias_fuente=original, aclaraciones_fuente=[resolution])
    response = ctx[-1].put(f"/proyectos/{ctx[2].id}/documentacion/comunes", json={"revision": 1, "datos": common})
    assert response.status_code == 422
    assert "responsable" in response.json()["detail"].lower()
    assert "equipo" in response.json()["detail"].lower()
    assert ctx[0].query(ProjectDocumentation).one().revision == 1


def test_legacy_resolution_requires_a_valid_date_and_exact_original():
    from app.services.source_resolution import source_is_resolved
    assert source_is_resolved({}) is True
    original = "Fecha pendiente de verificar."
    row = {"inconsistencia": original, "valor_confirmado": "1 de marzo", "soporte": "Acta de inicio", "responsable": "Investigadora", "fecha": "fecha ilegible"}
    assert source_is_resolved({"inconsistencias_fuente": original, "aclaraciones_fuente": [row]}) is False
    row["fecha"] = "2026-06-30"
    assert source_is_resolved({"inconsistencias_fuente": original, "aclaraciones_fuente": [row]}) is True


@pytest.mark.parametrize("rows", ["Dato sin estructura", {"soporte": "Acta"}, [None], ["Acta"], [False]])
def test_legacy_unstructured_source_resolution_keeps_review_pending(rows):
    from app.services.source_resolution import source_is_resolved
    assert source_is_resolved({"inconsistencias_fuente": "Una fecha sigue pendiente.", "aclaraciones_fuente": rows}) is False


@pytest.mark.parametrize("hour", ["25:00", "08:60", "8:00", "mañana", "08:00:00"])
def test_meeting_form_rejects_hours_outside_the_declared_format(documentation_context, hour):
    *_, client = documentation_context
    response = client.put(f"/proyectos/{documentation_context[2].id}/documentacion/borradores/acta_inicio",
                          json={"revision": 0, "datos": {"hora_inicio": hour}})
    assert response.status_code == 422
    assert "HH:MM" in response.json()["detail"]


def test_meeting_form_requires_end_after_start_and_accepts_midnight(documentation_context):
    *_, client = documentation_context
    endpoint = f"/proyectos/{documentation_context[2].id}/documentacion/borradores/acta_inicio"
    invalid = client.put(endpoint, json={"revision": 0, "datos": {"hora_inicio": "10:00", "hora_fin": "08:00"}})
    assert invalid.status_code == 422
    assert "hora final" in invalid.json()["detail"]
    valid = client.put(endpoint, json={"revision": 0, "datos": {"hora_inicio": "00:00", "hora_fin": "00:30"}})
    assert valid.status_code == 200
    assert valid.json()["datos"] == {"hora_inicio": "00:00", "hora_fin": "00:30"}


@pytest.mark.parametrize("change,field", [
    ({"periodo_desde": "2026-02-28"}, "periodo_desde"),
    ({"periodo_hasta": "2026-07-01"}, "periodo_hasta"),
    ({"periodo_desde": "2026-03-01", "periodo_hasta": "2026-04-30"}, "periodo_desde"),
])
def test_report_outside_project_or_assigned_bimester_cannot_generate(documentation_context, change, field):
    ctx = documentation_context
    view = complete_forms(ctx)
    base = f"/proyectos/{ctx[2].id}/documentacion"
    item = next(item for item in view["documentos"] if item["clave"] == "informe_bimensual__b2")
    changed = dict(item["datos"], **change)
    assert ctx[-1].put(base + "/borradores/" + item["clave"], json={"revision": 1, "datos": changed}).status_code == 200
    after = ctx[-1].get(base).json()
    report = next(item for item in after["documentos"] if item["clave"] == "informe_bimensual__b2")
    assert not report["generable"]
    assert any(pending["campo"] == field for pending in report["faltantes"])
    assert after["avance_documental"]["documentos_listos"] == after["avance_documental"]["documentos_totales"] - 1
    generated = ctx[-1].post(base + "/generar/" + report["clave"], json={"revision": 2, "revision_comunes": 1})
    assert generated.status_code == 422


def test_budget_mismatch_blocks_generation_but_source_notice_keeps_drafts_available(documentation_context):
    ctx = documentation_context
    view = complete_forms(ctx)
    base = f"/proyectos/{ctx[2].id}/documentacion"
    common = dict(view["comunes"], inconsistencias_fuente="Escenario propuesto pendiente de validación institucional.")
    assert ctx[-1].put(base + "/comunes", json={"revision": 1, "datos": common}).status_code == 200
    notice_view = ctx[-1].get(base).json()
    assert all(item["generable"] for item in notice_view["documentos"])
    assert notice_view["advertencias"]
    common["presupuesto"][0]["valor_planeado"] = "999"
    assert ctx[-1].put(base + "/comunes", json={"revision": 2, "datos": common}).status_code == 200
    inconsistent = ctx[-1].get(base).json()
    assert not any(item["generable"] for item in inconsistent["documentos"])
    assert inconsistent["avance_documental"]["documentos_listos"] == 0
    assert any("presupuesto" in pending["mensaje"] for pending in inconsistent["documentos"][0]["faltantes"])


def test_final_closure_requires_complete_period_and_a_confirmed_or_explained_balance(documentation_context):
    ctx = documentation_context
    view = complete_forms(ctx)
    common = ctx[0].query(ProjectDocumentation).one().datos
    draft = ctx[0].query(ProjectDocumentDraft).filter_by(clave="acta_cierre").one()
    slot = next(item for item in view["documentos"] if item["clave"] == "acta_cierre")
    data = dict(draft.datos, periodo_hasta="2026-05-31", fecha_reunion="2026-06-30")
    data["balance"] = [dict(data["balance"][0], valor_real="", observacion="")]
    pending = generation_pending(ctx[2], slot, common, data)
    assert {"periodo_hasta", "balance.0.valor_real"} <= {item["campo"] for item in pending}
    data["tipo_cierre"] = "parcial"
    data["balance"][0]["observacion"] = "El gasto del período está pendiente de conciliación con los soportes."
    assert not generation_pending(ctx[2], slot, common, data)


def test_closure_balance_and_meeting_date_must_agree_with_the_closed_period(documentation_context):
    ctx = documentation_context
    view = complete_forms(ctx)
    slot = next(item for item in view["documentos"] if item["clave"] == "acta_cierre")
    data = dict(slot["datos"], fecha_reunion="2026-06-29")
    data["balance"] = [dict(data["balance"][0], valor_planeado="999")]
    pending = generation_pending(ctx[2], slot, view["comunes"], data)
    assert {"fecha_reunion", "balance"} <= {item["campo"] for item in pending}
    data["fecha_reunion"] = "2026-07-01"
    data["balance"][0]["valor_planeado"] = "1000"
    assert generation_pending(ctx[2], slot, view["comunes"], data) == []


def test_bimester_boundaries_preserve_the_day_and_clip_the_last_project_month(documentation_context):
    ctx = documentation_context
    view = complete_forms(ctx)
    project = ctx[2]
    project.vigencia = 6
    common = dict(view["comunes"], fecha_inicio="2026-05-29", fecha_fin="2026-11-28")
    source = next(item for item in view["documentos"] if item["tipo"] == "informe_bimensual")
    periods = [("2026-05-29", "2026-07-28"), ("2026-07-29", "2026-09-28"), ("2026-09-29", "2026-11-28")]
    for index, (start, end) in enumerate(periods, 1):
        slot = dict(source, periodo_bimestre=index)
        data = dict(source["datos"], periodo_desde=start, periodo_hasta=end)
        assert generation_pending(project, slot, common, data) == []
    project.vigencia = 3
    common.update(fecha_inicio="2026-01-31", fecha_fin="2026-04-30")
    data = dict(source["datos"], periodo_desde="2026-03-31", periodo_hasta="2026-04-30")
    assert generation_pending(project, dict(source, periodo_bimestre=2), common, data) == []


def test_legacy_invalid_values_block_generation_with_a_readable_reason(documentation_context):
    ctx = documentation_context
    view = complete_forms(ctx)
    source = next(item for item in view["documentos"] if item["tipo"] == "acta_inicio")
    pending = generation_pending(ctx[2], source, view["comunes"], dict(source["datos"], hora_inicio="inválida"))
    assert pending and "HH:MM" in pending[0]["mensaje"]


def test_legacy_invalid_budget_keeps_the_editor_readable(documentation_context):
    ctx = documentation_context
    complete_forms(ctx)
    row = ctx[0].query(ProjectDocumentation).one()
    row.datos = dict(row.datos, presupuesto=[{"valor_planeado": "valor ilegible"}])
    ctx[0].commit()
    response = ctx[-1].get(f"/proyectos/{ctx[2].id}/documentacion")
    assert response.status_code == 200
    view = response.json()
    assert view["advertencias"]
    assert not any(item["generable"] for item in view["documentos"])


def test_renderer_revision_invalidates_artifacts_that_omitted_form_data(documentation_context):
    from types import SimpleNamespace

    ctx = documentation_context
    view = complete_forms(ctx)
    slot = next(item for item in view["documentos"] if item["tipo"] == "presentacion_proyecto")
    snapshot = current_snapshot(ctx[2], slot, view["comunes"], slot["datos"])
    assert snapshot["plantilla_version"] > 1
    legacy = SimpleNamespace(revision_comunes=view["revision"], revision_borrador=slot["revision"],
                             snapshot=dict(snapshot, plantilla_version=1))
    assert not version_is_current(legacy, snapshot, view["revision"], slot["revision"])
