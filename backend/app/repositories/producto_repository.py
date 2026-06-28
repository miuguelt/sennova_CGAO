from typing import List, Optional
from sqlalchemy.orm import Session
from app.models import Producto
from app.repositories.base_repository import BaseRepository

class ProductoRepository(BaseRepository[Producto]):
    """
    Repositorio para la entidad Producto.
    Auto-generado por el motor de proactividad DevBrain.
    """
    def __init__(self, db: Session):
        super().__init__(Producto, db)
