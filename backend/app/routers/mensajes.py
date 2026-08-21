"""
Router de Mensajería y Streaming Asíncrono en Tiempo Real
Comunicación interna entre usuarios del sistema (Admin, Investigadores, Aprendices)
Soporte completo para confirmaciones de entrega (✓✓ gris) y lectura (✓✓ verde) con SSE.

Los handlers son delgados a propósito: el driver de SQLAlchemy es bloqueante, así
que toda consulta se ejecuta en el threadpool (``run_in_threadpool``) y el event
loop queda libre para empujar eventos SSE mientras la base de datos responde.
"""

import json
import asyncio
import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas import (
    MensajeCreate,
    MensajeResponse,
    MensajeUserSimple,
    ConversacionSummary,
    MensajeStats,
    MensajeTyping
)
from app.services import mensajes_service
from app.services.realtime_broadcaster import broadcaster

logger = logging.getLogger("sennova.mensajes")

router = APIRouter(prefix="/mensajes", tags=["Mensajería"])

# Sin tráfico el canal queda mudo; el comentario de keepalive evita que proxies
# y balanceadores cierren la conexión por inactividad.
KEEPALIVE_SECONDS = 20.0


@router.get("/stream")
async def stream_mensajes(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    Canal Server-Sent Events (SSE) para comunicación asíncrona en tiempo real.
    Transmite mensajes entrantes, confirmaciones de entrega y lectura al instante.
    """
    uid = str(current_user.id)
    queue = await broadcaster.connect(uid)

    # Al conectarse, marcar como entregados los mensajes acumulados y avisar a
    # cada remitente. La sesión de base de datos se abre y cierra dentro del
    # threadpool: el streaming no puede retener una conexión del pool.
    try:
        remitentes, timestamp = await run_in_threadpool(
            mensajes_service.registrar_entregas_al_conectar, uid
        )
        for rem_id in remitentes:
            await broadcaster.broadcast_to_user(
                rem_id,
                "mensajes_entregados",
                {"destinatario_id": uid, "timestamp": timestamp}
            )
    except Exception as e:
        logger.error(f"Error marcando entregas iniciales para {uid}: {e}")

    async def event_generator():
        try:
            init_data = json.dumps({
                "type": "connected",
                "user_id": uid,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            yield f"event: connected\ndata: {init_data}\n\n"

            while True:
                if await request.is_disconnected():
                    break

                try:
                    event_payload = await asyncio.wait_for(queue.get(), timeout=KEEPALIVE_SECONDS)
                    event_type = event_payload.get("event", "message")
                    data_json = json.dumps(event_payload.get("data", {}), default=str)
                    yield f"event: {event_type}\ndata: {data_json}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            # La desconexión debe completarse aunque el cliente haya cortado y la
            # tarea esté siendo cancelada; de lo contrario la cola queda huérfana.
            try:
                await asyncio.shield(broadcaster.disconnect(uid, queue))
            except Exception:
                pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retorna el número de mensajes no leídos para el usuario actual (ligero para badges)."""
    count = await run_in_threadpool(
        mensajes_service.contar_no_leidos, db, str(current_user.id)
    )
    return {"no_leidos": count}


@router.get("/stats", response_model=MensajeStats)
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Estadísticas globales de mensajería para el usuario actual."""
    return await run_in_threadpool(
        mensajes_service.obtener_stats, db, str(current_user.id)
    )


@router.get("/destinatarios", response_model=List[MensajeUserSimple])
async def list_destinatarios(
    search: Optional[str] = None,
    rol: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Directorio de contactos con quienes el usuario puede iniciar una conversación."""
    return await run_in_threadpool(
        mensajes_service.listar_destinatarios, db, str(current_user.id), search, rol
    )


@router.get("/contacto/{otro_usuario_id}", response_model=MensajeUserSimple)
async def get_contacto(
    otro_usuario_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene el perfil simple de un interlocutor para iniciar o ver su chat."""
    contacto = await run_in_threadpool(
        mensajes_service.obtener_contacto, db, otro_usuario_id
    )
    if not contacto:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return contacto



@router.get("/conversaciones", response_model=List[ConversacionSummary])
async def list_conversaciones(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista el resumen de todas las conversaciones activas del usuario."""
    return await run_in_threadpool(
        mensajes_service.listar_conversaciones, db, str(current_user.id)
    )


@router.get("/conversacion/{otro_usuario_id}", response_model=List[MensajeResponse])
async def get_conversacion(
    otro_usuario_id: str,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene el historial de mensajes de la conversación con un usuario específico."""
    uid = str(current_user.id)
    try:
        mensajes, entrega_timestamp = await run_in_threadpool(
            mensajes_service.obtener_conversacion, db, uid, otro_usuario_id, skip, limit
        )
    except LookupError as err:
        raise HTTPException(status_code=404, detail=str(err))

    if entrega_timestamp:
        await broadcaster.broadcast_to_user(
            otro_usuario_id,
            "mensajes_entregados",
            {"destinatario_id": uid, "timestamp": entrega_timestamp}
        )

    return mensajes


@router.post("/conversacion/{otro_usuario_id}/marcar-leidos")
async def marcar_conversacion_leida(
    otro_usuario_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Marca todos los mensajes recibidos de un interlocutor específico como leídos (doble check verde)."""
    uid = str(current_user.id)
    count, timestamp = await run_in_threadpool(
        mensajes_service.marcar_leidos, db, uid, otro_usuario_id
    )

    # Notificar en tiempo real al remitente para que sus checks cambien a verde inmediatamente
    if count > 0:
        await broadcaster.broadcast_to_user(
            otro_usuario_id,
            "mensajes_leidos",
            {
                "lector_id": uid,
                "remitente_id": otro_usuario_id,
                "count": count,
                "timestamp": timestamp
            }
        )

    return {"success": True, "marcados": count}


@router.post("/conversacion/{otro_usuario_id}/marcar-entregados")
async def marcar_conversacion_entregada(
    otro_usuario_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Marca todos los mensajes recibidos de un interlocutor como entregados (doble check gris)."""
    uid = str(current_user.id)
    count, timestamp = await run_in_threadpool(
        mensajes_service.marcar_entregados, db, uid, otro_usuario_id
    )

    if count > 0:
        await broadcaster.broadcast_to_user(
            otro_usuario_id,
            "mensajes_entregados",
            {
                "destinatario_id": uid,
                "remitente_id": otro_usuario_id,
                "count": count,
                "timestamp": timestamp
            }
        )

    return {"success": True, "entregados": count}


@router.post("/typing")
async def notificar_typing(
    payload: MensajeTyping,
    current_user: User = Depends(get_current_user)
):
    """Transmite en tiempo real el estado 'escribiendo...' al destinatario.

    Señal efímera: no toca la base de datos ni deja rastro de auditoría.
    """
    uid = str(current_user.id)
    if payload.destinatario_id and payload.destinatario_id != uid:
        await broadcaster.broadcast_to_user(
            payload.destinatario_id,
            "typing_status",
            {
                "remitente_id": uid,
                "is_typing": payload.is_typing,
                "nombre": current_user.nombre
            }
        )
    return {"success": True}


@router.post("", response_model=MensajeResponse, status_code=status.HTTP_201_CREATED)
async def enviar_mensaje(
    payload: MensajeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Envía un nuevo mensaje directo con entrega y difusión asíncrona en tiempo real."""
    destinatario_id_str = str(payload.destinatario_id) if payload.destinatario_id else None
    # Estado de conexión evaluado en el event loop: es donde vive el registro SSE.
    destinatario_online = broadcaster.is_user_online(destinatario_id_str) if destinatario_id_str else False

    try:
        serialized = await run_in_threadpool(
            mensajes_service.crear_mensaje, db, current_user, payload, destinatario_online
        )
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except LookupError as err:
        raise HTTPException(status_code=404, detail=str(err))
    except PermissionError as err:
        # Adjunto ajeno o ya enviado en otro mensaje
        raise HTTPException(status_code=403, detail=str(err))

    # Difusión en tiempo real al destinatario
    if destinatario_id_str:
        await broadcaster.broadcast_to_user(
            destinatario_id_str,
            "mensaje_nuevo",
            serialized
        )

    return serialized


@router.delete("/{mensaje_id}")
async def eliminar_mensaje(
    mensaje_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Elimina un mensaje (solo por el remitente o un administrador)."""
    try:
        rem_id, dest_id = await run_in_threadpool(
            mensajes_service.eliminar_mensaje,
            db,
            mensaje_id,
            str(current_user.id),
            current_user.rol
        )
    except LookupError as err:
        raise HTTPException(status_code=404, detail=str(err))
    except PermissionError as err:
        raise HTTPException(status_code=403, detail=str(err))

    # Notificar eliminación a ambos interlocutores
    eliminar_event = {"mensaje_id": mensaje_id, "remitente_id": rem_id, "destinatario_id": dest_id}
    if dest_id:
        await broadcaster.broadcast_to_user(dest_id, "mensaje_eliminado", eliminar_event)
    await broadcaster.broadcast_to_user(rem_id, "mensaje_eliminado", eliminar_event)

    return {"success": True, "message": "Mensaje eliminado correctamente"}
