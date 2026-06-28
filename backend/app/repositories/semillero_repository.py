from typing import List, Optional
from sqlalchemy.orm import Session
from app.models import Semillero
from app.repositories.base_repository import BaseRepository

class SemilleroRepository(BaseRepository[Semillero]):
    """
    Repositorio para la entidad Semillero.
    Auto-generado por el motor de proactividad DevBrain.
    """
    def __init__(self, db: Session):
        super().__init__(Semillero, db)
