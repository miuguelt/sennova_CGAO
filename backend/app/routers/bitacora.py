from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import BitacoraEntry, Proyecto, User
from app.schemas import BitacoraCreate, BitacoraUpdate, BitacoraResponse
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
    # Verificar acceso al proyecto
    proyecto = db.query(Proyecto).filter(Proyecto.id == proyecto_id).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    entries = db.query(BitacoraEntry).filter(BitacoraEntry.proyecto_id == proyecto_id).order_by(BitacoraEntry.fecha.desc()).all()
    
    # Mapear nombres de usuario para la respuesta
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
    
    # Verificar acceso al proyecto
    if not entry.proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no asociado")
        
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

@router.put("/{entry_id}", response_model=BitacoraResponse)
def actualizar_entrada(
    entry_id: UUID,
    entry_in: BitacoraUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Actualiza una entrada existente (solo autor o admin)."""
    entry = db.query(BitacoraEntry).filter(BitacoraEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")
    
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
        
    if entry.user_id != current_user.id and current_user.rol != 'admin':
        raise HTTPException(status_code=403, detail="No tiene permisos para eliminar esta entrada")
        
    db.delete(entry)
    db.commit()
    return {"status": "deleted"}
