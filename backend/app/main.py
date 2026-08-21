"""
SENNOVA CGAO - Backend API
Sistema de Gestión de Investigación del CGAO Vélez
FastAPI + PostgreSQL
"""

import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.bootstrap import (
    AdminBootstrapError,
    credentials_from_settings,
    ensure_initial_admin,
)
from app.config import get_settings
from app.database import engine, Base, SessionLocal
from app.models import User
from app.routers import (
    auth, proyectos, grupos, semilleros, convocatorias, 
    productos, documentos, usuarios, stats, reportes, 
    entregables, notificaciones, cvlac, retos, bitacora, 
    maintenance, audit, plantillas, aprendices, mensajes,
    mensajes_adjuntos
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

        # Verificación segura de columnas adicionales en tablas existentes
        try:
            from sqlalchemy import inspect, text
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            with engine.connect() as conn:
                if "mensajes" in tables:
                    cols = [c["name"] for c in inspector.get_columns("mensajes")]
                    if "entregado" not in cols:
                        conn.execute(text("ALTER TABLE mensajes ADD COLUMN entregado BOOLEAN DEFAULT FALSE"))
                        conn.commit()
                    if "fecha_entrega" not in cols:
                        conn.execute(text("ALTER TABLE mensajes ADD COLUMN fecha_entrega TIMESTAMP"))
                        conn.commit()
                if "proyectos" in tables:
                    cols_p = [c["name"] for c in inspector.get_columns("proyectos")]
                    if "grupo_id" not in cols_p:
                        conn.execute(text("ALTER TABLE proyectos ADD COLUMN grupo_id VARCHAR(36)"))
                        conn.commit()
                    # Backfill grupo_id a partir de semilleros o grupo principal
                    if "semilleros" in tables and "grupos" in tables:
                        conn.execute(text("""
                            UPDATE proyectos 
                            SET grupo_id = (SELECT semilleros.grupo_id FROM semilleros WHERE semilleros.id = proyectos.semillero_id)
                            WHERE proyectos.grupo_id IS NULL AND proyectos.semillero_id IS NOT NULL
                        """))
                        conn.execute(text("""
                            UPDATE proyectos
                            SET grupo_id = (SELECT id FROM grupos LIMIT 1)
                            WHERE proyectos.grupo_id IS NULL AND (SELECT COUNT(*) FROM grupos) > 0
                        """))
                        conn.commit()
        except Exception as col_err:
            pass
        
        # Bootstrap: administrador inicial (mismo módulo que usa el entrypoint
        # del contenedor, para que arrancar con Docker o en local produzca el
        # mismo estado y las mismas validaciones).
        db = SessionLocal()
        try:
            result = ensure_initial_admin(
                db,
                credentials_from_settings(settings),
                enforce_strong_password=not settings.DEBUG,
            )
            print(f"👤 {result.detail}")

            # Poblado de datos de demostración. Borra grupos, semilleros,
            # proyectos, productos, retos, convocatorias, aprendices, bitácora y
            # todos los usuarios que no sean el admin, así que solo puede correr
            # en desarrollo.
            if settings.SEED_INITIAL_DATA:
                if not settings.DEBUG:
                    print(
                        "⛔ SEED_INITIAL_DATA=true ignorado: el poblado de demostración "
                        "borra datos existentes y solo se permite con DEBUG=true."
                    )
                else:
                    from app.models import Grupo
                    if db.query(Grupo).count() == 0:
                        print("🌱 SEED_INITIAL_DATA=true: poblando datos de demostración...")
                        try:
                            from scripts.seed_demo_data import seed_data
                            seed_data()
                            print("✅ Datos de demostración poblados correctamente")
                        except Exception as seed_err:
                            print(f"⚠️ Error en poblado de demostración: {seed_err}")
        except AdminBootstrapError as admin_err:
            # Sin administrador utilizable la instalación no sirve, pero tampoco
            # se crea uno abierto: se informa y la API arranca sin él.
            print(f"❌ No se creó el administrador inicial: {admin_err}")
        except Exception as e:
            print(f"⚠️ Error en bootstrap de usuario: {e}")
        finally:
            db.close()
            
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
    # El esquema completo de la API, incluidas las rutas administrativas, solo se
    # publica en desarrollo. En producción no hay motivo para regalar la
    # superficie de ataque a quien alcance el puerto.
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS_LIST,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?" if settings.DEBUG else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Registro de Auditoría Estricta
app.add_middleware(AuditMiddleware)

    
# ==========================================
# GESTIÓN DE EXCEPCIONES (CON SOPORTE CORS)
# ==========================================

from sqlalchemy.exc import OperationalError, SQLAlchemyError

def get_cors_origin(request: Request):
    """Obtiene el origen permitido para el encabezado CORS."""
    origin = request.headers.get("origin")
    if origin in ALLOWED_ORIGINS_LIST:
        return origin
    return ALLOWED_ORIGINS_LIST[0] if ALLOWED_ORIGINS_LIST else "*"

@app.exception_handler(Exception)
@app.exception_handler(HTTPException)
@app.exception_handler(RequestValidationError)
@app.exception_handler(SQLAlchemyError)
async def unified_cors_exception_handler(request: Request, exc: Exception):
    """Manejador único para asegurar CORS en TODOS los errores y diagnóstico descriptivo."""
    import traceback
    status_code = 500
    detail = str(exc)
    error_type = "Internal Server Error"
    
    if isinstance(exc, HTTPException):
        status_code = exc.status_code
        detail = exc.detail
        error_type = "HTTP Error"
    elif isinstance(exc, RequestValidationError):
        status_code = 422
        detail = exc.errors()
        error_type = "Validation Error"
    elif isinstance(exc, (OperationalError, SQLAlchemyError)):
        status_code = 503
        detail = "Base de datos temporalmente no disponible"
        error_type = "Database Error"
        print(f"❌ [DATABASE CRITICAL] {request.method} {request.url} - {exc}")
        traceback.print_exc()

    if status_code == 500:
        print(f"❌ [CRITICAL ERROR] {request.method} {request.url} - {detail}")
        traceback.print_exc()
    else:
        print(f"⚠️ [API Warning] {request.method} {request.url} [{status_code}]: {detail}")
    
    # Asegurar que incluso los errores tengan las cabeceras CORS correctas
    cors_origin = get_cors_origin(request)
    if settings.DEBUG:
        cors_origin = request.headers.get("origin")
        if not cors_origin or cors_origin == "*":
            cors_origin = ALLOWED_ORIGINS_LIST[0] if ALLOWED_ORIGINS_LIST else "http://localhost:3006"
    
    safe_headers = {
        "Access-Control-Allow-Origin": cors_origin or "*",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Credentials": "true",
    }
    if status_code == 503:
        safe_headers["Retry-After"] = "30"
    
    from fastapi.encoders import jsonable_encoder
    
    return JSONResponse(
        status_code=status_code,
        content=jsonable_encoder({
            "success": False,
            "error": error_type,
            "message": detail if isinstance(detail, str) else "Error de validación",
            "detail": detail,
            "path": str(request.url.path)
        }),
        headers=safe_headers
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
app.include_router(aprendices.router)
# Los adjuntos van primero: /mensajes/adjuntos/... no debe caer en /mensajes/{mensaje_id}
app.include_router(mensajes_adjuntos.router)
app.include_router(mensajes.router)


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


@app.get("/debug-headers")
def debug_headers(request: Request):
    """Diagnóstico de cabeceras recibidas."""
    return {
        "headers": dict(request.headers),
        "url": str(request.url),
        "method": request.method
    }


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
