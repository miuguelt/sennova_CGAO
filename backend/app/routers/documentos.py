"""
Router de Documentos
Gestión de archivos adjuntos (CV Lac, actas, contratos, informes)
Almacenamiento en disco (storage/documentos)
"""

import base64
import os
import uuid
from typing import List, Optional
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_current_admin
from app.database import get_db
from app.models import Documento, User, Proyecto
from app.schemas import DocumentoResponse
from app.utils import log_actividad

router = APIRouter(prefix="/documentos", tags=["Documentos"])

# Configuración de almacenamiento
STORAGE_DIR = Path("storage/documentos")
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/{documento_id}/view")
def view_documento(
    documento_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ver documento directamente en el navegador."""
    doc = db.query(Documento).filter(Documento.id == uuid.UUID(documento_id)).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    # Verificar permisos (admin o owner)
    if current_user.rol != "admin" and doc.owner_id != current_user.id:
        if doc.entidad_tipo == "proyecto":
            proyecto = db.query(Proyecto).filter(Proyecto.id == doc.entidad_id).first()
            if not (proyecto and any(m.id == current_user.id for m in proyecto.equipo)):
                raise HTTPException(status_code=403, detail="Sin acceso")
        else:
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
    "image/jpeg",
    "image/png",
    "image/jpg",
]


def validate_file(file: UploadFile) -> tuple:
    """Valida tipo y tamaño de archivo."""
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de archivo no permitido. Permitidos: {ALLOWED_CONTENT_TYPES}"
        )
    return file.content_type


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
        query = query.filter(Documento.entidad_id == uuid.UUID(entidad_id))
    if tipo:
        query = query.filter(Documento.tipo == tipo)
    
    # Si no es admin, solo ver sus propios documentos o documentos públicos
    if current_user.rol != "admin":
        query = query.filter(
            (Documento.owner_id == current_user.id) |
            (Documento.entidad_tipo == "proyecto")  # Proyectos son públicos entre el equipo
        )
    
    documentos = query.order_by(Documento.created_at.desc()).all()
    return documentos


@router.get("/{documento_id}", response_model=DocumentoResponse)
def get_documento(
    documento_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener detalle de un documento."""
    doc = db.query(Documento).filter(Documento.id == uuid.UUID(documento_id)).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    # Solo admin o owner pueden ver
    if current_user.rol != "admin" and doc.owner_id != current_user.id:
        # Permitir si es documento de proyecto donde el user es miembro
        if doc.entidad_tipo == "proyecto":
            from app.models import Proyecto
            proyecto = db.query(Proyecto).filter(Proyecto.id == doc.entidad_id).first()
            if proyecto and any(m.id == current_user.id for m in proyecto.equipo):
                return doc
        raise HTTPException(status_code=403, detail="Sin acceso a este documento")
    
    return doc


@router.post("/upload", response_model=DocumentoResponse, status_code=201)
async def upload_documento(
    entidad_tipo: str = Form(..., description="Tipo: proyecto, producto, user"),
    entidad_id: str = Form(...),
    tipo: str = Form(..., description="Tipo: cvlac_pdf, acta, contrato, informe, otro"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Subir un nuevo documento (max 10MB) al sistema de archivos."""
    content_type = validate_file(file)
    
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Archivo excede 10MB máximo")
    
    doc_id = str(uuid.uuid4())
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
    file_name = f"{doc_id}.{file_ext}"
    file_path = STORAGE_DIR / file_name
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Crear documento en BD
    documento = Documento(
        id=doc_id,
        entidad_tipo=entidad_tipo,
        entidad_id=str(uuid.UUID(entidad_id)),
        tipo=tipo,
        nombre_archivo=file.filename,
        content_type=content_type,
        file_path=str(file_path).replace("\\", "/"),
        owner_id=str(current_user.id)
    )
    
    db.add(documento)
    db.commit()
    db.refresh(documento)
    
    return documento


@router.get("/{documento_id}/download")
def download_documento(
    documento_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Descargar un documento. Retorna base64 por compatibilidad con frontend."""
    doc = db.query(Documento).filter(Documento.id == uuid.UUID(documento_id)).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    # Verificar permisos
    if current_user.rol != "admin" and doc.owner_id != current_user.id:
        if doc.entidad_tipo == "proyecto":
            from app.models import Proyecto
            proyecto = db.query(Proyecto).filter(Proyecto.id == doc.entidad_id).first()
            if proyecto and any(m.id == current_user.id for m in proyecto.equipo):
                pass
            else:
                raise HTTPException(status_code=403, detail="Sin acceso")
        else:
            raise HTTPException(status_code=403, detail="Sin acceso")
    
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


@router.delete("/{documento_id}")
def delete_documento(
    documento_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar un documento de la BD y del disco."""
    doc = db.query(Documento).filter(Documento.id == uuid.UUID(documento_id)).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    # Solo admin o owner pueden eliminar
    if current_user.rol != "admin" and doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sin permiso para eliminar")
    
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            print(f"Error al eliminar archivo físico: {e}")
            
    db.delete(doc)
    db.commit()
    
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
    
    proyecto = db.query(Proyecto).filter(Proyecto.id == uuid.UUID(proyecto_id)).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Verificar acceso
    has_access = (
        current_user.rol == "admin" or
        proyecto.owner_id == current_user.id or
        any(m.id == current_user.id for m in proyecto.equipo)
    )
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Sin acceso al proyecto")
    
    documentos = db.query(Documento).filter(
        Documento.entidad_tipo == "proyecto",
        Documento.entidad_id == uuid.UUID(proyecto_id)
    ).order_by(Documento.created_at.desc()).all()
    
    return documentos
