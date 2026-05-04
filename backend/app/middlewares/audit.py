from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import json
import logging
from app.database import SessionLocal
from app.models import AuditLog
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class AuditMiddleware(BaseHTTPMiddleware):
    """
    Middleware para interceptar y auditar peticiones de mutación (POST, PUT, DELETE, PATCH).
    """
    async def dispatch(self, request: Request, call_next):
        # Procesar petición
        response = await call_next(request)
        
        # Solo registrar mutaciones
        if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
            try:
                db = SessionLocal()
                try:
                    audit_entry = AuditLog(
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
