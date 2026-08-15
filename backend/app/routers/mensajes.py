"""
Router de Mensajería
Comunicación interna entre usuarios del sistema (Admin, Investigadores, Aprendices)
"""

from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.auth import get_current_user
from app.database import get_db
from app.models import User, Mensaje, Notificacion
from app.schemas import (
    MensajeCreate,
    MensajeResponse,
    MensajeUserSimple,
    ConversacionSummary,
    MensajeStats
)

router = APIRouter(prefix="/mensajes", tags=["Mensajería"])


def _serialize_user(user: Optional[User]) -> Optional[dict]:
    if not user:
        return None
    return {
        "id": str(user.id),
        "nombre": user.nombre,
        "email": user.email,
        "rol": user.rol,
        "rol_sennova": user.rol_sennova,
        "sede": user.sede,
        "programa_formacion": user.programa_formacion,
        "ficha": user.ficha,
    }


def _serialize_mensaje(msg: Mensaje) -> dict:
    return {
        "id": str(msg.id),
        "remitente_id": str(msg.remitente_id),
        "destinatario_id": str(msg.destinatario_id) if msg.destinatario_id else None,
        "asunto": msg.asunto,
        "contenido": msg.contenido,
        "leido": bool(msg.leido),
        "fecha_lectura": msg.fecha_lectura,
        "es_anuncio": bool(msg.es_anuncio),
        "created_at": msg.created_at,
        "updated_at": msg.updated_at,
        "remitente": _serialize_user(msg.remitente),
        "destinatario": _serialize_user(msg.destinatario) if msg.destinatario else None
    }


@router.get("/unread-count")
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retorna el número de mensajes no leídos para el usuario actual (ligero para badges)."""
    uid = str(current_user.id)
    count = db.query(func.count(Mensaje.id)).filter(
        Mensaje.destinatario_id == uid,
        Mensaje.leido == False
    ).scalar() or 0
    return {"no_leidos": count}


@router.get("/stats", response_model=MensajeStats)
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Estadísticas globales de mensajería para el usuario actual."""
    uid = str(current_user.id)
    total_recibidos = db.query(func.count(Mensaje.id)).filter(Mensaje.destinatario_id == uid).scalar() or 0
    no_leidos = db.query(func.count(Mensaje.id)).filter(Mensaje.destinatario_id == uid, Mensaje.leido == False).scalar() or 0
    total_enviados = db.query(func.count(Mensaje.id)).filter(Mensaje.remitente_id == uid).scalar() or 0
    
    return {
        "total_recibidos": total_recibidos,
        "no_leidos": no_leidos,
        "total_enviados": total_enviados
    }


