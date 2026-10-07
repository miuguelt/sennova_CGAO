"""Valida cargas del expediente en memoria y conserva sus rutas relativas."""

import hashlib
import io
import json
import re
import stat
import unicodedata
import zipfile
import zlib
from pathlib import PurePosixPath

from app.services.attachment_policy import clasificar
from app.services.project_evidence_service import STAGES

MAX_ZIP_SIZE = 50 * 1024 * 1024
MAX_TOTAL_SIZE = 200 * 1024 * 1024
MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_FILES = 500
MAX_ENTRIES = 1500
_RESERVED = re.compile(r"^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)", re.I)


def safe_path(value: str) -> str:
    """Rechaza rutas ambiguas o incompatibles con un expediente portable."""
    path = unicodedata.normalize("NFC", str(value or "").replace("\\", "/"))
    parts = path.split("/")
    if not path or len(path) > 1024 or any(
        not part or part in {".", ".."} or len(part) > 255
        or part != part.strip() or part.endswith(".") or _RESERVED.match(part)
        or any(unicodedata.category(char).startswith("C") or char in ':<>"|?*' for char in part)
        for part in parts
    ):
        raise ValueError("La ruta o el nombre del archivo no es seguro. Use nombres relativos sin puntos de retroceso ni caracteres reservados.")
    return path


def _zip_entries(content: bytes) -> list[tuple[str, bytes | None]]:
    if len(content) > MAX_ZIP_SIZE:
        raise ValueError("El ZIP supera el límite de 50 MB.")
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as package:
            infos = package.infolist()
            if len(infos) > MAX_ENTRIES:
                raise ValueError("El ZIP supera el límite de 1500 entradas.")
            if sum(info.file_size for info in infos) > MAX_TOTAL_SIZE:
                raise ValueError("El ZIP supera el límite de 200 MB descomprimidos.")
            if sum(not info.is_dir() for info in infos) > MAX_FILES:
                raise ValueError("La carga supera el límite de 500 archivos.")
            entries = []
            seen = set()
            for info in infos:
                path = safe_path(info.orig_filename.rstrip("/") if info.is_dir() else info.orig_filename)
                if path.casefold() in seen:
                    raise ValueError("El ZIP contiene rutas duplicadas; también se comparan sin distinguir mayúsculas.")
                seen.add(path.casefold())
                mode = stat.S_IFMT(info.external_attr >> 16)
                if mode not in (0, stat.S_IFREG, stat.S_IFDIR):
                    raise ValueError("El ZIP contiene enlaces u otras entradas especiales no permitidas.")
                if info.flag_bits & 1:
                    raise ValueError("No se admiten archivos ZIP cifrados. Cargue una copia sin contraseña.")
                if info.file_size > MAX_FILE_SIZE:
                    raise ValueError("Un archivo del ZIP supera el límite de 10 MB.")
                if info.is_dir():
                    if info.file_size:
                        raise ValueError("Una carpeta del ZIP contiene datos no válidos.")
                    entries.append((path, None))
                else:
                    with package.open(info) as source:
                        data = source.read(MAX_FILE_SIZE + 1)
                    if len(data) > MAX_FILE_SIZE or len(data) != info.file_size:
                        raise ValueError("Un archivo del ZIP supera el límite permitido o está dañado.")
                    entries.append((path, data))
            return entries
    except (zipfile.BadZipFile, zipfile.LargeZipFile, OSError, RuntimeError, NotImplementedError, EOFError, zlib.error) as error:
        raise ValueError("El archivo ZIP no es válido o está dañado. Verifique el archivo y vuelva a cargarlo.") from error


def _remove_wrapper(entries):
    """Retira una carpeta contenedora solo si envuelve las etapas conocidas."""
    roots = {path.split("/", 1)[0] for path, _ in entries}
    stages = {stage[1].casefold() for stage in STAGES}
    if len(roots) == 1:
        root = next(iter(roots))
        nested_stages = any(len(path.split("/")) > 1 and path.split("/")[1].casefold() in stages for path, _ in entries)
        if root.casefold() not in stages and nested_stages and not any(path == root and data is not None for path, data in entries):
            return [(path[len(root) + 1:], data) for path, data in entries if path != root]
    return entries


def read_uploads(uploads: list[tuple[str, bytes]], folder: str = "") -> dict:
    """Valida por completo una carga antes de que otra capa persista archivos."""
    if not uploads:
        raise ValueError("Seleccione un ZIP o al menos un archivo para cargar.")
    prefix = safe_path(folder) if folder else ""
    zip_count = sum(str(name).lower().endswith(".zip") for name, _ in uploads)
    if zip_count and (zip_count != 1 or len(uploads) != 1):
        raise ValueError("Cargue un solo ZIP o archivos independientes, sin mezclarlos.")
    if zip_count:
        safe_path(uploads[0][0])
        entries = _remove_wrapper(_zip_entries(uploads[0][1]))
    else:
        entries = [(safe_path(name), data) for name, data in uploads]
    if len(entries) > MAX_ENTRIES or sum(data is not None for _, data in entries) > MAX_FILES:
        raise ValueError("La carga supera el límite de entradas o de 500 archivos.")
    if sum(len(data) for _, data in entries if data is not None) > MAX_TOTAL_SIZE:
        raise ValueError("La carga supera el límite de 200 MB.")
    files, folders, paths = [], {}, {}
    for relative, data in entries:
        path = f"{prefix}/{relative}" if prefix else relative
        safe_path(path)
        key = path.casefold()
        if key in paths:
            raise ValueError("La carga contiene rutas duplicadas, incluso al comparar sin mayúsculas.")
        paths[key] = data is None
        if data is None:
            folders[key] = path
        for parent in PurePosixPath(path).parents:
            if str(parent) != ".":
                folders.setdefault(str(parent).casefold(), str(parent))
        if data is None:
            continue
        if not data:
            raise ValueError(f"El archivo «{path}» está vacío.")
        if len(data) > MAX_FILE_SIZE:
            raise ValueError(f"El archivo «{path}» supera el límite de 10 MB.")
        if PurePosixPath(path).suffix.casefold() == ".zip":
            raise ValueError("No se admiten otros ZIP dentro del expediente. Descomprímalos antes de cargarlo.")
        if PurePosixPath(path).suffix.casefold() == ".json":
            try:
                value = json.loads(data.decode("utf-8-sig"))
                if not isinstance(value, (dict, list)):
                    raise ValueError("Se esperaba un objeto o una lista.")
            except (ValueError, RecursionError) as error:
                raise ValueError("El archivo JSON no contiene un objeto o una lista válidos en UTF-8.") from error
            content_type = "application/json"
        else:
            content_type = clasificar(data, PurePosixPath(path).name).content_type
        files.append({"ruta": path, "nombre_archivo": PurePosixPath(path).name,
                      "content": data, "content_type": content_type,
                      "sha256": hashlib.sha256(data).hexdigest(), "tamano": len(data)})
    if any(key in folders and not is_folder for key, is_folder in paths.items()):
        raise ValueError("Una ruta aparece como archivo y como carpeta en la misma carga.")
    if not files and not folders:
        raise ValueError("El ZIP no contiene archivos ni carpetas.")
    return {"files": files, "carpetas": sorted(folders.values(), key=str.casefold)}
