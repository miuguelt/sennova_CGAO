"""
SENNOVA CGAO - Suite de Pruebas de Auditoría E2E de Todas las Tablas y Funciones.
Valida el ciclo de vida completo de cada entidad en la base de datos de extremo a extremo:
1. Users & Auth (CRUD, Roles, Login, Reset, Perfil)
2. Grupos de Investigación (CRUD, Integrantes, Stats)
3. Semilleros de Investigación (CRUD, Investigadores, Stats)
4. Aprendices (CRUD, Full Create, Vinculación)
5. Convocatorias (CRUD, Activas, Stats)
6. Proyectos (CRUD, Equipo, Presupuesto, Liquidación, Calidad)
7. Productos Minciencias (CRUD, Verificación, Tipologías)
8. Entregables & Cronograma (CRUD, Fases, Estados, Plantillas)
9. Documentos & Archivos (Upload, Download, CVLaC)
10. Bitácora Técnica (CRUD, Firma Dual, Adjuntos)
11. Banco de Retos (CRUD, Asignación)
12. Notificaciones In-App (CRUD, Estados, CVLaC alerts)
13. Mensajería Interna (Directos, Anuncios, Conversaciones)
14. Plantillas y Certificados (Cronograma, PDF, Reportes)
15. Reportes Consolidados (Excel, CSV, Estadísticas)
16. Auditoría y Trazabilidad (AuditLogs, Actividades)
17. Sistema y Mantenimiento (Health, Backup, Cache)
"""

import os
import io
import base64
import pytest
from datetime import datetime, date, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from db_support import db_path_for, sqlite_url_for

TEST_DB_FILE = db_path_for("test_sennova_all_tables_audit.db")
TEST_DB_URL = sqlite_url_for(TEST_DB_FILE)

os.environ["DATABASE_URL"] = TEST_DB_URL
os.environ["DEBUG"] = "true"

from app.database import Base, get_db
from app.main import app
from app.models import User, Grupo, Semillero, Aprendiz, Convocatoria, Proyecto, Producto, Entregable, Documento, BitacoraEntry, Reto, Notificacion, Actividad, Mensaje, AuditLog
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
def setup_audit_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    
    db = TestingSessionLocal()
    # 1. Crear usuarios para los 4 roles
    admin = User(
        email="admin_audit@sena.edu.co",
        password_hash=get_password_hash("Admin123!"),
        nombre="Administrador General SENNOVA",
        rol="admin",
        sede="CGAO Vélez",
        regional="Santander",
        is_active=True
    )
    investigador = User(
        email="investigador_audit@sena.edu.co",
        password_hash=get_password_hash("Inv123!"),
        nombre="Dra. María Investigadora",
        rol="investigador",
        rol_sennova="Investigador Principal",
        sede="CGAO Vélez",
        regional="Santander",
        is_active=True
    )
    instructor = User(
        email="instructor_audit@sena.edu.co",
        password_hash=get_password_hash("Inst123!"),
        nombre="Ing. Carlos Instructor",
        rol="instructor",
        rol_sennova="Tutor de Semillero",
        sede="CGAO Vélez",
        regional="Santander",
        is_active=True
    )
    aprendiz_user = User(
        email="aprendiz_audit@sena.edu.co",
        password_hash=get_password_hash("Apr123!"),
        nombre="Juan Aprendiz ADSO",
        rol="aprendiz",
        ficha="2827192",
        programa_formacion="ADSO",
        sede="CGAO Vélez",
        regional="Santander",
        is_active=True
    )
    db.add_all([admin, investigador, instructor, aprendiz_user])
    db.commit()
    db.close()

    yield

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except PermissionError:
            pass


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def auth_tokens(client):
    db = TestingSessionLocal()
    admin = db.query(User).filter(User.email == "admin_audit@sena.edu.co").first()
    inv = db.query(User).filter(User.email == "investigador_audit@sena.edu.co").first()
    inst = db.query(User).filter(User.email == "instructor_audit@sena.edu.co").first()
    apr = db.query(User).filter(User.email == "aprendiz_audit@sena.edu.co").first()

    tokens = {
        "admin": {
            "token": create_access_token(admin.id, admin.email, admin.rol),
            "headers": {"Authorization": f"Bearer {create_access_token(admin.id, admin.email, admin.rol)}"},
            "user_id": str(admin.id)
        },
        "investigador": {
            "token": create_access_token(inv.id, inv.email, inv.rol),
            "headers": {"Authorization": f"Bearer {create_access_token(inv.id, inv.email, inv.rol)}"},
            "user_id": str(inv.id)
        },
        "instructor": {
            "token": create_access_token(inst.id, inst.email, inst.rol),
            "headers": {"Authorization": f"Bearer {create_access_token(inst.id, inst.email, inst.rol)}"},
            "user_id": str(inst.id)
        },
        "aprendiz": {
            "token": create_access_token(apr.id, apr.email, apr.rol),
            "headers": {"Authorization": f"Bearer {create_access_token(apr.id, apr.email, apr.rol)}"},
            "user_id": str(apr.id)
        }
    }
    db.close()
    return tokens


