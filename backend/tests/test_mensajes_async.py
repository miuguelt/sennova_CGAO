"""Regression suite for the asynchronous behaviour of the messaging module.

Three defects are covered here, all of them invisible with a single user and
fatal with a handful of them:

1. the SSE stream used to keep a pooled DB connection checked out for the whole
   lifetime of the connection, so N concurrent listeners drained the pool;
2. the endpoints declared ``async def`` while issuing blocking SQLAlchemy calls,
   which serialised every request on the event loop;
3. the audit middleware wrote one row per request from inside the event loop,
   including the ``typing`` signal fired on every keystroke.
"""

import asyncio
import os
import time
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

from db_support import db_path_for, sqlite_url_for

TEST_DB_FILE = db_path_for("test_mensajes_async.db")
os.environ.setdefault("DATABASE_URL", sqlite_url_for(TEST_DB_FILE))
os.environ.setdefault(
    "JWT_SECRET", "testsecretkey_long_enough_for_security_compliance_32_chars"
)

from app.auth import create_access_token  # noqa: E402
from app.database import Base, SessionLocal, get_db  # noqa: E402
from app.database import engine as app_engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import AuditLog, Mensaje, User  # noqa: E402

Base.metadata.create_all(bind=app_engine)

# A one-connection pool makes the leak deterministic: if the stream holds its
# connection, no other request can obtain one and the pool times out.
limited_engine = create_engine(
    str(app_engine.url),
    connect_args={"check_same_thread": False},
    poolclass=QueuePool,
    pool_size=1,
    max_overflow=0,
    pool_timeout=1,
)
LimitedSession = sessionmaker(autocommit=False, autoflush=False, bind=limited_engine)

EMISOR_ID = "aaaaaaaa-0000-0000-0000-000000000001"
RECEPTOR_ID = "bbbbbbbb-0000-0000-0000-000000000002"


def _limited_get_db():
    """Sesión sobre el pool de una sola conexión (solo para la prueba de pool)."""
    db = LimitedSession()
    try:
        yield db
    finally:
        db.close()


def _get_db_de_pruebas():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def usuarios_y_overrides():
    db = SessionLocal()
    db.query(Mensaje).filter(
        Mensaje.remitente_id.in_([EMISOR_ID, RECEPTOR_ID])
    ).delete(synchronize_session=False)
    db.query(User).filter(User.id.in_([EMISOR_ID, RECEPTOR_ID])).delete(
        synchronize_session=False
    )
    db.add_all(
        [
            User(
                id=EMISOR_ID,
                email="emisor_async@sena.edu.co",
                nombre="Emisor Asíncrono",
                rol="investigador",
                password_hash="fakehash",
                is_active=True,
            ),
            User(
                id=RECEPTOR_ID,
                email="receptor_async@sena.edu.co",
                nombre="Receptor Asíncrono",
                rol="aprendiz",
                password_hash="fakehash",
                is_active=True,
            ),
        ]
    )
    db.commit()
    db.close()

    app.dependency_overrides[get_db] = _get_db_de_pruebas
    yield
    app.dependency_overrides.clear()


def _token(user_id: str, email: str, rol: str) -> str:
    return create_access_token(uuid.UUID(user_id), email, rol)


def _emisor_headers() -> dict:
    return {
        "Authorization": f"Bearer {_token(EMISOR_ID, 'emisor_async@sena.edu.co', 'investigador')}"
    }


def _contar_auditoria() -> int:
    db = SessionLocal()
    try:
        return db.query(AuditLog).count()
    finally:
        db.close()


