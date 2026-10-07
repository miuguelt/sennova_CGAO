"""Relaciones de planeación observables, sin acreditar calidad ni aprobación."""

from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas import ProyectoCreate, ProyectoUpdate
from app.services.documentation_catalog import COMMON_FIELDS, FORMULATION_FIELDS
from app.services.documentation_validation import validate_fields


def project():
    return SimpleNamespace(
        objetivos_especificos=["Caracterizar residuos", "Validar rendimiento"],
        owner=SimpleNamespace(nombre="Investigadora líder"),
        equipo=[SimpleNamespace(nombre="Analista de campo")],
    )


def common():
    return {
        "fecha_inicio": "2026-01-01", "fecha_fin": "2026-06-30",
        "equipo": [{"nombre": "Apoyo documental", "rol": "Muestreo", "actividades": "Recolectar datos"}],
        "cronograma": [{"actividad": "Caracterizar lotes", "objetivo_especifico": "Caracterizar residuos",
                        "encargado": "Analista de campo", "fecha_inicio": "2026-02-01", "fecha_fin": "2026-02-28",
                        "resultado": "Caracterización documentada"}],
        "presupuesto": [{"rubro": "Materiales", "valor_planeado": 100, "uso": "Pruebas",
                         "fecha_ejecucion": "Mes 2", "actividad_relacionada": "Caracterizar lotes"}],
    }


def results():
    return {"resultados_esperados": [{"resultado": "Caracterización documentada", "objetivo_especifico": "Caracterizar residuos",
                                      "indicador": "Lotes caracterizados", "meta": "1", "unidad": "lotes",
                                      "medio_verificacion": "Informe de caracterización"}]}


def test_new_projects_start_in_formulation_without_assumed_duration():
    value = ProyectoCreate(nombre="Proyecto en construcción", semillero_id=uuid4())
    assert value.estado == "En formulación"
    assert value.vigencia is None
    assert ProyectoCreate(nombre="Proyecto vigente", semillero_id=uuid4(), estado="Aprobado", vigencia=6).estado == "Aprobado"
    assert ProyectoCreate(nombre="Proyecto anterior", semillero_id=uuid4(), estado="Formulación").estado == "Formulación"


@pytest.mark.parametrize("duration", [0, -1, 61, 1.5, True])
def test_project_duration_rejects_unconfirmed_or_out_of_range_values(duration):
    with pytest.raises(ValidationError):
        ProyectoCreate(nombre="Proyecto", semillero_id=uuid4(), vigencia=duration)
    with pytest.raises(ValidationError):
        ProyectoUpdate(vigencia=duration)


def test_optional_relationship_fields_preserve_old_and_new_data():
    values = validate_fields(common(), COMMON_FIELDS)
    assert values["cronograma"][0]["objetivo_especifico"] == "Caracterizar residuos"
    assert values["presupuesto"][0]["actividad_relacionada"] == "Caracterizar lotes"
    assert validate_fields(results(), FORMULATION_FIELDS)["resultados_esperados"][0]["objetivo_especifico"] == "Caracterizar residuos"
    old = common()
    del old["cronograma"][0]["objetivo_especifico"]
    del old["presupuesto"][0]["actividad_relacionada"]
    assert "objetivo_especifico" not in validate_fields(old, COMMON_FIELDS)["cronograma"][0]


def test_relation_options_use_only_existing_objectives_activities_and_named_members():
    from app.services.formulation_coherence import relation_options
    values = common()
    values["equipo"].append({"nombre": "  Analista de campo  "})
    assert relation_options(project(), values) == {
        "objetivos": ["Caracterizar residuos", "Validar rendimiento"],
        "integrantes": ["Investigadora líder", "Analista de campo", "Apoyo documental"],
        "actividades": ["Caracterizar lotes"],
    }
    assert relation_options(SimpleNamespace(), {}) == {"objetivos": [], "integrantes": [], "actividades": []}


