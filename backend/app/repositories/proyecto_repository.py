from sqlalchemy.orm import Session
from app.models import Proyecto
from app.repositories.base_repository import BaseRepository

class ProyectoRepository(BaseRepository[Proyecto]):
    """
    Repositorio para la entidad Proyecto.
    Auto-generado por el motor de proactividad DevBrain.
    """
    def __init__(self, db: Session):
        super().__init__(Proyecto, db)
