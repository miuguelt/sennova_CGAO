from sqlalchemy.orm import Session
from app.models import Aprendiz
from app.repositories.base_repository import BaseRepository

class AprendizRepository(BaseRepository[Aprendiz]):
    """
    Repositorio para la entidad Aprendiz.
    Auto-generado por el motor de proactividad DevBrain.
    """
    def __init__(self, db: Session):
        super().__init__(Aprendiz, db)
