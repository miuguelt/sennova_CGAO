"""
Script de saneamiento de notificaciones huérfanas o inconsistentes
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Notificacion, Mensaje, User

def cleanup():
    db = SessionLocal()
    try:
        print("🔍 Buscando notificaciones huérfanas de mensajes...")
        notifs_msg = db.query(Notificacion).filter(
            (Notificacion.tipo == "mensaje") | (Notificacion.entidad_tipo.in_(["mensaje", "user_message", "chat"]))
        ).all()

        deleted_count = 0
        for n in notifs_msg:
            # Si la notificación es de mensaje y entidad_id es un usuario
            sender_id = str(n.entidad_id) if n.entidad_id else None
            recipient_id = str(n.user_id)

            if sender_id:
                # Comprobar si existe al menos un mensaje entre sender y recipient
                msg_exists = db.query(Mensaje).filter(
                    ((Mensaje.remitente_id == sender_id) & (Mensaje.destinatario_id == recipient_id)) |
                    ((Mensaje.remitente_id == recipient_id) & (Mensaje.destinatario_id == sender_id))
                ).first()

                if not msg_exists:
                    print(f"🗑️ Eliminando notificación huérfana de chat [{n.id}]: '{n.titulo}' para usuario {n.user_id}")
                    db.delete(n)
                    deleted_count += 1

        db.commit()
        print(f"✅ Saneamiento completado: {deleted_count} notificaciones huérfanas eliminadas.")
    finally:
        db.close()

if __name__ == "__main__":
    cleanup()
