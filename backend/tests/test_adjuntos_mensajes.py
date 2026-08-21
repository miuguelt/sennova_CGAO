"""Adjuntos de mensajería: subida, envío, acceso y borrado.

Comprueba el contrato completo: quién puede subir, quién puede descargar, cómo
viajan los adjuntos dentro del mensaje y qué ocurre en disco cuando el mensaje
se elimina.
"""

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from db_support import db_path_for, sqlite_url_for

TEST_DB_FILE = db_path_for("test_adjuntos_mensajes.db")
TEST_DB_URL = sqlite_url_for(TEST_DB_FILE)
os.environ.setdefault("DATABASE_URL", TEST_DB_URL)
os.environ.setdefault(
    "JWT_SECRET", "testsecretkey_long_enough_for_security_compliance_32_chars"
)

from app.auth import get_current_user  # noqa: E402
from app.database import Base, get_db  # noqa: E402
from app.database import engine as app_engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Mensaje, MensajeAdjunto, User  # noqa: E402
from app.services import attachment_storage as storage  # noqa: E402

Base.metadata.create_all(bind=app_engine)
SesionPrueba = sessionmaker(
    autocommit=False, autoflush=False,
    bind=create_engine(str(app_engine.url), connect_args={"check_same_thread": False}),
)

PNG = bytes.fromhex("89504e470d0a1a0a") + b"contenido-de-imagen" + b"\x00" * 32
PDF = b"%PDF-1.7\n" + b"contenido-de-informe" + b"\x00" * 32
MP4 = b"\x00\x00\x00\x20ftypisom" + b"contenido-de-video" + b"\x00" * 32
EXE = b"MZ\x90\x00" + b"\x00" * 32

REMITENTE = "cccccccc-0000-0000-0000-000000000001"
DESTINATARIO = "dddddddd-0000-0000-0000-000000000002"
AJENO = "eeeeeeee-0000-0000-0000-000000000003"

usuario_actual = None


def _sesion():
    db = SesionPrueba()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def entorno(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "RAIZ_ADJUNTOS", tmp_path / "adjuntos")

    db = SesionPrueba()
    db.query(MensajeAdjunto).delete()
    db.query(Mensaje).delete()
    db.query(User).filter(User.id.in_([REMITENTE, DESTINATARIO, AJENO])).delete(
        synchronize_session=False
    )
    db.add_all([
        User(id=REMITENTE, email="remitente_adj@sena.edu.co", nombre="Remitente",
             rol="investigador", password_hash="fakehash", is_active=True),
        User(id=DESTINATARIO, email="destinatario_adj@sena.edu.co", nombre="Destinataria",
             rol="aprendiz", password_hash="fakehash", is_active=True),
        User(id=AJENO, email="ajeno_adj@sena.edu.co", nombre="Ajeno",
             rol="investigador", password_hash="fakehash", is_active=True),
    ])
    db.commit()
    db.close()

    app.dependency_overrides[get_db] = _sesion
    app.dependency_overrides[get_current_user] = lambda: usuario_actual
    yield
    app.dependency_overrides.clear()


def _entrar(user_id: str):
    global usuario_actual
    db = SesionPrueba()
    usuario_actual = db.query(User).filter(User.id == user_id).first()
    db.close()
    return usuario_actual


client = TestClient(app)


def _subir(datos: bytes, nombre: str, content_type: str = "application/octet-stream"):
    return client.post(
        "/mensajes/adjuntos",
        files={"archivo": (nombre, datos, content_type)},
    )


def test_sube_imagen_documento_y_video():
    _entrar(REMITENTE)

    for datos, nombre, categoria in (
        (PNG, "captura.png", "imagen"),
        (PDF, "informe.pdf", "documento"),
        (MP4, "demostracion.mp4", "video"),
    ):
        respuesta = _subir(datos, nombre)
        assert respuesta.status_code == 201, respuesta.text
        cuerpo = respuesta.json()
        assert cuerpo["categoria"] == categoria
        assert cuerpo["nombre_archivo"] == nombre
        assert cuerpo["tamano_bytes"] == len(datos)
        assert cuerpo["id"]


