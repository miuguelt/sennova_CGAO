from sqlalchemy.orm import Session
from app.models import Notificacion
from app.repositories.base_repository import BaseRepository

class NotificacionRepository(BaseRepository[Notificacion]):
    """
    Repositorio para la entidad Notificacion.
    Auto-generado por el motor de proactividad DevBrain.
    """
    def __init__(self, db: Session):
        super().__init__(Notificacion, db)
