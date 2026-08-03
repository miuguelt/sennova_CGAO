from sqlalchemy.orm import Session
from app.models import Reto
from app.repositories.base_repository import BaseRepository

class RetoRepository(BaseRepository[Reto]):
    """
    Repositorio para la entidad Reto.
    Auto-generado por el motor de proactividad DevBrain.
    """
    def __init__(self, db: Session):
        super().__init__(Reto, db)
