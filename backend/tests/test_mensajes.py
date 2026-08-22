import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from db_support import db_path_for, sqlite_url_for

TEST_DB_FILE = db_path_for("test_mensajes.db")
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
from app.models import User, Mensaje
from app.auth import get_current_user

engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create test users in DB
def setup_users():
    db = TestingSessionLocal()
    # Clean table
    db.query(Mensaje).delete()
    db.query(User).delete()
    db.commit()

    admin = User(
        id="11111111-1111-1111-1111-111111111111",
        email="admin_mensajes@sena.edu.co",
        nombre="Admin Mensajes",
        rol="admin",
        password_hash="fakehash",
        is_active=True,
        sede="CGAO"
    )
    investigador = User(
        id="22222222-2222-2222-2222-222222222222",
        email="investigador_mensajes@sena.edu.co",
        nombre="Investigador Líder",
        rol="investigador",
        rol_sennova="Investigador Principal",
        password_hash="fakehash",
        is_active=True,
        sede="CGAO"
    )
    aprendiz = User(
        id="33333333-3333-3333-3333-333333333333",
        email="aprendiz_mensajes@sena.edu.co",
        nombre="Aprendiz Semillero",
        rol="aprendiz",
        programa_formacion="ADSO",
        ficha="2691234",
        password_hash="fakehash",
        is_active=True,
        sede="CGAO"
    )
    db.add_all([admin, investigador, aprendiz])
    db.commit()
    db.close()

setup_users()

# Active logged-in user state
current_test_user = None

def override_get_current_user():
    return current_test_user

@pytest.fixture(autouse=True)
def setup_overrides():
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    yield
    app.dependency_overrides.clear()

client = TestClient(app)


def test_messaging_flow_between_all_roles():
    global current_test_user
    db = TestingSessionLocal()
    admin = db.query(User).filter(User.email == "admin_mensajes@sena.edu.co").first()
    investigador = db.query(User).filter(User.email == "investigador_mensajes@sena.edu.co").first()
    aprendiz = db.query(User).filter(User.email == "aprendiz_mensajes@sena.edu.co").first()
    db.close()

    # 1. Admin sends message to Investigador
    current_test_user = admin
    payload = {
        "destinatario_id": str(investigador.id),
        "asunto": "Revisión de entregable técnico",
        "contenido": "Hola, por favor revisa el entregable 2 del proyecto de robótica."
    }
    resp = client.post("/mensajes", json=payload)
    assert resp.status_code == 201
    msg1 = resp.json()
    assert msg1["contenido"] == payload["contenido"]
    assert msg1["remitente_id"] == str(admin.id)
    assert msg1["destinatario_id"] == str(investigador.id)
    assert msg1["leido"] is False

    # 2. Investigador checks unread count and conversations
    current_test_user = investigador
    unread_resp = client.get("/mensajes/unread-count")
    assert unread_resp.status_code == 200
    assert unread_resp.json()["no_leidos"] == 1

    conv_resp = client.get("/mensajes/conversaciones")
    assert conv_resp.status_code == 200
    convs = conv_resp.json()
    assert len(convs) == 1
    assert convs[0]["otro_usuario"]["id"] == str(admin.id)
    assert convs[0]["no_leidos"] == 1
    assert convs[0]["total_mensajes"] == 1

    # 3. Investigador replies to Admin
    reply_payload = {
        "destinatario_id": str(admin.id),
        "asunto": "Re: Revisión de entregable técnico",
        "contenido": "Recibido, ya lo estoy revisando con el equipo."
    }
    reply_resp = client.post("/mensajes", json=reply_payload)
    assert reply_resp.status_code == 201

    # 4. Investigador marks messages from Admin as read
    mark_resp = client.post(f"/mensajes/conversacion/{admin.id}/marcar-leidos")
    assert mark_resp.status_code == 200
    assert mark_resp.json()["marcados"] >= 1

    # Check unread count is now 0
    unread_resp2 = client.get("/mensajes/unread-count")
    assert unread_resp2.json()["no_leidos"] == 0

    # 5. Investigador sends message to Aprendiz
    msg_aprendiz_payload = {
        "destinatario_id": str(aprendiz.id),
        "asunto": "Tarea de bitácora",
        "contenido": "Por favor actualiza tu bitácora de la semana."
    }
    aprendiz_msg_resp = client.post("/mensajes", json=msg_aprendiz_payload)
    assert aprendiz_msg_resp.status_code == 201

    # 6. Aprendiz checks messages from Investigador
    current_test_user = aprendiz
    aprendiz_unread = client.get("/mensajes/unread-count")
    assert aprendiz_unread.json()["no_leidos"] == 1

    thread_resp = client.get(f"/mensajes/conversacion/{investigador.id}")
    assert thread_resp.status_code == 200
    thread = thread_resp.json()
    assert len(thread) == 1
    assert thread[0]["contenido"] == "Por favor actualiza tu bitácora de la semana."

    # 7. Aprendiz replies to Investigador
    current_test_user = aprendiz
    aprendiz_reply = {
        "destinatario_id": str(investigador.id),
        "contenido": "Listo profe, ya la he completado y firmado."
    }
    ap_reply_resp = client.post("/mensajes", json=aprendiz_reply)
    assert ap_reply_resp.status_code == 201

    # 8. Test list destinatarios for Aprendiz
    dest_resp = client.get("/mensajes/destinatarios")
    assert dest_resp.status_code == 200
    dests = dest_resp.json()
    dest_ids = [d["id"] for d in dests]
    assert str(aprendiz.id) not in dest_ids
    assert str(admin.id) in dest_ids
    assert str(investigador.id) in dest_ids

    # 9. Test validation: cannot send to self
    self_resp = client.post("/mensajes", json={"destinatario_id": str(aprendiz.id), "contenido": "Self test"})
    assert self_resp.status_code == 400

    # 10. Test validation: empty message
    empty_resp = client.post("/mensajes", json={"destinatario_id": str(admin.id), "contenido": "   "})
    assert empty_resp.status_code == 400

    # 11. Test stats endpoint
    current_test_user = admin
    stats_resp = client.get("/mensajes/stats")
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert "total_recibidos" in stats
    assert "no_leidos" in stats
    assert "total_enviados" in stats

    # 12. Test marking delivered status
    current_test_user = admin
    new_msg = client.post("/mensajes", json={
        "destinatario_id": str(investigador.id),
        "contenido": "Mensaje para probar entrega"
    }).json()
    assert new_msg["entregado"] is False or new_msg["entregado"] is True

    # Investigador marks delivered
    current_test_user = investigador
    deliv_resp = client.post(f"/mensajes/conversacion/{admin.id}/marcar-entregados")
    assert deliv_resp.status_code == 200
    assert deliv_resp.json()["success"] is True

    # 13. Test typing status endpoint
    typing_resp = client.post("/mensajes/typing", json={
        "destinatario_id": str(admin.id),
        "is_typing": True
    })
    assert typing_resp.status_code == 200
    assert typing_resp.json()["success"] is True

    # 14. Test delete message
    current_test_user = admin
    del_msg_resp = client.delete(f"/mensajes/{new_msg['id']}")
    assert del_msg_resp.status_code == 200
    assert del_msg_resp.json()["success"] is True


