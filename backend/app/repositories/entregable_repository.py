from typing import List, Optional
from sqlalchemy.orm import Session
from app.models import Entregable
from app.repositories.base_repository import BaseRepository

class EntregableRepository(BaseRepository[Entregable]):
    """
    Repositorio para la entidad Entregable.
    Auto-generado por el motor de proactividad DevBrain.
    """
    def __init__(self, db: Session):
        super().__init__(Entregable, db)
