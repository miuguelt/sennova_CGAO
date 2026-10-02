"""
Router de Documentos
Gestión de archivos adjuntos (CV Lac, actas, contratos, informes)
Almacenamiento en disco (storage/documentos)
"""

import base64
import binascii
import logging
import math
import os
import uuid
from typing import List, Optional
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from fastapi.responses import FileResponse
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.config import get_settings
from app.auth import STAFF_ROLES, get_current_user
from app.database import get_db
from app.models import Aprendiz, Documento, Producto, User, Proyecto, Semillero
from app.schemas import DocumentoResponse, DocumentoCreate
from app.utils import log_actividad
from app.services.project_access import can_access_project
from app.services.proyectos_service import evaluar_y_auto_finalizar_proyecto

router = APIRouter(prefix="/documentos", tags=["Documentos"])
logger = logging.getLogger(__name__)

# Configuración de almacenamiento
settings = get_settings()
STORAGE_DIR = Path(settings.STORAGE_DIR) / "documentos" if hasattr(settings, "STORAGE_DIR") else Path("storage/documentos")
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def _can_access_document(documento: Documento, user: User, db: Session) -> bool:
    """Resuelve el permiso del adjunto con la misma política de su entidad."""
    if user.rol == "admin" or str(documento.owner_id) == str(user.id):
        return True
    if documento.entidad_tipo in {"general", "formato", "plantilla"}:
        return True
    if documento.entidad_tipo == "producto":
        product = db.query(Producto).filter(Producto.id == str(documento.entidad_id)).first()
        if not product:
            return False
        if product.proyecto:
            return can_access_project(product.proyecto, user)
        return user.rol in STAFF_ROLES or str(product.owner_id) == str(user.id)
    if documento.entidad_tipo != "proyecto":
        return False
    project = db.query(Proyecto).filter(Proyecto.id == str(documento.entidad_id)).first()
    return bool(project and can_access_project(project, user))


