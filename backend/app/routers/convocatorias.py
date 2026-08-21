from typing import List, Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.auth import get_current_user, get_current_admin
from app.database import get_db, safe_commit
from app.models import Convocatoria, User, Proyecto, Notificacion
from app.schemas import ConvocatoriaCreate, ConvocatoriaUpdate, ConvocatoriaResponse
from app.utils import log_actividad
from app.services import EmailService

router = APIRouter(prefix="/convocatorias", tags=["Convocatorias MINCIENCIAS / SENNOVA"])


def _attach_project_count(convocatorias: List[Convocatoria], db: Session):
    for c in convocatorias:
        c.total_proyectos = db.query(Proyecto).filter(
            Proyecto.convocatoria_id == str(c.id)
        ).count()


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
    _attach_project_count(convocatorias, db)
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
    background_tasks: BackgroundTasks,
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
    safe_commit(db)
    db.refresh(convocatoria)
    
    log_actividad(
        db, 
        admin.id, 
        "crear_convocatoria", 
        f"Publicó la convocatoria: {convocatoria.nombre} ({convocatoria.año})",
        entidad_tipo="convocatoria",
        entidad_id=str(convocatoria.id)
    )
    
    # Notificar a todos los investigadores activos
    try:
        investigadores = db.query(User).filter(
            User.rol.in_(['investigador', 'instructor']),
            User.is_active != False
        ).all()
        for inv in investigadores:
            notif = Notificacion(
                user_id=str(inv.id),
                tipo='convocatoria',
                titulo=f"Nueva Convocatoria: {convocatoria.nombre}",
                mensaje=f"Se ha publicado la convocatoria '{convocatoria.nombre}' ({convocatoria.año}). Fecha de cierre: {convocatoria.fecha_cierre}",
                entidad_tipo='convocatoria',
                entidad_id=str(convocatoria.id),
                prioridad='normal',
                leida=False
            )
            db.add(notif)
            
            body_html = f"""
            <h3>Hola {inv.nombre},</h3>
            <p>Se ha publicado una nueva convocatoria en la plataforma SENNOVA:</p>
            <ul>
                <li><b>Nombre:</b> {convocatoria.nombre}</li>
                <li><b>Año:</b> {convocatoria.año}</li>
                <li><b>Fecha de Cierre:</b> {convocatoria.fecha_cierre}</li>
            </ul>
            <p>Puedes postular tu proyecto ingresando a la plataforma.</p>
            <br/>
            <p>Atentamente,<br/>Coordinación SENNOVA CGAO</p>
            """
            EmailService.send_email_async(inv.email, f"Nueva Convocatoria Abierta: {convocatoria.nombre}", body_html, background_tasks)
        safe_commit(db)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Error al generar notificaciones de convocatoria: %s", e)
    
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
    
    update_data = convocatoria_update.model_dump(exclude_unset=True) if hasattr(convocatoria_update, 'model_dump') else convocatoria_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(convocatoria, field, value)
    
    safe_commit(db)
    db.refresh(convocatoria)
    
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
    safe_commit(db)
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
    _attach_project_count(convocatorias, db)
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
    
    por_estado_rows = db.query(
        Convocatoria.estado,
        func.count(Convocatoria.id).label("cantidad")
    ).group_by(Convocatoria.estado).all()
    
    return {
        "total_convocatorias": db.query(Convocatoria).count(),
        "por_año": [{"año": row[0], "cantidad": row[1]} for row in por_año_rows],
        "por_estado": [{"estado": row[0], "cantidad": row[1]} for row in por_estado_rows],
        "total_proyectos": db.query(Proyecto).count()
    }
