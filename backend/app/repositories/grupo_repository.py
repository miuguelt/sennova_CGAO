from typing import List, Optional
from sqlalchemy.orm import Session
from app.models import Grupo
from app.repositories.base_repository import BaseRepository

class GrupoRepository(BaseRepository[Grupo]):
    """
    Repositorio para la entidad Grupo.
    Auto-generado por el motor de proactividad DevBrain.
    """
    def __init__(self, db: Session):
        super().__init__(Grupo, db)
