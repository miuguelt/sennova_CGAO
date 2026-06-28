from typing import List, Optional
from sqlalchemy.orm import Session
from app.models import Documento
from app.repositories.base_repository import BaseRepository

class DocumentoRepository(BaseRepository[Documento]):
    """
    Repositorio para la entidad Documento.
    Auto-generado por el motor de proactividad DevBrain.
    """
    def __init__(self, db: Session):
        super().__init__(Documento, db)
