"""
SENNOVA CGAO - Backend API
Sistema de Gestión de Investigación del CGAO Vélez
FastAPI + PostgreSQL
"""

import os

from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager

from app.config import get_settings
from app.database import engine, Base, get_db
from app.auth import get_current_user, get_current_admin, get_password_hash
from app.models import User
from app.routers import (
    auth, proyectos, grupos, semilleros, convocatorias, 
    productos, documentos, usuarios, stats, reportes, 
    entregables, notificaciones, cvlac, retos, bitacora, 
    maintenance, audit, plantillas
)
from app.middlewares.audit import AuditMiddleware

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestión del ciclo de vida de la aplicación."""
    # Startup: Crear tablas si no existen (operación segura)
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Base de datos verificada/creada")
    except Exception as e:
        print(f"⚠️ Error inicializando BD: {e}")
    
    print("🚀 SENNOVA API iniciada")
    yield
    
    # Shutdown
    print("👋 SENNOVA API detenida")


# Crear aplicación FastAPI
app = FastAPI(
    title=settings.APP_NAME,
    description="API para la gestión de proyectos de investigación del CGAO Vélez - SENNOVA",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)


# Configurar orígenes permitidos desde variables de entorno
# REGLA ANTI-HARDCODING: Todos los orígenes deben venir de ALLOWED_ORIGINS
all_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")] if settings.ALLOWED_ORIGINS else []

# Orígenes adicionales para desarrollo (solo si DEBUG=true)
additional_origins = []
if settings.DEBUG:
    # En desarrollo, permitir orígenes locales adicionales desde variable de entorno
    extra_origins = os.getenv("ADDITIONAL_CORS_ORIGINS", "")
    if extra_origins:
        additional_origins = [o.strip() for o in extra_origins.split(",") if o.strip()]

ALLOWED_ORIGINS_LIST = list(set(all_origins + additional_origins))

# En modo DEBUG permitimos todo para facilitar el desarrollo híbrido
IF_DEBUG_ALLOW_ALL = ["*"] if settings.DEBUG else ALLOWED_ORIGINS_LIST

app.add_middleware(
    CORSMiddleware,
    allow_origins=IF_DEBUG_ALLOW_ALL,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Registro de Auditoría Estricta
app.add_middleware(AuditMiddleware)


# Middleware de diagnóstico y CORS forzado
@app.middleware("http")
async def cors_diagnostic_middleware(request: Request, call_next):
    origin = request.headers.get("origin")
    if origin:
        print(f"🔍 [CORS DEBUG] Request from Origin: {origin} | Path: {request.url.path}")
    response = await call_next(request)
    return response
    
# ==========================================
# GESTIÓN DE EXCEPCIONES (CON SOPORTE CORS)
# ==========================================

def get_cors_origin(request: Request):
    """Obtiene el origen permitido para el encabezado CORS."""
    origin = request.headers.get("origin")
    if origin in ALLOWED_ORIGINS_LIST:
        return origin
    return ALLOWED_ORIGINS_LIST[0] if ALLOWED_ORIGINS_LIST else "*"

@app.exception_handler(Exception)
@app.exception_handler(HTTPException)
@app.exception_handler(RequestValidationError)
async def unified_cors_exception_handler(request: Request, exc: Exception):
    """Manejador único para asegurar CORS en TODOS los errores."""
    import traceback
    status_code = 500
    detail = str(exc)
    
    if isinstance(exc, HTTPException):
        status_code = exc.status_code
        detail = exc.detail
    elif isinstance(exc, RequestValidationError):
        status_code = 422
        detail = exc.errors()

    print(f"❌ Error en {request.url} [{status_code}]: {detail}")
    if settings.DEBUG and status_code == 500:
        traceback.print_exc()
    
    # Asegurar que incluso los errores tengan las cabeceras CORS correctas
    cors_origin = get_cors_origin(request)
    if settings.DEBUG:
        cors_origin = request.headers.get("origin") or "*"
    
    return JSONResponse(
        status_code=status_code,
        content={
            "error": "Error del Servidor" if status_code == 500 else "Error de Validación",
            "detail": detail,
            "path": str(request.url.path)
        },
        headers={
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true"
        }
    )


# ==========================================
# ROUTERS
# ==========================================

app.include_router(auth.router)
app.include_router(proyectos.router)
app.include_router(grupos.router)
app.include_router(semilleros.router)
app.include_router(convocatorias.router)
app.include_router(productos.router)
app.include_router(documentos.router)
app.include_router(usuarios.router)
app.include_router(stats.router)
app.include_router(reportes.router)
app.include_router(entregables.router)
app.include_router(notificaciones.router)
app.include_router(cvlac.router)
app.include_router(retos.router)
app.include_router(bitacora.router)
app.include_router(maintenance.router)
app.include_router(audit.router)
app.include_router(plantillas.router)


# ==========================================
# ENDPOINTS RAÍZ
# ==========================================

@app.get("/")
def root():
    """Información básica de la API."""
    return {
        "name": settings.APP_NAME,
        "version": "2.0.0",
        "docs": "/docs",
        "status": "online"
    }


@app.get("/health")
def health_check():
    """Health check para monitoreo."""
    from datetime import datetime, timezone
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


if __name__ == "__main__":
    import uvicorn
    # Usar HOST desde variable de entorno o default
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=settings.DEBUG
    )
