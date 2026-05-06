from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import FileResponse
from app.auth import get_current_admin
from app.models import User
import os
import subprocess
from datetime import datetime
from app.config import get_settings

router = APIRouter(prefix="/maintenance", tags=["Mantenimiento"])
settings = get_settings()

@router.get("/backup")
def create_backup(admin: User = Depends(get_current_admin)):
    """Genera un backup de la base de datos."""
    if settings.DATABASE_URL.startswith("sqlite"):
        # Backup simple de SQLite
        db_path = "./sennova.db"
        if os.path.exists(db_path):
            return FileResponse(
                db_path, 
                filename=f"sennova_backup_{datetime.now().strftime('%Y%m%d')}.db",
                media_type="application/x-sqlite3"
            )
        raise HTTPException(status_code=404, detail="Archivo de base de datos no encontrado")
    else:
        # Intento de backup PostgreSQL si las herramientas están instaladas
        # Para entorno local/devbrain, a veces no tenemos pg_dump directamente
        # Retornamos un JSON con metadatos por ahora o intentamos el dump
        try:
            # Extraer params de DATABASE_URL si es necesario
            # Simplificamos: en devbrain central solemos usar docker
            return {"message": "Backup de PostgreSQL debe gestionarse vía Docker o pg_dump externo.", "url": settings.DATABASE_URL}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@router.post("/clear-cache")
def clear_cache(admin: User = Depends(get_current_admin)):
    """Limpia archivos temporales y caché del sistema."""
    # Simulación de limpieza
    import shutil
    temp_dir = "./temp"
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
        os.makedirs(temp_dir)
    return {"message": "Caché del sistema optimizada correctamente"}
