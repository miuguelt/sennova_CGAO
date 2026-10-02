"""Formularios guiados y autoría documental autenticada por proyecto."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import STAFF_ROLES, get_current_user
from app.database import get_db
from app.models import User
from app.routers.project_files import authorized_project
from app.services.documentation_commands import save_common, save_draft, generate_version, review_version
from app.services.documentation_state import documentation_view

router = APIRouter(prefix="/proyectos", tags=["Construcción documental"])


class FormEdit(BaseModel):
    revision: int = Field(ge=0)
    datos: dict


class GenerateDocument(BaseModel):
    revision: int = Field(ge=0)
    revision_comunes: int = Field(ge=0)


class ReviewDocument(BaseModel):
    observacion: str = Field(default="", max_length=2000)


def editable_project(project_id, user, db):
    project = authorized_project(str(project_id), user, db)
    if user.rol not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Solo investigadores y administradores pueden construir y revisar documentos.")
    return project


@router.get("/{proyecto_id}/documentacion")
def get_documentation(proyecto_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return documentation_view(authorized_project(str(proyecto_id), current_user, db), db)


@router.put("/{proyecto_id}/documentacion/comunes")
def update_common(proyecto_id: UUID, payload: FormEdit, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return save_common(editable_project(proyecto_id, current_user, db), db, current_user, payload.revision, payload.datos)


@router.put("/{proyecto_id}/documentacion/borradores/{clave}")
def update_draft(proyecto_id: UUID, clave: str, payload: FormEdit, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return save_draft(editable_project(proyecto_id, current_user, db), db, current_user, clave, payload.revision, payload.datos)


@router.post("/{proyecto_id}/documentacion/generar/{clave}")
def generate_document(proyecto_id: UUID, clave: str, payload: GenerateDocument, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return generate_version(editable_project(proyecto_id, current_user, db), db, current_user, clave, payload.revision, payload.revision_comunes)


@router.post("/{proyecto_id}/documentacion/revisar/{documento_id}")
def review_document(proyecto_id: UUID, documento_id: UUID, payload: ReviewDocument, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return review_version(editable_project(proyecto_id, current_user, db), db, current_user, str(documento_id), payload.observacion)