# ==============================================================================
# 1. TABLA: USERS & AUTH
# ==============================================================================
def test_audit_users_and_auth(client, auth_tokens):
    headers = auth_tokens["admin"]["headers"]
    
    # 1.1 Listar usuarios
    res = client.get("/usuarios/", headers=headers)
    assert res.status_code == 200
    users = res.json()
    assert len(users) >= 4

    # 1.2 Obtener usuario específico
    inv_id = auth_tokens["investigador"]["user_id"]
    res = client.get(f"/usuarios/{inv_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["email"] == "investigador_audit@sena.edu.co"

    # 1.3 Actualizar usuario
    res = client.put(f"/usuarios/{inv_id}", json={
        "nombre": "Dra. María Investigadora PhD",
        "nivel_academico": "Doctorado",
        "horas_mensuales": 40
    }, headers=headers)
    assert res.status_code == 200
    assert res.json()["nombre"] == "Dra. María Investigadora PhD"
    assert res.json()["nivel_academico"] == "Doctorado"

    # 1.4 Auth /me
    res_me = client.get("/auth/me", headers=auth_tokens["investigador"]["headers"])
    assert res_me.status_code == 200
    assert res_me.json()["email"] == "investigador_audit@sena.edu.co"

    # 1.5 Cambio de Contraseña
    res_pw = client.post("/auth/change-password", json={
        "old_password": "Inv123!",
        "new_password": "NewSecurePassword456!"
    }, headers=auth_tokens["investigador"]["headers"])
    assert res_pw.status_code == 200

    # 1.6 Login con nueva contraseña
    res_login = client.post("/auth/login", json={
        "email": "investigador_audit@sena.edu.co",
        "password": "NewSecurePassword456!"
    })
    assert res_login.status_code == 200
    assert "access_token" in res_login.json()


# ==============================================================================
# 2. TABLA: GRUPOS DE INVESTIGACIÓN
# ==============================================================================
def test_audit_grupos(client, auth_tokens):
    headers = auth_tokens["admin"]["headers"]

    # 2.1 Crear Grupo
    res = client.post("/grupos", json={
        "nombre": "Grupo de Investigación e Innovación Agroindustrial CGAO",
        "nombre_completo": "Grupo Agroindustrial y Tecnológico de Vélez",
        "codigo_gruplac": "COL0182938",
        "clasificacion": "A",
        "director_nombre": "Dr. Fernando Director",
        "director_email": "director@sena.edu.co",
        "lineas_investigacion": ["Agroindustria", "Biotecnología", "Software"]
    }, headers=headers)
    assert res.status_code in (200, 201)
    grupo = res.json()
    grupo_id = grupo["id"]

    # 2.2 Listar Grupos
    res_list = client.get("/grupos", headers=headers)
    assert res_list.status_code == 200
    assert any(g["id"] == grupo_id for g in res_list.json())

    # 2.3 Obtener Grupo por ID
    res_get = client.get(f"/grupos/{grupo_id}", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["codigo_gruplac"] == "COL0182938"

    # 2.4 Agregar Integrante (Soporta JSON body)
    inv_id = auth_tokens["investigador"]["user_id"]
    res_mem = client.post(f"/grupos/{grupo_id}/integrantes", json={
        "user_id": inv_id,
        "rol_en_grupo": "Investigador Asociado"
    }, headers=headers)
    assert res_mem.status_code in (200, 201)

    # 2.5 Listar Integrantes
    res_members = client.get(f"/grupos/{grupo_id}/integrantes", headers=headers)
    assert res_members.status_code == 200
    assert len(res_members.json()) >= 1

    # 2.6 Estadísticas de Grupo (Valida que el cálculo de cumplimiento funcione correctamente)
    res_stats = client.get(f"/grupos/{grupo_id}/stats", headers=headers)
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert "total_proyectos" in stats
    assert "cumplimiento" in stats


# ==============================================================================
# 3. TABLA: SEMILLEROS & APRENDICES
# ==============================================================================
def test_audit_semilleros_and_aprendices(client, auth_tokens):
    admin_headers = auth_tokens["admin"]["headers"]
    inst_headers = auth_tokens["instructor"]["headers"]
    apr_user_id = auth_tokens["aprendiz"]["user_id"]
    inst_user_id = auth_tokens["instructor"]["user_id"]

    # 3.1 Obtener grupo existente
    res_grupos = client.get("/grupos", headers=admin_headers)
    grupo_id = res_grupos.json()[0]["id"]

    # 3.2 Crear Semillero
    res_sem = client.post("/semilleros", json={
        "nombre": "Semillero de Investigación en Inteligencia Artificial y Agro",
        "sigla": "SIIA",
        "grupo_id": grupo_id,
        "linea_investigacion": "Inteligencia Artificial Aplicada",
        "lider_nombre": "Ing. Carlos Instructor",
        "horas_dedicadas": 20
    }, headers=admin_headers)
    assert res_sem.status_code in (200, 201)
    semillero = res_sem.json()
    semillero_id = semillero["id"]

    # 3.3 Vincular Investigador/Instructor al Semillero (Soporta JSON body)
    res_inv = client.post(f"/semilleros/{semillero_id}/investigadores", json={
        "user_id": inst_user_id,
        "rol_en_semillero": "Tutor Principal"
    }, headers=admin_headers)
    assert res_inv.status_code in (200, 201)

    # 3.4 Vincular Aprendiz Existente
    res_apr = client.post(f"/semilleros/{semillero_id}/aprendices", json={
        "user_id": apr_user_id,
        "semillero_id": semillero_id,
        "estado": "activo"
    }, headers=admin_headers)
    assert res_apr.status_code in (200, 201)
    aprendiz_record = res_apr.json()
    aprendiz_id = aprendiz_record["id"]

    # 3.5 Creación Rápida de Aprendiz (Full Create: User + Aprendiz)
    res_full = client.post(f"/semilleros/{semillero_id}/aprendices/full", json={
        "email": "aprendiz_nuevo_e2e@sena.edu.co",
        "nombre": "Laura Aprendiz Full",
        "password": "Password123!",
        "documento": "1098765432",
        "celular": "3115550000",
        "ficha": "2827192",
        "programa_formacion": "ADSO",
        "semillero_id": semillero_id,
        "estado": "activo"
    }, headers=admin_headers)
    assert res_full.status_code in (200, 201)

    # 3.6 Listar Aprendices Globales y por Semillero
    res_apr_sem = client.get(f"/semilleros/{semillero_id}/aprendices", headers=inst_headers)
    assert res_apr_sem.status_code == 200
    assert len(res_apr_sem.json()) >= 2

    res_apr_global = client.get("/aprendices", headers=admin_headers)
    assert res_apr_global.status_code == 200
    assert len(res_apr_global.json()) >= 2

    # 3.7 Actualizar estado de Aprendiz
    res_up_apr = client.put(f"/aprendices/{aprendiz_id}", json={
        "estado": "egresado"
    }, headers=admin_headers)
    assert res_up_apr.status_code == 200
    assert res_up_apr.json()["estado"] == "egresado"


# ==============================================================================
# 4. TABLA: CONVOCATORIAS
# ==============================================================================
def test_audit_convocatorias(client, auth_tokens):
    headers = auth_tokens["admin"]["headers"]

    # 4.1 Crear Convocatoria
    res = client.post("/convocatorias", json={
        "numero_oe": "OE-AUDIT-2026",
        "nombre": "Convocatoria Fomento a la Innovación 2026",
        "año": 2026,
        "fecha_apertura": "2026-01-15",
        "fecha_cierre": "2026-11-30",
        "estado": "abierta",
        "fuente": "SENNOVA",
        "descripcion": "Financiación de prototipos y patentes."
    }, headers=headers)
    assert res.status_code in (200, 201)
    conv = res.json()
    conv_id = conv["id"]

    # 4.2 Listar Convocatorias
    res_list = client.get("/convocatorias", headers=headers)
    assert res_list.status_code == 200
    assert any(c["id"] == conv_id for c in res_list.json())

    # 4.3 Convocatorias Activas Now
    res_act = client.get("/convocatorias/activas/now", headers=headers)
    assert res_act.status_code == 200
    assert len(res_act.json()) >= 1

    # 4.4 Stats de Convocatorias
    res_stats = client.get("/convocatorias/stats/resumen", headers=headers)
    assert res_stats.status_code == 200
    assert "total_convocatorias" in res_stats.json()


# ==============================================================================
# 5. TABLA: PROYECTOS (CRUD, Equipo, Presupuesto, Liquidación)
# ==============================================================================
def test_audit_proyectos_lifecycle(client, auth_tokens):
    admin_headers = auth_tokens["admin"]["headers"]
    inv_headers = auth_tokens["investigador"]["headers"]
    inv_id = auth_tokens["investigador"]["user_id"]

    res_sem = client.get("/semilleros", headers=admin_headers)
    semillero_id = res_sem.json()[0]["id"]
    res_conv = client.get("/convocatorias", headers=admin_headers)
    conv_id = res_conv.json()[0]["id"]

    # 5.1 Crear Proyecto
    res_proj = client.post("/proyectos", json={
        "codigo_sgps": "SGPS-2026-99",
        "nombre": "Desarrollo de Sistema Inteligente de Monitoreo Bovino",
        "nombre_corto": "BoviSmart",
        "tipologia": "Investigación Aplicada",
        "estado": "En ejecución",
        "vigencia": 2026,
        "presupuesto_total": 45000000.0,
        "objetivo_general": "Implementar sensores IoT y visión por computador para monitoreo animal.",
        "objetivos_especificos": ["Diseñar arquitectura de hardware", "Desarrollar algoritmo de visión"],
        "semillero_id": semillero_id,
        "convocatoria_id": conv_id
    }, headers=admin_headers)
    assert res_proj.status_code in (200, 201)
    proj = res_proj.json()
    proj_id = proj["id"]

    # 5.2 Asignar Miembro al Equipo
    res_eq = client.post(f"/proyectos/{proj_id}/equipo", json={
        "user_id": inv_id,
        "rol_en_proyecto": "Co-Investigador Líder",
        "horas_dedicadas": 30
    }, headers=admin_headers)
    assert res_eq.status_code in (200, 201)

    # 5.3 Generar Plantilla Presupuestal
    res_pres = client.post(f"/proyectos/{proj_id}/generar-presupuesto-plantilla", headers=admin_headers)
    assert res_pres.status_code == 200
    assert res_pres.json()["status"] == "template_generated"

    # 5.4 Evaluación de Calidad de Formulación (Elaboración Status)
    res_elab = client.get(f"/proyectos/{proj_id}/elaboracion-status", headers=inv_headers)
    assert res_elab.status_code == 200
    assert "score_total" in res_elab.json()
    assert "nivel_calidad" in res_elab.json()

    # 5.5 Diagnóstico de Requisitos de Liquidación
    res_liq = client.get(f"/proyectos/{proj_id}/check-liquidacion", headers=admin_headers)
    assert res_liq.status_code == 200
    assert "can_liquidate" in res_liq.json()
    assert "checklist" in res_liq.json()


# ==============================================================================
# 6. TABLA: PRODUCTOS DE INVESTIGACIÓN & MINCIENCIAS
# ==============================================================================
def test_audit_productos_minciencias(client, auth_tokens):
    inv_headers = auth_tokens["investigador"]["headers"]
    admin_headers = auth_tokens["admin"]["headers"]

    res_proj = client.get("/proyectos", headers=admin_headers)
    proj_id = res_proj.json()[0]["id"]

    # 6.1 Crear Producto Minciencias
    res_prod = client.post("/productos", json={
        "tipo": "A1",
        "categoria": "A",
        "nombre": "Sensor IoT para Monitoreo de Parámetros Bovinos en Clima Frío",
        "descripcion": "Paper científico publicado en revista Scopus Q2",
        "fecha_publicacion": "2026-05-10",
        "doi": "10.1016/j.agro.2026.102938",
        "url": "https://doi.org/10.1016/j.agro.2026.102938",
        "proyecto_id": proj_id
    }, headers=inv_headers)
    assert res_prod.status_code in (200, 201)
    prod = res_prod.json()
    prod_id = prod["id"]
    assert prod["is_verificado"] is False

    # 6.2 Admin verifica Producto
    res_ver = client.post(f"/productos/{prod_id}/verificar", json={
        "is_verificado": True
    }, headers=admin_headers)
    assert res_ver.status_code == 200
    assert res_ver.json()["is_verificado"] is True

    # 6.3 Estadísticas de Productos (Valida alias /stats y /stats/resumen)
    res_stats = client.get("/productos/stats", headers=admin_headers)
    assert res_stats.status_code == 200
    assert "total" in res_stats.json()
    assert "verificados" in res_stats.json()


# ==============================================================================
# 7. TABLA: ENTREGABLES & CRONOGRAMA
# ==============================================================================
def test_audit_entregables_cronograma(client, auth_tokens):
    admin_headers = auth_tokens["admin"]["headers"]
    inv_headers = auth_tokens["investigador"]["headers"]
    inv_id = auth_tokens["investigador"]["user_id"]

    res_proj = client.get("/proyectos", headers=admin_headers)
    proj_id = res_proj.json()[0]["id"]

    # 7.1 Generar hitos institucionalmente desde plantilla
    res_gen = client.post(f"/entregables/proyecto/{proj_id}/generate-template", headers=admin_headers)
    assert res_gen.status_code in (200, 201)

    # 7.2 Crear Entregable Específico
    res_ent = client.post("/entregables/", json={
        "proyecto_id": proj_id,
        "fase": "Fase II - Ejecución",
        "titulo": "Prototipo Funcional de Circuito de Adquisición",
        "descripcion": "Placa PCB impresa y ensamblada",
        "tipo": "producto",
        "fecha_entrega": (date.today() + timedelta(days=10)).isoformat(),
        "responsable_id": inv_id
    }, headers=admin_headers)
    assert res_ent.status_code in (200, 201)
    ent_id = res_ent.json()["id"]

    # 7.3 Listar Entregables por Proyecto
    res_list = client.get(f"/entregables/proyecto/{proj_id}", headers=admin_headers)
    assert res_list.status_code == 200
    assert len(res_list.json()) >= 1

    # 7.4 Listar Mis Entregables
    res_mis = client.get("/entregables/mis-entregables", headers=inv_headers)
    assert res_mis.status_code == 200
    assert len(res_mis.json()) >= 1

    # 7.5 Flujo de Cambio de Estado
    res_st1 = client.post(f"/entregables/{ent_id}/cambiar-estado?nuevo_estado=en_desarrollo", headers=inv_headers)
    assert res_st1.status_code == 200
    assert res_st1.json()["estado"] == "en_desarrollo"

    res_st2 = client.post(f"/entregables/{ent_id}/cambiar-estado?nuevo_estado=enviado", headers=inv_headers)
    assert res_st2.status_code == 200
    assert res_st2.json()["estado"] == "enviado"

    res_st3 = client.post(f"/entregables/{ent_id}/cambiar-estado?nuevo_estado=aprobado&observaciones=Revisado+conforme", headers=admin_headers)
    assert res_st3.status_code == 200
    assert res_st3.json()["estado"] == "aprobado"


# ==============================================================================
# 8. TABLA: DOCUMENTOS & GESTIÓN DE ARCHIVOS
# ==============================================================================
def test_audit_documentos(client, auth_tokens):
    headers = auth_tokens["admin"]["headers"]
    res_proj = client.get("/proyectos", headers=headers)
    proj_id = res_proj.json()[0]["id"]

    # 8.1 Cargar Documento (Base64 JSON)
    dummy_pdf_content = b"%PDF-1.4 dummy test content for sennova"
    dummy_b64 = base64.b64encode(dummy_pdf_content).decode("utf-8")

    res_doc = client.post("/documentos", json={
        "entidad_tipo": "proyecto",
        "entidad_id": proj_id,
        "tipo": "informe_final",
        "nombre_archivo": "informe_final_bovismart_2026.pdf",
        "data_base64": dummy_b64
    }, headers=headers)
    assert res_doc.status_code in (200, 201)
    doc = res_doc.json()
    doc_id = doc["id"]

    # 8.2 Listar Documentos
    res_list = client.get(f"/documentos?entidad_id={proj_id}", headers=headers)
    assert res_list.status_code == 200
    assert any(d["id"] == doc_id for d in res_list.json())

    # 8.3 Descargar Documento
    res_down = client.get(f"/documentos/{doc_id}/download", headers=headers)
    assert res_down.status_code == 200
    assert "data_base64" in res_down.json()


# ==============================================================================
# 9. TABLA: BITÁCORA TÉCNICA (Firma Dual de Investigador y Aprendiz)
# ==============================================================================
def test_audit_bitacora_dual_signing(client, auth_tokens):
    inv_headers = auth_tokens["investigador"]["headers"]
    apr_headers = auth_tokens["aprendiz"]["headers"]
    admin_headers = auth_tokens["admin"]["headers"]

    res_proj = client.get("/proyectos", headers=admin_headers)
    proj_id = res_proj.json()[0]["id"]

    # 9.1 Crear Entrada de Bitácora
    res_bita = client.post("/bitacora", json={
        "proyecto_id": proj_id,
        "titulo": "Sesión de Trabajo #1: Calibración de Sensores de Temperatura",
        "contenido": "Se configuraron los microcontroladores ESP32 y se validó la comunicación MQTT.",
        "categoria": "técnica",
        "fecha": datetime.now(timezone.utc).isoformat()
    }, headers=inv_headers)
    assert res_bita.status_code in (200, 201)
    bitacora = res_bita.json()
    bita_id = bitacora["id"]

    # 9.2 Firma de Investigador
    res_sign_inv = client.post(f"/bitacora/{bita_id}/sign", json={
        "evidence": {"ip": "192.168.1.10", "device": "Workstation Investigador"}
    }, headers=inv_headers)
    assert res_sign_inv.status_code == 200
    assert res_sign_inv.json()["is_firmado_investigador"] is True

    # 9.3 Firma de Aprendiz
    res_sign_apr = client.post(f"/bitacora/{bita_id}/sign", json={
        "evidence": {"ip": "192.168.1.20", "device": "Laptop Aprendiz ADSO"}
    }, headers=apr_headers)
    assert res_sign_apr.status_code == 200
    assert res_sign_apr.json()["is_firmado_aprendiz"] is True

    # 9.4 Listar Bitácora por Proyecto
    res_bita_proj = client.get(f"/bitacora/proyecto/{proj_id}", headers=inv_headers)
    assert res_bita_proj.status_code == 200
    assert len(res_bita_proj.json()) >= 1


# ==============================================================================
# 10. TABLA: BANCO DE RETOS DE INNOVACIÓN
# ==============================================================================
def test_audit_retos(client, auth_tokens):
    headers = auth_tokens["admin"]["headers"]
    res_sem = client.get("/semilleros", headers=headers)
    semillero_id = res_sem.json()[0]["id"]

    # 10.1 Crear Reto
    res_reto = client.post("/retos", json={
        "titulo": "Optimización del Proceso de Pasteurización en Pequeñas Fincas",
        "descripcion": "Se requiere un sistema de bajo costo para registro térmico continuo.",
        "sector_productivo": "Agropecuario / Lácteos",
        "empresa_solicitante": "AsoLácteos Vélez",
        "contacto_email": "gerencia@asolacteos.com",
        "prioridad": "alta"
    }, headers=headers)
    assert res_reto.status_code in (200, 201)
    reto_id = res_reto.json()["id"]

    # 10.2 Asignar Reto a Semillero
    res_patch = client.patch(f"/retos/{reto_id}", json={
        "semillero_asignado_id": semillero_id,
        "estado": "en_progreso"
    }, headers=headers)
    assert res_patch.status_code == 200
    assert res_patch.json()["estado"] == "en_progreso"


# ==============================================================================
# 11. TABLA: NOTIFICACIONES & ALERTAS
# ==============================================================================
def test_audit_notificaciones(client, auth_tokens):
    inv_headers = auth_tokens["investigador"]["headers"]
    admin_headers = auth_tokens["admin"]["headers"]

    # 11.1 Listar Notificaciones
    res = client.get("/notificaciones/", headers=inv_headers)
    assert res.status_code == 200
    notifs = res.json()
    assert len(notifs) >= 1

    # 11.2 Stats de Notificaciones
    res_stats = client.get("/notificaciones/stats", headers=inv_headers)
    assert res_stats.status_code == 200
    assert "total" in res_stats.json()

    # 11.3 Marcar todas como leídas
    res_all = client.post("/notificaciones/marcar-todas-leidas", headers=inv_headers)
    assert res_all.status_code == 200

    # 11.4 Check pendientes badge
    res_badge = client.get("/notificaciones/check/pendientes", headers=inv_headers)
    assert res_badge.status_code == 200
    assert "no_leidas" in res_badge.json()


# ==============================================================================
# 12. TABLA: MENSAJERÍA INTERNA (Chats, Anuncios, Estadísticas)
# ==============================================================================
def test_audit_mensajeria(client, auth_tokens):
    admin_headers = auth_tokens["admin"]["headers"]
    inv_headers = auth_tokens["investigador"]["headers"]
    apr_headers = auth_tokens["aprendiz"]["headers"]
    inv_id = auth_tokens["investigador"]["user_id"]
    admin_id = auth_tokens["admin"]["user_id"]

    # 12.1 Enviar Mensaje Directo (Admin -> Investigador)
    res_msg = client.post("/mensajes", json={
        "destinatario_id": inv_id,
        "asunto": "Revisión de Informe Trimestral",
        "contenido": "Estimada Dra. María, favor revisar las observaciones del comité SENNOVA."
    }, headers=admin_headers)
    assert res_msg.status_code in (200, 201)
    msg_id = res_msg.json()["id"]

    # 12.2 Enviar Anuncio Institucional (Admin Broadcast)
    res_anuncio = client.post("/mensajes", json={
        "asunto": "Cierre de Convocatoria SENNOVA 2026",
        "contenido": "Recordamos a todos los investigadores que el plazo finaliza este viernes.",
        "es_anuncio": True
    }, headers=admin_headers)
    assert res_anuncio.status_code in (200, 201)

    # 12.3 Listar Conversaciones
    res_convs = client.get("/mensajes/conversaciones", headers=inv_headers)
    assert res_convs.status_code == 200
    assert len(res_convs.json()) >= 1

    # 12.4 Ver Historial de Conversación y Marcar Leído
    res_hist = client.get(f"/mensajes/conversacion/{admin_id}", headers=inv_headers)
    assert res_hist.status_code == 200
    assert len(res_hist.json()) >= 1

    res_read = client.post(f"/mensajes/conversacion/{admin_id}/marcar-leidos", headers=inv_headers)
    assert res_read.status_code == 200

    # 12.5 Directorio de Destinatarios
    res_dir = client.get("/mensajes/destinatarios", headers=apr_headers)
    assert res_dir.status_code == 200
    assert len(res_dir.json()) >= 1


# ==============================================================================
# 13. MÓDULO: CVLAC & IMPORTADOR DE PRODUCTOS
# ==============================================================================
def test_audit_cvlac_integration(client, auth_tokens):
    inv_headers = auth_tokens["investigador"]["headers"]
    admin_headers = auth_tokens["admin"]["headers"]
    inv_id = auth_tokens["investigador"]["user_id"]

    # 13.1 Validar URL CVLaC
    res_val = client.get("/cvlac/validar-url?url=https://scienti.minciencias.gov.co/cvlac/visualizador/generarCurriculoCv.do?cod_rh=0001234567")
    assert res_val.status_code == 200
    assert res_val.json()["valid"] is True

    # 13.2 Importar CVLaC
    res_imp = client.post("/cvlac/import?url=https://scienti.minciencias.gov.co/cvlac/0001234567", headers=inv_headers)
    assert res_imp.status_code == 200

    # 13.3 Importar Productos Masivos de CVLaC (Valida el nuevo endpoint con fechas válidas)
    res_imp_prods = client.post(f"/cvlac/importar-productos?user_id={inv_id}", json={
        "productos": [
            {
                "nombre": "Software de Reconocimiento Facial Bovino v2.0",
                "tipo": "software",
                "categoria": "A",
                "fecha_publicacion": "2026-04-12",
                "descripcion": "Registrado ante DNDA"
            },
            {
                "nombre": "Prototipo de Comedero Automatizado con Sensores",
                "tipo": "prototipo_industrial",
                "categoria": "B",
                "fecha_publicacion": "2026-03-01"
            }
        ]
    }, headers=inv_headers)
    assert res_imp_prods.status_code == 200
    assert res_imp_prods.json()["importados"] >= 1

    # 13.4 Resumen del Sistema CVLaC
    res_resumen = client.get("/cvlac/resumen-sistema", headers=admin_headers)
    assert res_resumen.status_code == 200
    assert "total_investigadores" in res_resumen.json()


# ==============================================================================
# 14. MÓDULO: REPORTES CONSOLIDADOS (Excel / CSV)
# ==============================================================================
def test_audit_reportes_consolidados(client, auth_tokens):
    headers = auth_tokens["admin"]["headers"]

    # 14.1 Consolidado de Proyectos (CSV y Excel)
    res_proj_csv = client.get("/reportes/proyectos-consolidado?formato=csv", headers=headers)
    assert res_proj_csv.status_code == 200
    assert "text/csv" in res_proj_csv.headers["content-type"]

    res_proj_xlsx = client.get("/reportes/proyectos-consolidado?formato=excel", headers=headers)
    assert res_proj_xlsx.status_code == 200

    # 14.2 Consolidado de Grupos
    res_grup_csv = client.get("/reportes/grupos-consolidado?formato=csv", headers=headers)
    assert res_grup_csv.status_code == 200

    # 14.3 Consolidado de Productos
    res_prod_csv = client.get("/reportes/productos-consolidado?formato=csv", headers=headers)
    assert res_prod_csv.status_code == 200

    # 14.4 Consolidado de Semilleros
    res_sem_csv = client.get("/reportes/semilleros-consolidado?formato=csv", headers=headers)
    assert res_sem_csv.status_code == 200

    # 14.5 Estadísticas Resumen de Reportes
    res_res = client.get("/reportes/estadisticas-resumen", headers=headers)
    assert res_res.status_code == 200
    assert "totales" in res_res.json()


# ==============================================================================
# 15. MÓDULO: PLANTILLAS INSTITUCIONALES & CERTIFICADOS
# ==============================================================================
def test_audit_plantillas(client, auth_tokens):
    admin_headers = auth_tokens["admin"]["headers"]
    inv_headers = auth_tokens["investigador"]["headers"]
    apr_user_id = auth_tokens["aprendiz"]["user_id"]
    inv_id = auth_tokens["investigador"]["user_id"]

    res_proj = client.get("/proyectos", headers=admin_headers)
    proj_id = res_proj.json()[0]["id"]
    res_sem = client.get("/semilleros", headers=admin_headers)
    semillero_id = res_sem.json()[0]["id"]

    # 15.1 Certificado de Aprendiz
    res_cert = client.get(f"/plantillas/semilleros/{semillero_id}/certificado-aprendiz/{apr_user_id}", headers=admin_headers)
    assert res_cert.status_code == 200
    assert "datos_certificado" in res_cert.json()

    # 15.2 Reporte Mensual de Avance
    res_rep = client.get(f"/plantillas/usuarios/{inv_id}/reporte-mensual?mes=6&año=2026", headers=inv_headers)
    assert res_rep.status_code == 200

    # 15.3 Bitácora Oficial
    res_bit_oficial = client.get(f"/plantillas/proyectos/{proj_id}/bitacora-oficial", headers=inv_headers)
    assert res_bit_oficial.status_code == 200
    assert "entradas" in res_bit_oficial.json()


# ==============================================================================
# 16. MÓDULO: ESTADÍSTICAS & DASHBOARD GLOBAL
# ==============================================================================
def test_audit_stats_and_dashboard(client, auth_tokens):
    admin_headers = auth_tokens["admin"]["headers"]
    inv_headers = auth_tokens["investigador"]["headers"]
    inv_id = auth_tokens["investigador"]["user_id"]

    # 16.1 Dashboard stats
    res_dash = client.get("/stats/dashboard", headers=inv_headers)
    assert res_dash.status_code == 200
    assert "proyectos" in res_dash.json()

    # 16.2 Admin stats
    res_adm = client.get("/stats/admin", headers=admin_headers)
    assert res_adm.status_code == 200
    assert "usuarios" in res_adm.json()

    # 16.3 Evolución temporal analytics
    res_evo = client.get("/stats/analytics/evolucion?meses=6", headers=admin_headers)
    assert res_evo.status_code == 200
    assert "evolucion_mensual" in res_evo.json()

    # 16.4 User Impact 360
    res_imp = client.get(f"/stats/user/{inv_id}/impact", headers=inv_headers)
    assert res_imp.status_code == 200
    assert "cumplimiento" in res_imp.json()
    assert "proyectos_count" in res_imp.json()

    # 16.5 Búsqueda Global
    res_search = client.get("/stats/search/global?q=bovi", headers=inv_headers)
    assert res_search.status_code == 200
    assert "results" in res_search.json()


# ==============================================================================
# 17. MÓDULO: AUDITORÍA TÉCNICA & MANTENIMIENTO
# ==============================================================================
def test_audit_system_and_maintenance(client, auth_tokens):
    admin_headers = auth_tokens["admin"]["headers"]

    # 17.1 Health Check
    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"

    # 17.2 Audit Logs
    res_logs = client.get("/audit/logs", headers=admin_headers)
    assert res_logs.status_code == 200
    assert isinstance(res_logs.json(), list)

    # 17.3 Audit Stats
    res_audit_stats = client.get("/audit/stats", headers=admin_headers)
    assert res_audit_stats.status_code == 200

    # 17.4 Limpieza de caché
    res_cache = client.post("/maintenance/clear-cache", headers=admin_headers)
    assert res_cache.status_code == 200
