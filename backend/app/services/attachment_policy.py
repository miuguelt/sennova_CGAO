"""What may be attached to a message, and under which limits.

The extension and the content-type that the browser sends are user input: an
executable renamed to ``.png`` arrives looking innocent. Every upload is
therefore classified by its own leading bytes, and the declared extension only
has to agree with what the signature already proved.
"""

import os
import re
from dataclasses import dataclass
from typing import Optional

from app.config import get_settings

settings = get_settings()

MB = 1024 * 1024


class TipoNoPermitido(ValueError):
    """El archivo no pertenece a ninguna categoría admitida."""


class ArchivoDemasiadoGrande(ValueError):
    """El archivo supera el límite de su categoría."""


@dataclass(frozen=True)
class TipoDetectado:
    categoria: str          # imagen | documento | audio | video
    content_type: str
    extension: str          # con punto, en minúsculas
    nombre_seguro: str


def _limite_env(nombre: str, por_defecto_mb: int) -> int:
    return int(os.getenv(nombre, str(por_defecto_mb))) * MB


LIMITES = {
    "imagen": _limite_env("ADJUNTO_MAX_IMAGEN_MB", 15),
    "documento": _limite_env("ADJUNTO_MAX_DOCUMENTO_MB", 30),
    "audio": _limite_env("ADJUNTO_MAX_AUDIO_MB", 30),
    "video": _limite_env("ADJUNTO_MAX_VIDEO_MB", 200),
}

# (categoría, content-type, extensiones aceptadas, comprobación de firma)
# El orden importa: las variantes de contenedor (RIFF, ISO-BMFF, ZIP) comparten
# cabecera y se distinguen por un marcador posterior.
_FIRMAS = [
    ("imagen", "image/jpeg", (".jpg", ".jpeg"), lambda d: d[:3] == b"\xff\xd8\xff"),
    ("imagen", "image/png", (".png",), lambda d: d[:8] == b"\x89PNG\r\n\x1a\n"),
    ("imagen", "image/gif", (".gif",), lambda d: d[:6] in (b"GIF87a", b"GIF89a")),
    ("imagen", "image/webp", (".webp",), lambda d: d[:4] == b"RIFF" and d[8:12] == b"WEBP"),
    ("imagen", "image/bmp", (".bmp",), lambda d: d[:2] == b"BM"),
    ("imagen", "image/heic", (".heic", ".heif"), lambda d: d[4:8] == b"ftyp" and d[8:12] in (b"heic", b"heix", b"mif1")),

    ("audio", "audio/wav", (".wav",), lambda d: d[:4] == b"RIFF" and d[8:12] == b"WAVE"),
    ("audio", "audio/ogg", (".ogg", ".oga"), lambda d: d[:4] == b"OggS"),
    ("audio", "audio/mp4", (".m4a",), lambda d: d[4:8] == b"ftyp" and d[8:11] == b"M4A"),
    ("audio", "audio/mpeg", (".mp3",), lambda d: d[:3] == b"ID3" or d[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2")),

    ("video", "video/mp4", (".mp4",), lambda d: d[4:8] == b"ftyp" and d[8:12] in (b"isom", b"iso2", b"mp41", b"mp42", b"avc1", b"dash")),
    ("video", "video/quicktime", (".mov",), lambda d: d[4:8] == b"ftyp" and d[8:12] in (b"qt  ", b"moov")),
    ("video", "video/webm", (".webm", ".mkv"), lambda d: d[:4] == b"\x1a\x45\xdf\xa3"),
    ("video", "video/x-msvideo", (".avi",), lambda d: d[:4] == b"RIFF" and d[8:12] == b"AVI "),

    ("documento", "application/pdf", (".pdf",), lambda d: d[:5] == b"%PDF-"),
    ("documento", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
     (".docx", ".xlsx", ".pptx", ".zip"), lambda d: d[:4] == b"PK\x03\x04"),
    ("documento", "application/msword", (".doc", ".xls", ".ppt"),
     lambda d: d[:8] == b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"),
]

# Los formatos ZIP de Office comparten firma; el content-type real se decide por
# la extensión ya validada contra esa firma común.
_CONTENT_TYPE_POR_EXTENSION = {
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".zip": "application/zip",
    ".doc": "application/msword",
    ".xls": "application/vnd.ms-excel",
    ".ppt": "application/vnd.ms-powerpoint",
    ".mkv": "video/x-matroska",
    ".heif": "image/heif",
    ".oga": "audio/ogg",
}

# Texto plano: no tiene firma, se valida que el contenido sea decodificable.
_EXTENSIONES_TEXTO = {".txt": "text/plain", ".csv": "text/csv", ".md": "text/markdown"}

_CARACTERES_PROHIBIDOS = re.compile(r"[^A-Za-z0-9 ._\-áéíóúÁÉÍÓÚñÑüÜ]")


def sanear_nombre(nombre_original: str) -> str:
    """Deja un nombre presentable y sin capacidad de escapar del directorio."""
    base = os.path.basename(str(nombre_original or "").replace("\\", "/")).strip()
    base = base.replace("..", "_")
    base = _CARACTERES_PROHIBIDOS.sub("_", base)
    base = base.lstrip(".") or "archivo"
    return base[:120]


def _es_texto(datos: bytes) -> bool:
    if b"\x00" in datos:
        return False
    try:
        datos.decode("utf-8")
        return True
    except UnicodeDecodeError:
        return False


def clasificar(cabecera: bytes, nombre_original: str) -> TipoDetectado:
    """Determina la categoría a partir de los bytes iniciales del archivo.

    ``cabecera`` son los primeros bytes leídos del flujo (basta con 4 KB).
    """
    nombre_seguro = sanear_nombre(nombre_original)
    extension = os.path.splitext(nombre_seguro)[1].lower()

    for categoria, content_type, extensiones, coincide in _FIRMAS:
        if not coincide(cabecera):
            continue
        if extension not in extensiones:
            raise TipoNoPermitido(
                f"El contenido del archivo no corresponde con la extensión «{extension or 'sin extensión'}»"
            )
        return TipoDetectado(
            categoria=categoria,
            content_type=_CONTENT_TYPE_POR_EXTENSION.get(extension, content_type),
            extension=extension,
            nombre_seguro=nombre_seguro,
        )

    if extension in _EXTENSIONES_TEXTO and _es_texto(cabecera):
        return TipoDetectado(
            categoria="documento",
            content_type=_EXTENSIONES_TEXTO[extension],
            extension=extension,
            nombre_seguro=nombre_seguro,
        )

    raise TipoNoPermitido(
        "Formato no admitido. Se aceptan imágenes (JPG, PNG, GIF, WEBP, BMP, HEIC), "
        "videos (MP4, MOV, WEBM, AVI), audio (MP3, WAV, OGG, M4A) y documentos "
        "(PDF, Word, Excel, PowerPoint, TXT, CSV, ZIP)."
    )


def limite_bytes(categoria: str) -> int:
    return LIMITES.get(categoria, 10 * MB)


def verificar_tamano(categoria: str, tamano_bytes: int) -> None:
    limite = limite_bytes(categoria)
    if tamano_bytes > limite:
        raise ArchivoDemasiadoGrande(
            f"El archivo pesa {tamano_bytes / MB:.1f} MB y el límite para {categoria} "
            f"es {limite // MB} MB"
        )


def es_previsualizable(categoria: Optional[str]) -> bool:
    """Categorías que el navegador puede mostrar en línea sin descargar."""
    return categoria in ("imagen", "video", "audio")
