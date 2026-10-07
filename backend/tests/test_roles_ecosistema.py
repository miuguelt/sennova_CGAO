# -*- coding: utf-8 -*-
"""
🧪 Test de Roles y Ecosistema de Permisos SENNOVA (Aprendiz, Investigador, Admin)
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models import Aprendiz, Documento, User, Grupo, Proyecto, Semillero, proyecto_equipo
from app.auth import create_access_token, get_password_hash

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
        rol="investigador",
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

    semillero = Semillero(
        nombre="Automatización agroindustrial", grupo_id=grupo.id, owner_id=str(instructor.id),
    )
    semillero.investigadores.extend([instructor, investigador])
    db.add(semillero)
    db.flush()

    proy = Proyecto(
        nombre="Proyecto Automatización Agroindustrial",
        linea_investigacion="Agroindustria",
        owner_id=str(instructor.id),
        semillero_id=str(semillero.id),
        grupo_id=str(grupo.id),
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


def test_public_registration_is_apprentice_only_and_admin_can_create_investigators():
    client = TestClient(app)

    # El registro público no debe permitir autoasignarse permisos de personal.
    res_inst = client.post("/auth/register", json={
        "email": "nuevo_inst@sena.edu.co",
        "password": "password123",
        "nombre": "Docente Nuevo",
        "rol": "instructor",
        "sede": "Vélez"
    })
    assert res_inst.status_code == 422

    res_inv = client.post("/auth/register", json={
        "email": "nuevo_inv@sena.edu.co",
        "password": "password123",
        "nombre": "Investigador Nuevo",
        "rol": "investigador",
        "sede": "Vélez"
    })
    assert res_inv.status_code == 403

    # El registro de aprendiz continúa abierto.
    res_apr = client.post("/auth/register", json={
        "email": "nuevo_apr@sena.edu.co",
        "password": "password123",
        "nombre": "Aprendiz Nuevo",
        "rol": "aprendiz",
        "sede": "Vélez"
    })
    assert res_apr.status_code == 201
    assert res_apr.json()["rol"] == "aprendiz"

    # Tampoco se admiten roles desconocidos.
    res_unknown = client.post("/auth/register", json={
        "email": "nuevo_rol@sena.edu.co",
        "password": "password123",
        "nombre": "Rol Desconocido",
        "rol": "superusuario",
        "sede": "Vélez"
    })
    assert res_unknown.status_code == 422

    # El registro público no puede crear administradores.
    res_adm = client.post("/auth/register", json={
        "email": "hacker@sena.edu.co",
        "password": "password123",
        "nombre": "Falso Admin",
        "rol": "admin",
        "sede": "Vélez"
    })
    assert res_adm.status_code == 403

    # El administrador conserva la capacidad de crear perfiles de personal.
    admin = TestingSessionLocal().query(User).filter(User.email == "admin_eco@sena.edu.co").first()
    admin_token = create_access_token(admin.id, admin.email, admin.rol)
    res_removed_role = client.post("/auth/users", headers={
        "Authorization": f"Bearer {admin_token}"
    }, json={
        "email": "nuevo_inst@sena.edu.co",
        "password": "password123",
        "nombre": "Docente Nuevo",
        "rol": "instructor",
        "sede": "Vélez"
    })
    assert res_removed_role.status_code == 422

    res_admin_create = client.post("/auth/users", headers={
        "Authorization": f"Bearer {admin_token}"
    }, json={
        "email": "nuevo_inv@sena.edu.co",
        "password": "password123",
        "nombre": "Investigador Nuevo",
        "rol": "investigador",
        "sede": "Vélez"
    })
    assert res_admin_create.status_code == 201
    assert res_admin_create.json()["rol"] == "investigador"


def test_investigador_can_create_semillero_and_link_apprentices():
    client = TestClient(app)

    # El antiguo perfil de instructor ya usa el rol investigador.
    res_login = client.post("/auth/login", json={"email": "inst_eco@sena.edu.co", "password": "123456"})
    assert res_login.status_code == 200
    token_inst = res_login.json()["access_token"]
    headers_inst = {"Authorization": f"Bearer {token_inst}"}

    db = TestingSessionLocal()
    grupo = db.query(Grupo).filter(Grupo.nombre == "Grupo de Innovación CGAO").first()
    grupo_id = str(grupo.id)
    apr = db.query(User).filter(User.email == "apr_eco@sena.edu.co").first()
    apr_id = str(apr.id)
    db.close()

    # Investigador crea semillero.
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

def test_aprendiz_cannot_create_semillero_or_project():
    client = TestClient(app)

    res_login = client.post("/auth/login", json={"email": "apr_eco@sena.edu.co", "password": "123456"})
    token_apr = res_login.json()["access_token"]
    headers_apr = {"Authorization": f"Bearer {token_apr}"}

    db = TestingSessionLocal()
    grupo = db.query(Grupo).first()
    grupo_id = str(grupo.id)
    semillero_id = str(db.query(Semillero).filter_by(nombre="Automatización agroindustrial").one().id)
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
        "semillero_id": semillero_id,
        "linea_investigacion": "Test"
    }, headers=headers_apr)
    assert res_proy.status_code == 403


def test_apprentice_only_sees_training_resources_while_staff_keeps_broad_access():
    client = TestClient(app)
    db = TestingSessionLocal()
    aprendiz = db.query(User).filter(User.email == "apr_eco@sena.edu.co").first()
    instructor = db.query(User).filter(User.email == "inst_eco@sena.edu.co").first()
    admin = db.query(User).filter(User.email == "admin_eco@sena.edu.co").first()
    grupo = db.query(Grupo).first()
    otro_aprendiz = User(
        email="otro_aprendiz_eco@sena.edu.co",
        password_hash=aprendiz.password_hash,
        nombre="Otra Aprendiz",
        rol="aprendiz",
        is_active=True,
    )
    db.add(otro_aprendiz)
    db.commit()

    semillero_propio = Semillero(
        nombre="Semillero propio del aprendiz",
        grupo_id=str(grupo.id),
        owner_id=str(instructor.id),
    )
    semillero_ajeno = Semillero(
        nombre="Semillero de otra ficha",
        grupo_id=str(grupo.id),
        owner_id=str(instructor.id),
    )
    db.add_all([semillero_propio, semillero_ajeno])
    db.commit()
    db.add(Aprendiz(semillero_id=str(semillero_propio.id), user_id=str(aprendiz.id)))
    db.add(Aprendiz(semillero_id=str(semillero_ajeno.id), user_id=str(otro_aprendiz.id)))
    proyecto_aprendiz = Proyecto(
        nombre="Proyecto formativo del aprendiz",
        owner_id=str(aprendiz.id),
        estado="En ejecución",
    )
    proyecto_ajeno = Proyecto(
        nombre="Proyecto de otra aprendiz",
        owner_id=str(otro_aprendiz.id),
        estado="En ejecución",
    )
    proyecto_semillero = Proyecto(
        nombre="Proyecto formativo del semillero",
        owner_id=str(instructor.id),
        semillero_id=str(semillero_propio.id),
        estado="En ejecución",
    )
    db.add_all([proyecto_aprendiz, proyecto_ajeno, proyecto_semillero])
    db.commit()
    db.execute(proyecto_equipo.insert().values(
        proyecto_id=str(proyecto_aprendiz.id),
        user_id=str(aprendiz.id),
        rol_en_proyecto="Aprendiz",
        horas_dedicadas=12,
    ))
    db.commit()

    documento_propio = Documento(
        entidad_tipo="proyecto",
        entidad_id=str(proyecto_aprendiz.id),
        tipo="evidencia",
        nombre_archivo="evidencia_aprendiz.pdf",
        owner_id=str(aprendiz.id),
    )
    recurso_formativo = Documento(
        entidad_tipo="formato",
        entidad_id=str(semillero_propio.id),
        tipo="formato",
        nombre_archivo="guia_formativa.pdf",
        owner_id=str(instructor.id),
    )
    documento_ajeno = Documento(
        entidad_tipo="proyecto",
        entidad_id=str(proyecto_ajeno.id),
        tipo="informe",
        nombre_archivo="informe_ajeno.pdf",
        owner_id=str(instructor.id),
    )
    db.add_all([documento_propio, recurso_formativo, documento_ajeno])
    db.commit()

    learner_headers = {
        "Authorization": f"Bearer {create_access_token(aprendiz.id, aprendiz.email, aprendiz.rol)}"
    }
    learner_id = str(aprendiz.id)
    staff_headers = {
        "Authorization": f"Bearer {create_access_token(instructor.id, instructor.email, instructor.rol)}"
    }
    admin_headers = {
        "Authorization": f"Bearer {create_access_token(admin.id, admin.email, admin.rol)}"
    }
    own_semillero_id = str(semillero_propio.id)
    unrelated_semillero_id = str(semillero_ajeno.id)
    unrelated_aprendiz_id = str(otro_aprendiz.id)
    own_project_id = str(proyecto_aprendiz.id)
    unrelated_project_id = str(proyecto_ajeno.id)
    semillero_project_id = str(proyecto_semillero.id)
    linked_semillero_ids = {
        str(record.semillero_id)
        for record in db.query(Aprendiz).filter(Aprendiz.user_id == str(aprendiz.id)).all()
    }
    db.close()

    assert client.get("/usuarios", headers=learner_headers).status_code == 403
    assert client.get("/aprendices", headers=learner_headers).status_code == 403
    assert client.get(f"/aprendices/{learner_id}", headers=learner_headers).status_code == 200
    assert client.get(f"/aprendices/{unrelated_aprendiz_id}", headers=learner_headers).status_code == 403
    learner_projects = client.get("/proyectos", headers=learner_headers)
    assert learner_projects.status_code == 200
    learner_project_ids = {project["id"] for project in learner_projects.json()}
    assert learner_project_ids >= {
        own_project_id,
        semillero_project_id,
    }
    assert unrelated_project_id not in learner_project_ids
    semillero_project = client.get(f"/proyectos/{semillero_project_id}", headers=learner_headers)
    assert semillero_project.status_code == 200
    assert semillero_project.json()["presupuesto_total"] is None
    assert semillero_project.json()["presupuesto_detallado"] == {}
    assert "email" not in semillero_project.json()["owner"]
    assert all(
        not {"email", "ficha", "programa_formacion"}.intersection(member)
        for member in semillero_project.json()["equipo"]
    )
    assert client.get(f"/proyectos/{unrelated_project_id}", headers=learner_headers).status_code == 403

    semilleros = client.get("/semilleros", headers=learner_headers)
    assert semilleros.status_code == 200
    assert {item["id"] for item in semilleros.json()} == linked_semillero_ids
    assert client.get(f"/semilleros/{own_semillero_id}", headers=learner_headers).status_code == 200
    assert client.get(f"/semilleros/{unrelated_semillero_id}", headers=learner_headers).status_code == 403
    own_members = client.get(f"/semilleros/{own_semillero_id}/aprendices", headers=learner_headers)
    assert own_members.status_code == 200
    assert len(own_members.json()) == 1
    assert not {"documento", "email", "celular"}.intersection(own_members.json()[0])
    assert client.get(f"/semilleros/{unrelated_semillero_id}/aprendices", headers=learner_headers).status_code == 403

    learner_documents = client.get("/documentos", headers=learner_headers)
    assert learner_documents.status_code == 200
    assert {item["nombre_archivo"] for item in learner_documents.json()} == {
        "evidencia_aprendiz.pdf",
        "guia_formativa.pdf",
    }

    assert client.get(
        f"/plantillas/proyectos/{unrelated_project_id}/presupuesto-detalle",
        headers=learner_headers,
    ).status_code == 403
    assert client.get(
        f"/plantillas/semilleros/{own_semillero_id}/certificado-aprendiz/{learner_id}",
        headers=learner_headers,
    ).status_code == 200
    assert client.get(
        f"/plantillas/semilleros/{unrelated_semillero_id}/certificado-aprendiz/{unrelated_aprendiz_id}",
        headers=learner_headers,
    ).status_code == 403

    for path in (
        "/grupos",
        "/productos",
        "/convocatorias",
        "/cvlac/resumen-sistema",
        "/stats/analytics/evolucion?meses=1",
        "/stats/search/global?q=Semillero",
    ):
        assert client.get(path, headers=learner_headers).status_code == 403

    assert client.get("/usuarios", headers=staff_headers).status_code == 200
    staff_projects = client.get("/proyectos", headers=staff_headers)
    assert staff_projects.status_code == 200
    assert {project["id"] for project in staff_projects.json()} >= {
        own_project_id,
        unrelated_project_id,
        semillero_project_id,
    }
    assert client.get(f"/proyectos/{unrelated_project_id}", headers=staff_headers).status_code == 200
    staff_semilleros = client.get("/semilleros", headers=staff_headers)
    own_staff_semillero = next(item for item in staff_semilleros.json() if item["id"] == own_semillero_id)
    assert {"documento", "email", "celular"}.issubset(own_staff_semillero["aprendices"][0])
    for path in (
        "/grupos",
        "/productos",
        "/convocatorias",
        "/cvlac/resumen-sistema",
        "/stats/analytics/evolucion?meses=1",
        "/stats/search/global?q=Semillero",
    ):
        assert client.get(path, headers=staff_headers).status_code == 200

    # Las operaciones administrativas y los reportes de usuarios respetan el rol.
    learner_stats = client.get("/usuarios/stats/resumen", headers=learner_headers)
    assert learner_stats.status_code == 403
    staff_stats = client.get("/usuarios/stats/resumen", headers=staff_headers)
    assert staff_stats.status_code == 200
    assert staff_stats.json()["total"] >= 4
    assert {item["rol"] for item in staff_stats.json()["por_rol"]} >= {
        "admin", "investigador", "aprendiz"
    }

    learner_toggle = client.post(
        f"/usuarios/{unrelated_aprendiz_id}/toggle-active",
        headers=learner_headers,
    )
    assert learner_toggle.status_code == 403
    disable_other_learner = client.post(
        f"/usuarios/{unrelated_aprendiz_id}/toggle-active",
        headers=staff_headers,
    )
    assert disable_other_learner.status_code == 200
    assert disable_other_learner.json()["is_active"] is False
    restore_other_learner = client.post(
        f"/usuarios/{unrelated_aprendiz_id}/toggle-active",
        headers=staff_headers,
    )
    assert restore_other_learner.status_code == 200
    assert restore_other_learner.json()["is_active"] is True
    assert client.post(
        "/usuarios/00000000-0000-0000-0000-000000000000/toggle-active",
        headers=staff_headers,
    ).status_code == 404

    assert client.post("/cvlac/subir-pdf", headers=learner_headers).status_code == 403
    cvlac_upload = client.post("/cvlac/subir-pdf", headers=staff_headers)
    assert cvlac_upload.status_code == 200
    assert cvlac_upload.json()["message"] == "CVLaC recibido correctamente y en proceso de revisión"

    learner_certificates = client.get(
        f"/plantillas/proyectos/{own_project_id}/certificados-masivos",
        headers=learner_headers,
    )
    assert learner_certificates.status_code == 403
    staff_certificates = client.get(
        f"/plantillas/proyectos/{own_project_id}/certificados-masivos",
        headers=staff_headers,
    )
    assert staff_certificates.status_code == 403
    admin_certificates = client.get(
        f"/plantillas/proyectos/{own_project_id}/certificados-masivos",
        headers=admin_headers,
    )
    assert admin_certificates.status_code == 200
    assert len(admin_certificates.json()) == 1
    assert admin_certificates.json()[0]["datos_usuario"]["nombre"] == "PEDRO APRENDIZ"
    assert admin_certificates.json()[0]["datos_usuario"]["horas"] == 12