def test_rechaza_formatos_no_admitidos():
    _entrar(REMITENTE)

    respuesta = _subir(EXE, "instalador.exe")
    assert respuesta.status_code == 400
    assert "admit" in respuesta.json()["detail"].lower()


def test_rechaza_archivo_que_supera_el_limite(monkeypatch):
    from app.services import attachment_policy as policy

    _entrar(REMITENTE)
    monkeypatch.setitem(policy.LIMITES, "imagen", 16)

    respuesta = _subir(PNG, "grande.png")
    assert respuesta.status_code == 413


def test_el_mensaje_viaja_con_sus_adjuntos():
    _entrar(REMITENTE)
    imagen = _subir(PNG, "captura.png").json()
    informe = _subir(PDF, "informe.pdf").json()

    envio = client.post("/mensajes", json={
        "destinatario_id": DESTINATARIO,
        "contenido": "Te comparto la evidencia",
        "adjunto_ids": [imagen["id"], informe["id"]],
    })
    assert envio.status_code == 201, envio.text
    adjuntos = envio.json()["adjuntos"]
    assert {a["nombre_archivo"] for a in adjuntos} == {"captura.png", "informe.pdf"}

    _entrar(DESTINATARIO)
    conversacion = client.get(f"/mensajes/conversacion/{REMITENTE}")
    assert conversacion.status_code == 200
    assert len(conversacion.json()[0]["adjuntos"]) == 2


def test_solo_remitente_y_destinatario_descargan():
    _entrar(REMITENTE)
    imagen = _subir(PNG, "captura.png").json()
    client.post("/mensajes", json={
        "destinatario_id": DESTINATARIO,
        "contenido": "Evidencia",
        "adjunto_ids": [imagen["id"]],
    })

    _entrar(DESTINATARIO)
    descarga = client.get(f"/mensajes/adjuntos/{imagen['id']}")
    assert descarga.status_code == 200
    assert descarga.content == PNG

    _entrar(AJENO)
    assert client.get(f"/mensajes/adjuntos/{imagen['id']}").status_code == 403


def test_no_se_puede_adjuntar_un_archivo_de_otro_usuario():
    _entrar(AJENO)
    ajeno = _subir(PDF, "informe.pdf").json()

    _entrar(REMITENTE)
    envio = client.post("/mensajes", json={
        "destinatario_id": DESTINATARIO,
        "contenido": "Intento de apropiación",
        "adjunto_ids": [ajeno["id"]],
    })
    assert envio.status_code in (400, 403)


def test_borrar_el_mensaje_libera_el_archivo_del_disco():
    _entrar(REMITENTE)
    imagen = _subir(PNG, "captura.png").json()
    mensaje = client.post("/mensajes", json={
        "destinatario_id": DESTINATARIO,
        "contenido": "Se borrará",
        "adjunto_ids": [imagen["id"]],
    }).json()

    db = SesionPrueba()
    registro = db.query(MensajeAdjunto).filter(MensajeAdjunto.id == imagen["id"]).first()
    ruta = storage.resolver_ruta(registro.storage_path)
    db.close()
    assert ruta.exists()

    assert client.delete(f"/mensajes/{mensaje['id']}").status_code == 200
    assert not ruta.exists()


def test_el_archivo_compartido_sobrevive_a_un_borrado_parcial():
    """Dos adjuntos con el mismo contenido comparten archivo por deduplicación."""
    _entrar(REMITENTE)
    primero = _subir(PDF, "informe.pdf").json()
    segundo = _subir(PDF, "informe-copia.pdf").json()

    mensaje_uno = client.post("/mensajes", json={
        "destinatario_id": DESTINATARIO, "contenido": "Uno",
        "adjunto_ids": [primero["id"]],
    }).json()
    client.post("/mensajes", json={
        "destinatario_id": DESTINATARIO, "contenido": "Dos",
        "adjunto_ids": [segundo["id"]],
    })

    db = SesionPrueba()
    registro = db.query(MensajeAdjunto).filter(MensajeAdjunto.id == segundo["id"]).first()
    ruta = storage.resolver_ruta(registro.storage_path)
    db.close()

    assert client.delete(f"/mensajes/{mensaje_uno['id']}").status_code == 200
    assert ruta.exists(), "el borrado de un mensaje no puede vaciar el adjunto del otro"
