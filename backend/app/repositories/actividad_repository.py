from typing import List, Optional
from sqlalchemy.orm import Session
from app.models import Actividad
from app.repositories.base_repository import BaseRepository

class ActividadRepository(BaseRepository[Actividad]):
    """
    Repositorio para la entidad Actividad.
    Auto-generado por el motor de proactividad DevBrain.
    """
    def __init__(self, db: Session):
        super().__init__(Actividad, db)
