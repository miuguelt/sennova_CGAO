from uuid import UUID
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_current_admin
from app.database import get_db
from app.models import Semillero, Grupo, User, Aprendiz
from app.schemas import SemilleroCreate, SemilleroUpdate, SemilleroResponse, AprendizCreate, AprendizResponse, AprendizUpdate
from app.utils import log_actividad

router = APIRouter(prefix="/semilleros", tags=["Semilleros de Investigación"])



def _make_semillero_dict(semillero: Semillero) -> dict:
    """Convierte un objeto Semillero a diccionario para serialización correcta."""
    return {
        "id": str(semillero.id),
        "nombre": semillero.nombre,
        "linea_investigacion": semillero.linea_investigacion,
        "plan_accion": semillero.plan_accion,
        "horas_dedicadas": semillero.horas_dedicadas,
        "estado": semillero.estado,
        "grupo_id": str(semillero.grupo_id),
        "grupo": None,  # Simplificado para evitar recursión
        "owner_id": str(semillero.owner_id),
        "aprendices": [],  # Simplificado
        "total_aprendices": len(semillero.aprendices) if semillero.aprendices else 0,
        "created_at": semillero.created_at
    }


@router.get("")
def list_semilleros(
    skip: int = 0,
    limit: int = 100,
    grupo_id: Optional[str] = None,
    estado: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar semilleros de investigación."""
    query = db.query(Semillero)
    
    if grupo_id:
        query = query.filter(Semillero.grupo_id == str(grupo_id))
    if estado:
        query = query.filter(Semillero.estado == estado)
    
    semilleros = query.offset(skip).limit(limit).all()
    
    return [_make_semillero_dict(s) for s in semilleros]


@router.get("/{semillero_id}")
def get_semillero(
    semillero_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener detalle de un semillero."""
    semillero = db.query(Semillero).filter(Semillero.id == str(semillero_id)).first()
    if not semillero:
        raise HTTPException(status_code=404, detail="Semillero no encontrado")
    
    return _make_semillero_dict(semillero)


@router.post("", status_code=201)
def create_semillero(
    semillero_data: SemilleroCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear un nuevo semillero."""
    # Verificar que el grupo existe
    grupo = db.query(Grupo).filter(Grupo.id == str(semillero_data.grupo_id)).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    semillero = Semillero(
        nombre=semillero_data.nombre,
        linea_investigacion=semillero_data.linea_investigacion,
        plan_accion=semillero_data.plan_accion,
        horas_dedicadas=semillero_data.horas_dedicadas,
        estado=semillero_data.estado,
        grupo_id=str(semillero_data.grupo_id),
        owner_id=str(current_user.id)
    )
    
    db.add(semillero)
    db.commit()
    db.refresh(semillero)
    
    # Registrar actividad
    log_actividad(
        db, 
        current_user.id, 
        "crear_semillero", 
        f"Creó el semillero: {semillero.nombre}",
        entidad_tipo="semillero",
        entidad_id=str(semillero.id)
    )
    
    return _make_semillero_dict(semillero)


@router.put("/{semillero_id}")
def update_semillero(
    semillero_id: str,
    semillero_update: SemilleroUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar un semillero."""
    semillero = db.query(Semillero).filter(Semillero.id == str(semillero_id)).first()
    if not semillero:
        raise HTTPException(status_code=404, detail="Semillero no encontrado")
    
    # Solo admin o owner pueden editar
    if current_user.rol != "admin" and str(semillero.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso para editar")
    
    update_data = semillero_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(semillero, field, value)
    
    db.commit()
    db.refresh(semillero)
    
    # Registrar actividad
    log_actividad(
        db, 
        current_user.id, 
        "actualizar_semillero", 
        f"Actualizó el semillero: {semillero.nombre}",
        entidad_tipo="semillero",
        entidad_id=str(semillero.id)
    )
    
    return _make_semillero_dict(semillero)


@router.delete("/{semillero_id}")
def delete_semillero(
    semillero_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar un semillero."""
    semillero = db.query(Semillero).filter(Semillero.id == str(semillero_id)).first()
    if not semillero:
        raise HTTPException(status_code=404, detail="Semillero no encontrado")
    
    if current_user.rol != "admin" and str(semillero.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso para eliminar")
    
    db.delete(semillero)
    db.commit()
    
    return {"message": "Semillero eliminado"}


# ==========================================
# GESTIÓN DE APRENDICES
# ==========================================

def _make_aprendiz_dict(aprendiz: Aprendiz) -> dict:
    """Convierte un objeto Aprendiz a diccionario."""
    return {
        "id": str(aprendiz.id),
        "nombre": aprendiz.nombre,
        "ficha": aprendiz.ficha,
        "programa": aprendiz.programa,
        "estado": aprendiz.estado,
        "semillero_id": str(aprendiz.semillero_id),
        "fecha_ingreso": aprendiz.fecha_ingreso
    }


@router.get("/{semillero_id}/aprendices")
def list_aprendices(
    semillero_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar aprendices de un semillero."""
    semillero = db.query(Semillero).filter(Semillero.id == str(semillero_id)).first()
    if not semillero:
        raise HTTPException(status_code=404, detail="Semillero no encontrado")
    
    return [_make_aprendiz_dict(a) for a in semillero.aprendices]


@router.post("/{semillero_id}/aprendices", status_code=201)
def add_aprendiz(
    semillero_id: str,
    aprendiz_data: AprendizCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Agregar aprendiz a un semillero."""
    semillero = db.query(Semillero).filter(Semillero.id == str(semillero_id)).first()
    if not semillero:
        raise HTTPException(status_code=404, detail="Semillero no encontrado")
    
    # Solo admin o owner pueden agregar aprendices
    if current_user.rol != "admin" and str(semillero.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso")
    
    aprendiz = Aprendiz(
        nombre=aprendiz_data.nombre,
        ficha=aprendiz_data.ficha,
        programa=aprendiz_data.programa,
        estado=aprendiz_data.estado,
        semillero_id=str(semillero.id)
    )
    
    db.add(aprendiz)
    db.commit()
    db.refresh(aprendiz)
    
    return _make_aprendiz_dict(aprendiz)


@router.put("/{semillero_id}/aprendices/{aprendiz_id}")
def update_aprendiz(
    semillero_id: str,
    aprendiz_id: str,
    aprendiz_data: AprendizUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar datos de un aprendiz."""
    semillero = db.query(Semillero).filter(Semillero.id == str(semillero_id)).first()
    if not semillero:
        raise HTTPException(status_code=404, detail="Semillero no encontrado")
    
    if current_user.rol != "admin" and str(semillero.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso")
    
    aprendiz = db.query(Aprendiz).filter(
        Aprendiz.id == str(aprendiz_id),
        Aprendiz.semillero_id == str(semillero_id)
    ).first()
    
    if not aprendiz:
        raise HTTPException(status_code=404, detail="Aprendiz no encontrado")
    
    update_data = aprendiz_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(aprendiz, field, value)
    
    db.commit()
    db.refresh(aprendiz)
    return _make_aprendiz_dict(aprendiz)


@router.delete("/{semillero_id}/aprendices/{aprendiz_id}")
def delete_aprendiz(
    semillero_id: str,
    aprendiz_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar aprendiz de un semillero."""
    semillero = db.query(Semillero).filter(Semillero.id == str(semillero_id)).first()
    if not semillero:
        raise HTTPException(status_code=404, detail="Semillero no encontrado")
    
    if current_user.rol != "admin" and str(semillero.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso")
    
    aprendiz = db.query(Aprendiz).filter(
        Aprendiz.id == str(aprendiz_id),
        Aprendiz.semillero_id == str(semillero_id)
    ).first()
    
    if not aprendiz:
        raise HTTPException(status_code=404, detail="Aprendiz no encontrado")
    
    db.delete(aprendiz)
    db.commit()
    
    return {"message": "Aprendiz eliminado"}
