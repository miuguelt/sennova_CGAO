from typing import List, Optional
from sqlalchemy.orm import Session
from app.models import Convocatoria
from app.repositories.base_repository import BaseRepository

class ConvocatoriaRepository(BaseRepository[Convocatoria]):
    """
    Repositorio para la entidad Convocatoria.
    Auto-generado por el motor de proactividad DevBrain.
    """
    def __init__(self, db: Session):
        super().__init__(Convocatoria, db)