def test_broadcaster_service():
    import asyncio
    from app.services.realtime_broadcaster import MessageBroadcaster

    async def _test():
        b = MessageBroadcaster()
        uid = "test-user-uuid"
        q = await b.connect(uid)
        assert b.is_user_online(uid) is True

        await b.broadcast_to_user(uid, "test_event", {"hello": "world"})
        item = await asyncio.wait_for(q.get(), timeout=1.0)
        assert item["event"] == "test_event"
        assert item["data"]["hello"] == "world"

        await b.disconnect(uid, q)
        assert b.is_user_online(uid) is False

    asyncio.run(_test())


def test_notification_and_contacto_for_messages():
    global current_test_user
    from app.models import Notificacion

    db = TestingSessionLocal()
    admin = db.query(User).filter(User.email == "admin_mensajes@sena.edu.co").first()
    investigador = db.query(User).filter(User.email == "investigador_mensajes@sena.edu.co").first()
    db.close()

    # 1. Admin sends message to Investigador
    current_test_user = admin
    payload = {
        "destinatario_id": str(investigador.id),
        "asunto": "Notificación de Chat",
        "contenido": "Mensaje para verificar redirección al chat"
    }
    resp = client.post("/mensajes", json=payload)
    assert resp.status_code == 201

    # 2. Check notification in DB for Investigador has entidad_id == admin.id
    db = TestingSessionLocal()
    notif = db.query(Notificacion).filter(
        Notificacion.user_id == str(investigador.id),
        Notificacion.entidad_tipo == "mensaje"
    ).order_by(Notificacion.created_at.desc()).first()
    assert notif is not None
    assert notif.tipo == "mensaje"
    assert str(notif.entidad_id) == str(admin.id)
    assert "Admin Mensajes" in notif.titulo
    db.close()

    # 3. Test GET /mensajes/contacto/{otro_usuario_id}
    current_test_user = investigador
    contacto_resp = client.get(f"/mensajes/contacto/{admin.id}")
    assert contacto_resp.status_code == 200
    contacto = contacto_resp.json()
    assert contacto["id"] == str(admin.id)
    assert contacto["nombre"] == admin.nombre
    assert contacto["email"] == admin.email
    assert contacto["rol"] == admin.rol


def test_notification_synchronization_on_chat_read():
    """Verifica que al marcar mensajes de chat como leídos, las notificaciones in-app se sincronicen."""
    global current_test_user
    from app.models import Notificacion

    db = TestingSessionLocal()
    admin = db.query(User).filter(User.email == "admin_mensajes@sena.edu.co").first()
    investigador = db.query(User).filter(User.email == "investigador_mensajes@sena.edu.co").first()
    db.close()

    # 1. Admin envía mensaje a Investigador
    current_test_user = admin
    payload = {
        "destinatario_id": str(investigador.id),
        "asunto": "Prueba de sincronización",
        "contenido": "Hola investigador, este mensaje debe sincronizarse"
    }
    resp = client.post("/mensajes", json=payload)
    assert resp.status_code == 201

    # Comprobar que la notificación del investigador está como NO leída
    db = TestingSessionLocal()
    notif = db.query(Notificacion).filter(
        Notificacion.user_id == str(investigador.id),
        Notificacion.entidad_id == str(admin.id),
        Notificacion.tipo == "mensaje"
    ).order_by(Notificacion.created_at.desc()).first()
    assert notif is not None
    assert notif.leida is False
    db.close()

    # 2. Investigador abre el chat y marca la conversación como leída
    current_test_user = investigador
    mark_resp = client.post(f"/mensajes/conversacion/{admin.id}/marcar-leidos")
    assert mark_resp.status_code == 200

    # 3. Verificar que la notificación en la DB ahora está sincronizada como LEÍDA
    db = TestingSessionLocal()
    notif_updated = db.query(Notificacion).filter(
        Notificacion.id == notif.id
    ).first()
    assert notif_updated.leida is True
    assert notif_updated.fecha_lectura is not None
    db.close()


