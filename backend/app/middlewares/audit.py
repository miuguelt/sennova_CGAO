from fastapi import Request
from fastapi.concurrency import run_in_threadpool
from starlette.middleware.base import BaseHTTPMiddleware
import logging
from jose import jwt, JWTError
from app.database import SessionLocal
from app.models import AuditLog
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

METODOS_AUDITADOS = ("POST", "PUT", "DELETE", "PATCH")

# Señales efímeras de la mensajería en tiempo real: el pulso "escribiendo..." se
# emite en cada pulsación de tecla y no representa un cambio de datos, así que
# auditarlo solo inunda la tabla y añade una escritura por tecla.
RUTAS_SIN_AUDITORIA = frozenset({"/mensajes/typing"})


def _registrar(entrada_kwargs: dict) -> None:
    """Escribe la entrada de auditoría. Se ejecuta en el threadpool."""
    db = SessionLocal()
    try:
        db.add(AuditLog(**entrada_kwargs))
        db.commit()
    finally:
        db.close()


class AuditMiddleware(BaseHTTPMiddleware):
    """
    Middleware para interceptar y auditar peticiones de mutación (POST, PUT, DELETE, PATCH).
    Captura el usuario que realiza la acción mediante el token JWT.

    La escritura viaja al threadpool: el driver de base de datos es bloqueante y
    hacerla en el event loop congelaba los canales SSE en cada mutación.
    """
    async def dispatch(self, request: Request, call_next):
        # 1. Intentar extraer el user_id del token antes de procesar la petición
        user_id = None
        auth_header = request.headers.get("Authorization")

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
                user_id = payload.get("sub")
            except JWTError:
                # El token puede ser inválido o haber expirado, el router lo manejará
                pass

        # 2. Procesar la petición
        response = await call_next(request)

        # 3. Solo registrar mutaciones significativas, nunca señales efímeras
        ruta = str(request.url.path)
        if request.method in METODOS_AUDITADOS and ruta not in RUTAS_SIN_AUDITORIA:
            try:
                await run_in_threadpool(_registrar, {
                    "user_id": user_id,
                    "method": request.method,
                    "endpoint": ruta,
                    "status_code": response.status_code,
                    "ip_address": request.client.host if request.client else "unknown",
                    "user_agent": request.headers.get("user-agent", "unknown"),
                })
            except Exception as e:
                logger.error(f"Error en Auditoría Middleware: {e}")

        return response
