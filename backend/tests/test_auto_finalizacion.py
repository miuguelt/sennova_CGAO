import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Set test environment
from db_support import db_path_for, sqlite_url_for

TEST_DB_FILE = db_path_for("test_auto_finalizacion.db")
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
from app.models import User, Documento
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
mock_admin = User(
    id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    email="admin_auto@sena.edu.co",
    nombre="Admin Auto Test",
    rol="admin",
    is_active=True
)

def override_get_current_user():
    return mock_admin

@pytest.fixture(autouse=True)
def setup_overrides():
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    yield
    app.dependency_overrides.clear()

client = TestClient(app)


def test_auto_finalizacion_flow_and_elaboracion_diagnostic():
    # 1. Crear un proyecto
    res_proj = client.post("/proyectos", json={
        "nombre": "Proyecto SENNOVA Automatización Robotizada",
        "nombre_corto": "SENNOVA-Auto",
        "codigo_sgps": "SGPS-2026-777",
        "estado": "En ejecución",
        "vigencia": 12,
        "presupuesto_total": 50000000,
        "tipologia": "Innovación",
        "linea_investigacion": "Robótica Industrial",
        "descripcion": "Proyecto de prueba para validar la auto-finalización y diagnóstico de elaboración.",
        "objetivo_general": "Desarrollar un prototipo de automatización para procesos industriales.",
        "objetivos_especificos": ["Diseñar circuito electrónico", "Programar microcontrolador"],
        "año": 2026,
        "año_fin": 2026,
        "continua_siguiente_año": False,
        "presupuesto_detallado": {"items": [{"categoria": "Equipos", "valor": 50000000}]}
    })
    assert res_proj.status_code == 201, res_proj.text
    proj_data = res_proj.json()
    proj_id = proj_data["id"]

    # 2. Consultar Diagnóstico de Elaboración
    res_elab = client.get(f"/proyectos/{proj_id}/elaboracion-status")
    assert res_elab.status_code == 200
    elab_data = res_elab.json()
    assert "score_total" in elab_data
    assert "nivel_calidad" in elab_data
    assert isinstance(elab_data["recomendaciones"], list)

    # 3. Verificar estado inicial de liquidación (no cumple aún)
    res_check1 = client.get(f"/proyectos/{proj_id}/liquidar/check")
    assert res_check1.status_code == 200
    check1_data = res_check1.json()
    assert check1_data["can_liquidate"] is False
    assert check1_data["auto_finalizado"] is False

    # 4. Crear Entregable en el proyecto y aprobarlo
    res_ent = client.post("/entregables/", json={
        "proyecto_id": proj_id,
        "fase": "Fase 1",
        "titulo": "Informe de Avance Técnico",
        "descripcion": "Entrega de arquitectura del robot",
        "tipo": "informe",
        "fecha_entrega": "2026-10-15"
    })
    assert res_ent.status_code == 201
    ent_id = res_ent.json()["id"]

    # 5. Crear 2 productos de investigación y verificarlos (para cumplir requisito Minciencias)
    res_prod1 = client.post("/productos", json={
        "tipo": "A1 - Artículo de Investigación",
        "nombre": "Artículo Robótica SENNOVA v1",
        "descripcion": "Publicación científica sobre control adaptativo",
        "fecha_publicacion": "2026-06-01",
        "proyecto_id": proj_id
    })
    assert res_prod1.status_code == 201
    prod1_id = res_prod1.json()["id"]

    res_prod2 = client.post("/productos", json={
        "tipo": "B1 - Patente de Invención",
        "nombre": "Patente Garra Robótica Inteligente",
        "descripcion": "Diseño industrial de efector final",
        "fecha_publicacion": "2026-07-01",
        "proyecto_id": proj_id
    })
    assert res_prod2.status_code == 201
    prod2_id = res_prod2.json()["id"]

    # Verificar productos por Admin
    client.post(f"/productos/{prod1_id}/verificar", json={"is_verificado": True})
    client.post(f"/productos/{prod2_id}/verificar", json={"is_verificado": True})

    # 6. Registrar informe final técnico en BD (para simular carga de informe)
    db = TestingSessionLocal()
    doc_informe = Documento(
        entidad_tipo="proyecto",
        entidad_id=proj_id,
        tipo="informe_final",
        nombre_archivo="Informe_Final_Robotica.pdf",
        content_type="application/pdf",
        file_path="storage/documentos/test_informe.pdf",
        owner_id=mock_admin.id
    )
    db.add(doc_informe)
    db.commit()
    db.close()

    # 7. Cambiar estado de Entregable a 'aprobado' -> Debe disparar la auto-finalización del proyecto
    res_app = client.post(f"/entregables/{ent_id}/cambiar-estado?nuevo_estado=aprobado", json={})
    assert res_app.status_code == 200

    # 8. Comprobar que el proyecto ahora está en estado 'Finalizado'
    res_proj_after = client.get(f"/proyectos/{proj_id}")
    assert res_proj_after.status_code == 200
    assert res_proj_after.json()["estado"] == "Finalizado"

    # 9. Verificar endpoint de liquidación check confirma 100% de cumplimiento
    res_check2 = client.get(f"/proyectos/{proj_id}/liquidar/check")
    assert res_check2.status_code == 200
    check2_data = res_check2.json()
    assert check2_data["can_liquidate"] is True
    assert check2_data["porcentaje_completitud"] == 100.0

    # Teardown database
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass
