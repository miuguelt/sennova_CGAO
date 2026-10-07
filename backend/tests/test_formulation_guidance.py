"""Comportamiento de las orientaciones heurísticas de formulación."""

import time

import pytest

from app.services.formulation_ai_service import get_field_recommendations


def test_recommendations_are_immediate_methodological_guidance(monkeypatch):
    def unexpected_delay(*_args, **_kwargs):
        pytest.fail("Las recomendaciones locales no deben simular una llamada a IA.")

    monkeypatch.setattr(time, "sleep", unexpected_delay)

    tips = get_field_recommendations("planteamiento_problema", "Texto breve sin contexto")

    assert len(tips) == 3
    assert "contexto" in tips[0]
    assert "formación profesional" in tips[1]
    assert "pregunta de investigación" in tips[2]


def test_recommendations_for_empty_objective_explain_how_to_continue():
    tips = get_field_recommendations("objetivo_general", "")

    assert len(tips) == 2
    assert "verbo en infinitivo" in tips[0]
    assert "propósito" in tips[1]


@pytest.mark.parametrize("field", ["objetivo_general", "objetivos_especificos", "objetivo_especifico"])
@pytest.mark.parametrize("text", ["", "   ", "\n\t"])
def test_blank_objectives_receive_guidance_without_internal_errors(field, text):
    tips = get_field_recommendations(field, text)
    assert "verbo en infinitivo" in tips[0]
    assert any("propósito" in tip for tip in tips)


@pytest.mark.parametrize("field", [
    "introduccion", "contexto", "referente_teorico", "marco_normativo", "poblacion_muestra",
    "tecnicas_recoleccion", "fases", "resultados_esperados", "impactos", "conclusiones", "referencias",
])
@pytest.mark.parametrize("text", ["xyz", "  "])
def test_guidance_is_specific_and_never_certifies_text_quality(field, text):
    tips = get_field_recommendations(field, text)
    assert tips
    joined = " ".join(tips).lower()
    assert "buena estructura" not in joined
    assert "la ia" not in joined
    assert "orientación" in joined
    assert "validación" in joined
    assert get_field_recommendations(field, text) != get_field_recommendations("campo_desconocido", text)


def test_rules_normalize_case_and_whitespace_and_keep_the_input():
    text = "  SENA FORMACIÓN: contexto detallado " + ("información " * 12) + "¿Qué investigar?  "
    original = text
    tips = get_field_recommendations("planteamiento_problema", text)
    assert text == original
    assert all("Recuerda articular" not in tip for tip in tips)
    assert all("buena estructura" not in tip for tip in tips)


@pytest.mark.parametrize("field,text,expected", [
    ("justificacion", "xyz", "beneficios"),
    ("justificacion", "Un impacto esperado " * 10, "pertinente"),
    ("objetivo_general", "Conocimiento para el territorio", "infinitivo"),
    ("objetivo_general", "Desarrollar una herramienta para apoyar proyectos", "resultado principal"),
    ("metodologia", "Una propuesta inicial", "fases"),
    ("metodologia", "Fase de diagnóstico y fase de análisis", "instrumentos"),
    ("campo_desconocido", "Contenido por revisar", "no cuenta con una regla específica"),
])
def test_local_rules_offer_next_steps_for_each_observed_condition(field, text, expected):
    tips = get_field_recommendations(field, text)
    assert any(expected in tip for tip in tips)
    assert all("buena estructura" not in tip for tip in tips)
