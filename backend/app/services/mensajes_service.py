"""Data access for the internal messaging feature.

Every function here is deliberately synchronous and receives an already open
``Session``. SQLAlchemy's driver is blocking, so the router executes these calls
in the threadpool: the event loop stays free to push SSE events while a query is
running. Domain failures are raised as plain Python errors and translated to
HTTP status codes at the router boundary.
"""

from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Mensaje, MensajeAdjunto, Notificacion, User
from app.services import adjuntos_service


def serializar_usuario(user: Optional[User]) -> Optional[dict]:
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


def serializar_mensaje(msg: Mensaje) -> dict:
    return {
        "id": str(msg.id),
        "remitente_id": str(msg.remitente_id),
        "destinatario_id": str(msg.destinatario_id) if msg.destinatario_id else None,
        "asunto": msg.asunto,
        "contenido": msg.contenido,
        "leido": bool(msg.leido),
        "fecha_lectura": msg.fecha_lectura,
        "entregado": bool(getattr(msg, "entregado", False) or msg.leido),
        "fecha_entrega": getattr(msg, "fecha_entrega", None) or msg.fecha_lectura or msg.created_at,
        "es_anuncio": bool(msg.es_anuncio),
        "created_at": msg.created_at,
        "updated_at": msg.updated_at,
        "remitente": serializar_usuario(msg.remitente),
        "destinatario": serializar_usuario(msg.destinatario) if msg.destinatario else None,
        "adjuntos": [
            adjuntos_service.serializar_adjunto(a) for a in (msg.adjuntos or [])
        ],
    }


def contar_no_leidos(db: Session, uid: str) -> int:
    return db.query(func.count(Mensaje.id)).filter(
        Mensaje.destinatario_id == uid,
        Mensaje.leido == False  # noqa: E712 - comparación SQL, no booleana de Python
    ).scalar() or 0


def obtener_stats(db: Session, uid: str) -> dict:
    return {
        "total_recibidos": db.query(func.count(Mensaje.id)).filter(
            Mensaje.destinatario_id == uid
        ).scalar() or 0,
        "no_leidos": contar_no_leidos(db, uid),
        "total_enviados": db.query(func.count(Mensaje.id)).filter(
            Mensaje.remitente_id == uid
        ).scalar() or 0,
    }


def listar_destinatarios(
    db: Session, uid: str, search: Optional[str] = None, rol: Optional[str] = None
) -> List[dict]:
    query = db.query(User).filter(User.id != uid, User.is_active == True)  # noqa: E712

    if rol:
        query = query.filter(User.rol == rol)

    if search:
        s_term = f"%{search}%"
        query = query.filter(
            or_(
                User.nombre.ilike(s_term),
                User.email.ilike(s_term),
                User.rol_sennova.ilike(s_term),
                User.programa_formacion.ilike(s_term),
            )
        )

    return [serializar_usuario(u) for u in query.order_by(User.nombre.asc()).limit(100).all()]


def listar_conversaciones(db: Session, uid: str) -> List[dict]:
    mensajes_usuario = db.query(Mensaje).filter(
        or_(Mensaje.remitente_id == uid, Mensaje.destinatario_id == uid)
    ).order_by(Mensaje.created_at.desc()).all()

    partners = {}
    for msg in mensajes_usuario:
        if str(msg.remitente_id) == uid:
            other_id = str(msg.destinatario_id) if msg.destinatario_id else None
        else:
            other_id = str(msg.remitente_id)

        if not other_id:
            continue

        if other_id not in partners:
            partners[other_id] = {"ultimo_mensaje": msg, "total": 0, "no_leidos": 0}
        partners[other_id]["total"] += 1
        if str(msg.destinatario_id) == uid and not msg.leido:
            partners[other_id]["no_leidos"] += 1

    if not partners:
        return []

    user_map = {
        str(u.id): u
        for u in db.query(User).filter(User.id.in_(list(partners.keys()))).all()
    }

    summaries = [
        {
            "otro_usuario": serializar_usuario(user_map[other_id]),
            "ultimo_mensaje": serializar_mensaje(data["ultimo_mensaje"]),
            "no_leidos": data["no_leidos"],
            "total_mensajes": data["total"],
        }
        for other_id, data in partners.items()
        if other_id in user_map
    ]
    summaries.sort(key=lambda s: s["ultimo_mensaje"]["created_at"], reverse=True)
    return summaries


def obtener_conversacion(
    db: Session, uid: str, otro_usuario_id: str, skip: int = 0, limit: int = 100
) -> Tuple[List[dict], Optional[str]]:
    """Historial con el interlocutor.

    Devuelve los mensajes y, cuando la lectura confirmó entregas pendientes, la
    marca de tiempo que el router debe difundir al remitente.
    """
    if not db.query(User).filter(User.id == otro_usuario_id).first():
        raise LookupError("Usuario destinatario no encontrado")

    mensajes = db.query(Mensaje).filter(
        or_(
            and_(Mensaje.remitente_id == uid, Mensaje.destinatario_id == otro_usuario_id),
            and_(Mensaje.remitente_id == otro_usuario_id, Mensaje.destinatario_id == uid),
        )
    ).order_by(Mensaje.created_at.asc()).offset(skip).limit(limit).all()

    now = datetime.now(timezone.utc)
    entregas_nuevas = False
    for m in mensajes:
        if str(m.destinatario_id) == uid and not m.entregado:
            m.entregado = True
            m.fecha_entrega = now
            entregas_nuevas = True

    if entregas_nuevas:
        db.commit()

    return [serializar_mensaje(m) for m in mensajes], now.isoformat() if entregas_nuevas else None


