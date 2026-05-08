import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Reto, User
from app.schemas_retos import RetoCreate, RetoUpdate, RetoResponse

router = APIRouter(prefix="/retos", tags=["Banco de Retos"])

@router.get("", response_model=List[RetoResponse])
def listar_retos(db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    retos = db.query(Reto).options(joinedload(Reto.semillero_asignado)).order_by(Reto.created_at.desc()).all()
    
    # Populate semillero_nombre for the frontend
    for r in retos:
        if r.semillero_asignado:
            r.semillero_nombre = r.semillero_asignado.nombre
    return retos

@router.get("/{reto_id}", response_model=RetoResponse)
def obtener_reto(reto_id: str, db: Session = Depends(get_db)):
    try:
        uid = uuid.UUID(reto_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de reto inválido")
        
    from sqlalchemy.orm import joinedload
    reto = db.query(Reto).options(joinedload(Reto.semillero_asignado)).filter(Reto.id == uid).first()
    if not reto:
        raise HTTPException(status_code=404, detail="Reto no encontrado")
    if reto.semillero_asignado:
        reto.semillero_nombre = reto.semillero_asignado.nombre
    return reto

@router.post("", response_model=RetoResponse, status_code=201)
def crear_reto(
    reto: RetoCreate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    nuevo_reto = Reto(**reto.model_dump(), owner_id=str(current_user.id))
    db.add(nuevo_reto)
    db.commit()
    db.refresh(nuevo_reto)
    return nuevo_reto

@router.patch("/{reto_id}", response_model=RetoResponse)
def actualizar_reto(
    reto_id: str,
    reto_update: RetoUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reto_db = db.query(Reto).filter(Reto.id == uuid.UUID(reto_id)).first()
    if not reto_db:
        raise HTTPException(status_code=404, detail="Reto no encontrado")
    
    if current_user.rol != "admin" and reto_db.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")

    update_data = reto_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "semillero_asignado_id" and value:
            value = str(value)
        setattr(reto_db, key, value)

    db.commit()
    db.refresh(reto_db)
    
    # Re-fetch with semillero join to return fresh name
    return obtener_reto(reto_id, db)

@router.delete("/{reto_id}")
def eliminar_reto(
    reto_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reto_db = db.query(Reto).filter(Reto.id == uuid.UUID(reto_id)).first()
    if not reto_db:
        raise HTTPException(status_code=404, detail="Reto no encontrado")
        
    if current_user.rol != "admin" and reto_db.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
        
    db.delete(reto_db)
    db.commit()
    return {"message": "Reto eliminado exitosamente"}