@router.get("/destinatarios", response_model=List[MensajeUserSimple])
def list_destinatarios(
    search: Optional[str] = None,
    rol: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Directorio de contactos con quienes el usuario puede iniciar una conversación."""
    uid = str(current_user.id)
    query = db.query(User).filter(User.id != uid, User.is_active == True)
    
    if rol:
        query = query.filter(User.rol == rol)
        
    if search:
        s_term = f"%{search}%"
        query = query.filter(
            or_(
                User.nombre.ilike(s_term),
                User.email.ilike(s_term),
                User.rol_sennova.ilike(s_term),
                User.programa_formacion.ilike(s_term)
            )
        )
        
    users = query.order_by(User.nombre.asc()).limit(100).all()
    return [_serialize_user(u) for u in users]


@router.get("/conversaciones", response_model=List[ConversacionSummary])
def list_conversaciones(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista el resumen de todas las conversaciones activas del usuario."""
    uid = str(current_user.id)
    
    # Obtener todos los mensajes donde el usuario es remitente o destinatario
    mensajes_usuario = db.query(Mensaje).filter(
        or_(Mensaje.remitente_id == uid, Mensaje.destinatario_id == uid)
    ).order_by(Mensaje.created_at.desc()).all()
    
    # Agrupar por el otro interlocutor
    partners = {}
    for msg in mensajes_usuario:
        if str(msg.remitente_id) == uid:
            other_id = str(msg.destinatario_id) if msg.destinatario_id else None
        else:
            other_id = str(msg.remitente_id)
            
        if not other_id:
            continue
            
        if other_id not in partners:
            partners[other_id] = {
                "ultimo_mensaje": msg,
                "total": 0,
                "no_leidos": 0
            }
        partners[other_id]["total"] += 1
        if str(msg.destinatario_id) == uid and not msg.leido:
            partners[other_id]["no_leidos"] += 1

    summaries = []
    if partners:
        other_users = db.query(User).filter(User.id.in_(list(partners.keys()))).all()
        user_map = {str(u.id): u for u in other_users}
        
        for other_id, data in partners.items():
            user_obj = user_map.get(other_id)
            if not user_obj:
                continue
            summaries.append({
                "otro_usuario": _serialize_user(user_obj),
                "ultimo_mensaje": _serialize_mensaje(data["ultimo_mensaje"]),
                "no_leidos": data["no_leidos"],
                "total_mensajes": data["total"]
            })
            
    # Ordenar por fecha del último mensaje descendente
    summaries.sort(key=lambda s: s["ultimo_mensaje"]["created_at"], reverse=True)
    return summaries


@router.get("/conversacion/{otro_usuario_id}", response_model=List[MensajeResponse])
def get_conversacion(
    otro_usuario_id: str,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene el historial de mensajes de la conversación con un usuario específico."""
    uid = str(current_user.id)
    
    # Verificar existencia del interlocutor
    other_user = db.query(User).filter(User.id == otro_usuario_id).first()
    if not other_user:
        raise HTTPException(status_code=404, detail="Usuario destinatario no encontrado")
        
    mensajes = db.query(Mensaje).filter(
        or_(
            and_(Mensaje.remitente_id == uid, Mensaje.destinatario_id == otro_usuario_id),
            and_(Mensaje.remitente_id == otro_usuario_id, Mensaje.destinatario_id == uid)
        )
    ).order_by(Mensaje.created_at.asc()).offset(skip).limit(limit).all()
    
    return [_serialize_mensaje(m) for m in mensajes]


@router.post("/conversacion/{otro_usuario_id}/marcar-leidos")
def marcar_conversacion_leida(
    otro_usuario_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Marca todos los mensajes recibidos de un interlocutor específico como leídos."""
    uid = str(current_user.id)
    now = datetime.now(timezone.utc)
    
    mensajes_no_leidos = db.query(Mensaje).filter(
        Mensaje.remitente_id == otro_usuario_id,
        Mensaje.destinatario_id == uid,
        Mensaje.leido == False
    ).all()
    
    count = 0
    for m in mensajes_no_leidos:
        m.leido = True
        m.fecha_lectura = now
        count += 1
        
    db.commit()
    return {"success": True, "marcados": count}


@router.post("", response_model=MensajeResponse, status_code=status.HTTP_201_CREATED)
def enviar_mensaje(
    payload: MensajeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Envía un nuevo mensaje directo o anuncio del sistema."""
    if not payload.contenido or not payload.contenido.strip():
        raise HTTPException(status_code=400, detail="El contenido del mensaje no puede estar vacío")
        
    destinatario = None
    if payload.destinatario_id:
        if str(payload.destinatario_id) == str(current_user.id):
            raise HTTPException(status_code=400, detail="No puedes enviarte un mensaje a ti mismo")
            
        destinatario = db.query(User).filter(User.id == payload.destinatario_id).first()
        if not destinatario:
            raise HTTPException(status_code=404, detail="Destinatario no encontrado")
    elif not payload.es_anuncio or current_user.rol != 'admin':
        raise HTTPException(status_code=400, detail="Debes especificar un destinatario")

    nuevo_mensaje = Mensaje(
        remitente_id=current_user.id,
        destinatario_id=destinatario.id if destinatario else None,
        asunto=payload.asunto.strip() if payload.asunto else None,
        contenido=payload.contenido.strip(),
        leido=False,
        es_anuncio=payload.es_anuncio if current_user.rol == 'admin' else False
    )
    
    db.add(nuevo_mensaje)
    
    # Generar notificación in-app para el destinatario
    if destinatario:
        notif = Notificacion(
            user_id=destinatario.id,
            tipo="sistema",
            titulo=f"Mensaje de {current_user.nombre}",
            mensaje=payload.contenido.strip()[:120],
            entidad_tipo="mensaje",
            entidad_id=nuevo_mensaje.id,
            prioridad="normal"
        )
        db.add(notif)
        
    db.commit()
    db.refresh(nuevo_mensaje)
    
    return _serialize_mensaje(nuevo_mensaje)


@router.delete("/{mensaje_id}")
def eliminar_mensaje(
    mensaje_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Elimina un mensaje (solo por el remitente o un administrador)."""
    msg = db.query(Mensaje).filter(Mensaje.id == mensaje_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")
        
    if str(msg.remitente_id) != str(current_user.id) and current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar este mensaje")
        
    db.delete(msg)
    db.commit()
    return {"success": True, "message": "Mensaje eliminado correctamente"}
