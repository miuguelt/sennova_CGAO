import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup test DB
from db_support import db_path_for, sqlite_url_for

TEST_DB_FILE = db_path_for("test_proyectos_crud.db")
TEST_DB_URL = sqlite_url_for(TEST_DB_FILE)
if os.path.exists(TEST_DB_FILE):
    try:
        os.remove(TEST_DB_FILE)
    except Exception:
        pass

os.environ["DATABASE_URL"] = TEST_DB_URL
os.environ["JWT_SECRET"] = "testsecretkey_long_enough_for_security_compliance_32_chars"

from app.database import Base, get_db
from app.main import app
from app.models import User
from app.auth import get_current_user

engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

# Mock admin user
mock_user = User(
    id="11111111-1111-1111-1111-111111111111",
    email="admin_proyectos@sena.edu.co",
    nombre="Admin Proyectos Test",
    rol="admin",
    is_active=True
)

def override_get_current_user():
    return mock_user

@pytest.fixture(autouse=True)
def setup_overrides():
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    yield
    app.dependency_overrides.clear()

client = TestClient(app)


def test_proyecto_crud_and_temporal_fields():
    # 1. Create a project
    payload = {
        "nombre": "Proyecto Innovación Robótica SENNOVA",
        "nombre_corto": "PIR-SENNOVA",
        "codigo_sgps": "SGPS-2026-999",
        "estado": "Formulación",
        "vigencia": 12,
        "presupuesto_total": 45000000,
        "tipologia": "Innovación",
        "linea_investigacion": "Sistemas Inteligentes",
        "descripcion": "Proyecto de prueba para validar campos temporales.",
        "año": 2026,
        "año_fin": 2026,
        "continua_siguiente_año": False,
        "presupuesto_detallado": {"personal": 20000000, "materiales": 25000000}
    }
    
    response = client.post("/proyectos", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()
    
    assert data["nombre"] == payload["nombre"]
    assert data["estado"] == "Formulación"
    assert data["año"] == 2026
    assert data["año_fin"] == 2026
    assert data["continua_siguiente_año"] is False
    proyecto_id = data["id"]

    # 2. Get detail
    response_get = client.get(f"/proyectos/{proyecto_id}")
    assert response_get.status_code == 200
    data_get = response_get.json()
    assert data_get["año"] == 2026
    assert data_get["estado"] == "Formulación"

    # 3. List projects
    response_list = client.get("/proyectos")
    assert response_list.status_code == 200
    proyectos = response_list.json()
    assert any(p["id"] == proyecto_id and p["año"] == 2026 for p in proyectos)

    # 4. Generate budget template
    response_budget = client.post(f"/proyectos/{proyecto_id}/generate-budget-template")
    assert response_budget.status_code == 200
    assert response_budget.json() == {"status": "template_generated", "items_count": 8}

    response_budget_detail = client.get(f"/proyectos/{proyecto_id}")
    assert response_budget_detail.status_code == 200
    assert [
        item["item"] for item in response_budget_detail.json()["presupuesto_detallado"]["items"]
    ] == [
        "Servicios personales instructores del área administrativa",
        "Servicios personales indirectos (sin ser roles SENNOVA), operador logístico evento EDT",
        "Materiales de formación",
        "Mantenimiento",
        "Equipos sistemas",
        "Viáticos a la formación profesional",
        "Bienestar alumnos",
        "Ediciones e impresos",
    ]


def test_proyecto_move_and_reassign_semillero():
    # 0. Create Grupo
    g_payload = {
        "nombre": "Grupo de Investigación SENNOVA CGAO",
        "codigo_gruplac": "COL0001234",
        "clasificacion": "A1"
    }
    r_g = client.post("/grupos", json=g_payload)
    assert r_g.status_code == 201, r_g.text
    grupo_id = r_g.json()["id"]

    # 1. Create Semillero 1
    sem1_payload = {
        "nombre": "Semillero de Robótica e IA",
        "sigla": "SRIA",
        "linea_investigacion": "Sistemas Inteligentes",
        "estado": "Activo",
        "grupo_id": grupo_id
    }
    r_s1 = client.post("/semilleros", json=sem1_payload)
    assert r_s1.status_code == 201, r_s1.text
    sem1_id = r_s1.json()["id"]

    # 2. Create Semillero 2
    sem2_payload = {
        "nombre": "Semillero de Biotecnología y Agro",
        "sigla": "SBA",
        "linea_investigacion": "Biotecnología",
        "estado": "Activo",
        "grupo_id": grupo_id
    }
    r_s2 = client.post("/semilleros", json=sem2_payload)
    assert r_s2.status_code == 201, r_s2.text
    sem2_id = r_s2.json()["id"]

    # 3. Create Project assigned to Semillero 1
    proy_payload = {
        "nombre": "Dron Autónomo para Monitoreo de Cultivos",
        "nombre_corto": "DAMC",
        "codigo_sgps": "SGPS-2026-DRON",
        "estado": "Formulación",
        "vigencia": 12,
        "presupuesto_total": 30000000,
        "semillero_id": sem1_id
    }
    r_p = client.post("/proyectos", json=proy_payload)
    assert r_p.status_code == 201, r_p.text
    proy_id = r_p.json()["id"]
    assert r_p.json()["semillero_id"] == sem1_id

    # 4. Move project to Semillero 2
    r_move = client.put(f"/proyectos/{proy_id}", json={"semillero_id": sem2_id})
    assert r_move.status_code == 200, r_move.text
    assert r_move.json()["semillero_id"] == sem2_id

    # 5. Verify in project detail
    r_detail = client.get(f"/proyectos/{proy_id}")
    assert r_detail.status_code == 200
    assert r_detail.json()["semillero_id"] == sem2_id

    # 6. Unlink project from any semillero (set semillero_id to None/null)
    r_unlink = client.put(f"/proyectos/{proy_id}", json={"semillero_id": None})
    assert r_unlink.status_code == 200, r_unlink.text
    assert r_unlink.json()["semillero_id"] is None

    # 7. Verify unlinked state
    r_detail2 = client.get(f"/proyectos/{proy_id}")
    assert r_detail2.status_code == 200
    assert r_detail2.json()["semillero_id"] is None
