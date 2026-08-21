# -*- coding: utf-8 -*-
"""
🧪 Test de Automatización — SENNOVA
====================================
Valida el flujo de SENNOVA (Auth, Proyectos, Cronograma, Productos, Presupuesto, Bitácora y Aprendices).

Se ejecuta siempre contra una base SQLite efímera mediante TestClient. La versión
anterior probaba primero ``GET /health`` contra el servidor real y, si respondía,
mandaba todo el flujo por HTTP: con el backend levantado eso escribía en la base
operativa de PostgreSQL, y cada corrida dejaba allí un proyecto, un semillero,
una bitácora y sus entregables y productos, sin limpiar nada. Además, cuando el
servidor no respondía la prueba se saltaba en silencio, así que nunca podía
fallar. Ahora no hay red: el aislamiento no depende del estado del entorno.
"""
import os
import secrets
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Configurar entorno de test antes de importar app
from db_support import db_path_for, sqlite_url_for

TEST_DB_FILE = db_path_for("test_automation.db")
TEST_DB_URL = sqlite_url_for(TEST_DB_FILE)

os.environ["DATABASE_URL"] = TEST_DB_URL
os.environ["DEBUG"] = "true"

from app.auth import get_password_hash  # noqa: E402
from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User  # noqa: E402

ADMIN_EMAIL = "admin.automation@sena.edu.co"
# Efímera por ejecución: no hay contraseña escrita en el repositorio y la base
# que protege se destruye al terminar la corrida.
ADMIN_PASS = secrets.token_urlsafe(24)

test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module")
def client():
    # El override se aplica aquí y no al importar el módulo: `app` es un
    # singleton compartido por toda la suite, así que el último módulo importado
    # ganaba y estas pruebas acababan autenticando contra la base de otro test.
    previous_override = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = override_get_db

    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        if not db.query(User).filter(User.email == ADMIN_EMAIL).first():
            db.add(
                User(
                    email=ADMIN_EMAIL,
                    password_hash=get_password_hash(ADMIN_PASS),
                    nombre="Administrador SENNOVA",
                    rol="admin",
                    sede="CGAO",
                    documento="admin01",
                    is_active=True,
                )
            )
            db.commit()
    finally:
        db.close()

    with TestClient(app) as test_client:
        yield test_client

    Base.metadata.drop_all(bind=test_engine)

    if previous_override is None:
        app.dependency_overrides.pop(get_db, None)
    else:
        app.dependency_overrides[get_db] = previous_override


@pytest.fixture(scope="module")
def headers(client):
    response = client.post(
        "/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}
    )
    assert response.status_code == 200, f"Error en login: {response.text}"
    token = response.json().get("access_token")
    assert token, "No se recibió access_token"
    return {"Authorization": f"Bearer {token}"}


