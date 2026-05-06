import hashlib
import json
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import BitacoraEntry, Proyecto, User
from app.schemas import BitacoraCreate, BitacoraUpdate, BitacoraResponse, BitacoraSignRequest
from app.auth import get_current_user

router = APIRouter(
    prefix="/bitacora",
    tags=["Bitácora de Proyectos"]
)

@router.get("/proyecto/{proyecto_id}", response_model=List[BitacoraResponse])
def listar_bitacora(
    proyecto_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtiene todas las entradas de bitácora de un proyecto específico."""
    proyecto = db.query(Proyecto).filter(Proyecto.id == proyecto_id).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    entries = db.query(BitacoraEntry).filter(BitacoraEntry.proyecto_id == proyecto_id).order_by(BitacoraEntry.fecha.desc()).all()
    
    for entry in entries:
        entry.user_nombre = entry.user.nombre
        
    return entries

@router.get("/{entry_id}", response_model=BitacoraResponse)
def obtener_entrada(
    entry_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtiene una entrada específica de bitácora."""
    entry = db.query(BitacoraEntry).filter(BitacoraEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")
    
    entry.user_nombre = entry.user.nombre
    return entry

@router.post("/", response_model=BitacoraResponse)
def crear_entrada(
    entry_in: BitacoraCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crea una nueva entrada en la bitácora técnica."""
    proyecto = db.query(Proyecto).filter(Proyecto.id == entry_in.proyecto_id).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        
    new_entry = BitacoraEntry(
        **entry_in.dict(),
        user_id=current_user.id
    )
    
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    
    new_entry.user_nombre = current_user.nombre
    return new_entry

@router.post("/{entry_id}/sign", response_model=BitacoraResponse)
def firmar_entrada(
    entry_id: UUID,
    sign_in: BitacoraSignRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Firma digitalmente una entrada de bitácora."""
    entry = db.query(BitacoraEntry).filter(BitacoraEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")

    # Determinar qué rol está firmando
    # Investigador: Admin, Gestor, Instructor, Investigador
    es_investigador = current_user.rol.lower() in ['admin', 'gestor', 'instructor', 'investigador']
    es_aprendiz = current_user.rol.lower() == 'aprendiz'

    if not es_investigador and not es_aprendiz:
        raise HTTPException(status_code=403, detail="Su rol no está autorizado para firmar bitácoras")

    # Generar Hash de integridad del contenido
    content_str = f"{entry.titulo}|{entry.contenido}|{entry.categoria}|{entry.proyecto_id}"
    integrity_hash = hashlib.sha256(content_str.encode()).hexdigest()

    # Preparar evidencia
    evidence = {
        "user_id": str(current_user.id),
        "user_email": current_user.email,
        "ip": request.client.host,
        "user_agent": request.headers.get("user-agent"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "integrity_hash": integrity_hash
    }

    if es_investigador:
        entry.is_firmado_investigador = True
        entry.fecha_firma_investigador = datetime.now(timezone.utc)
        meta = entry.signature_metadata or {}
        meta["investigador"] = evidence
        entry.signature_metadata = meta
    else:
        entry.is_firmado_aprendiz = True
        entry.fecha_firma_aprendiz = datetime.now(timezone.utc)
        meta = entry.signature_metadata or {}
        meta["aprendiz"] = evidence
        entry.signature_metadata = meta

    db.commit()
    db.refresh(entry)
    entry.user_nombre = entry.user.nombre
    return entry

@router.put("/{entry_id}", response_model=BitacoraResponse)
def actualizar_entrada(
    entry_id: UUID,
    entry_in: BitacoraUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Actualiza una entrada existente (solo si no está firmada por ambos)."""
    entry = db.query(BitacoraEntry).filter(BitacoraEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")
    
    if entry.is_firmado_investigador and entry.is_firmado_aprendiz:
        raise HTTPException(status_code=400, detail="No se puede editar una bitácora con firmas completas")

    if entry.user_id != current_user.id and current_user.rol != 'admin':
        raise HTTPException(status_code=403, detail="No tiene permisos para editar esta entrada")
        
    update_data = entry_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(entry, key, value)
        
    db.commit()
    db.refresh(entry)
    entry.user_nombre = entry.user.nombre
    return entry

@router.delete("/{entry_id}")
def eliminar_entrada(
    entry_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Elimina una entrada de bitácora."""
    entry = db.query(BitacoraEntry).filter(BitacoraEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")
        
    if entry.is_firmado_investigador or entry.is_firmado_aprendiz:
         raise HTTPException(status_code=400, detail="No se puede eliminar una bitácora firmada")

    if entry.user_id != current_user.id and current_user.rol != 'admin':
        raise HTTPException(status_code=403, detail="No tiene permisos para eliminar esta entrada")
        
    db.delete(entry)
    db.commit()
    return {"status": "deleted"}

