"""Recepción autenticada de archivos y selección revisada para un proyecto."""

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, ValidationError
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.routers.project_documentation import editable_project
from app.services.project_file_import.archive import MAX_FILE_SIZE, MAX_TOTAL_SIZE, MAX_ZIP_SIZE
from app.services.project_file_import.service import analyze_uploads, import_uploads, public_analysis

router = APIRouter(prefix="/proyectos", tags=["Importación del expediente"])


class FileSelection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ruta: str = Field(min_length=1, max_length=1024)
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    periodo_bimestre: int | None = Field(default=None, strict=True, ge=1, le=600)
    importar_datos: bool = Field(default=True, strict=True)


def parse_selection(value):
    try:
        selected = TypeAdapter(list[FileSelection]).validate_json(value)
        if not 1 <= len(selected) <= 500:
            raise ValueError
        return selected
    except (ValidationError, ValueError):
        raise HTTPException(status_code=422, detail="Seleccione entre 1 y 500 archivos analizados con ruta, hash y bimestre válido cuando corresponda.")


async def read_files(files):
    try:
        if not 1 <= len(files) <= 500:
            raise HTTPException(status_code=422, detail="Seleccione entre 1 y 500 archivos, o un solo ZIP.")
        uploads, total = [], 0
        for file in files:
            maximum = MAX_ZIP_SIZE if (file.filename or "").lower().endswith(".zip") else MAX_FILE_SIZE
            content = await file.read(maximum + 1)
            total += len(content)
            if len(content) > maximum or total > MAX_TOTAL_SIZE:
                raise HTTPException(status_code=413, detail="La carga supera el límite: 50 MB por ZIP, 10 MB por archivo y 200 MB en conjunto.")
            uploads.append((file.filename or "", content))
        return uploads
    finally:
        for file in files:
            await file.close()


@router.post("/{proyecto_id}/expediente/analizar-archivos")
async def analyze_project_files(proyecto_id: UUID, files: list[UploadFile] = File(...),
                                carpeta: str = Form(""), tipo: str = Form(""),
                                current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = await run_in_threadpool(editable_project, proyecto_id, current_user, db)
    analysis = await run_in_threadpool(analyze_uploads, project, await read_files(files), carpeta, tipo)
    return public_analysis(analysis)


@router.post("/{proyecto_id}/expediente/importar-archivos", status_code=201)
async def import_project_files(proyecto_id: UUID, files: list[UploadFile] = File(...),
                               seleccion: str = Form(...), carpeta: str = Form(""), tipo: str = Form(""),
                               current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = await run_in_threadpool(editable_project, proyecto_id, current_user, db)
    selection = parse_selection(seleccion)
    analysis = await run_in_threadpool(analyze_uploads, project, await read_files(files), carpeta, tipo)
    return await run_in_threadpool(import_uploads, project, db, current_user, analysis, selection)
