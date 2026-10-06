"""Ayudas específicas visibles desde el catálogo de documentación persistida."""

import os
import secrets

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET", secrets.token_urlsafe(32))

from app.documentation_models import ProjectDocumentation, ProjectDocumentDraft, ProjectDocumentVersion
from app.models import Base, Documento, Proyecto, User
from app.services.documentation_catalog import (
    ATTENDEE_FIELDS, COMMON_FIELDS, FORMULATION_FIELDS, MEETING_FIELDS, RESULT_FIELDS,
)
from app.services.documentation_state import documentation_view
from app.services.documentation_validation import missing_fields, normalize_value


def test_all_shared_catalog_fields_and_columns_have_specific_instructions():
    for fields in (COMMON_FIELDS, FORMULATION_FIELDS, MEETING_FIELDS, RESULT_FIELDS, ATTENDEE_FIELDS):
        for field in fields:
            for entry in [field, *field.get("columns", [])]:
                assert entry["help"] != f"Registra {entry['label'].lower()} con información verificable del proyecto."
                assert len(entry["help"]) > 35
                assert "default" not in entry


def test_guidance_distinguishes_project_problem_design_planned_targets_and_verified_results():
    formulation = {field["key"]: field for field in FORMULATION_FIELDS}
    reports = {field["key"]: field for field in RESULT_FIELDS}
    expected = {
        "contexto": ("territorio", "población"), "planteamiento_problema": ("causas", "consecuencias"),
        "justificacion": ("beneficios", "pertinencia"), "metodologia": ("enfoque", "procedimiento"),
        "poblacion_muestra": ("selección", "criterios"), "tecnicas_recoleccion": ("instrumentos", "datos"),
        "fases": ("actividades", "entregables"), "impactos": ("esperados", "evidencia"),
        "marco_normativo": ("fuente", "vigencia"), "referencias": ("autor", "año"),
    }
    for key, words in expected.items():
        assert all(word in formulation[key]["help"].lower() for word in words)
    columns = {field["key"]: field for field in reports["resultados"]["columns"]}
    assert "planeada" in columns["meta"]["help"]
    assert "alcanzada" in columns["logro"]["help"]
    assert "misma unidad" in columns["logro"]["help"]
    assert "no existe" in columns["evidencia"]["help"].lower()
    assert reports["antecedentes"]["help"] != formulation["planteamiento_problema"]["help"]
    assert reports["metodologia"]["help"] != formulation["metodologia"]["help"]
    assert "decisiones" in next(field for field in MEETING_FIELDS if field["key"] == "objetivo_reunion")["help"]


def test_documentation_view_exposes_specific_shared_guidance_without_creating_documents():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine)() as db:
        owner = User(email="guidance@example.com", nombre="Equipo sintético", password_hash="example", rol="investigador")
        db.add(owner)
        db.flush()
        project = Proyecto(nombre="Proyecto sintético de orientación", owner_id=owner.id,
                           vigencia=2, objetivo_general="Organizar documentos")
        db.add(project)
        db.commit()
        view = documentation_view(project, db)
        common = {field["key"]: field for field in view["campos_comunes"]}
        assert "rubros" in common["presupuesto"]["help"].lower()
        assert "roles" in common["equipo"]["help"].lower()
        formulation = next(item for item in view["documentos"] if item["tipo"] == "formulacion_proyecto")
        report = next(item for item in view["documentos"] if item["tipo"] == "informe_bimensual")
        assert formulation["campos"] == list(FORMULATION_FIELDS)
        assert all(field in report["campos"] for field in RESULT_FIELDS)
        assert all(item["revision"] == 0 for item in view["documentos"])
        assert view["revision"] == 0 and view["comunes"] == {}
        assert all(db.query(model).count() == 0 for model in
                   (ProjectDocumentation, ProjectDocumentDraft, ProjectDocumentVersion, Documento))
    engine.dispose()


def test_form_validation_feedback_addresses_the_researcher_as_tu():
    with pytest.raises(HTTPException) as invalid_number:
        normalize_value("sin cifra", {"key": "presupuesto", "label": "Presupuesto", "type": "number"}, "Formulario")
    assert "ingresa un número válido" in invalid_number.value.detail

    pending = missing_fields({}, [{"key": "nombre", "label": "Nombre del proyecto", "required": True, "type": "text"}])
    assert pending[0]["mensaje"] == "Completa nombre del proyecto."
