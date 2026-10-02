"""Consulta y exportación autenticada del expediente por proyecto."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from starlette.background import BackgroundTask
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Proyecto, User
from app.services.project_access import can_access_project
from app.services.project_evidence_service import evaluate_project_file, build_project_file_zip

router = APIRouter(prefix="/proyectos", tags=["Expedientes"])


def authorized_project(project_id: str, current_user: User, db: Session) -> Proyecto:
    """Resuelve existencia y acceso antes de leer documentos o archivos."""
    project = db.query(Proyecto).filter(Proyecto.id == project_id).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    if not can_access_project(project, current_user):
        raise HTTPException(status_code=403, detail="Sin acceso al expediente del proyecto")
    return project


@router.get("/{proyecto_id}/expediente")
def get_project_file(proyecto_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Devuelve faltantes y disponibilidad de las seis etapas documentales."""
    return evaluate_project_file(authorized_project(proyecto_id, current_user, db), db)


def zip_chunks(archive):
    """Transmite por bloques y libera el temporal incluso ante desconexión."""
    try:
        while chunk := archive.read(64 * 1024):
            yield chunk
    finally:
        archive.close()


@router.get("/{proyecto_id}/expediente/descargar")
def download_project_file(proyecto_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Descarga el expediente disponible e identifica si todavía está incompleto."""
    project = authorized_project(proyecto_id, current_user, db)
    archive = build_project_file_zip(project, db)
    return StreamingResponse(
        zip_chunks(archive), media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="expediente_{project.id}.zip"'},
        background=BackgroundTask(archive.close),
    )
