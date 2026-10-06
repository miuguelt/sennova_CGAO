"""Pruebas unitarias para la ruta guiada y endpoints de formulación de proyectos."""

import io
import os
import secrets
import zipfile
from decimal import Decimal
from xml.sax.saxutils import escape

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET", secrets.token_urlsafe(48))

from app.auth import get_current_user
from app.config import get_settings
from app.database import get_db
from app.main import app
from app.models import Base, Producto, Proyecto, User
from app.services.documentation_catalog import COMMON_FIELDS
from app.services.formulation_route import (
    _blank,
    _budget_warning,
    _cop,
    _project_pending,
    _section_pending,
    formulation_route,
    project_values,
)


def _make_test_docx(rows):
    table_rows = []
    for row in rows:
        cells = "".join(
            f"<w:tc><w:p><w:r><w:t>{escape(cell)}</w:t></w:r></w:p></w:tc>" for cell in row
        )
        table_rows.append(f"<w:tr>{cells}</w:tr>")
    body = (
        "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>"
        "<w:document xmlns:w='http://schemas.openxmlformats.org/wordprocessingml/2006/main'>"
        f"<w:body><w:tbl>{''.join(table_rows)}</w:tbl></w:body></w:document>"
    )
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as arc:
        arc.writestr("[Content_Types].xml", "<Types/>")
        arc.writestr("word/document.xml", body)
    return buf.getvalue()