def test_sennova_automation_flow(client, headers):
    """Valida la suite de automatización completa para SENNOVA."""
    # 1. Crear Proyecto
    proyecto_data = {
        "nombre": f"Proyecto Test Automatización {uuid.uuid4().hex[:8]}",
        "nombre_corto": "PROY-TEST",
        "tipologia": "Investigación",
        "estado": "Formulación",
        "vigencia": 2026,
    }
    res_proj = client.post("/proyectos", json=proyecto_data, headers=headers)
    assert res_proj.status_code == 201, f"Error creando proyecto: {res_proj.text}"
    proyecto_id = res_proj.json().get("id")
    assert proyecto_id is not None, "El proyecto no tiene ID"

    # 2. Generación de Entregables (Cronograma)
    res_cron = client.post(
        f"/entregables/proyecto/{proyecto_id}/generate-template", headers=headers
    )
    assert res_cron.status_code == 200, f"Error generando cronograma: {res_cron.text}"
    assert "count" in res_cron.json(), "Respuesta del cronograma sin contador de hitos"

    # 3. Generación de Productos
    res_prod = client.post(
        f"/productos/proyecto/{proyecto_id}/generate-template", headers=headers
    )
    assert res_prod.status_code == 200, f"Error generando productos: {res_prod.text}"
    assert "count" in res_prod.json(), "Respuesta de productos sin contador"

    # 4. Generación de Presupuesto
    res_pres = client.post(
        f"/proyectos/{proyecto_id}/generate-budget-template", headers=headers
    )
    assert res_pres.status_code == 200, f"Error generando presupuesto: {res_pres.text}"
    assert "items_count" in res_pres.json(), "Respuesta de presupuesto sin contador de rubros"

    # 5. Bitácora Multimedia
    bitacora_data = {
        "titulo": "Entrada de Test Multimedia",
        "contenido": "Contenido de prueba con adjuntos",
        "categoria": "técnica",
        "proyecto_id": proyecto_id,
        "adjuntos": [
            {
                "nombre": "imagen1.jpg",
                "url": "https://picsum.photos/800/600",
                "type": "image/jpeg",
                "size": 1024,
            },
            {
                "nombre": "imagen2.jpg",
                "url": "https://picsum.photos/800/601",
                "type": "image/jpeg",
                "size": 2048,
            },
        ],
    }
    res_bit = client.post("/bitacora", json=bitacora_data, headers=headers)
    assert res_bit.status_code == 201, f"Error en bitácora multimedia: {res_bit.text}"
    bit_id = res_bit.json().get("id")
    assert bit_id is not None

    # Verificar que los adjuntos persistieron
    res_bit_get = client.get(f"/bitacora/{bit_id}", headers=headers)
    assert res_bit_get.status_code == 200
    assert len(res_bit_get.json().get("adjuntos", [])) == 2


def test_vinculacion_aprendiz_semillero(client, headers):
    """Vincula un aprendiz a un semillero y comprueba que el nombre se auto-pobla."""
    res_users = client.get("/usuarios", headers=headers)
    assert res_users.status_code == 200, f"Error al listar usuarios: {res_users.text}"
    users = res_users.json()
    aprendiz_user = next((u for u in users if u.get("rol") == "aprendiz"), None)

    if not aprendiz_user:
        apr_user_data = {
            "nombre": "Aprendiz Test Auto",
            "email": f"aprendiz_{uuid.uuid4().hex[:6]}@soy.sena.edu.co",
            "password": secrets.token_urlsafe(16),
            "rol": "aprendiz",
            "documento": f"1098{uuid.uuid4().hex[:4]}",
        }
        res_create_apr = client.post("/auth/register", json=apr_user_data)
        assert res_create_apr.status_code == 201, (
            f"Error creando aprendiz: {res_create_apr.text}"
        )
        aprendiz_user = res_create_apr.json().get("user") or res_create_apr.json()

    user_id = aprendiz_user["id"]

    res_groups = client.get("/grupos", headers=headers)
    assert res_groups.status_code == 200, f"Error al obtener grupos: {res_groups.text}"
    groups = res_groups.json()

    if not groups:
        res_create_g = client.post(
            "/grupos",
            json={"nombre": "Grupo Auto Test", "clasificacion": "A1"},
            headers=headers,
        )
        assert res_create_g.status_code == 201, (
            f"Error creando grupo: {res_create_g.text}"
        )
        groups = [res_create_g.json()]

    grupo_id = groups[0]["id"]
    sem_data = {"nombre": "Semillero Test Automático", "grupo_id": grupo_id}
    res_sem = client.post("/semilleros", json=sem_data, headers=headers)
    assert res_sem.status_code == 201, f"Error creando semillero: {res_sem.text}"
    sem_id = res_sem.json().get("id")
    assert sem_id is not None

    apr_data = {"user_id": user_id, "ficha": "1234567", "programa": "ADSO"}
    res_apr = client.post(
        f"/semilleros/{sem_id}/aprendices", json=apr_data, headers=headers
    )
    assert res_apr.status_code in (200, 201), f"Error vinculando aprendiz: {res_apr.text}"
    assert "nombre" in res_apr.json(), "El nombre del aprendiz no se auto-pobló"