@router.get("/{documento_id}/view")
def view_documento(
    documento_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ver documento directamente en el navegador."""
    doc = db.query(Documento).filter(Documento.id == str(documento_id)).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    if not _can_access_document(doc, current_user, db):
        raise HTTPException(status_code=403, detail="Sin acceso")
    
    # Registrar actividad de visualización
    log_actividad(
        db, 
        current_user.id, 
        "ver_documento", 
        f"Visualizó el documento: {doc.nombre_archivo}",
        entidad_tipo="documento",
        entidad_id=str(doc.id)
    )
    
    if doc.file_path and os.path.exists(doc.file_path):
        return FileResponse(
            path=doc.file_path,
            media_type=doc.content_type,
            filename=doc.nombre_archivo,
            content_disposition_type="inline"
        )
    elif doc.data_base64:
        # Fallback por si la migración no ocurrió
        content = base64.b64decode(doc.data_base64)
        return Response(
            content=content,
            media_type=doc.content_type,
            headers={
                "Content-Disposition": f"inline; filename={doc.nombre_archivo}"
            }
        )
    else:
        raise HTTPException(status_code=404, detail="Archivo físico no encontrado")

# Tamaño máximo de archivo: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024

# Tipos MIME permitidos
ALLOWED_CONTENT_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/jpeg",
    "image/png",
    "image/jpg",
    "video/mp4",
]

CONTENT_TYPES_BY_EXTENSION = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".mp4": "video/mp4",
}


def validate_file(file: UploadFile) -> str:
    """Valida tipo y tamaño de archivo."""
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de archivo no permitido. Permitidos: {ALLOWED_CONTENT_TYPES}"
        )
    return file.content_type


def _validate_document_target(entidad_tipo: str, entidad_id: str, tipo: str,
                              periodo_bimestre: Optional[int], user: User, db: Session) -> Optional[str]:
    """Valida existencia, acceso y período antes de escribir el expediente."""
    try:
        entidad_id = str(UUID(entidad_id))
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(status_code=422, detail="El identificador de la entidad no es válido")
    project = None
    if entidad_tipo in {"general", "formato", "plantilla"}:
        pass
    elif entidad_tipo == "proyecto":
        project = db.query(Proyecto).filter(Proyecto.id == entidad_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        if not can_access_project(project, user):
            raise HTTPException(status_code=403, detail="Sin acceso al proyecto")
    elif entidad_tipo == "producto":
        product = db.query(Producto).filter(Producto.id == entidad_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        project = product.proyecto
        allowed = can_access_project(project, user) if project else (
            user.rol in STAFF_ROLES or str(product.owner_id) == str(user.id)
        )
        if not allowed:
            raise HTTPException(status_code=403, detail="Sin acceso al producto")
    elif entidad_tipo == "user":
        target = db.query(User).filter(User.id == entidad_id).first()
        if not target:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        if user.rol != "admin" and str(target.id) != str(user.id):
            raise HTTPException(status_code=403, detail="Solo puedes subir documentos a tu perfil")
    else:
        raise HTTPException(status_code=422, detail="Tipo de entidad no permitido")

    if tipo in {"informe_bimensual", "informe_bimestral"}:
        if entidad_tipo != "proyecto":
            raise HTTPException(status_code=422, detail="El informe bimestral debe pertenecer a un proyecto")
        if periodo_bimestre is None or periodo_bimestre < 1:
            raise HTTPException(status_code=422, detail="Indica un período bimestral mayor o igual a 1")
        if project.vigencia and project.vigencia > 0 and periodo_bimestre > math.ceil(project.vigencia / 2):
            raise HTTPException(status_code=422, detail="El período bimestral supera la duración del proyecto")
    elif periodo_bimestre is not None:
        raise HTTPException(status_code=422, detail="El período bimestral solo corresponde a informes bimestrales")
    return str(project.id) if project else None


def _validate_content(content: bytes) -> None:
    """Rechaza archivos vacíos o superiores al límite del centro documental."""
    if not content:
        raise HTTPException(status_code=400, detail="El archivo está vacío. Selecciona un archivo con contenido")
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="El archivo supera el máximo permitido de 10 MB")


def _persist_document(documento: Documento, content: bytes, db: Session) -> Documento:
    """Guarda el archivo y compensa la escritura si la transacción falla."""
    file_path = STORAGE_DIR / f"{documento.id}{Path(documento.nombre_archivo).suffix.lower()}"
    file_created = False
    try:
        with open(file_path, "xb") as file:
            file_created = True
            file.write(content)
        documento.file_path = file_path.as_posix()
        db.add(documento)
        db.flush()
        db.refresh(documento)
        db.commit()
    except Exception:
        db.rollback()
        if file_created:
            try:
                file_path.unlink(missing_ok=True)
            except OSError:
                logger.exception("No se pudo retirar el archivo de la transacción fallida")
        logger.exception("No se pudo guardar el documento")
        raise HTTPException(status_code=500, detail="No se pudo guardar el documento. Intenta nuevamente")
    return documento


def _evaluate_project_completion(project_id: Optional[str], db: Session) -> None:
    """Actualiza el cierre al incorporar cualquier soporte del expediente."""
    if project_id:
        try:
            evaluar_y_auto_finalizar_proyecto(project_id, db)
        except Exception:
            db.rollback()
            logger.exception("El documento se guardó, pero no se pudo evaluar el cierre del proyecto")


@router.get("", response_model=List[DocumentoResponse])
def list_documentos(
    entidad_tipo: Optional[str] = None,
    entidad_id: Optional[str] = None,
    tipo: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar documentos con filtros opcionales."""
    query = db.query(Documento)
    
    if entidad_tipo:
        query = query.filter(Documento.entidad_tipo == entidad_tipo)
    if entidad_id:
        query = query.filter(Documento.entidad_id == str(entidad_id))
    if tipo:
        query = query.filter(Documento.tipo == tipo)
    
    if current_user.rol != "admin":
        if current_user.rol in STAFF_ROLES:
            allowed_projects = db.query(Proyecto.id)
        else:
            project_access = (Proyecto.owner_id == str(current_user.id)) | Proyecto.equipo.any(
                User.id == str(current_user.id)
            )
            if current_user.rol == "aprendiz":
                project_access = project_access | Proyecto.semillero.has(
                    Semillero.aprendices.any(Aprendiz.user_id == str(current_user.id))
                )
            allowed_projects = db.query(Proyecto.id).filter(project_access)

        allowed_products = db.query(Producto.id).filter(or_(
            Producto.owner_id == str(current_user.id),
            Producto.proyecto_id.in_(allowed_projects),
        )) if current_user.rol not in STAFF_ROLES else db.query(Producto.id)

        query = query.filter(or_(
            Documento.owner_id == str(current_user.id),
            Documento.entidad_tipo.in_(["general", "formato", "plantilla"]),
            and_(
                Documento.entidad_tipo == "proyecto",
                Documento.entidad_id.in_(allowed_projects),
            ),
            and_(
                Documento.entidad_tipo == "producto",
                Documento.entidad_id.in_(allowed_products),
            ),
        ))
    
    documentos = query.order_by(Documento.created_at.desc()).all()
    return documentos


@router.get("/{documento_id}", response_model=DocumentoResponse)
def get_documento(
    documento_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener detalle de un documento."""
    doc = db.query(Documento).filter(Documento.id == str(documento_id)).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    if not _can_access_document(doc, current_user, db):
        raise HTTPException(status_code=403, detail="Sin acceso a este documento")
    
    return doc


@router.post("", response_model=DocumentoResponse, status_code=201)
@router.post("/", response_model=DocumentoResponse, status_code=201)
def create_documento_base64(
    data: DocumentoCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crea o registra un documento mediante base64 (JSON)."""
    if data.tipo == "evidencia_bitacora":
        raise HTTPException(status_code=422, detail="El tipo de adjunto de bitácora ya no está disponible. Seleccione otro tipo de documento.")
    if current_user.rol == "aprendiz":
        raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para subir documentos")

    project_id = _validate_document_target(data.entidad_tipo, str(data.entidad_id), data.tipo,
                                            data.periodo_bimestre, current_user, db)
    content_type = CONTENT_TYPES_BY_EXTENSION.get(Path(data.nombre_archivo).suffix.lower())
    if not content_type:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido")
    if len(data.data_base64) > 4 * ((MAX_FILE_SIZE + 2) // 3):
        raise HTTPException(status_code=400, detail="El archivo supera el máximo permitido de 10 MB")
    try:
        binary_data = base64.b64decode(data.data_base64, validate=True)
    except (ValueError, binascii.Error):
        raise HTTPException(status_code=400, detail="El contenido base64 no es válido")
    _validate_content(binary_data)

    documento = Documento(
        id=str(uuid.uuid4()),
        entidad_tipo=data.entidad_tipo,
        entidad_id=str(data.entidad_id),
        tipo=data.tipo,
        nombre_archivo=data.nombre_archivo,
        descripcion=data.descripcion,
        periodo_bimestre=data.periodo_bimestre,
        content_type=content_type,
        owner_id=str(current_user.id)
    )

    _persist_document(documento, binary_data, db)
    _evaluate_project_completion(project_id, db)

    return documento


@router.post("/upload", response_model=DocumentoResponse, status_code=201)
async def upload_documento(
    entidad_tipo: Optional[str] = Form("general", description="Tipo: proyecto, producto, user, general, formato"),
    entidad_id: Optional[str] = Form(None),
    tipo: Optional[str] = Form("evidencia", description="Tipo: cvlac_pdf, acta, contrato, informe, evidencia, soporte_minciencias, otro"),
    descripcion: Optional[str] = Form(None, description="Descripción de la evidencia o referencia documental"),
    periodo_bimestre: Optional[int] = Form(None, description="Número del período del informe bimestral"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Subir un nuevo documento (max 10MB) al sistema de archivos."""
    if tipo == "evidencia_bitacora":
        raise HTTPException(status_code=422, detail="El tipo de adjunto de bitácora ya no está disponible. Seleccione otro tipo de documento.")
    if current_user.rol == "aprendiz":
        raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para subir documentos")
    resolved_entidad_tipo = entidad_tipo or "general"
    if resolved_entidad_tipo in {"proyecto", "producto", "user"} and not (entidad_id and entidad_id.strip()):
        raise HTTPException(status_code=422, detail="Indica la entidad a la que pertenece el documento")
    resolved_entidad_id = entidad_id.strip() if (entidad_id and entidad_id.strip()) else str(current_user.id)
    resolved_tipo = tipo or "evidencia"
    project_id = _validate_document_target(resolved_entidad_tipo, resolved_entidad_id, resolved_tipo,
                                            periodo_bimestre, current_user, db)
    resolved_entidad_id = str(UUID(resolved_entidad_id))
    content_type = validate_file(file)
    if not file.filename:
        raise HTTPException(status_code=400, detail="El archivo debe tener un nombre")
    content = await file.read(MAX_FILE_SIZE + 1)
    _validate_content(content)
    
    # Crear documento en BD
    documento = Documento(
        id=str(uuid.uuid4()),
        entidad_tipo=resolved_entidad_tipo,
        entidad_id=resolved_entidad_id,
        tipo=resolved_tipo,
        nombre_archivo=file.filename,
        descripcion=descripcion.strip() if descripcion and descripcion.strip() else None,
        content_type=content_type,
        periodo_bimestre=periodo_bimestre,
        owner_id=str(current_user.id)
    )
    
    _persist_document(documento, content, db)
    _evaluate_project_completion(project_id, db)

    return documento


@router.get("/{documento_id}/download")
def download_documento(
    documento_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Descargar un documento. Retorna base64 por compatibilidad con frontend."""
    doc = db.query(Documento).filter(Documento.id == str(documento_id)).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    if not _can_access_document(doc, current_user, db):
        raise HTTPException(status_code=403, detail="Sin acceso")
    
    data_b64 = None
    target_path = None
    if doc.file_path:
        if os.path.exists(doc.file_path):
            target_path = doc.file_path
        elif os.path.exists(STORAGE_DIR / Path(doc.file_path).name):
            target_path = STORAGE_DIR / Path(doc.file_path).name

    if target_path and os.path.exists(target_path):
        with open(target_path, "rb") as f:
            data_b64 = base64.b64encode(f.read()).decode('utf-8')
    elif doc.data_base64:
        data_b64 = doc.data_base64
    
    return {
        "id": doc.id,
        "nombre_archivo": doc.nombre_archivo,
        "descripcion": doc.descripcion,
        "content_type": doc.content_type,
        "data_base64": data_b64,
        "created_at": doc.created_at
    }


@router.delete("/{documento_id}")
def delete_documento(
    documento_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar un documento de la BD y del disco."""
    doc = db.query(Documento).filter(Documento.id == str(documento_id)).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    # Solo admin o owner pueden eliminar (aprendices no)
    if current_user.rol == "aprendiz":
        raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para eliminar documentos")
    if current_user.rol != "admin" and doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sin permiso para eliminar")
    
    target_path = None
    if doc.file_path:
        if os.path.exists(doc.file_path):
            target_path = doc.file_path
        elif os.path.exists(STORAGE_DIR / Path(doc.file_path).name):
            target_path = STORAGE_DIR / Path(doc.file_path).name

    db.delete(doc)
    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("No se pudo eliminar el documento de la base de datos")
        raise HTTPException(status_code=500, detail="No se pudo eliminar el documento. Intenta nuevamente")
    if target_path:
        try:
            Path(target_path).unlink(missing_ok=True)
        except OSError:
            logger.exception("El registro se eliminó, pero falta retirar el archivo físico")
            raise HTTPException(status_code=500, detail="El registro se eliminó, pero no se pudo retirar el archivo físico")
    
    return {"message": "Documento eliminado"}


# ==========================================
# ENDPOINTS ESPECIALES
# ==========================================

@router.get("/user/cvlac")
def get_user_cvlac(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener CV Lac del usuario actual."""
    doc = db.query(Documento).filter(
        Documento.entidad_tipo == "user",
        Documento.entidad_id == current_user.id,
        Documento.tipo == "cvlac_pdf"
    ).order_by(Documento.created_at.desc()).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="CV Lac no encontrado")
    
    data_b64 = None
    if doc.file_path and os.path.exists(doc.file_path):
        with open(doc.file_path, "rb") as f:
            data_b64 = base64.b64encode(f.read()).decode('utf-8')
    elif doc.data_base64:
        data_b64 = doc.data_base64
        
    return {
        "id": doc.id,
        "nombre_archivo": doc.nombre_archivo,
        "content_type": doc.content_type,
        "data_base64": data_b64,
        "created_at": doc.created_at
    }


@router.get("/proyecto/{proyecto_id}/list")
def get_proyecto_documentos(
    proyecto_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar documentos de un proyecto específico."""
    from app.models import Proyecto
    
    proyecto = db.query(Proyecto).filter(Proyecto.id == str(proyecto_id)).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    if not can_access_project(proyecto, current_user):
        raise HTTPException(status_code=403, detail="Sin acceso al proyecto")
    
    documentos = db.query(Documento).filter(
        Documento.entidad_tipo == "proyecto",
        Documento.entidad_id == str(proyecto_id)
    ).order_by(Documento.created_at.desc()).all()
    
    return documentos