@pytest.fixture
def formulation_env(tmp_path, monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    db = factory()
    from app.middlewares import audit
    monkeypatch.setattr(audit, "SessionLocal", factory)
    user = User(
        email="investigador.formulacion@sena.edu.co",
        nombre="Investigador Líder",
        password_hash="secret",
        rol="investigador",
    )
    db.add(user)
    db.flush()
    project = Proyecto(
        nombre="Proyecto Biocombustibles 2026",
        codigo_sgps="SGPS-2026-01",
        owner_id=user.id,
        vigencia=12,
        presupuesto_total=50000000,
        objetivo_general="Desarrollar biocombustible a partir de residuos",
        objetivos_especificos=["Caracterizar residuos", "Estandarizar proceso", "Validar rendimiento"],
    )
    db.add(project)
    db.commit()
    monkeypatch.setattr(get_settings(), "STORAGE_DIR", str(tmp_path))
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    client = TestClient(app, raise_server_exceptions=False)
    yield db, user, project, client
    app.dependency_overrides.clear()
    db.close()
    engine.dispose()


def test_formulation_route_helpers():
    assert _blank(None) is True
    assert _blank("") is True
    assert _blank([]) is True
    assert _blank("valor") is False
    assert _blank([1, 2]) is False
    assert _cop(Decimal(1500000)) == "$ 1.500.000 COP"

    class MockProject:
        nombre = "Proyecto Alfa"
        objetivo_general = "Objetivo Alfa"
        objetivos_especificos = ["Específico 1", "  ", "Específico 2"]
        vigencia = 6
        presupuesto_total = 10000000

    vals = project_values(MockProject())
    assert vals["nombre"] == "Proyecto Alfa"
    assert "Específico 1\nEspecífico 2" == vals["objetivos_especificos"]

    empty_proj = MockProject()
    empty_proj.nombre = None
    empty_proj.objetivo_general = None
    empty_proj.objetivos_especificos = None
    empty_proj.vigencia = None
    empty_proj.presupuesto_total = None
    empty_vals = project_values(empty_proj)
    assert empty_vals["nombre"] == ""

    proj = MockProject()
    common_ok = {"presupuesto": [{"valor_planeado": 5000000}, {"valor_planeado": 5000000}]}
    assert _budget_warning(proj, common_ok) == []

    common_diff = {"presupuesto": [{"valor_planeado": 4000000}]}
    diff_warn = _budget_warning(proj, common_diff)
    assert len(diff_warn) == 1
    assert "no coincide" in diff_warn[0] or "desglose suma" in diff_warn[0]

    common_invalid = {"presupuesto": [{"valor_planeado": "no-es-numero"}]}
    invalid_warn = _budget_warning(proj, common_invalid)
    assert len(invalid_warn) == 1
    assert "no numéricos" in invalid_warn[0]
    assert invalid_warn[0].startswith("Revisa")
    assert _project_pending({}, ["nombre"])[0].startswith("Completa")

    assert _budget_warning(proj, {}) == []
    empty_proj.presupuesto_total = None
    assert _budget_warning(empty_proj, common_ok) == []


def test_formulation_route_calculation(formulation_env):
    db, user, project, client = formulation_env
    route = formulation_route(project, {}, {})
    assert route["total"] == 10
    assert route["pasos"][0]["id"] == "identificacion"
    assert route["pasos"][0]["completo"] is True
    assert route["porcentaje"] > 0
    assert route["siguiente_paso"] is not None

    # Probar con slot generable y con versión vigente en historial
    slot_generable = {"generable": True, "historial": []}
    route_gen = formulation_route(project, {}, slot_generable)
    assert "Genera la formulación" in route_gen["pasos"][9]["faltantes"][0]

    slot_vigente = {"generable": True, "historial": [{"vigente": True}]}
    route_vig = formulation_route(project, {}, slot_vigente)
    assert route_vig["pasos"][9]["completo"] is True


def test_formulation_route_follows_the_reference_project_sequence_and_groups_fields(formulation_env):
    _db, _user, project, _client = formulation_env

    route = formulation_route(project, {}, {})
    steps = route["pasos"]

    assert [step["id"] for step in steps] == [
        "identificacion", "institucional", "problema", "objetivos", "marco",
        "metodologia", "resultados", "recursos", "referencias", "generar",
    ]
    assert route["total"] == 10
    assert [step["proposito"].split()[0] for step in steps] == [
        "Identifica", "Completa", "Construye", "Convierte", "Sustenta",
        "Describe", "Formula", "Conecta", "Cierra", "Revisa",
    ]
    assert steps[2]["campos"] == ["introduccion", "contexto", "planteamiento_problema", "justificacion"]
    assert steps[3]["campos"] == ["objetivo_general", "objetivos_especificos"]
    assert steps[6]["campos"] == ["resultados_esperados", "impactos", "conclusiones"]
    assert steps[7]["campos"] == ["presupuesto", "cronograma"]
    assert steps[8]["campos"] == ["referencias"]

    for step in steps[:-1]:
        grouped_fields = [field for block in step["bloques"] for field in block["campos"]]
        assert grouped_fields == step["campos"]

    training_fields = {
        "nivel_formacion", "programa_formacion", "competencia",
        "resultados_aprendizaje", "fase_proyecto_formativo",
        "categoria_proyecto", "area_investigacion",
    }
    team_field = next(field for field in COMMON_FIELDS if field["key"] == "equipo")
    author_fields = {"identificacion", "correo_contacto", "telefono_contacto"}
    assert author_fields <= {field["key"] for field in team_field["columns"]}
    assert all(not field["required"] for field in team_field["columns"] if field["key"] in author_fields)
    assert "autoría y contacto" in team_field["details_label"].lower()
    assert "autorización" in team_field["details_help"].lower()
    institutional = steps[1]
    metadata_block = next(block for block in institutional["bloques"] if block["id"] == "formacion-convocatoria")
    assert training_fields <= set(metadata_block["campos"])
    assert training_fields <= set(institutional["campos"])
    assert all(not field["required"] for field in COMMON_FIELDS if field["key"] in training_fields)


def test_optional_cap14_metadata_does_not_block_institutional_step(formulation_env):
    _db, _user, project, _client = formulation_env
    common = {
        "centro": "Centro de formación",
        "regional": "Regional de prueba",
        "ciudad": "Municipio de prueba",
        "responsable": "Responsable de prueba",
        "fecha_inicio": "2026-01-01",
        "fecha_fin": "2026-12-31",
        "equipo": [{"nombre": "Investigador de prueba", "rol": "Investigación", "actividades": "Coordinar el estudio"}],
        "presupuesto": [{"rubro": "Materiales", "valor_planeado": 50000000, "uso": "Pruebas del proyecto", "fecha_ejecucion": "Mes 1"}],
        "cronograma": [{"actividad": "Caracterizar el proceso", "encargado": "Investigador de prueba", "fecha_textual": "Mes 1", "resultado": "Caracterización documentada"}],
    }

    route = formulation_route(project, common, {})
    institutional = next(step for step in route["pasos"] if step["id"] == "institucional")

    assert institutional["completo"] is True
    assert institutional["faltantes"] == []



def test_update_identification_endpoint(formulation_env):
    db, user, project, client = formulation_env
    payload = {
        "nombre": "Proyecto Actualizado V2",
        "objetivo_general": "Nuevo objetivo general para el proyecto",
        "objetivos_especificos": "Primer objetivo\nSegundo objetivo",
        "vigencia": 18,
        "presupuesto_total": 75000000,
    }
    resp = client.put(f"/proyectos/{project.id}/documentacion/identificacion", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["proyecto"]["nombre"] == "Proyecto Actualizado V2"
    assert len(data["proyecto"]["objetivos_especificos"]) == 2

    # Probar con lista en objetivos_especificos
    payload_list = {"objetivos_especificos": ["Obj A", "Obj B"]}
    resp_list = client.put(f"/proyectos/{project.id}/documentacion/identificacion", json=payload_list)
    assert resp_list.status_code == 200


def test_analyze_formulation_file_endpoint(formulation_env):
    db, user, project, client = formulation_env
    # Archivo inválido (no docx)
    resp_bad = client.post(
        f"/proyectos/{project.id}/documentacion/analizar-formato",
        files={"archivo": ("datos.pdf", b"%PDF-1.4", "application/pdf")},
    )
    assert resp_bad.status_code == 400
    assert "docx" in resp_bad.json()["detail"].lower()

    # Archivo docx válido
    docx_bytes = _make_test_docx([
        ["Título del Proyecto", "Cultivo sostenible de microalgas"],
        ["5. Objetivos", "Objetivo General: Desarrollar cultivo controlado\nObjetivos Específicos: Diseñar fotobiorreactor de bajo costo"],
        ["2. Introducción", "Introducción detallada sobre microalgas"],
        ["3. Planteamiento del problema", "Falta de alternativas energéticas limpias"],
    ])
    resp_ok = client.post(
        f"/proyectos/{project.id}/documentacion/analizar-formato",
        files={"archivo": ("formato_cap.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    assert resp_ok.status_code == 200
    res_data = resp_ok.json()
    assert "borrador" in res_data
    assert "proyecto" in res_data
    assert "campos_detectados" in res_data


def test_apply_formulation_endpoint(formulation_env):
    db, user, project, client = formulation_env
    payload = {
        "proyecto": {
            "nombre": "Proyecto Aplicado desde Formato",
            "objetivo_general": "Implementar biorreactor automatizado",
            "objetivos_especificos": "Probar sensores\nMonitorear pH",
        },
        "borrador": {
            "introduccion": "Texto de introducción aplicado con éxito",
            "planteamiento_problema": "Descripción del problema validada",
        },
    }
    resp = client.post(f"/proyectos/{project.id}/documentacion/aplicar-formato", json=payload)
    assert resp.status_code == 200
    result = resp.json()
    assert result["proyecto"]["nombre"] == "Proyecto Aplicado desde Formato"
    formulation_doc = next(d for d in result["documentos"] if d["clave"] == "formulacion_proyecto")
    assert formulation_doc["datos"]["introduccion"] == "Texto de introducción aplicado con éxito"

def test_recommendation_endpoint(formulation_env):
    db, user, project, client = formulation_env
    payload = {
        "campo": "planteamiento_problema",
        "texto": "Es un problema muy grave."
    }
    resp = client.post(f"/proyectos/{project.id}/documentacion/recomendar", json=payload)
    assert resp.status_code == 200
    res_data = resp.json()
    assert "recomendaciones" in res_data
    assert len(res_data["recomendaciones"]) > 0
    assert any("breve" in rec.lower() for rec in res_data["recomendaciones"])

    payload_empty = {
        "campo": "cualquier_otro",
        "texto": ""
    }
    resp_empty = client.post(f"/proyectos/{project.id}/documentacion/recomendar", json=payload_empty)
    assert resp_empty.status_code == 200
    assert "Ingresa algo de texto" in resp_empty.json()["recomendaciones"][0]

