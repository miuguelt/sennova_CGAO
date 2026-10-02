"""Limpieza transaccional de registros y posterior retiro de archivos autorizados."""

import logging
from pathlib import Path
from typing import Iterable, Optional

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Documento

logger = logging.getLogger(__name__)


def delete_entity_documents(db: Session, entidad_tipo: str, entidad_id: str) -> list[Documento]:
    """Marca los soportes de una entidad para borrar en la transacción del llamador.

    No confirma la transacción ni retira archivos. El llamador debe conservar la
    lista y pasarla a ``cleanup_document_files`` únicamente después del commit.
    """
    documents = db.query(Documento).filter(
        Documento.entidad_tipo == entidad_tipo,
        Documento.entidad_id == str(entidad_id),
    ).all()
    for document in documents:
        db.delete(document)
    return documents


def cleanup_document_files(documents: Iterable[Documento], storage_dir: Optional[Path] = None) -> list[str]:
    """Retira archivos después del commit y devuelve IDs cuya limpieza queda pendiente.

    Solo se eliminan archivos del directorio documental autorizado. Las rutas
    antiguas inexistentes pueden resolverse por su nombre dentro de ese directorio.
    Las rutas existentes externas y los enlaces que salgan del directorio se
    conservan y se informan al llamador.
    """
    root = Path(storage_dir if storage_dir is not None else Path(get_settings().STORAGE_DIR) / "documentos").resolve()
    pending = []
    for document in documents:
        if not document.file_path:
            continue
        try:
            stored = Path(document.file_path.replace("\\", "/"))
            target = stored.resolve()
            if not target.exists():
                target = (root / stored.name).resolve()
            if not target.is_relative_to(root):
                if target.exists():
                    pending.append(str(document.id))
                    logger.warning("El archivo del documento %s está fuera del almacenamiento autorizado", document.id)
                continue
            target.unlink(missing_ok=True)
        except (OSError, RuntimeError, ValueError):
            pending.append(str(document.id))
            logger.exception("El archivo del documento %s queda pendiente de limpieza", document.id)
    return pending