def marcar_leidos(db: Session, uid: str, otro_usuario_id: str) -> Tuple[int, str]:
    now = datetime.now(timezone.utc)
    mensajes_no_leidos = db.query(Mensaje).filter(
        Mensaje.remitente_id == otro_usuario_id,
        Mensaje.destinatario_id == uid,
        Mensaje.leido == False  # noqa: E712
    ).all()

    for m in mensajes_no_leidos:
        m.leido = True
        m.fecha_lectura = now
        m.entregado = True
        if not m.fecha_entrega:
            m.fecha_entrega = now

    db.commit()
    return len(mensajes_no_leidos), now.isoformat()


def marcar_entregados(db: Session, uid: str, otro_usuario_id: str) -> Tuple[int, str]:
    now = datetime.now(timezone.utc)
    mensajes_no_entregados = db.query(Mensaje).filter(
        Mensaje.remitente_id == otro_usuario_id,
        Mensaje.destinatario_id == uid,
        Mensaje.entregado == False  # noqa: E712
    ).all()

    for m in mensajes_no_entregados:
        m.entregado = True
        m.fecha_entrega = now

    if mensajes_no_entregados:
        db.commit()

    return len(mensajes_no_entregados), now.isoformat()


def registrar_entregas_al_conectar(uid: str) -> Tuple[List[str], str]:
    """Marca como entregados los mensajes acumulados mientras el usuario estaba fuera.

    Abre y cierra su propia sesión porque la invoca el canal SSE, que no debe
    retener una conexión del pool mientras el streaming siga abierto.
    """
    now = datetime.now(timezone.utc)
    db = SessionLocal()
    try:
        pendientes = db.query(Mensaje).filter(
            Mensaje.destinatario_id == uid,
            Mensaje.entregado == False  # noqa: E712
        ).all()

        remitentes = set()
        for m in pendientes:
            m.entregado = True
            m.fecha_entrega = now
            remitentes.add(str(m.remitente_id))

        if pendientes:
            db.commit()

        return sorted(remitentes), now.isoformat()
    finally:
        db.close()


def crear_mensaje(
    db: Session, remitente: User, payload, destinatario_online: bool
) -> dict:
    """Persiste un mensaje directo o anuncio junto con su notificación in-app."""
    adjunto_ids = list(getattr(payload, "adjunto_ids", None) or [])

    # Un mensaje puede ser solo archivos: el texto deja de ser obligatorio cuando
    # se envían adjuntos, como en cualquier mensajería.
    if not payload.contenido or not payload.contenido.strip():
        if not adjunto_ids:
            raise ValueError("El contenido del mensaje no puede estar vacío")

    destinatario = None
    if payload.destinatario_id:
        if str(payload.destinatario_id) == str(remitente.id):
            raise ValueError("No puedes enviarte un mensaje a ti mismo")

        destinatario = db.query(User).filter(User.id == payload.destinatario_id).first()
        if not destinatario:
            raise LookupError("Destinatario no encontrado")
    elif not payload.es_anuncio or remitente.rol != "admin":
        raise ValueError("Debes especificar un destinatario")

    now = datetime.now(timezone.utc)
    nuevo_mensaje = Mensaje(
        remitente_id=remitente.id,
        destinatario_id=destinatario.id if destinatario else None,
        asunto=payload.asunto.strip() if payload.asunto else None,
        contenido=(payload.contenido or "").strip(),
        leido=False,
        entregado=destinatario_online,
        fecha_entrega=now if destinatario_online else None,
        es_anuncio=payload.es_anuncio if remitente.rol == "admin" else False,
    )
    db.add(nuevo_mensaje)
    db.flush()  # Asigna el id del mensaje antes de colgarle los adjuntos
    adjuntos_service.asociar_a_mensaje(db, nuevo_mensaje, str(remitente.id), adjunto_ids)

    if destinatario:
        contenido_notif = (payload.contenido or "Archivo adjunto").strip()[:120]
        db.add(Notificacion(
            user_id=destinatario.id,
            tipo="mensaje",
            titulo=f"Mensaje de {remitente.nombre}",
            mensaje=contenido_notif,
            entidad_tipo="mensaje",
            entidad_id=remitente.id,
            prioridad="normal",
        ))

    db.commit()
    db.refresh(nuevo_mensaje)
    return serializar_mensaje(nuevo_mensaje)


def eliminar_mensaje(
    db: Session, mensaje_id: str, actor_id: str, actor_rol: str
) -> Tuple[str, Optional[str]]:
    """Elimina un mensaje y devuelve (remitente_id, destinatario_id) para difundirlo."""
    msg = db.query(Mensaje).filter(Mensaje.id == mensaje_id).first()
    if not msg:
        raise LookupError("Mensaje no encontrado")

    if str(msg.remitente_id) != str(actor_id) and actor_rol != "admin":
        raise PermissionError("No tienes permisos para eliminar este mensaje")

    rem_id = str(msg.remitente_id)
    dest_id = str(msg.destinatario_id) if msg.destinatario_id else None

    # El registro cae por cascada; los bytes solo si ningún otro adjunto
    # comparte el mismo contenido.
    adjuntos_service.liberar_archivos(db, list(msg.adjuntos or []))

    db.delete(msg)
    db.commit()
    return rem_id, dest_id


def obtener_contacto(db: Session, otro_usuario_id: str) -> Optional[dict]:
    """Obtiene el perfil simple de un usuario para iniciar o abrir una conversación."""
    user = db.query(User).filter(User.id == otro_usuario_id, User.is_active == True).first()  # noqa: E712
    if not user:
        return None
    return serializar_usuario(user)

