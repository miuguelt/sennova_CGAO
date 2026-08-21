# -*- coding: utf-8 -*-
"""
🧪 Test Integral de Perspectivas y Alcances de Usuario SENNOVA
Valida exhaustivamente los permisos, alcances y restricciones de cada tipo de usuario:
- Admin (Líder SENNOVA)
- Instructor (Docente Investigador)
- Investigador (Investigador SENNOVA)
- Aprendiz (Aprendiz Semillerista)
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models import User, Grupo, Proyecto, Semillero, BitacoraEntry
from app.auth import get_password_hash
from db_support import db_path_for, sqlite_url_for

SQLALCHEMY_DATABASE_URL = sqlite_url_for(db_path_for("test_perspectivas_usuarios.db"))
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module", autouse=True)
def setup_test_environment():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # 1. Admin
    admin = User(
        email="admin_test@sena.edu.co",
        password_hash=get_password_hash("password123"),
        nombre="Ing. Sandra Líder SENNOVA",
        rol="admin",
        sede="CGAO Vélez",
        is_active=True
    )
    # 2. Instructor
    instructor = User(
        email="instructor_test@sena.edu.co",
        password_hash=get_password_hash("password123"),
        nombre="Prof. Carlos Instructor",
        rol="instructor",
        sede="CGAO Vélez",
        is_active=True
    )
    # 3. Investigador
    investigador = User(
        email="investigador_test@sena.edu.co",
        password_hash=get_password_hash("password123"),
        nombre="Dra. Elena Investigadora",
        rol="investigador",
        sede="CGAO Vélez",
        is_active=True
    )
    # 4. Aprendiz
    aprendiz = User(
        email="aprendiz_test@sena.edu.co",
        password_hash=get_password_hash("password123"),
        nombre="Felipe Aprendiz ADSO",
        rol="aprendiz",
        documento="1098765432",
        ficha="2678901",
        programa_formacion="ADSO",
        sede="CGAO Vélez",
        is_active=True
    )

    db.add_all([admin, instructor, investigador, aprendiz])
    db.commit()

    # Grupo de Investigación
    grupo = Grupo(
        nombre="Grupo de Innovación Agroindustrial CGAO",
        codigo_gruplac="COL-001-CGAO",
        owner_id=str(admin.id)
    )
    db.add(grupo)
    db.commit()

    # Proyecto base
    proy = Proyecto(
        nombre="Sistema de Trazabilidad Agropecuaria SENNOVA",
        linea_investigacion="Biotecnología",
        owner_id=str(instructor.id),
        estado="En ejecución"
    )
    db.add(proy)
    db.commit()

    db.close()

    def override_get_db():
        try:
            db_session = TestingSessionLocal()
            yield db_session
        finally:
            db_session.close()

    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def get_auth_token(client: TestClient, email: str, password: str = "password123") -> str:
    res = client.post("/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Error autenticando a {email}: {res.text}"
    return res.json()["access_token"]


def test_perspectiva_admin_alcances_completos():
    """
    Perspectiva Líder SENNOVA (Admin):
    - Acceso a módulos de auditoría y telemetría (/audit/stats, /audit/logs)
    - Acceso a estadísticas globales del dashboard
    - Capacidad de listar y administrar proyectos globales
    """
    client = TestClient(app)
    token = get_auth_token(client, "admin_test@sena.edu.co")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Auditoría
    res_audit_stats = client.get("/audit/stats", headers=headers)
    assert res_audit_stats.status_code == 200
    assert "system_status" in res_audit_stats.json()

    res_audit_logs = client.get("/audit/logs", headers=headers)
    assert res_audit_logs.status_code == 200
    assert isinstance(res_audit_logs.json(), list)

    # 2. Stats Dashboard
    res_stats = client.get("/stats/dashboard", headers=headers)
    assert res_stats.status_code == 200
    assert "proyectos" in res_stats.json()
    assert res_stats.json()["proyectos"]["total"] >= 1

    # 3. Listar proyectos
    res_proy = client.get("/proyectos", headers=headers)
    assert res_proy.status_code == 200
    assert len(res_proy.json()) >= 1


def test_perspectiva_instructor_alcances_y_restricciones():
    """
    Perspectiva Instructor:
    - Puede crear semilleros de investigación
    - Puede crear proyectos I+D+i
    - Puede firmar bitácoras como tutor / docente
    - Restricción: Bloqueo 403 en endpoints de superadministrador (/audit)
    """
    client = TestClient(app)
    token = get_auth_token(client, "instructor_test@sena.edu.co")
    headers = {"Authorization": f"Bearer {token}"}

    db = TestingSessionLocal()
    grupo = db.query(Grupo).first()
    grupo_id = str(grupo.id)
    apr = db.query(User).filter(User.email == "aprendiz_test@sena.edu.co").first()
    apr_id = str(apr.id)
    proy = db.query(Proyecto).first()
    proy_id = str(proy.id)
    db.close()

    # 1. Crear Semillero
    res_sem = client.post("/semilleros", json={
        "nombre": "Semillero de Tecnologías Emergentes CGAO",
        "linea_investigacion": "Software & AI",
        "grupo_id": grupo_id,
        "plan_accion": "Desarrollo de prototipos para el sector agroindustrial",
        "horas_dedicadas": 15,
        "estado": "activo"
    }, headers=headers)
    assert res_sem.status_code == 201
    sem_id = res_sem.json()["id"]

    # 2. Vincular Aprendiz al Semillero
    res_vin = client.post(f"/semilleros/{sem_id}/aprendices", json={"user_id": apr_id}, headers=headers)
    assert res_vin.status_code == 201

    # 3. Tutoría / Firma Docente de Bitácora
    # Creamos una bitácora inicial
    bit_entry = client.post("/bitacora", json={
        "titulo": "Prueba de campo sensores suelo",
        "contenido": "Calibración inicial de sensores en cultivo experimental.",
        "categoria": "técnica",
        "proyecto_id": proy_id,
        "horas_dedicadas": 3
    }, headers=headers)
    assert bit_entry.status_code == 201
    bit_id = bit_entry.json()["id"]

    # Instructor firma como docente tutor
    res_sign = client.post(f"/bitacora/{bit_id}/sign", json={}, headers=headers)
    assert res_sign.status_code == 200
    assert res_sign.json()["is_firmado_investigador"] is True

    # 4. Restricción: Bloqueo de Auditoría (403 Forbidden)
    res_audit = client.get("/audit/logs", headers=headers)
    assert res_audit.status_code == 403


def test_perspectiva_investigador_alcances_y_restricciones():
    """
    Perspectiva Investigador SENNOVA:
    - Puede crear y gestionar proyectos de investigación
    - Puede registrar entregables y bitácoras
    - Restricción: Bloqueo 403 en endpoints de superadministrador (/audit)
    """
    client = TestClient(app)
    token = get_auth_token(client, "investigador_test@sena.edu.co")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Crear Proyecto
    res_proy = client.post("/proyectos", json={
        "nombre": "Estudio de Rendimiento en Cultivos Biofortificados",
        "linea_investigacion": "Biotecnología",
        "estado": "En formulación",
        "vigencia": 2026,
        "presupuesto_total": 45000000.0,
        "año": 2026,
        "tipologia": "I+D Aplicada"
    }, headers=headers)
    assert res_proy.status_code == 201
    assert res_proy.json()["nombre"] == "Estudio de Rendimiento en Cultivos Biofortificados"

    # 2. Restricción: Bloqueo de Auditoría (403 Forbidden)
    res_audit = client.get("/audit/stats", headers=headers)
    assert res_audit.status_code == 403


def test_perspectiva_aprendiz_alcances_formativos_y_bloqueos():
    """
    Perspectiva Aprendiz Semillerista:
    - Puede crear bitácoras personales
    - Puede firmar su propia bitácora
    - Restricción: No puede crear proyectos (403)
    - Restricción: No puede crear semilleros (403)
    - Restricción: No puede acceder a auditoría (403)
    """
    client = TestClient(app)
    token = get_auth_token(client, "aprendiz_test@sena.edu.co")
    headers = {"Authorization": f"Bearer {token}"}

    db = TestingSessionLocal()
    proy = db.query(Proyecto).first()
    proy_id = str(proy.id)
    grupo = db.query(Grupo).first()
    grupo_id = str(grupo.id)
    db.close()

    # 1. Aprendiz crea bitácora de su actividad formativa
    res_bit = client.post("/bitacora", json={
        "titulo": "Implementación de frontend en React",
        "contenido": "Se desarrollaron componentes y validaciones para la interfaz de usuario.",
        "categoria": "técnica",
        "proyecto_id": proy_id,
        "horas_dedicadas": 4
    }, headers=headers)
    assert res_bit.status_code == 201
    bit_id = res_bit.json()["id"]

    # 2. Aprendiz firma su bitácora
    res_sign = client.post(f"/bitacora/{bit_id}/sign", json={}, headers=headers)
    assert res_sign.status_code == 200
    assert res_sign.json()["is_firmado_aprendiz"] is True

    # 3. Restricción: Aprendiz NO puede crear proyectos (403)
    res_proy_block = client.post("/proyectos", json={
        "nombre": "Proyecto No Permitido por Aprendiz",
        "linea_investigacion": "Software"
    }, headers=headers)
    assert res_proy_block.status_code == 403

    # 4. Restricción: Aprendiz NO puede crear semilleros (403)
    res_sem_block = client.post("/semilleros", json={
        "nombre": "Semillero No Permitido por Aprendiz",
        "linea_investigacion": "Software",
        "grupo_id": grupo_id
    }, headers=headers)
    assert res_sem_block.status_code == 403

    # 5. Restricción: Aprendiz NO puede acceder a logs de auditoría (403)
    res_audit_block = client.get("/audit/logs", headers=headers)
    assert res_audit_block.status_code == 403
