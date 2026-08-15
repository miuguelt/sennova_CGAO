import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Configurar entorno de test antes de importar app
from db_support import db_path_for, sqlite_url_for

TEST_DB_FILE = db_path_for("test_sennova_e2e.db")
TEST_DB_URL = sqlite_url_for(TEST_DB_FILE)

os.environ["DATABASE_URL"] = TEST_DB_URL
os.environ["DEBUG"] = "true"

from app.database import Base, get_db
from app.main import app
from app.models import User
from app.auth import get_password_hash, create_access_token

test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    # Recrear tablas limpias
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    
    # Crear admin por defecto
    admin = User(
        email="admin@sena.edu.co",
        password_hash=get_password_hash("123456"),
        nombre="Admin E2E",
        rol="admin",
        sede="CGAO",
        is_active=True
    )
    # Crear investigador por defecto
    investigador = User(
        email="investigador@sena.edu.co",
        password_hash=get_password_hash("123456"),
        nombre="Investigador E2E",
        rol="investigador",
        sede="CGAO",
        is_active=True
    )
    db.add(admin)
    db.add(investigador)
    db.commit()
    db.close()
    
    yield
    
    # Teardown: Eliminar base de datos de test
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()
    
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except PermissionError as e:
            import warnings
            warnings.warn(f"No se pudo eliminar {TEST_DB_FILE} en teardown: {e}")


def test_sennova_e2e_notification_and_project_lifecycle(setup_db):
    client = TestClient(app)
    
    db = TestingSessionLocal()
    admin_user = db.query(User).filter(User.email == "admin@sena.edu.co").first()
    inv_user = db.query(User).filter(User.email == "investigador@sena.edu.co").first()
    
    admin_token = create_access_token(admin_user.id, admin_user.email, admin_user.rol)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    inv_token = create_access_token(inv_user.id, inv_user.email, inv_user.rol)
    inv_headers = {"Authorization": f"Bearer {inv_token}"}
    
    inv_id = str(inv_user.id)
    db.close()

    # 3. Crear Grupo y Semillero (para poder ligar proyectos)
    res_grupo = client.post("/grupos", json={"nombre": "Grupo Investigadores CGAO", "codigo": "CGAO-01", "sigla": "GCGAO"}, headers=admin_headers)
    assert res_grupo.status_code == 201
    grupo_id = res_grupo.json()["id"]
    
    res_sem = client.post("/semilleros", json={"nombre": "Semillero ADSO Vélez", "grupo_id": grupo_id}, headers=admin_headers)
    assert res_sem.status_code == 201
    semillero_id = res_sem.json()["id"]

    # 4. Crear Convocatoria (Admin) -> Debe generar notificaciones in-app e emails simulados
    res_conv = client.post("/convocatorias", json={
        "numero_oe": "OE-2026-01",
        "nombre": "Convocatoria Sennova I+D+I 2026",
        "año": 2026,
        "fecha_apertura": "2026-01-01",
        "fecha_cierre": "2026-12-31",
        "estado": "abierta",
        "descripcion": "Financiación de proyectos de desarrollo tecnológico"
    }, headers=admin_headers)
    assert res_conv.status_code == 201
    conv_id = res_conv.json()["id"]
    
    # 5. Verificar que el Investigador recibió la notificación in-app de Convocatoria
    res_notif = client.get("/notificaciones/?solo_no_leidas=true", headers=inv_headers)
    assert res_notif.status_code == 200
    notifs = res_notif.json()
    assert len(notifs) >= 1
    assert any("Convocatoria" in n["titulo"] for n in notifs)
    conv_notif = [n for n in notifs if "Convocatoria" in n["titulo"]][0]
    assert conv_notif["entidad_tipo"] == "convocatoria"
    
    # Marcar notificación como leída
    res_read = client.put(f"/notificaciones/{conv_notif['id']}/marcar-leida", json={"leida": True}, headers=inv_headers)
    assert res_read.status_code == 200

    # 6. Crear Proyecto (Admin o Investigador)
    res_proj = client.post("/proyectos", json={
        "nombre": "Desarrollo de Software Agroindustrial Inteligente",
        "nombre_corto": "AgroIntellect",
        "tipologia": "Investigación Aplicada",
        "estado": "Formulación",
        "vigencia": 2026,
        "semillero_id": semillero_id,
        "convocatoria_id": conv_id
    }, headers=admin_headers)
    assert res_proj.status_code == 201
    proj_id = res_proj.json()["id"]
    
    # Asignar investigador al equipo del proyecto
    res_eq = client.post(f"/proyectos/{proj_id}/equipo", json={"user_id": inv_id, "rol_en_proyecto": "Co-investigador", "horas_dedicadas": 20}, headers=admin_headers)
    assert res_eq.status_code in (200, 201)

    # 7. Crear Entregable (Asignado al Investigador) -> Genera email + in-app
    res_ent = client.post("/entregables/", json={
        "proyecto_id": proj_id,
        "fase": "Planeación",
        "titulo": "Diseño de Arquitectura Cloud",
        "descripcion": "Definición del modelo relacional e infraestructura",
        "tipo": "documento",
        "fecha_entrega": "2026-08-30",
        "responsable_id": inv_id
    }, headers=admin_headers)
    assert res_ent.status_code == 201
    ent_id = res_ent.json()["id"]

    # 8. Investigador verifica notificación de Entregable asignado
    res_notif = client.get("/notificaciones/?solo_no_leidas=true", headers=inv_headers)
    assert res_notif.status_code == 200
    notifs = res_notif.json()
    assert any("entregable asignado" in n["titulo"].lower() for n in notifs)

    # 9. Cambiar estado de Entregable a 'enviado' (Investigador)
    res_status = client.post(f"/entregables/{ent_id}/cambiar-estado?nuevo_estado=enviado", json={}, headers=inv_headers)
    assert res_status.status_code == 200
    
    # 10. Aprobación del Entregable (Admin) -> Genera notificación e email
    res_approve = client.post(f"/entregables/{ent_id}/cambiar-estado?nuevo_estado=aprobado&observaciones=Excelente trabajo", json={}, headers=admin_headers)
    assert res_approve.status_code == 200
    
    # Investigador verifica notificación de aprobación
    res_notif = client.get("/notificaciones/", headers=inv_headers)
    assert any("actualizado" in n["titulo"].lower() and "aprobado" in n["mensaje"].lower() for n in res_notif.json())

    # 11. Investigador crea Producto -> Genera notificación para Admin
    res_prod = client.post("/productos", json={
        "tipo": "Software / Algoritmo",
        "nombre": "Software de Procesamiento de Lácteos v1.0",
        "descripcion": "Algoritmo para calcular madurez de quesos",
        "fecha_publicacion": "2026-06-01",
        "proyecto_id": proj_id
    }, headers=inv_headers)
    assert res_prod.status_code == 201
    prod_id = res_prod.json()["id"]

    # Admin verifica notificación de producto por revisar
    res_admin_notif = client.get("/notificaciones/?solo_no_leidas=true", headers=admin_headers)
    assert any("Producto por Verificar" in n["titulo"] for n in res_admin_notif.json())

    # 12. Admin verifica Producto -> Genera notificación para el Investigador
    res_verify = client.post(f"/productos/{prod_id}/verificar", json={"is_verificado": True}, headers=admin_headers)
    assert res_verify.status_code == 200
    assert res_verify.json()["is_verificado"] is True

    # Investigador recibe notificación de producto aprobado
    res_notif = client.get("/notificaciones/", headers=inv_headers)
    assert any("Producto Verificado" in n["titulo"] for n in res_notif.json())
