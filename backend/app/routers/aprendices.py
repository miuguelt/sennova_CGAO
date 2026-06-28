from typing import List, Optional
import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.auth import get_current_user, get_current_admin
from app.models import Aprendiz, User, Semillero
from app.schemas import AprendizResponse, AprendizUpdate

router = APIRouter(prefix="/aprendices", tags=["Gestión de Aprendices"])

@router.get("", response_model=List[AprendizResponse])
def list_aprendices(
    skip: int = 0,
    limit: int = 100,
    semillero_id: Optional[UUID] = None,
    estado: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista todos los aprendices del sistema con filtros opcionales.
    Ruta de alto nivel para facilitar la gestión global.
    """
    try:
        query = db.query(Aprendiz)
        
        if semillero_id:
            query = query.filter(Aprendiz.semillero_id == semillero_id)
        if estado:
            query = query.filter(Aprendiz.estado == estado)
            
        return query.offset(skip).limit(limit).all()
    except sa.exc.OperationalError as db_err:
        raise db_err
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{aprendiz_id}", response_model=AprendizResponse)
def get_aprendiz(
    aprendiz_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene el detalle de un aprendiz específico."""
    try:
        aprendiz = db.query(Aprendiz).filter(Aprendiz.id == aprendiz_id).first()
        if not aprendiz:
            raise HTTPException(status_code=404, detail="Aprendiz no encontrado")
        return aprendiz
    except sa.exc.OperationalError as db_err:
        raise db_err
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{aprendiz_id}", response_model=AprendizResponse)
def update_aprendiz(
    aprendiz_id: UUID,
    data: AprendizUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualiza el estado de un aprendiz."""
    try:
        aprendiz = db.query(Aprendiz).filter(Aprendiz.id == aprendiz_id).first()
        if not aprendiz:
            raise HTTPException(status_code=404, detail="Aprendiz no encontrado")
        
        # Solo administradores o el líder del semillero pueden editar
        semillero = db.query(Semillero).filter(Semillero.id == aprendiz.semillero_id).first()
        if current_user.rol != "admin" and str(semillero.owner_id) != str(current_user.id):
            raise HTTPException(status_code=403, detail="No tiene permisos para modificar este aprendiz")
        
        update_data = data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(aprendiz, field, value)
            
        db.commit()
        db.refresh(aprendiz)
        return aprendiz
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{aprendiz_id}")
def delete_aprendiz(
    aprendiz_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Elimina el registro de vinculación de un aprendiz (Solo Admin)."""
    try:
        aprendiz = db.query(Aprendiz).filter(Aprendiz.id == aprendiz_id).first()
        if not aprendiz:
            raise HTTPException(status_code=404, detail="Aprendiz no encontrado")
            
        db.delete(aprendiz)
        db.commit()
        return {"message": "Vinculación eliminada correctamente"}
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
