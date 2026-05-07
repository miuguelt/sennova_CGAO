from uuid import UUID
from typing import List, Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.auth import get_current_user, get_current_admin
from app.database import get_db
from app.models import Convocatoria, User, Proyecto
from app.schemas import ConvocatoriaCreate, ConvocatoriaUpdate, ConvocatoriaResponse
from app.utils import log_actividad

router = APIRouter(prefix="/convocatorias", tags=["Convocatorias MINCIENCIAS / SENNOVA"])



@router.get("", response_model=List[ConvocatoriaResponse])
def list_convocatorias(
    skip: int = 0,
    limit: int = 100,
    año: Optional[int] = None,
    estado: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar convocatorias SENNOVA."""
    query = db.query(Convocatoria)
    
    if año:
        query = query.filter(Convocatoria.año == año)
    if estado:
        query = query.filter(Convocatoria.estado == estado)
    
    convocatorias = query.order_by(Convocatoria.año.desc()).offset(skip).limit(limit).all()
    
    # Agregar conteo de proyectos
    for c in convocatorias:
        c.total_proyectos = db.query(Proyecto).filter(
        Proyecto.convocatoria_id == str(c.id)
        ).count()
    
    return convocatorias


@router.get("/{convocatoria_id}", response_model=ConvocatoriaResponse)
def get_convocatoria(
    convocatoria_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener detalle de una convocatoria."""
    convocatoria = db.query(Convocatoria).filter(Convocatoria.id == str(convocatoria_id)).first()
    if not convocatoria:
        raise HTTPException(status_code=404, detail="Convocatoria no encontrada")
    
    convocatoria.total_proyectos = db.query(Proyecto).filter(
        Proyecto.convocatoria_id == str(convocatoria.id)
    ).count()
    
    return convocatoria


@router.post("", response_model=ConvocatoriaResponse, status_code=201)
def create_convocatoria(
    convocatoria_data: ConvocatoriaCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Crear nueva convocatoria (solo admin)."""
    convocatoria = Convocatoria(
        numero_oe=convocatoria_data.numero_oe,
        nombre=convocatoria_data.nombre,
        año=convocatoria_data.año,
        fecha_apertura=convocatoria_data.fecha_apertura,
        fecha_cierre=convocatoria_data.fecha_cierre,
        estado=convocatoria_data.estado,
        descripcion=convocatoria_data.descripcion,
        owner_id=str(admin.id)
    )
    
    db.add(convocatoria)
    db.commit()
    db.refresh(convocatoria)
    
    # Registrar actividad
    log_actividad(
        db, 
        admin.id, 
        "crear_convocatoria", 
        f"Publicó la convocatoria: {convocatoria.nombre} ({convocatoria.año})",
        entidad_tipo="convocatoria",
        entidad_id=str(convocatoria.id)
    )
    
    convocatoria.total_proyectos = 0
    return convocatoria


@router.put("/{convocatoria_id}", response_model=ConvocatoriaResponse)
def update_convocatoria(
    convocatoria_id: str,
    convocatoria_update: ConvocatoriaUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Actualizar convocatoria (solo admin)."""
    convocatoria = db.query(Convocatoria).filter(Convocatoria.id == str(convocatoria_id)).first()
    if not convocatoria:
        raise HTTPException(status_code=404, detail="Convocatoria no encontrada")
    
    update_data = convocatoria_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(convocatoria, field, value)
    
    db.commit()
    db.refresh(convocatoria)
    
    # Registrar actividad
    log_actividad(
        db, 
        admin.id, 
        "actualizar_convocatoria", 
        f"Actualizó la convocatoria: {convocatoria.nombre}",
        entidad_tipo="convocatoria",
        entidad_id=str(convocatoria.id)
    )
    
    convocatoria.total_proyectos = db.query(Proyecto).filter(
        Proyecto.convocatoria_id == str(convocatoria.id)
    ).count()
    
    return convocatoria


@router.delete("/{convocatoria_id}")
def delete_convocatoria(
    convocatoria_id: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Eliminar convocatoria (solo admin)."""
    convocatoria = db.query(Convocatoria).filter(Convocatoria.id == str(convocatoria_id)).first()
    if not convocatoria:
        raise HTTPException(status_code=404, detail="Convocatoria no encontrada")
    
    db.delete(convocatoria)
    db.commit()
    
    return {"message": "Convocatoria eliminada"}


# ==========================================
# ENDPOINTS ESPECIALES
# ==========================================

@router.get("/activas/now", response_model=List[ConvocatoriaResponse])
def get_convocatorias_activas(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener convocatorias actualmente abiertas."""
    today = date.today()
    
    convocatorias = db.query(Convocatoria).filter(
        Convocatoria.estado == "abierta",
        Convocatoria.fecha_apertura <= today,
        (Convocatoria.fecha_cierre >= today) | (Convocatoria.fecha_cierre == None)
    ).all()
    
    for c in convocatorias:
        c.total_proyectos = db.query(Proyecto).filter(
            Proyecto.convocatoria_id == str(c.id)
        ).count()
    
    return convocatorias


@router.get("/stats/resumen")
def get_convocatorias_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Estadísticas de convocatorias (Acceso investigadores)."""
    por_año_rows = db.query(
        Convocatoria.año,
        func.count(Convocatoria.id).label("cantidad")
    ).group_by(Convocatoria.año).all()
    
    por_año = [{"año": row[0], "cantidad": row[1]} for row in por_año_rows]
    
    por_estado_rows = db.query(
        Convocatoria.estado,
        func.count(Convocatoria.id).label("cantidad")
    ).group_by(Convocatoria.estado).all()
    
    por_estado = [{"estado": row[0], "cantidad": row[1]} for row in por_estado_rows]
    
    stats = {
        "total_convocatorias": db.query(Convocatoria).count(),
        "por_año": por_año,
        "por_estado": por_estado,
        "total_proyectos": db.query(Proyecto).count()
    }
    return stats
