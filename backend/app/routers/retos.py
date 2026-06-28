import uuid
from typing import List, Optional

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Reto, User
from app.schemas_retos import RetoCreate, RetoUpdate, RetoResponse

router = APIRouter(prefix="/retos", tags=["Banco de Retos"])

@router.get("", response_model=List[RetoResponse])
def listar_retos(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista todos los retos."""
    try:
        from sqlalchemy.orm import joinedload
        retos = db.query(Reto).options(joinedload(Reto.semillero_asignado)).order_by(Reto.created_at.desc()).all()
        
        # Populate semillero_nombre for the frontend
        for r in retos:
            if r.semillero_asignado:
                r.semillero_nombre = r.semillero_asignado.nombre
        return retos
    except sa.exc.OperationalError as db_err:
        raise db_err
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{reto_id}", response_model=RetoResponse)
def obtener_reto(
    reto_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene un reto específico."""
    try:
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
    except sa.exc.OperationalError as db_err:
        raise db_err
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=RetoResponse, status_code=201)
def crear_reto(
    reto: RetoCreate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Crea un nuevo reto."""
    try:
        if current_user.rol == "aprendiz":
            raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para crear retos")
        nuevo_reto = Reto(**reto.model_dump(), owner_id=str(current_user.id))
        db.add(nuevo_reto)
        db.commit()
        db.refresh(nuevo_reto)
        return nuevo_reto
    except HTTPException:
        db.rollback()
        raise
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{reto_id}", response_model=RetoResponse)
def actualizar_reto(
    reto_id: str,
    reto_update: RetoUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualiza un reto existente."""
    try:
        reto_db = db.query(Reto).filter(Reto.id == uuid.UUID(reto_id)).first()
        if not reto_db:
            raise HTTPException(status_code=404, detail="Reto no encontrado")
        
        if current_user.rol == "aprendiz":
            raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para modificar retos")
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
        return obtener_reto(reto_id, current_user, db)
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{reto_id}")
def eliminar_reto(
    reto_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        reto_db = db.query(Reto).filter(Reto.id == uuid.UUID(reto_id)).first()
        if not reto_db:
            raise HTTPException(status_code=404, detail="Reto no encontrado")
            
        if current_user.rol == "aprendiz":
            raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para modificar retos")
        if current_user.rol != "admin" and reto_db.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="No autorizado")
            
        db.delete(reto_db)
        db.commit()
        return {"message": "Reto eliminado exitosamente"}
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
