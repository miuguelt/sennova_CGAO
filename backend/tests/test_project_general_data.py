"""Los datos generales se guardan al crear y se sugieren sin alterar proyectos existentes."""

import pytest
from fastapi.testclient import TestClient

from test_project_hierarchy import hierarchy_context, close_hierarchy_context
from app.auth import get_current_user
from app.config import get_settings
from app.documentation_models import ProjectDocumentation
from app.main import app
from app.models import Proyecto


@pytest.fixture
def context(monkeypatch):
    result = hierarchy_context()
    from app.middlewares import audit
    from sqlalchemy.orm import sessionmaker
    monkeypatch.setattr(audit, "SessionLocal", sessionmaker(bind=result[0]))
    yield result
    close_hierarchy_context(result)


def create_payload(context):
    return {
        "nombre": "Proyecto con datos generales",
        "semillero_id": str(context[7].id),
        "investigador_responsable_id": str(context[3].id),
    }


def test_creation_persists_general_data_in_same_transaction(context):
    client = TestClient(app)
    response = client.post("/proyectos", json=create_payload(context))
    assert response.status_code == 201, response.text
    project_id = response.json()["id"]
    row = context[1].query(ProjectDocumentation).filter_by(proyecto_id=project_id).one()
    assert row.datos == {
        "centro": "Centro de Gestión Agroempresarial del Oriente (CGAO) - Subsede Vélez",
        "regional": "Santander", "ciudad": "Vélez", "responsable": "Investigadora",
    }
    assert row.revision == 0 and str(row.updated_by) == str(context[2].id)
    view = client.get(f"/proyectos/{project_id}/documentacion").json()
    assert view["comunes"] == row.datos == view["datos_iniciales"]
    assert not {"codigo_cap", "fecha_inicio", "fecha_fin", "equipo", "programa_formacion"} & row.datos.keys()
    context[1].expire_all()
    assert client.get(f"/proyectos/{project_id}/documentacion").json()["comunes"] == row.datos


def test_creation_uses_configured_institution_and_actual_investigator(context, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "PROJECT_DEFAULT_CENTRO", " Otro centro ", raising=False)
    monkeypatch.setattr(settings, "PROJECT_DEFAULT_REGIONAL", " Otra regional ", raising=False)
    monkeypatch.setattr(settings, "PROJECT_DEFAULT_CIUDAD", " Otro municipio ", raising=False)
    app.dependency_overrides[get_current_user] = lambda: context[3]
    response = TestClient(app).post("/proyectos", json=create_payload(context))
    assert response.status_code == 201, response.text
    row = context[1].query(ProjectDocumentation).one()
    assert row.datos == {"centro": "Otro centro", "regional": "Otra regional", "ciudad": "Otro municipio", "responsable": "Investigadora"}
    assert str(row.updated_by) == str(context[3].id)


def test_invalid_creation_rolls_back_project_and_general_data(context):
    payload = create_payload(context)
    payload["equipo"] = [{"user_id": str(context[6].id)}]
    response = TestClient(app).post("/proyectos", json=payload)
    assert response.status_code == 422
    assert context[1].query(Proyecto).count() == 0
    assert context[1].query(ProjectDocumentation).count() == 0


def test_commit_failure_does_not_leave_project_or_general_data(context, monkeypatch):
    from sqlalchemy.exc import SQLAlchemyError

    def unavailable_commit():
        raise SQLAlchemyError("Persistencia no disponible en la prueba")

    monkeypatch.setattr(context[1], "commit", unavailable_commit)
    response = TestClient(app, raise_server_exceptions=False).post("/proyectos", json=create_payload(context))
    assert response.status_code == 503
    assert context[1].query(Proyecto).count() == 0
    assert context[1].query(ProjectDocumentation).count() == 0


def test_read_suggests_defaults_without_changing_existing_data(context):
    db = context[1]
    project = Proyecto(nombre="Proyecto existente", owner_id=context[3].id)
    db.add(project)
    db.commit()
    client = TestClient(app)
    url = f"/proyectos/{project.id}/documentacion"
    first = client.get(url).json()
    assert first["comunes"] == {} and first["revision"] == 0
    assert first["datos_iniciales"]["responsable"] == context[3].nombre
    assert db.query(ProjectDocumentation).count() == 0
    saved = {"centro": "Centro confirmado", "ciudad": "Otra ciudad", "responsable": "Responsable documentado", "codigo_cap": "CAP-01"}
    assert client.put(url + "/comunes", json={"revision": 0, "datos": saved}).status_code == 200
    second = client.get(url).json()
    assert second["comunes"] == saved and second["revision"] == 1
    assert second["datos_iniciales"]["centro"] != saved["centro"]


def test_general_defaults_omit_unconfigured_values_and_missing_owner(context, monkeypatch):
    from app.services.project_general_data import general_project_data
    from types import SimpleNamespace

    for field in ("PROJECT_DEFAULT_CENTRO", "PROJECT_DEFAULT_REGIONAL", "PROJECT_DEFAULT_CIUDAD"):
        monkeypatch.setattr(get_settings(), field, " ", raising=False)
    assert general_project_data(SimpleNamespace(owner=None)) == {}
    assert general_project_data(SimpleNamespace(owner=SimpleNamespace(nombre=" "))) == {}
    assert general_project_data(SimpleNamespace(owner=SimpleNamespace(nombre=" Responsable "))) == {"responsable": "Responsable"}


def test_institution_defaults_can_be_configured_from_environment(monkeypatch):
    import secrets
    from app.config import Settings

    expected = {"PROJECT_DEFAULT_CENTRO": "Centro configurado", "PROJECT_DEFAULT_REGIONAL": "Regional configurada", "PROJECT_DEFAULT_CIUDAD": "Municipio configurado"}
    for key, value in expected.items():
        monkeypatch.setenv(key, value)
    settings = Settings(_env_file=None, DEBUG=True, DATABASE_URL="sqlite://", JWT_SECRET=secrets.token_urlsafe(48))
    assert {key: getattr(settings, key) for key in expected} == expected


def test_import_creation_also_persists_general_data(context, monkeypatch, tmp_path):
    from test_proyecto_import import sample_formulation
    from app.routers import proyectos

    monkeypatch.setattr(proyectos, "FORMULATION_STORAGE_DIR", tmp_path)
    import json
    response = TestClient(app).post("/proyectos/importar-formulacion", data={"proyecto": json.dumps(create_payload(context))},
                                    files={"file": ("formulacion.docx", sample_formulation(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
    assert response.status_code == 201, response.text
    row = context[1].query(ProjectDocumentation).one()
    assert row.datos["ciudad"] == "Vélez" and row.datos["responsable"] == context[3].nombre
    assert list(tmp_path.glob("*.docx"))
