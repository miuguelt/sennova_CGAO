# -*- coding: utf-8 -*-
"""
🧪 Test de Roles y Separación de Datos — Semilleros de Investigación
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models import User, Grupo, Semillero
from app.auth import get_password_hash

from db_support import db_path_for, sqlite_url_for

SQLALCHEMY_DATABASE_URL = sqlite_url_for(db_path_for("test_semilleros_roles.db"))
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    admin = User(
        email="admin_sem@sena.edu.co",
        password_hash=get_password_hash("123456"),
        nombre="Admin Semillero",
        rol="admin",
        sede="CGAO",
        is_active=True
    )
    investigador = User(
        email="inv_sem@sena.edu.co",
        password_hash=get_password_hash("123456"),
        nombre="Carlos Coinvestigador",
        rol="investigador",
        sede="CGAO",
        is_active=True
    )
    aprendiz = User(
        email="apr_sem@sena.edu.co",
        password_hash=get_password_hash("123456"),
        nombre="Ana Aprendiz",
        rol="aprendiz",
        documento="1098765432",
        ficha="2558190",
        programa_formacion="ADSO",
        sede="CGAO",
        is_active=True
    )

    db.add(admin)
    db.add(investigador)
    db.add(aprendiz)
    db.commit()

    grupo = Grupo(
        nombre="Grupo de IA Agro",
        codigo_gruplac="G-IA-01",
        owner_id=str(admin.id)
    )
    db.add(grupo)
    db.commit()

    semillero = Semillero(
        nombre="Semillero AgroIA",
        grupo_id=str(grupo.id),
        owner_id=str(admin.id),
        linea_investigacion="IA Aplicada"
    )
    db.add(semillero)
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


def test_semillero_role_separation_and_data_formatting():
    client = TestClient(app)

    # 1. Login como Admin
    res_login = client.post("/auth/login", json={"email": "admin_sem@sena.edu.co", "password": "123456"})
    assert res_login.status_code == 200
    token = res_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    db = TestingSessionLocal()
    inv_user = db.query(User).filter(User.email == "inv_sem@sena.edu.co").first()
    apr_user = db.query(User).filter(User.email == "apr_sem@sena.edu.co").first()
    semillero = db.query(Semillero).filter(Semillero.nombre == "Semillero AgroIA").first()

    sem_id = str(semillero.id)
    inv_id = str(inv_user.id)
    apr_id = str(apr_user.id)
    db.close()

    # 2. Intentar agregar un Investigador a la lista de Aprendices (debe fallar 400)
    res_inv_as_apr = client.post(f"/semilleros/{sem_id}/aprendices", json={"user_id": inv_id}, headers=headers)
    assert res_inv_as_apr.status_code == 400
    assert "Solo usuarios con rol 'aprendiz'" in res_inv_as_apr.json()["detail"]

    # 3. Intentar agregar un Aprendiz como Investigador (debe fallar 400)
    res_apr_as_inv = client.post(f"/semilleros/{sem_id}/investigadores?user_id={apr_id}", headers=headers)
    assert res_apr_as_inv.status_code == 400
    assert "Los aprendices no pueden ser vinculados como investigadores" in res_apr_as_inv.json()["detail"]

    # 4. Vincular Aprendiz legítimo (debe pasar 201)
    res_add_apr = client.post(f"/semilleros/{sem_id}/aprendices", json={"user_id": apr_id}, headers=headers)
    assert res_add_apr.status_code == 201
    assert res_add_apr.json()["nombre"] == "Ana Aprendiz"

    # 5. Vincular Investigador legítimo (debe pasar 200)
    res_add_inv = client.post(f"/semilleros/{sem_id}/investigadores?user_id={inv_id}&rol_en_semillero=Coinvestigador", headers=headers)
    assert res_add_inv.status_code == 200

    # 6. Consultar semillero y verificar que grupo_nombre, grupo, aprendices e investigadores estén correctamente estructurados
    res_get = client.get(f"/semilleros/{sem_id}", headers=headers)
    assert res_get.status_code == 200
    sem_data = res_get.json()

    assert sem_data["grupo_nombre"] == "Grupo de IA Agro"
    assert sem_data["grupo"]["nombre"] == "Grupo de IA Agro"
    assert len(sem_data["investigadores"]) == 1
    assert sem_data["investigadores"][0]["nombre"] == "Carlos Coinvestigador"
    assert len(sem_data["aprendices"]) == 1
    assert sem_data["aprendices"][0]["nombre"] == "Ana Aprendiz"
