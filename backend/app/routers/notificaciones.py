"""
Router de Notificaciones
Sistema de alertas in-app y gestión de notificaciones
"""

from datetime import datetime, timezone
from typing import List, Optional

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.database import get_db
from app.auth import get_current_user, get_current_admin
from app.models import User, Notificacion
from app.schemas import (
    NotificacionCreate, NotificacionResponse, NotificacionListResponse, 
    NotificacionMarcarLeida, NotificacionStats
)

router = APIRouter(
    prefix="/notificaciones",
    tags=["Notificaciones"]
)


@router.get("/", response_model=List[NotificacionListResponse])
def listar_notificaciones(
    solo_no_leidas: bool = Query(False, description="Solo notificaciones no leídas"),
    leida: Optional[bool] = Query(None, description="Filtrar por estado leída (true/false)"),
    limite: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0, description="Saltar N notificaciones (paginación)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista las notificaciones del usuario actual."""
    try:
        query = db.query(Notificacion).filter(Notificacion.user_id == str(current_user.id))
        
        if leida is not None:
            if leida:
                query = query.filter(Notificacion.leida == True)
            else:
                query = query.filter((Notificacion.leida == False) | (Notificacion.leida.is_(None)))
        elif solo_no_leidas:
            query = query.filter((Notificacion.leida == False) | (Notificacion.leida.is_(None)))
        
        notificaciones = query.order_by(desc(Notificacion.created_at)).offset(skip).limit(limite).all()
        
        return notificaciones
    except sa.exc.OperationalError as db_err:
        raise db_err
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats", response_model=NotificacionStats)
def estadisticas_notificaciones(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retorna estadísticas de notificaciones del usuario."""
    try:
        total = db.query(Notificacion).filter(Notificacion.user_id == current_user.id).count()
        no_leidas = db.query(Notificacion).filter(
            Notificacion.user_id == current_user.id,
            Notificacion.leida == False
        ).count()
        
        # Por tipo
        por_tipo = {}
        tipos = db.query(Notificacion.tipo, func.count(Notificacion.id)).filter(
            Notificacion.user_id == current_user.id
        ).group_by(Notificacion.tipo).all()
        for tipo, count in tipos:
            por_tipo[tipo] = count
        
        # Por prioridad
        por_prioridad = {}
        prioridades = db.query(Notificacion.prioridad, func.count(Notificacion.id)).filter(
            Notificacion.user_id == current_user.id
        ).group_by(Notificacion.prioridad).all()
        for prio, count in prioridades:
            por_prioridad[prio] = count
        
        return {
            "total": total,
            "no_leidas": no_leidas,
            "por_tipo": por_tipo,
            "por_prioridad": por_prioridad
        }
    except sa.exc.OperationalError as db_err:
        raise db_err
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{notificacion_id}", response_model=NotificacionResponse)
def obtener_notificacion(
    notificacion_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene una notificación específica."""
    try:
        notificacion = db.query(Notificacion).filter(Notificacion.id == notificacion_id).first()
        
        if not notificacion:
            raise HTTPException(status_code=404, detail="Notificación no encontrada")
        
        if notificacion.user_id != current_user.id and current_user.rol != 'admin':
            raise HTTPException(status_code=403, detail="No tienes permiso para ver esta notificación")
        
        # Marcar como leída automáticamente al verla
        if not notificacion.leida:
            notificacion.leida = True
            notificacion.fecha_lectura = datetime.now(timezone.utc)
            db.commit()
        
        return notificacion
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{notificacion_id}/marcar-leida")
def marcar_leida(
    notificacion_id: str,
    data: NotificacionMarcarLeida,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Marca una notificación como leída o no leída."""
    try:
        notificacion = db.query(Notificacion).filter(Notificacion.id == notificacion_id).first()
        
        if not notificacion:
            raise HTTPException(status_code=404, detail="Notificación no encontrada")
        
        if notificacion.user_id != current_user.id and current_user.rol != 'admin':
            raise HTTPException(status_code=403, detail="No tienes permiso para modificar esta notificación")
        
        notificacion.leida = data.leida
        notificacion.fecha_lectura = datetime.now(timezone.utc) if data.leida else None
        
        db.commit()
        
        return {
            "message": f"Notificación marcada como {'leída' if data.leida else 'no leída'}",
            "notificacion_id": notificacion_id
        }
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/marcar-todas-leidas")
def marcar_todas_leidas(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Marca todas las notificaciones del usuario como leídas."""
    try:
        db.query(Notificacion).filter(
            Notificacion.user_id == current_user.id,
            Notificacion.leida == False
        ).update({
            "leida": True,
            "fecha_lectura": datetime.now(timezone.utc)
        })
        
        db.commit()
        
        return {"message": "Todas las notificaciones marcadas como leídas"}
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{notificacion_id}")
def eliminar_notificacion(
    notificacion_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Elimina una notificación."""
    try:
        notificacion = db.query(Notificacion).filter(Notificacion.id == notificacion_id).first()
        
        if not notificacion:
            raise HTTPException(status_code=404, detail="Notificación no encontrada")
        
        if notificacion.user_id != current_user.id and current_user.rol != 'admin':
            raise HTTPException(status_code=403, detail="No tienes permiso para eliminar esta notificación")
        
        db.delete(notificacion)
        db.commit()
        
        return {"message": "Notificación eliminada"}
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================================
# ENDPOINTS PARA CREAR NOTIFICACIONES (Sistema interno)
# ==========================================================

@router.post("/crear-sistema", status_code=status.HTTP_201_CREATED)
def crear_notificacion_sistema(
    user_id: str,
    titulo: str,
    mensaje: str,
    prioridad: str = "normal",
    entidad_tipo: Optional[str] = None,
    entidad_id: Optional[str] = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Crea una notificación de sistema (solo admin)."""
    try:
        notificacion = Notificacion(
            user_id=user_id,
            tipo='sistema',
            titulo=titulo,
            mensaje=mensaje,
            prioridad=prioridad,
            entidad_tipo=entidad_tipo,
            entidad_id=entidad_id
        )
        
        db.add(notificacion)
        db.commit()
        
        return {
            "message": "Notificación creada",
            "notificacion_id": notificacion.id
        }
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/enviar-mensaje", status_code=status.HTTP_201_CREATED)
def enviar_mensaje_usuario(
    data: NotificacionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Envía un mensaje o notificación directa a un usuario."""
    try:
        destinatario = db.query(User).filter(User.id == str(data.user_id)).first()
        if not destinatario:
            raise HTTPException(status_code=404, detail="Usuario destinatario no encontrado")
        
        titulo = data.titulo
        if current_user.rol != 'admin' and not titulo.lower().startswith("mensaje de"):
            titulo = f"Mensaje de {current_user.nombre}: {titulo}"
            
        notificacion = Notificacion(
            user_id=str(data.user_id),
            tipo=data.tipo or 'sistema',
            titulo=titulo,
            mensaje=data.mensaje,
            prioridad=data.prioridad or 'normal',
            entidad_tipo=data.entidad_tipo or 'user_message',
            entidad_id=str(data.entidad_id) if data.entidad_id else str(current_user.id)
        )
        
        db.add(notificacion)
        db.commit()
        db.refresh(notificacion)
        
        return {
            "message": "Mensaje enviado exitosamente",
            "notificacion_id": str(notificacion.id)
        }
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/enviar-masivo", status_code=status.HTTP_201_CREATED)
def enviar_notificacion_masiva(
    titulo: str,
    mensaje: str,
    tipo: str = "sistema",
    prioridad: str = "normal",
    solo_investigadores: bool = True,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Envía una notificación a todos los usuarios (solo admin)."""
    try:
        query = db.query(User)
        if solo_investigadores:
            query = query.filter(User.rol.in_(['investigador', 'instructor']))
        
        usuarios = query.all()
        
        notificaciones_creadas = 0
        for usuario in usuarios:
            notificacion = Notificacion(
                user_id=usuario.id,
                tipo=tipo,
                titulo=titulo,
                mensaje=mensaje,
                prioridad=prioridad
            )
            db.add(notificacion)
            notificaciones_creadas += 1
        
        db.commit()
        
        return {
            "message": f"Notificación enviada a {notificaciones_creadas} usuarios",
            "total_destinatarios": notificaciones_creadas
        }
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================================
# ENDPOINTS DE UTILIDAD
# ==========================================================

@router.get("/check/pendientes")
def check_notificaciones_pendientes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retorna el número de notificaciones no leídas (para el badge)."""
    try:
        count = db.query(Notificacion).filter(
            Notificacion.user_id == current_user.id,
            Notificacion.leida == False
        ).count()
        
        return {
            "no_leidas": count,
            "tiene_notificaciones": count > 0
        }
    except sa.exc.OperationalError as db_err:
        raise db_err
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/limpiar-leidas")
def limpiar_notificaciones_leidas(
    dias_retencion: int = Query(30, description="Días a mantener notificaciones leídas"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Elimina notificaciones leídas antiguas."""
    try:
        from datetime import timedelta
        
        fecha_limite = datetime.now(timezone.utc) - timedelta(days=dias_retencion)
        
        # Solo puede limpiar sus propias notificaciones
        deleted = db.query(Notificacion).filter(
            Notificacion.user_id == current_user.id,
            Notificacion.leida == True,
            Notificacion.created_at < fecha_limite
        ).delete()
        
        db.commit()
        
        return {
            "message": f"{deleted} notificaciones eliminadas",
            "eliminadas": deleted
        }
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================================
# NOTIFICACIONES CVLAC
# ==========================================================

@router.post("/cvlac/alertar-desactualizados", status_code=status.HTTP_201_CREATED)
def alertar_cvlac_desactualizados(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Envía notificaciones a investigadores con CVLAC desactualizado o sin CVLAC."""
    try:
        # Buscar investigadores e instructores con CVLAC no actualizado
        investigadores = db.query(User).filter(
            User.rol.in_(['investigador', 'instructor']),
            User.is_active == True,
            (User.estado_cv_lac != 'Actualizado') | (User.estado_cv_lac == None)
        ).all()
        
        notificaciones_creadas = 0
        for inv in investigadores:
            estado = inv.estado_cv_lac or 'sin CVLAC'
            
            if estado == 'sin CVLAC':
                titulo = "CVLAC no registrado"
                mensaje = "No tienes un CVLAC registrado en el sistema. Por favor actualiza tu perfil con la URL de tu CVLAC de Scienti Colciencias."
                prioridad = "alta"
            else:
                titulo = "CVLAC desactualizado"
                mensaje = f"Tu CVLAC está marcado como '{estado}'. Por favor verifica que esté actualizado para cumplir con los reportes institucionales."
                prioridad = "normal"
            
            notificacion = Notificacion(
                user_id=str(inv.id),
                tipo='cvlac',
                titulo=titulo,
                mensaje=mensaje,
                prioridad=prioridad,
                entidad_tipo='perfil',
                entidad_id=str(inv.id)
            )
            db.add(notificacion)
            notificaciones_creadas += 1
        
        db.commit()
        
        return {
            "message": f"Alertas CVLAC enviadas a {notificaciones_creadas} investigadores/instructores",
            "total_notificados": notificaciones_creadas,
            "estados_afectados": ["sin CVLAC", "desactualizado"]
        }
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cvlac/pendientes")
def get_cvlac_pendientes(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Retorna lista de investigadores con CVLAC pendiente (para admin)."""
    try:
        investigadores = db.query(User).filter(
            User.rol.in_(['investigador', 'instructor']),
            User.is_active == True,
            (User.estado_cv_lac != 'Actualizado') | (User.estado_cv_lac == None)
        ).all()
        
        return {
            "total_pendientes": len(investigadores),
            "investigadores": [
                {
                    "id": str(inv.id),
                    "nombre": inv.nombre,
                    "email": inv.email,
                    "estado_cvlac": inv.estado_cv_lac or 'sin CVLAC',
                    "cv_lac_url": inv.cv_lac_url,
                    "tiene_url": inv.cv_lac_url is not None
                }
                for inv in investigadores
            ]
        }
    except sa.exc.OperationalError as db_err:
        raise db_err
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
