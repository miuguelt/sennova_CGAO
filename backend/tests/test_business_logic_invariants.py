import os
import uuid
import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from db_support import db_path_for, sqlite_url_for

TEST_DB_FILE = db_path_for("test_business_logic_invariants.db")
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
from app.models import User, Proyecto, Entregable, Producto, Convocatoria, Reto
from app.auth import get_current_user

engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)
Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

class CurrentUserHolder:
    user = None

holder = CurrentUserHolder()

def override_get_current_user():
    return holder.user

@pytest.fixture(autouse=True)
def setup_overrides():
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    yield
    app.dependency_overrides.clear()

client = TestClient(app)


@pytest.fixture(scope="module")
def seeded_users():
    db = TestingSessionLocal()
    admin_id = str(uuid.uuid4())
    director_id = str(uuid.uuid4())
    responsable_id = str(uuid.uuid4())

    admin = User(
        id=admin_id,
        email="admin_inv@sena.edu.co",
        nombre="Administrador Sistema",
        rol="admin",
        password_hash="hash123",
        is_active=True,
    )
    director = User(
        id=director_id,
        email="director_inv@sena.edu.co",
        nombre="Director Investigador",
        rol="investigador",
        password_hash="hash123",
        is_active=True,
    )
    responsable = User(
        id=responsable_id,
        email="responsable_inv@sena.edu.co",
        nombre="Aprendiz Responsable",
        rol="aprendiz",
        password_hash="hash123",
        is_active=True,
    )
    db.add_all([admin, director, responsable])
    db.commit()
    return {"admin": admin, "director": director, "responsable": responsable}


def test_responsable_cannot_approve_or_adjust_own_entregable(seeded_users):
    admin = seeded_users["admin"]
    director = seeded_users["director"]
    responsable = seeded_users["responsable"]

    db = TestingSessionLocal()
    proyecto = Proyecto(
        id=str(uuid.uuid4()),
        nombre="Proyecto I+D Biotecnología",
        owner_id=director.id,
        estado="En ejecución",
        presupuesto_total=40000000,
    )
    entregable = Entregable(
        id=str(uuid.uuid4()),
        proyecto_id=proyecto.id,
        responsable_id=responsable.id,
        fase="Fase I",
        titulo="Prototipo de Biorreactor",
        tipo="producto",
        fecha_entrega=date(2026, 11, 15),
        estado="pendiente",
    )
    db.add_all([proyecto, entregable])
    db.commit()
    entregable_id = entregable.id
    db.close()

    # Como responsable (aprendiz/ejecutor), intentar auto-aprobar
    holder.user = responsable
    res_aprob = client.post(
        f"/entregables/{entregable_id}/cambiar-estado",
        params={"nuevo_estado": "aprobado"},
    )
    assert res_aprob.status_code == 403
    assert "Solo el director del proyecto o un administrador" in res_aprob.json()["detail"]

    # Como responsable, intentar solicitar ajustes
    res_ajust = client.post(
        f"/entregables/{entregable_id}/cambiar-estado",
        params={"nuevo_estado": "ajustes_requeridos", "observaciones": "Autoevaluación"},
    )
    assert res_ajust.status_code == 403

    # Pero el responsable sí puede cambiar a en_desarrollo o enviado
    res_desarr = client.post(
        f"/entregables/{entregable_id}/cambiar-estado",
        params={"nuevo_estado": "en_desarrollo"},
    )
    assert res_desarr.status_code == 200
    assert res_desarr.json()["estado"] == "en_desarrollo"


def test_director_evaluation_rules_and_approval_immutability(seeded_users):
    admin = seeded_users["admin"]
    director = seeded_users["director"]
    responsable = seeded_users["responsable"]

    db = TestingSessionLocal()
    proyecto = Proyecto(
        id=str(uuid.uuid4()),
        nombre="Proyecto Sensores IoT Agrícolas",
        owner_id=director.id,
        estado="En ejecución",
    )
    entregable = Entregable(
        id=str(uuid.uuid4()),
        proyecto_id=proyecto.id,
        responsable_id=responsable.id,
        fase="Fase II",
        titulo="Firmware de Telemetría",
        tipo="documento",
        fecha_entrega=date(2026, 12, 1),
        estado="en_desarrollo",
    )
    db.add_all([proyecto, entregable])
    db.commit()
    entregable_id = entregable.id
    db.close()

    holder.user = director
    # Intentar solicitar ajustes sin observaciones
    res_sin_obs = client.post(
        f"/entregables/{entregable_id}/cambiar-estado",
        params={"nuevo_estado": "ajustes_requeridos", "observaciones": ""},
    )
    assert res_sin_obs.status_code == 400
    assert "observaciones que justifiquen" in res_sin_obs.json()["detail"]

    # Solicitar ajustes con observaciones válidas
    res_con_obs = client.post(
        f"/entregables/{entregable_id}/cambiar-estado",
        params={"nuevo_estado": "ajustes_requeridos", "observaciones": "Falta incluir el diagrama de conexiones"},
    )
    assert res_con_obs.status_code == 200
    assert res_con_obs.json()["estado"] == "ajustes_requeridos"

    # Director aprueba el entregable
    res_apr = client.post(
        f"/entregables/{entregable_id}/cambiar-estado",
        params={"nuevo_estado": "aprobado", "observaciones": "Revisado y conforme"},
    )
    assert res_apr.status_code == 200
    assert res_apr.json()["estado"] == "aprobado"

    # Una vez aprobado, el director (no-admin) no puede revertirlo arbitrariamente
    res_rev = client.post(
        f"/entregables/{entregable_id}/cambiar-estado",
        params={"nuevo_estado": "en_desarrollo"},
    )
    assert res_rev.status_code == 400
    assert "Un entregable aprobado no puede cambiar de estado salvo por un administrador" in res_rev.json()["detail"]

    # El administrador sí puede corregir el estado si fuera necesario
    holder.user = admin
    res_admin_rev = client.post(
        f"/entregables/{entregable_id}/cambiar-estado",
        params={"nuevo_estado": "en_desarrollo"},
    )
    assert res_admin_rev.status_code == 200
    assert res_admin_rev.json()["estado"] == "en_desarrollo"


