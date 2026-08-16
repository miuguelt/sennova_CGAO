# -*- coding: utf-8 -*-
"""
🧪 Test de Endpoints de Estadísticas y Dashboard (/stats)
Verifica que todos los roles puedan consultar /stats/dashboard y demás endpoints sin errores 500.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models import User, Grupo, Semillero, Proyecto, Producto, Entregable, Aprendiz, BitacoraEntry, Actividad
from app.auth import get_password_hash
from datetime import datetime, date, timezone

from db_support import db_path_for, sqlite_url_for

SQLALCHEMY_DATABASE_URL = sqlite_url_for(db_path_for("test_stats_endpoints.db"))
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    admin = User(
        email="admin_stats@sena.edu.co",
        password_hash=get_password_hash("123456"),
        nombre="Admin Stats",
        rol="admin",
        sede="CGAO",
        is_active=True
    )
    investigador = User(
        email="inv_stats@sena.edu.co",
        password_hash=get_password_hash("123456"),
        nombre="Carlos Investigador",
        rol="investigador",
        sede="CGAO",
        is_active=True
    )
    instructor = User(
        email="inst_stats@sena.edu.co",
        password_hash=get_password_hash("123456"),
        nombre="Laura Instructora",
        rol="instructor",
        sede="CGAO",
        is_active=True
    )
    aprendiz = User(
        email="apr_stats@sena.edu.co",
        password_hash=get_password_hash("123456"),
        nombre="Pedro Aprendiz",
        rol="aprendiz",
        documento="1098765430",
        ficha="2558190",
        programa_formacion="ADSO",
        sede="CGAO",
        is_active=True
    )

    db.add_all([admin, investigador, instructor, aprendiz])
    db.commit()

    # Grupo y Semillero
    grupo = Grupo(
        nombre="Grupo SENNOVA Test",
        codigo_gruplac="G-TEST-01",
        owner_id=str(admin.id)
    )
    db.add(grupo)
    db.commit()

    semillero = Semillero(
        nombre="Semillero Test Stats",
        grupo_id=str(grupo.id),
        owner_id=str(investigador.id),
        linea_investigacion="Biotecnología"
    )
    db.add(semillero)
    db.commit()

    # Vincular aprendiz
    apr_link = Aprendiz(
        user_id=str(aprendiz.id),
        semillero_id=str(semillero.id),
        estado="activo",
        fecha_ingreso=date.today()
    )
    db.add(apr_link)

    # Proyecto
    proyecto = Proyecto(
        nombre="Proyecto Automatización Stats",
        nombre_corto="AutoStats",
        codigo_sgps="SGPS-2026-01",
        estado="En ejecución",
        owner_id=str(investigador.id),
        semillero_id=str(semillero.id),
        presupuesto_total=50000000.0,
        linea_programatica="I+D"
    )
    db.add(proyecto)
    db.commit()

    # Producto
    producto = Producto(
        nombre="Software de Diagnóstico",
        tipo="software",
        owner_id=str(investigador.id),
        proyecto_id=str(proyecto.id),
        is_verificado=True
    )
    db.add(producto)

    # Entregable
    entregable = Entregable(
        titulo="Entregable 1",
        fase="Fase 1",
        proyecto_id=str(proyecto.id),
        responsable_id=str(investigador.id),
        estado="pendiente",
        fecha_entrega=date.today()
    )
    db.add(entregable)

    # Bitacora
    bitacora = BitacoraEntry(
        proyecto_id=str(proyecto.id),
        user_id=str(aprendiz.id),
        titulo="Avance de Bitácora",
        contenido="Desarrollo inicial de pruebas",
        fecha=datetime.now(timezone.utc),
        is_firmado_investigador=True,
        is_firmado_aprendiz=False
    )
    db.add(bitacora)

    # Actividad
    actividad = Actividad(
        user_id=str(admin.id),
        tipo_accion="create_proyecto",
        descripcion="Creación de proyecto de prueba"
    )
    db.add(actividad)
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


def get_auth_header(client, email, password="123456"):
    res = client.post("/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_dashboard_stats_all_roles():
    """Valida que /stats/dashboard responda 200 para todos los roles sin excepción 500."""
    client = TestClient(app)

    roles_emails = [
        "admin_stats@sena.edu.co",
        "inv_stats@sena.edu.co",
        "inst_stats@sena.edu.co",
        "apr_stats@sena.edu.co"
    ]

    for email in roles_emails:
        headers = get_auth_header(client, email)
        res = client.get("/stats/dashboard", headers=headers)
        assert res.status_code == 200, f"Failed for {email}: {res.status_code} - {res.text}"
        data = res.json()
        assert "proyectos" in data
        assert "productos" in data
        assert "aprendices" in data
        assert "bitacoras" in data
        assert "tareas_criticas" in data
        assert "historial_reciente" in data
        assert "proyectos_por_estado" in data


def test_stats_resumen_admin():
    """Valida que /stats/resumen funcione para admin."""
    client = TestClient(app)
    admin_headers = get_auth_header(client, "admin_stats@sena.edu.co")
    res = client.get("/stats/resumen", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "usuarios" in data
    assert "proyectos" in data
    assert "productos" in data


def test_analytics_evolucion():
    """Valida que /stats/analytics/evolucion retorne datos de serie temporal."""
    client = TestClient(app)
    admin_headers = get_auth_header(client, "admin_stats@sena.edu.co")
    res = client.get("/stats/analytics/evolucion?meses=6", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "evolucion_mensual" in data
    assert "totales_actuales" in data


def test_user_impact():
    """Valida que /stats/user/{id}/impact retorne datos 360 del usuario."""
    client = TestClient(app)
    db = TestingSessionLocal()
    inv_user = db.query(User).filter(User.email == "inv_stats@sena.edu.co").first()
    inv_id = str(inv_user.id)
    db.close()

    admin_headers = get_auth_header(client, "admin_stats@sena.edu.co")
    res = client.get(f"/stats/user/{inv_id}/impact", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "cumplimiento" in data
    assert "proyectos_count" in data
    assert "productos_count" in data


def test_semillero_impact():
    """Valida que /stats/semillero/{id}/impact retorne estadísticas del semillero."""
    client = TestClient(app)
    db = TestingSessionLocal()
    semillero = db.query(Semillero).filter(Semillero.nombre == "Semillero Test Stats").first()
    sem_id = str(semillero.id)
    db.close()

    admin_headers = get_auth_header(client, "admin_stats@sena.edu.co")
    res = client.get(f"/stats/semillero/{sem_id}/impact", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_aprendices" in data
    assert "impacto" in data
    assert "evolucion" in data


def test_global_search():
    """Valida que /stats/search/global devuelva resultados."""
    client = TestClient(app)
    admin_headers = get_auth_header(client, "admin_stats@sena.edu.co")
    res = client.get("/stats/search/global?q=AutoStats", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert len(data["results"]) > 0
