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
