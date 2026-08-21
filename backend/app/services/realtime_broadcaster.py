"""
Servicio Difusor en Tiempo Real (Real-time Message Broadcaster)
Maneja conexiones de streaming asíncronas (SSE) y difusión de eventos a usuarios conectados.
"""

import asyncio
import json
import logging
from typing import Dict, Set, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger("sennova.realtime")


class MessageBroadcaster:
    """
    Gestor central de difusión de eventos en tiempo real.
    Mantiene colas asíncronas (asyncio.Queue) por usuario activo para emitir
    mensajes instantáneos, confirmaciones de entrega/lectura y estados de escritura.
    """

    def __init__(self):
        # Mapeo: user_id (str) -> Set[asyncio.Queue]
        self._user_queues: Dict[str, Set[asyncio.Queue]] = {}
        self._lock: Optional[asyncio.Lock] = None

    def _get_lock(self) -> asyncio.Lock:
        if self._lock is None:
            self._lock = asyncio.Lock()
        return self._lock

    async def connect(self, user_id: str) -> asyncio.Queue:
        """Registra un nuevo canal/cola para un usuario conectado."""
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        lock = self._get_lock()
        async with lock:
            if user_id not in self._user_queues:
                self._user_queues[user_id] = set()
            self._user_queues[user_id].add(queue)
            logger.info(f"🔗 Usuario {user_id} conectado a SSE. Conexiones activas: {len(self._user_queues[user_id])}")
        return queue

    async def disconnect(self, user_id: str, queue: asyncio.Queue):
        """Elimina la cola de un usuario cuando se desconecta."""
        lock = self._get_lock()
        async with lock:
            if user_id in self._user_queues:
                self._user_queues[user_id].discard(queue)
                if not self._user_queues[user_id]:
                    del self._user_queues[user_id]
                logger.info(f"🔌 Conexión SSE cerrada para usuario {user_id}")

    def is_user_online(self, user_id: str) -> bool:
        """Verifica de forma inmediata si un usuario tiene al menos una conexión activa."""
        return user_id in self._user_queues and len(self._user_queues[user_id]) > 0

    async def broadcast_to_user(self, user_id: str, event_type: str, data: Any):
        """
        Envía un evento estructurado a todas las conexiones activas de un usuario específico.
        """
        if not user_id:
            return

        user_id_str = str(user_id)
        payload = {
            "event": event_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        queues_to_send = []
        if user_id_str in self._user_queues:
            queues_to_send = list(self._user_queues[user_id_str])

        for q in queues_to_send:
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                logger.warning(f"⚠️ Cola SSE llena para usuario {user_id_str}. Descartando mensaje más antiguo.")
                try:
                    q.get_nowait()
                    q.put_nowait(payload)
                except Exception:
                    pass
            except Exception as e:
                logger.error(f"❌ Error al enviar evento SSE a {user_id_str}: {e}")

    async def broadcast_to_users(self, user_ids: list, event_type: str, data: Any):
        """Envía un evento a múltiples usuarios."""
        for uid in user_ids:
            if uid:
                await self.broadcast_to_user(str(uid), event_type, data)


# Instancia singleton global
broadcaster = MessageBroadcaster()
