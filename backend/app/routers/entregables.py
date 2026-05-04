"""
Router de Entregables - Cronograma SENNOVA
Gestión de entregables y cronograma de proyectos
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, get_current_admin
from app.models import User, Proyecto, Entregable, Notificacion
from app.utils import log_actividad
from app.schemas import (
    EntregableCreate, EntregableUpdate, EntregableResponse, 
    EntregableListResponse, NotificacionCreate
)

router = APIRouter(
    prefix="/entregables",
    tags=["Entregables - Cronograma"]
)


def calcular_dias_restantes(fecha_entrega) -> Optional[int]:
    """Calcula días restantes hasta la fecha de entrega."""
    if not fecha_entrega:
        return None
    hoy = datetime.now(timezone.utc).date()
    if isinstance(fecha_entrega, datetime):
        fecha = fecha_entrega.date()
    else:
        fecha = fecha_entrega
    return (fecha - hoy).days


def puede_ver_entregables(proyecto: Proyecto, user: User) -> bool:
    """Verifica si el usuario puede ver los entregables del proyecto."""
    if user.rol == 'admin':
        return True
    if proyecto.owner_id == user.id:
        return True
    # Verificar si es miembro del equipo
    for miembro in proyecto.equipo:
        if miembro.id == user.id:
            return True
    return False


def puede_editar_entregables(proyecto: Proyecto, user: User) -> bool:
    """Verifica si el usuario puede editar entregables del proyecto."""
    if user.rol == 'admin':
        return True
    if proyecto.owner_id == user.id:
        return True
    return False


@router.get("/proyecto/{proyecto_id}", response_model=List[EntregableListResponse])
def listar_entregables_proyecto(
    proyecto_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista todos los entregables de un proyecto."""
    proyecto = db.query(Proyecto).filter(Proyecto.id == proyecto_id).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    if not puede_ver_entregables(proyecto, current_user):
        raise HTTPException(status_code=403, detail="No tienes permiso para ver estos entregables")
    
    entregables = db.query(Entregable).filter(
        Entregable.proyecto_id == proyecto_id
    ).order_by(Entregable.fecha_entrega).all()
    
    # Calcular días restantes
    result = []
    for e in entregables:
        e_dict = {
            "id": e.id,
            "fase": e.fase,
            "titulo": e.titulo,
            "estado": e.estado,
            "fecha_entrega": e.fecha_entrega,
            "dias_restantes": calcular_dias_restantes(e.fecha_entrega)
        }
        result.append(e_dict)
    
    return result


