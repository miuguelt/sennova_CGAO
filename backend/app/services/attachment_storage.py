"""Content-addressable storage for message attachments.

The layout is ``<raiz>/<aa>/<bb>/<sha256><ext>``, where ``aa`` and ``bb`` are the
first two byte-pairs of the digest. That caps the tree at 256 × 256 = 65 536 leaf
directories no matter how many files arrive — the depth never grows, unlike a
folder per conversation, per user or per day. Two files with identical bytes
land on the same path, so the same document forwarded to twenty people occupies
disk once.

Uploads are streamed in blocks into a temporary file while the digest is
computed, so a 200 MB video never sits in memory.
"""

import hashlib
import os
import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO

from app.config import get_settings

settings = get_settings()

RAIZ_ADJUNTOS = Path(getattr(settings, "STORAGE_DIR", "storage")) / "adjuntos"

BLOQUE = 1024 * 1024


@dataclass(frozen=True)
class ArchivoGuardado:
    ruta_relativa: str
    sha256: str
    tamano_bytes: int
    ya_existia: bool


def _destino(sha256: str, extension: str) -> Path:
    return RAIZ_ADJUNTOS / sha256[:2] / sha256[2:4] / f"{sha256}{extension}"


def guardar_archivo(flujo: BinaryIO, nombre_seguro: str, limite_bytes: int = 0) -> ArchivoGuardado:
    """Vuelca el flujo a disco y devuelve su ubicación direccionable por contenido.

    Si el contenido ya estaba almacenado, se descarta la copia temporal y se
    reutiliza el archivo existente. ``limite_bytes`` corta la escritura en cuanto
    se supera el máximo, para que un envío enorme no llene el disco.
    """
    extension = os.path.splitext(nombre_seguro)[1].lower()
    digest = hashlib.sha256()
    tamano = 0

    RAIZ_ADJUNTOS.mkdir(parents=True, exist_ok=True)
    descriptor, ruta_temporal = tempfile.mkstemp(dir=RAIZ_ADJUNTOS, suffix=".parcial")

    try:
        with os.fdopen(descriptor, "wb") as temporal:
            while True:
                bloque = flujo.read(BLOQUE)
                if not bloque:
                    break
                tamano += len(bloque)
                if limite_bytes and tamano > limite_bytes:
                    raise ValueError("LIMITE_SUPERADO")
                digest.update(bloque)
                temporal.write(bloque)

        sha256 = digest.hexdigest()
        destino = _destino(sha256, extension)

        if destino.exists():
            os.unlink(ruta_temporal)
            return ArchivoGuardado(
                ruta_relativa=_relativa(destino),
                sha256=sha256,
                tamano_bytes=destino.stat().st_size,
                ya_existia=True,
            )

        destino.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(ruta_temporal, destino)
        return ArchivoGuardado(
            ruta_relativa=_relativa(destino),
            sha256=sha256,
            tamano_bytes=tamano,
            ya_existia=False,
        )
    except BaseException:
        if os.path.exists(ruta_temporal):
            os.unlink(ruta_temporal)
        raise


def _relativa(destino: Path) -> str:
    return destino.relative_to(RAIZ_ADJUNTOS).as_posix()


def resolver_ruta(ruta_relativa: str) -> Path:
    """Convierte la ruta almacenada en una ruta absoluta verificada.

    Rechaza cualquier valor que apunte fuera del árbol de adjuntos: la ruta llega
    desde la base de datos, pero un registro manipulado no puede convertirse en
    una lectura arbitraria del sistema de archivos.
    """
    raiz = RAIZ_ADJUNTOS.resolve()
    candidata = (RAIZ_ADJUNTOS / str(ruta_relativa or "")).resolve()

    if raiz != candidata and raiz not in candidata.parents:
        raise ValueError("Ruta de adjunto fuera del área de almacenamiento")

    return candidata


def eliminar_si_no_referenciado(ruta_relativa: str, sigue_referenciado: bool) -> bool:
    """Borra el archivo solo cuando ningún registro lo sigue usando.

    Con almacenamiento deduplicado, varios adjuntos comparten un mismo archivo:
    borrar en cuanto se elimina un mensaje dejaría a los demás sin contenido.
    """
    if sigue_referenciado:
        return False

    try:
        ruta = resolver_ruta(ruta_relativa)
    except ValueError:
        return False

    if not ruta.exists():
        return False

    ruta.unlink()
    _limpiar_directorios_vacios(ruta.parent)
    return True


def _limpiar_directorios_vacios(directorio: Path) -> None:
    """Retira las carpetas de reparto que quedaron sin archivos."""
    raiz = RAIZ_ADJUNTOS.resolve()
    actual = directorio.resolve()

    while actual != raiz and raiz in actual.parents:
        try:
            next(actual.iterdir())
            return
        except StopIteration:
            actual.rmdir()
            actual = actual.parent
        except OSError:
            return
