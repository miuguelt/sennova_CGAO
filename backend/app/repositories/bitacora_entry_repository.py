from sqlalchemy.orm import Session
from app.models import BitacoraEntry
from app.repositories.base_repository import BaseRepository

class BitacoraEntryRepository(BaseRepository[BitacoraEntry]):
    """
    Repositorio para la entidad BitacoraEntry.
    Auto-generado por el motor de proactividad DevBrain.
    """
    def __init__(self, db: Session):
        super().__init__(BitacoraEntry, db)
