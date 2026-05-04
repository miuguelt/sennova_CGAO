from sqlalchemy.orm import Session
from app.models import Actividad
from typing import Optional

def log_actividad(
    db: Session,
    user_id: str,
    tipo_accion: str,
    descripcion: str,
    entidad_tipo: Optional[str] = None,
    entidad_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
):
    """
    Registra una acción en la tabla de actividades para auditoría e historial.
    """
    try:
        nueva_actividad = Actividad(
            user_id=str(user_id),
            tipo_accion=tipo_accion,
            descripcion=descripcion,
            entidad_tipo=entidad_tipo,
            entidad_id=str(entidad_id) if entidad_id else None,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(nueva_actividad)
        db.commit()
    except Exception as e:
        print(f"Error al registrar actividad: {e}")
        db.rollback()