def test_coherence_links_cover_objectives_without_changing_the_inputs():
    from app.services.formulation_coherence import coherence_review
    values, formulation = common(), results()
    review = coherence_review(project(), values, formulation)
    assert any(item["campo"] == "proyecto.objetivos_especificos.1" and item["paso"] == "objetivos" for item in review)
    assert not any(item["nivel"] == "advertencia" for item in review)
    assert values == common()
    assert formulation == results()
    complete_project = project()
    complete_project.objetivos_especificos = ["Caracterizar residuos"]
    assert coherence_review(complete_project, values, formulation) == []


def test_missing_and_unknown_links_are_actionable_with_exact_field_paths():
    from app.services.formulation_coherence import coherence_review
    values, formulation = common(), results()
    values["cronograma"][0].update(objetivo_especifico="Objetivo ajeno", encargado="Persona no asignada", fecha_inicio="2025-12-30")
    values["presupuesto"][0]["actividad_relacionada"] = "Actividad ajena"
    formulation["resultados_esperados"][0].update(objetivo_especifico="Objetivo ajeno", indicador="", meta="", unidad="", medio_verificacion="")
    review = coherence_review(project(), values, formulation)
    paths = {item["campo"] for item in review}
    assert {"comunes.cronograma.0.objetivo_especifico", "comunes.cronograma.0.encargado", "comunes.cronograma.0.fecha_inicio",
            "comunes.presupuesto.0.actividad_relacionada", "formulacion.resultados_esperados.0.objetivo_especifico",
            "formulacion.resultados_esperados.0.medio_verificacion"} <= paths
    assert all(set(item) == {"campo", "mensaje", "paso", "nivel"} for item in review)
    assert all(item["mensaje"] and item["nivel"] in {"orientacion", "advertencia"} for item in review)
    assert any(item["nivel"] == "advertencia" for item in review)


def test_missing_links_are_orientations_and_support_zero_meta():
    from app.services.formulation_coherence import coherence_review
    values, formulation = common(), results()
    values["cronograma"][0].update(objetivo_especifico="", encargado="", resultado="")
    values["presupuesto"][0]["actividad_relacionada"] = ""
    formulation["resultados_esperados"][0].update(objetivo_especifico="", meta=0)
    review = coherence_review(project(), values, formulation)
    assert all(item["nivel"] == "orientacion" for item in review)
    assert not any(item["campo"].endswith(".meta") for item in review)
    assert any(item["campo"] == "comunes.cronograma.0.resultado" for item in review)


def test_unknown_dates_and_descriptive_periods_are_never_invented():
    from app.services.formulation_coherence import coherence_review
    values = common()
    values["cronograma"][0].update(fecha_inicio="dato pendiente", fecha_fin="", fecha_textual="Mes 8")
    review = coherence_review(project(), values, results())
    assert not any("fecha_" in item["campo"] for item in review)
    assert values["cronograma"][0]["fecha_textual"] == "Mes 8"


def test_sources_and_budget_discrepancies_remain_visible_and_targeted():
    from app.services.formulation_coherence import coherence_review
    values = common()
    values["inconsistencias_fuente"] = "Dos fechas distintas; revisar acta firmada."
    subject = project()
    subject.presupuesto_total = 200
    review = coherence_review(subject, values, results())
    assert any(item["campo"] == "comunes.inconsistencias_fuente" and "soporte" in item["mensaje"] for item in review)
    assert any(item["campo"] == "comunes.presupuesto" for item in review)
    assert values["inconsistencias_fuente"] == "Dos fechas distintas; revisar acta firmada."


def test_blank_legacy_objectives_do_not_invent_a_relationship_or_approval():
    from app.services.formulation_coherence import coherence_review
    subject = project()
    subject.objetivos_especificos = ["  ", "Caracterizar residuos"]
    review = coherence_review(subject, common(), results())
    assert review == []
    assert subject.objetivos_especificos[0] == "  "