def test_product_update_revokes_verification_on_critical_fields(seeded_users):
    admin = seeded_users["admin"]
    director = seeded_users["director"]

    db = TestingSessionLocal()
    prod = Producto(
        id=str(uuid.uuid4()),
        nombre="Artículo Científico Bioenergía",
        tipo="A1 - Artículo de Investigación",
        categoria="A",
        doi="10.1000/bio.2026.01",
        owner_id=director.id,
        is_verificado=True,
        verificado_por=admin.id,
    )
    db.add(prod)
    db.commit()
    prod_id = prod.id
    db.close()

    # El autor modifica el nombre y el DOI -> el aval se debe revocar automáticamente
    holder.user = director
    res_up = client.put(
        f"/productos/{prod_id}",
        json={"nombre": "Nuevo Título Alterado", "doi": "10.1000/alterado.99"},
    )
    assert res_up.status_code == 200

    db = TestingSessionLocal()
    prod_db = db.query(Producto).filter(Producto.id == prod_id).first()
    assert prod_db.nombre == "Nuevo Título Alterado"
    assert prod_db.is_verificado is False
    assert prod_db.verificado_por is None
    db.close()

    # Si el admin lo vuelve a verificar
    holder.user = admin
    res_ver = client.post(f"/productos/{prod_id}/verificar", json={"is_verificado": True})
    assert res_ver.status_code == 200

    # Y el admin actualiza el nombre, el aval se conserva porque es autoridad administrativa
    res_admin_up = client.put(
        f"/productos/{prod_id}",
        json={"nombre": "Título Estandarizado por Admin"},
    )
    assert res_admin_up.status_code == 200
    db = TestingSessionLocal()
    prod_db2 = db.query(Producto).filter(Producto.id == prod_id).first()
    assert prod_db2.is_verificado is True
    db.close()


def test_finalized_project_immutability(seeded_users):
    admin = seeded_users["admin"]
    director = seeded_users["director"]

    db = TestingSessionLocal()
    proyecto = Proyecto(
        id=str(uuid.uuid4()),
        nombre="Proyecto Liquidado e Inmutable",
        owner_id=director.id,
        estado="Finalizado",
        presupuesto_total=60000000,
        codigo_sgps="SGPS-FINALIZADO-01",
    )
    db.add(proyecto)
    db.commit()
    proj_id = proyecto.id
    db.close()

    # Director intenta alterar presupuesto en proyecto finalizado -> HTTP 422
    holder.user = director
    res_presupuesto = client.put(
        f"/proyectos/{proj_id}",
        json={"presupuesto_total": 85000000},
    )
    assert res_presupuesto.status_code == 422
    assert "El proyecto se encuentra liquidado" in res_presupuesto.json()["detail"]

    # Director intenta reabrir el proyecto cambiando estado a 'En ejecución' -> HTTP 403
    res_reapertura = client.put(
        f"/proyectos/{proj_id}",
        json={"estado": "En ejecución"},
    )
    assert res_reapertura.status_code == 403
    assert "Solo un administrador puede solicitar la reapertura" in res_reapertura.json()["detail"]


def test_delete_convocatoria_blocked_when_has_projects(seeded_users):
    admin = seeded_users["admin"]
    director = seeded_users["director"]

    db = TestingSessionLocal()
    conv = Convocatoria(
        id=str(uuid.uuid4()),
        numero_oe="CONV-2026-TEST",
        nombre="Convocatoria Especial SENNOVA 2026",
        año=2026,
        owner_id=admin.id,
    )
    db.add(conv)
    db.commit()

    proj = Proyecto(
        id=str(uuid.uuid4()),
        nombre="Proyecto Adscrito a Convocatoria",
        owner_id=director.id,
        convocatoria_id=conv.id,
        estado="Formulación",
    )
    db.add(proj)
    db.commit()
    conv_id = conv.id
    db.close()

    # Intentar eliminar la convocatoria con proyectos vinculados -> HTTP 409
    holder.user = admin
    res_del = client.delete(f"/convocatorias/{conv_id}")
    assert res_del.status_code == 409
    assert "No es posible eliminar la convocatoria" in res_del.json()["detail"]
    assert "proyecto(s) vinculados" in res_del.json()["detail"]


def test_delete_reto_blocked_when_has_projects(seeded_users):
    admin = seeded_users["admin"]
    director = seeded_users["director"]

    db = TestingSessionLocal()
    reto = Reto(
        id=str(uuid.uuid4()),
        titulo="Reto Optimización Cadena Cacao",
        descripcion="Mejora en proceso de secado",
        owner_id=director.id,
    )
    db.add(reto)
    db.commit()

    proj = Proyecto(
        id=str(uuid.uuid4()),
        nombre="Proyecto Solución Reto Cacao",
        owner_id=director.id,
        reto_origen_id=reto.id,
        estado="Formulación",
    )
    db.add(proj)
    db.commit()
    reto_id = reto.id
    db.close()

    # Intentar eliminar el reto con proyectos vinculados -> HTTP 409
    holder.user = director
    res_del_reto = client.delete(f"/retos/{reto_id}")
    assert res_del_reto.status_code == 409
    assert "No es posible eliminar el reto" in res_del_reto.json()["detail"]
    assert "proyecto(s) vinculado(s)" in res_del_reto.json()["detail"]
