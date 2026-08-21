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

from app.config import get_settings
from app.auth import get_current_user
from app.database import get_db
from app.models import Documento, User, Proyecto
from app.schemas import DocumentoResponse, DocumentoCreate
from app.utils import log_actividad
from app.services.proyectos_service import evaluar_y_auto_finalizar_proyecto

router = APIRouter(prefix="/documentos", tags=["Documentos"])

# Configuración de almacenamiento
settings = get_settings()
STORAGE_DIR = Path(settings.STORAGE_DIR) / "documentos" if hasattr(settings, "STORAGE_DIR") else Path("storage/documentos")
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


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
    
    # Verificar permisos (admin o owner)
    if current_user.rol != "admin" and doc.owner_id != current_user.id:
        if doc.entidad_tipo == "proyecto":
            proyecto = db.query(Proyecto).filter(Proyecto.id == doc.entidad_id).first()
            if not (proyecto and any(m.id == current_user.id for m in proyecto.equipo)):
                raise HTTPException(status_code=403, detail="Sin acceso")
        elif doc.entidad_tipo in ["general", "formato", "plantilla"]:
            pass
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
        query = query.filter(Documento.entidad_id == str(entidad_id))
    if tipo:
        query = query.filter(Documento.tipo == tipo)
    
    # Si no es admin, solo ver sus propios documentos o documentos públicos de proyectos y generales
    if current_user.rol != "admin":
        query = query.filter(
            (Documento.owner_id == current_user.id) |
            (Documento.entidad_tipo == "proyecto") |
            (Documento.entidad_tipo.in_(["general", "formato", "plantilla"]))
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
    doc = db.query(Documento).filter(Documento.id == str(documento_id)).first()
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


@router.post("", response_model=DocumentoResponse, status_code=201)
@router.post("/", response_model=DocumentoResponse, status_code=201)
def create_documento_base64(
    data: DocumentoCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crea o registra un documento mediante base64 (JSON)."""
    if current_user.rol == "aprendiz":
        raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para subir documentos")

    doc_id = str(uuid.uuid4())
    file_ext = data.nombre_archivo.split('.')[-1] if '.' in data.nombre_archivo else 'bin'
    file_name = f"{doc_id}.{file_ext}"
    file_path = STORAGE_DIR / file_name

    try:
        binary_data = base64.b64decode(data.data_base64)
        with open(file_path, "wb") as f:
            f.write(binary_data)
    except Exception:
        file_path = None

    documento = Documento(
        id=doc_id,
        entidad_tipo=data.entidad_tipo,
        entidad_id=str(data.entidad_id),
        tipo=data.tipo,
        nombre_archivo=data.nombre_archivo,
        file_path=str(file_path) if file_path else None,
        data_base64=data.data_base64 if not file_path else None,
        content_type="application/pdf" if data.nombre_archivo.endswith(".pdf") else "application/octet-stream",
        owner_id=str(current_user.id)
    )

    db.add(documento)
    try:
        db.commit()
        db.refresh(documento)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    if data.entidad_tipo == "proyecto" and data.tipo == "informe_final":
        try:
            evaluar_y_auto_finalizar_proyecto(str(data.entidad_id), db)
        except Exception:
            pass

    return documento


@router.post("/upload", response_model=DocumentoResponse, status_code=201)
async def upload_documento(
    entidad_tipo: Optional[str] = Form("general", description="Tipo: proyecto, producto, user, general, formato"),
    entidad_id: Optional[str] = Form(None),
    tipo: Optional[str] = Form("evidencia", description="Tipo: cvlac_pdf, acta, contrato, informe, evidencia, soporte_minciencias, otro"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Subir un nuevo documento (max 10MB) al sistema de archivos."""
    if current_user.rol == "aprendiz":
        raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para subir documentos")
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
    
    resolved_entidad_tipo = entidad_tipo or "general"
    resolved_entidad_id = entidad_id if (entidad_id and entidad_id.strip()) else str(current_user.id)
    resolved_tipo = tipo or "evidencia"
    
    # Crear documento en BD
    documento = Documento(
        id=doc_id,
        entidad_tipo=resolved_entidad_tipo,
        entidad_id=resolved_entidad_id,
        tipo=resolved_tipo,
        nombre_archivo=file.filename,
        content_type=content_type,
        file_path=str(file_path).replace("\\", "/"),
        owner_id=str(current_user.id)
    )
    
    db.add(documento)
    try:
        db.commit()
    except Exception as __db_err:
        import logging
        logging.getLogger(__name__).warning('DB Commit falló (infraestructura): %s', __db_err)
        try:
            if 'session' in globals() or 'session' in locals():
                db.session.rollback()
            else:
                db.rollback()
        except Exception:
            pass
    db.refresh(documento)
    
    # Si se subió un informe final de proyecto, evaluar auto-finalización
    if resolved_entidad_tipo == "proyecto" and resolved_tipo == "informe_final":
        try:
            evaluar_y_auto_finalizar_proyecto(resolved_entidad_id, db)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("Error al evaluar auto-finalización tras subir informe_final: %s", e)

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
    
    # Verificar permisos
    if current_user.rol != "admin" and doc.owner_id != current_user.id:
        if doc.entidad_tipo == "proyecto":
            from app.models import Proyecto
            proyecto = db.query(Proyecto).filter(Proyecto.id == doc.entidad_id).first()
            if proyecto and any(m.id == current_user.id for m in proyecto.equipo):
                pass
            else:
                raise HTTPException(status_code=403, detail="Sin acceso")
        elif doc.entidad_tipo in ["general", "formato", "plantilla"]:
            pass
        else:
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

    if target_path and os.path.exists(target_path):
        try:
            os.remove(target_path)
        except Exception as e:
            print(f"⚠️ Error al eliminar archivo físico: {e}")
            
    db.delete(doc)
    try:
        db.commit()
    except Exception as __db_err:
        import logging
        logging.getLogger(__name__).warning('DB Commit falló (infraestructura): %s', __db_err)
        try:
            if 'session' in globals() or 'session' in locals():
                db.session.rollback()
            else:
                db.rollback()
        except Exception:
            pass
    
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
    
    # Verificar acceso
    has_access = (
        current_user.rol == "admin" or
        str(proyecto.owner_id) == str(current_user.id) or
        any(str(m.id) == str(current_user.id) for m in proyecto.equipo)
    )
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Sin acceso al proyecto")
    
    documentos = db.query(Documento).filter(
        Documento.entidad_tipo == "proyecto",
        Documento.entidad_id == str(proyecto_id)
    ).order_by(Documento.created_at.desc()).all()
    
    return documentos
