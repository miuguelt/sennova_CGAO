# -*- coding: utf-8 -*-
"""
🧪 Test de Roles y Ecosistema de Permisos SENNOVA (Aprendiz, Instructor, Investigador, Admin)
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models import User, Grupo, Proyecto
from app.auth import get_password_hash

from db_support import db_path_for, sqlite_url_for

SQLALCHEMY_DATABASE_URL = sqlite_url_for(db_path_for("test_roles_ecosistema.db"))
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    admin = User(
        email="admin_eco@sena.edu.co",
        password_hash=get_password_hash("123456"),
        nombre="Líder SENNOVA",
        rol="admin",
        sede="CGAO",
        is_active=True
    )
    investigador = User(
        email="inv_eco@sena.edu.co",
        password_hash=get_password_hash("123456"),
        nombre="Juan Investigador",
        rol="investigador",
        sede="CGAO",
        is_active=True
    )
    instructor = User(
        email="inst_eco@sena.edu.co",
        password_hash=get_password_hash("123456"),
        nombre="María Instructora",
        rol="instructor",
        sede="CGAO",
        is_active=True
    )
    aprendiz = User(
        email="apr_eco@sena.edu.co",
        password_hash=get_password_hash("123456"),
        nombre="Pedro Aprendiz",
        rol="aprendiz",
        documento="1098765431",
        ficha="2678900",
        programa_formacion="ADSO",
        sede="CGAO",
        is_active=True
    )

    db.add_all([admin, investigador, instructor, aprendiz])
    db.commit()

    grupo = Grupo(
        nombre="Grupo de Innovación CGAO",
        codigo_gruplac="COL-001-CGAO",
        owner_id=str(admin.id)
    )
    db.add(grupo)
    db.commit()

    proy = Proyecto(
        nombre="Proyecto Automatización Agroindustrial",
        linea_investigacion="Agroindustria",
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


def test_public_registration_allowed_roles():
    client = TestClient(app)

    # 1. Registrar instructor con éxito
    res_inst = client.post("/auth/register", json={
        "email": "nuevo_inst@sena.edu.co",
        "password": "password123",
        "nombre": "Docente Nuevo",
        "rol": "instructor",
        "sede": "Vélez"
    })
    assert res_inst.status_code == 201
    assert res_inst.json()["rol"] == "instructor"

    # 2. Registrar investigador con éxito
    res_inv = client.post("/auth/register", json={
        "email": "nuevo_inv@sena.edu.co",
        "password": "password123",
        "nombre": "Investigador Nuevo",
        "rol": "investigador",
        "sede": "Vélez"
    })
    assert res_inv.status_code == 201
    assert res_inv.json()["rol"] == "investigador"

    # 3. Registrar aprendiz con éxito
    res_apr = client.post("/auth/register", json={
        "email": "nuevo_apr@sena.edu.co",
        "password": "password123",
        "nombre": "Aprendiz Nuevo",
        "rol": "aprendiz",
        "sede": "Vélez"
    })
    assert res_apr.status_code == 201
    assert res_apr.json()["rol"] == "aprendiz"

    # 4. Intentar registrar admin públicamente (debe fallar 403)
    res_adm = client.post("/auth/register", json={
        "email": "hacker@sena.edu.co",
        "password": "password123",
        "nombre": "Falso Admin",
        "rol": "admin",
        "sede": "Vélez"
    })
    assert res_adm.status_code == 403


def test_instructor_and_investigador_can_create_semillero_and_sign_bitacora():
    client = TestClient(app)

    # Login como instructor
    res_login = client.post("/auth/login", json={"email": "inst_eco@sena.edu.co", "password": "123456"})
    assert res_login.status_code == 200
    token_inst = res_login.json()["access_token"]
    headers_inst = {"Authorization": f"Bearer {token_inst}"}

    db = TestingSessionLocal()
    grupo = db.query(Grupo).filter(Grupo.nombre == "Grupo de Innovación CGAO").first()
    grupo_id = str(grupo.id)
    apr = db.query(User).filter(User.email == "apr_eco@sena.edu.co").first()
    apr_id = str(apr.id)
    proy = db.query(Proyecto).filter(Proyecto.nombre == "Proyecto Automatización Agroindustrial").first()
    proy_id = str(proy.id)
    db.close()

    # Instructor crea semillero
    res_sem = client.post("/semilleros", json={
        "nombre": "Semillero TIC y Agro",
        "linea_investigacion": "Agroindustria 4.0",
        "grupo_id": grupo_id,
        "plan_accion": "Capacitación en IoT",
        "horas_dedicadas": 20,
        "estado": "activo"
    }, headers=headers_inst)
    assert res_sem.status_code == 201
    sem_id = res_sem.json()["id"]

    # Vincular aprendiz legítimo
    res_vin = client.post(f"/semilleros/{sem_id}/aprendices", json={"user_id": apr_id}, headers=headers_inst)
    assert res_vin.status_code == 201

    # Login como aprendiz
    res_login_apr = client.post("/auth/login", json={"email": "apr_eco@sena.edu.co", "password": "123456"})
    token_apr = res_login_apr.json()["access_token"]
    headers_apr = {"Authorization": f"Bearer {token_apr}"}

    # Aprendiz crea entrada de bitácora
    res_bit = client.post("/bitacora", json={
        "titulo": "Implementación de sensores DHT22",
        "contenido": "Se configuró el firmware Arduino para lectura de humedad y temperatura.",
        "categoria": "Técnica",
        "proyecto_id": proy_id,
        "horas_dedicadas": 4
    }, headers=headers_apr)
    assert res_bit.status_code == 201
    bit_id = res_bit.json()["id"]

    # Aprendiz firma su entrada
    res_sign_apr = client.post(f"/bitacora/{bit_id}/sign", json={}, headers=headers_apr)
    assert res_sign_apr.status_code == 200
    assert res_sign_apr.json()["is_firmado_aprendiz"] is True

    # Instructor firma como tutor
    res_sign_inst = client.post(f"/bitacora/{bit_id}/sign", json={}, headers=headers_inst)
    assert res_sign_inst.status_code == 200
    assert res_sign_inst.json()["is_firmado_investigador"] is True


def test_aprendiz_cannot_create_semillero_or_project():
    client = TestClient(app)

    res_login = client.post("/auth/login", json={"email": "apr_eco@sena.edu.co", "password": "123456"})
    token_apr = res_login.json()["access_token"]
    headers_apr = {"Authorization": f"Bearer {token_apr}"}

    db = TestingSessionLocal()
    grupo = db.query(Grupo).first()
    grupo_id = str(grupo.id)
    db.close()

    # Intentar crear semillero (debe fallar 403)
    res_sem = client.post("/semilleros", json={
        "nombre": "Semillero Ilegal",
        "linea_investigacion": "Test",
        "grupo_id": grupo_id
    }, headers=headers_apr)
    assert res_sem.status_code == 403

    # Intentar crear proyecto (debe fallar 403)
    res_proy = client.post("/proyectos", json={
        "nombre": "Proyecto No Autorizado",
        "linea_investigacion": "Test"
    }, headers=headers_apr)
    assert res_proy.status_code == 403