class _StreamDriver:
    """Conduce el ASGI directamente: httpx acumula el cuerpo completo y un SSE
    infinito nunca termina, así que el transporte de pruebas no sirve aquí."""

    def __init__(self, path: str):
        self.scope = {
            "type": "http",
            "asgi": {"version": "3.0", "spec_version": "2.1"},
            "http_version": "1.1",
            "method": "GET",
            "scheme": "http",
            "path": path.split("?")[0],
            "raw_path": path.encode(),
            "query_string": path.partition("?")[2].encode(),
            "root_path": "",
            "headers": [(b"host", b"test"), (b"accept", b"text/event-stream")],
            "client": ("127.0.0.1", 12345),
            "server": ("test", 80),
        }
        self.status_code = None
        self.chunks = []
        self.primer_evento = asyncio.Event()
        self._peticion_enviada = False

    async def receive(self):
        if not self._peticion_enviada:
            self._peticion_enviada = True
            return {"type": "http.request", "body": b"", "more_body": False}
        await asyncio.sleep(3600)

    async def send(self, message):
        if message["type"] == "http.response.start":
            self.status_code = message["status"]
        elif message["type"] == "http.response.body":
            cuerpo = message.get("body", b"")
            if cuerpo:
                self.chunks.append(cuerpo.decode())
                self.primer_evento.set()


def test_stream_no_retiene_conexion_del_pool():
    """Una conexión SSE abierta no puede bloquear el pool de base de datos."""
    token = _token(RECEPTOR_ID, "receptor_async@sena.edu.co", "aprendiz")
    app.dependency_overrides[get_db] = _limited_get_db

    async def _run():
        driver = _StreamDriver(f"/mensajes/stream?token={token}")
        tarea = asyncio.create_task(app(driver.scope, driver.receive, driver.send))
        try:
            await asyncio.wait_for(driver.primer_evento.wait(), timeout=10.0)
            assert driver.status_code == 200
            assert "connected" in "".join(driver.chunks)

            assert limited_engine.pool.checkedout() == 0, (
                "El stream SSE retiene una conexión del pool durante toda "
                "la sesión; con varios usuarios en línea el pool se agota."
            )

            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test", timeout=10.0
            ) as ac:
                respuesta = await ac.get(
                    "/mensajes/unread-count", headers=_emisor_headers()
                )
            assert respuesta.status_code == 200
        finally:
            tarea.cancel()
            try:
                await asyncio.wait_for(tarea, timeout=5.0)
            except (asyncio.CancelledError, asyncio.TimeoutError):
                pass

    asyncio.run(asyncio.wait_for(_run(), timeout=30.0))


def test_endpoints_no_bloquean_el_event_loop(monkeypatch):
    """El trabajo de base de datos se ejecuta fuera del hilo del event loop."""
    from app.services import mensajes_service

    def _consulta_lenta(db, uid):
        time.sleep(0.4)
        return []

    monkeypatch.setattr(mensajes_service, "listar_conversaciones", _consulta_lenta)

    async def _run():
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", timeout=10.0
        ) as ac:
            inicio = time.perf_counter()
            respuestas = await asyncio.gather(
                *[
                    ac.get("/mensajes/conversaciones", headers=_emisor_headers())
                    for _ in range(3)
                ]
            )
            transcurrido = time.perf_counter() - inicio

        assert all(r.status_code == 200 for r in respuestas)
        assert transcurrido < 0.9, (
            f"Tres consultas de 0,4 s tardaron {transcurrido:.2f} s: se están "
            "serializando en el event loop en lugar de correr en el threadpool."
        )

    asyncio.run(_run())


def test_typing_no_genera_auditoria_y_las_mutaciones_si():
    """El pulso de escritura no deja rastro; el envío de mensajes sí se audita."""
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        antes = _contar_auditoria()
        typing = client.post(
            "/mensajes/typing",
            json={"destinatario_id": RECEPTOR_ID, "is_typing": True},
            headers=_emisor_headers(),
        )
        assert typing.status_code == 200
        assert _contar_auditoria() == antes, (
            "El pulso 'escribiendo...' se audita en cada pulsación de tecla y "
            "escribe en la base de datos desde el event loop."
        )

        envio = client.post(
            "/mensajes",
            json={"destinatario_id": RECEPTOR_ID, "contenido": "Prueba asíncrona"},
            headers=_emisor_headers(),
        )
        assert envio.status_code == 201

    assert _contar_auditoria() == antes + 1
