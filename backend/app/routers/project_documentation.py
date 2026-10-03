"""Formularios guiados y autoría documental autenticada por proyecto."""

from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import STAFF_ROLES, get_current_user
from app.database import get_db
from app.models import User
from app.routers.project_files import authorized_project
from app.services.documentation_commands import (
    apply_formulation_proposal,
    generate_version,
    review_version,
    save_common,
    save_draft,
    update_project_identification,
)
from app.services.documentation_state import documentation_view
from app.services.proyecto_import_service import FormulationFileError, extract_formulation_sections

router = APIRouter(prefix="/proyectos", tags=["Construcción documental"])



class FormEdit(BaseModel):
    revision: int = Field(ge=0)
    datos: dict


class GenerateDocument(BaseModel):
    revision: int = Field(ge=0)
    revision_comunes: int = Field(ge=0)


class ReviewDocument(BaseModel):
    observacion: str = Field(default="", max_length=2000)


class ProjectIdentificationEdit(BaseModel):
    nombre: str | None = None
    objetivo_general: str | None = None
    objetivos_especificos: str | list[str] | None = None
    vigencia: int | None = None
    presupuesto_total: float | None = None


class ApplyFormulationPayload(BaseModel):
    borrador: dict = Field(default_factory=dict)
    proyecto: dict = Field(default_factory=dict)


class RecommendationRequest(BaseModel):
    campo: str
    texto: str = Field(default="")


def editable_project(project_id, user, db):
    project = authorized_project(str(project_id), user, db)
    if user.rol not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Solo investigadores y administradores pueden construir y revisar documentos.")
    return project


@router.get("/{proyecto_id}/documentacion")
def get_documentation(proyecto_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return documentation_view(authorized_project(str(proyecto_id), current_user, db), db)


@router.put("/{proyecto_id}/documentacion/identificacion")
def update_identification(proyecto_id: UUID, payload: ProjectIdentificationEdit, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return update_project_identification(editable_project(proyecto_id, current_user, db), db, current_user, payload.model_dump(exclude_unset=True))


@router.put("/{proyecto_id}/documentacion/comunes")
def update_common(proyecto_id: UUID, payload: FormEdit, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return save_common(editable_project(proyecto_id, current_user, db), db, current_user, payload.revision, payload.datos)


@router.put("/{proyecto_id}/documentacion/borradores/{clave}")
def update_draft(proyecto_id: UUID, clave: str, payload: FormEdit, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return save_draft(editable_project(proyecto_id, current_user, db), db, current_user, clave, payload.revision, payload.datos)


@router.post("/{proyecto_id}/documentacion/analizar-formato")
async def analyze_formulation_file(proyecto_id: UUID, archivo: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    editable_project(proyecto_id, current_user, db)
    content = await archivo.read()
    try:
        return extract_formulation_sections(archivo.filename, content)
    except FormulationFileError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/{proyecto_id}/documentacion/aplicar-formato")
def apply_formulation(proyecto_id: UUID, payload: ApplyFormulationPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return apply_formulation_proposal(editable_project(proyecto_id, current_user, db), db, current_user, payload.borrador, payload.proyecto)


@router.post("/{proyecto_id}/documentacion/generar/{clave}")
def generate_document(proyecto_id: UUID, clave: str, payload: GenerateDocument, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return generate_version(editable_project(proyecto_id, current_user, db), db, current_user, clave, payload.revision, payload.revision_comunes)


@router.post("/{proyecto_id}/documentacion/revisar/{documento_id}")
def review_document(proyecto_id: UUID, documento_id: UUID, payload: ReviewDocument, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return review_version(editable_project(proyecto_id, current_user, db), db, current_user, str(documento_id), payload.observacion)


@router.post("/{proyecto_id}/documentacion/recomendar")
def get_recommendation(proyecto_id: UUID, payload: RecommendationRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    editable_project(proyecto_id, current_user, db)
    from app.services.formulation_ai_service import get_field_recommendations
    return {"recomendaciones": get_field_recommendations(payload.campo, payload.texto)}


