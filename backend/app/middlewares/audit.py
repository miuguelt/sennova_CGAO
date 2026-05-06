from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import json
import logging
from jose import jwt, JWTError
from app.database import SessionLocal
from app.models import AuditLog
from app.config import get_settings
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
settings = get_settings()

class AuditMiddleware(BaseHTTPMiddleware):
    """
    Middleware para interceptar y auditar peticiones de mutación (POST, PUT, DELETE, PATCH).
    Captura el usuario que realiza la acción mediante el token JWT.
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
        
        # 3. Solo registrar mutaciones exitosas o intentos significativos
        if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
            try:
                db = SessionLocal()
                try:
                    audit_entry = AuditLog(
                        user_id=user_id,
                        method=request.method,
                        endpoint=str(request.url.path),
                        status_code=response.status_code,
                        ip_address=request.client.host if request.client else "unknown",
                        user_agent=request.headers.get("user-agent", "unknown")
                    )
                    db.add(audit_entry)
                    db.commit()
                finally:
                    db.close()
            except Exception as e:
                logger.error(f"Error en Auditoría Middleware: {e}")
                
        return response