@router.get("/mis-entregables", response_model=List[EntregableResponse])
def listar_mis_entregables(
    pendientes_only: bool = Query(False, description="Solo entregables pendientes"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista los entregables asignados al usuario actual."""
    query = db.query(Entregable).filter(Entregable.responsable_id == current_user.id)
    
    if pendientes_only:
        query = query.filter(Entregable.estado.in_(['pendiente', 'en_desarrollo']))
    
    entregables = query.order_by(Entregable.fecha_entrega).all()
    
    result = []
    for e in entregables:
        e_dict = {
            "id": e.id,
            "fase": e.fase,
            "titulo": e.titulo,
            "descripcion": e.descripcion,
            "tipo": e.tipo,
            "fecha_entrega": e.fecha_entrega,
            "estado": e.estado,
            "fecha_envio": e.fecha_envio,
            "fecha_aprobacion": e.fecha_aprobacion,
            "observaciones": e.observaciones,
            "proyecto_id": e.proyecto_id,
            "responsable_id": e.responsable_id,
            "producto_id": e.producto_id,
            "created_at": e.created_at,
            "updated_at": e.updated_at,
            "responsable_nombre": e.responsable.nombre if e.responsable else None,
            "producto_nombre": e.producto.nombre if e.producto else None,
            "dias_restantes": calcular_dias_restantes(e.fecha_entrega)
        }
        result.append(e_dict)
    
    return result


@router.get("/{entregable_id}", response_model=EntregableResponse)
def obtener_entregable(
    entregable_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene un entregable específico."""
    entregable = db.query(Entregable).filter(Entregable.id == entregable_id).first()
    if not entregable:
        raise HTTPException(status_code=404, detail="Entregable no encontrado")
    
    if not puede_ver_entregables(entregable.proyecto, current_user):
        raise HTTPException(status_code=403, detail="No tienes permiso para ver este entregable")
    
    return {
        "id": entregable.id,
        "fase": entregable.fase,
        "titulo": entregable.titulo,
        "descripcion": entregable.descripcion,
        "tipo": entregable.tipo,
        "fecha_entrega": entregable.fecha_entrega,
        "estado": entregable.estado,
        "fecha_envio": entregable.fecha_envio,
        "fecha_aprobacion": entregable.fecha_aprobacion,
        "observaciones": entregable.observaciones,
        "proyecto_id": entregable.proyecto_id,
        "responsable_id": entregable.responsable_id,
        "producto_id": entregable.producto_id,
        "created_at": entregable.created_at,
        "updated_at": entregable.updated_at,
        "responsable_nombre": entregable.responsable.nombre if entregable.responsable else None,
        "producto_nombre": entregable.producto.nombre if entregable.producto else None,
        "dias_restantes": calcular_dias_restantes(entregable.fecha_entrega)
    }


@router.post("/", response_model=EntregableResponse, status_code=status.HTTP_201_CREATED)
def crear_entregable(
    data: EntregableCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crea un nuevo entregable en el proyecto."""
    proyecto = db.query(Proyecto).filter(Proyecto.id == data.proyecto_id).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    if not puede_editar_entregables(proyecto, current_user):
        raise HTTPException(status_code=403, detail="No tienes permiso para crear entregables")
    
    # Calcular fechas de recordatorio
    fecha_entrega = data.fecha_entrega
    if isinstance(fecha_entrega, str):
        from datetime import datetime as dt
        fecha_entrega = dt.strptime(fecha_entrega, '%Y-%m-%d').date()
    
    recordatorio_15 = fecha_entrega - timedelta(days=15)
    recordatorio_3 = fecha_entrega - timedelta(days=3)
    
    entregable = Entregable(
        fase=data.fase,
        titulo=data.titulo,
        descripcion=data.descripcion,
        tipo=data.tipo,
        fecha_entrega=data.fecha_entrega,
        fecha_recordatorio_15d=recordatorio_15,
        fecha_recordatorio_3d=recordatorio_3,
        proyecto_id=data.proyecto_id,
        responsable_id=data.responsable_id,
        producto_id=data.producto_id,
        estado='pendiente'
    )
    
    db.add(entregable)
    db.commit()
    db.refresh(entregable)
    
    # Registrar actividad
    log_actividad(
        db, 
        current_user.id, 
        "crear_entregable", 
        f"Añadió el entregable: {entregable.titulo}",
        entidad_tipo="entregable",
        entidad_id=str(entregable.id)
    )
    
    # Notificar al responsable si existe
    if entregable.responsable_id and entregable.responsable_id != current_user.id:
        notificacion = Notificacion(
            user_id=entregable.responsable_id,
            tipo='entregable',
            titulo=f'Nuevo entregable asignado: {entregable.titulo}',
            mensaje=f'Se te ha asignado el entregable "{entregable.titulo}" del proyecto "{proyecto.nombre_corto or proyecto.nombre}". Fecha límite: {entregable.fecha_entrega}',
            entidad_tipo='entregable',
            entidad_id=entregable.id,
            prioridad='normal'
        )
        db.add(notificacion)
        db.commit()
    
    return {
        "id": entregable.id,
        "fase": entregable.fase,
        "titulo": entregable.titulo,
        "descripcion": entregable.descripcion,
        "tipo": entregable.tipo,
        "fecha_entrega": entregable.fecha_entrega,
        "estado": entregable.estado,
        "fecha_envio": entregable.fecha_envio,
        "fecha_aprobacion": entregable.fecha_aprobacion,
        "observaciones": entregable.observaciones,
        "proyecto_id": entregable.proyecto_id,
        "responsable_id": entregable.responsable_id,
        "producto_id": entregable.producto_id,
        "created_at": entregable.created_at,
        "updated_at": entregable.updated_at,
        "responsable_nombre": entregable.responsable.nombre if entregable.responsable else None,
        "producto_nombre": entregable.producto.nombre if entregable.producto else None,
        "dias_restantes": calcular_dias_restantes(entregable.fecha_entrega)
    }


@router.put("/{entregable_id}", response_model=EntregableResponse)
def actualizar_entregable(
    entregable_id: str,
    data: EntregableUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualiza un entregable existente."""
    entregable = db.query(Entregable).filter(Entregable.id == entregable_id).first()
    if not entregable:
        raise HTTPException(status_code=404, detail="Entregable no encontrado")
    
    if not puede_editar_entregables(entregable.proyecto, current_user):
        raise HTTPException(status_code=403, detail="No tienes permiso para editar este entregable")
    
    # Actualizar campos
    update_data = data.model_dump(exclude_unset=True)
    
    # Si cambia la fecha de entrega, recalcular recordatorios
    if 'fecha_entrega' in update_data and update_data['fecha_entrega']:
        fecha = update_data['fecha_entrega']
        if isinstance(fecha, str):
            from datetime import datetime as dt
            fecha = dt.strptime(fecha, '%Y-%m-%d').date()
        entregable.fecha_recordatorio_15d = fecha - timedelta(days=15)
        entregable.fecha_recordatorio_3d = fecha - timedelta(days=3)
    
    for field, value in update_data.items():
        setattr(entregable, field, value)
    
    db.commit()
    db.refresh(entregable)
    
    return {
        "id": entregable.id,
        "fase": entregable.fase,
        "titulo": entregable.titulo,
        "descripcion": entregable.descripcion,
        "tipo": entregable.tipo,
        "fecha_entrega": entregable.fecha_entrega,
        "estado": entregable.estado,
        "fecha_envio": entregable.fecha_envio,
        "fecha_aprobacion": entregable.fecha_aprobacion,
        "observaciones": entregable.observaciones,
        "proyecto_id": entregable.proyecto_id,
        "responsable_id": entregable.responsable_id,
        "producto_id": entregable.producto_id,
        "created_at": entregable.created_at,
        "updated_at": entregable.updated_at,
        "responsable_nombre": entregable.responsable.nombre if entregable.responsable else None,
        "producto_nombre": entregable.producto.nombre if entregable.producto else None,
        "dias_restantes": calcular_dias_restantes(entregable.fecha_entrega)
    }


@router.delete("/{entregable_id}")
def eliminar_entregable(
    entregable_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Elimina un entregable."""
    entregable = db.query(Entregable).filter(Entregable.id == entregable_id).first()
    if not entregable:
        raise HTTPException(status_code=404, detail="Entregable no encontrado")
    
    if not puede_editar_entregables(entregable.proyecto, current_user):
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar este entregable")
    
    db.delete(entregable)
    db.commit()
    
    return {"message": "Entregable eliminado correctamente"}


@router.post("/{entregable_id}/cambiar-estado")
def cambiar_estado_entregable(
    entregable_id: str,
    nuevo_estado: str,
    observaciones: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cambia el estado de un entregable (enviado, aprobado, ajustes_requeridos)."""
    entregable = db.query(Entregable).filter(Entregable.id == entregable_id).first()
    if not entregable:
        raise HTTPException(status_code=404, detail="Entregable no encontrado")
    
    estados_validos = ['pendiente', 'en_desarrollo', 'enviado', 'aprobado', 'ajustes_requeridos']
    if nuevo_estado not in estados_validos:
        raise HTTPException(status_code=400, detail=f"Estado no válido. Use: {', '.join(estados_validos)}")
    
    entregable.estado = nuevo_estado
    
    if observaciones:
        entregable.observaciones = observaciones
    
    # Actualizar fechas según estado
    if nuevo_estado == 'enviado':
        entregable.fecha_envio = datetime.now(timezone.utc).date()
    elif nuevo_estado == 'aprobado':
        entregable.fecha_aprobacion = datetime.now(timezone.utc).date()
    
    db.commit()
    
    # Notificar al responsable del cambio
    if entregable.responsable_id and entregable.responsable_id != current_user.id:
        notificacion = Notificacion(
            user_id=entregable.responsable_id,
            tipo='entregable',
            titulo=f'Entregable actualizado: {entregable.titulo}',
            mensaje=f'El entregable "{entregable.titulo}" ha cambiado a estado: {nuevo_estado}. {observaciones or ""}',
            entidad_tipo='entregable',
            entidad_id=entregable.id,
            prioridad='normal' if nuevo_estado != 'ajustes_requeridos' else 'alta'
        )
        db.add(notificacion)
        db.commit()
    
    return {
        "message": f"Estado actualizado a: {nuevo_estado}",
        "entregable_id": entregable_id,
        "nuevo_estado": nuevo_estado
    }


@router.get("/alertas/proximos")
def entregables_proximos(
    dias: int = Query(15, description="Días de anticipación"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista entregables que vencen en los próximos N días."""
    from datetime import date, timedelta
    hoy = date.today()
    fecha_limite = hoy + timedelta(days=dias)
    
    query = db.query(Entregable).filter(
        Entregable.fecha_entrega <= fecha_limite,
        Entregable.fecha_entrega >= hoy,
        Entregable.estado.in_(['pendiente', 'en_desarrollo'])
    )
    
    # Si no es admin, solo mostrar los del usuario
    if current_user.rol != 'admin':
        # Entregables donde es responsable o miembro del proyecto
        query = query.join(Proyecto).filter(
            (Entregable.responsable_id == current_user.id) |
            (Proyecto.owner_id == current_user.id)
        )
    
    entregables = query.order_by(Entregable.fecha_entrega).all()
    
    result = []
    for e in entregables:
        result.append({
            "id": e.id,
            "titulo": e.titulo,
            "fase": e.fase,
            "proyecto_nombre": e.proyecto.nombre_corto or e.proyecto.nombre,
            "fecha_entrega": e.fecha_entrega,
            "dias_restantes": calcular_dias_restantes(e.fecha_entrega),
            "responsable_nombre": e.responsable.nombre if e.responsable else "Sin asignar"
        })
    
    return {
        "total": len(result),
        "dias_consulta": dias,
        "entregables": result
    }
