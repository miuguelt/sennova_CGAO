"""Reconstruye rutas de originales importados sin perder versiones homónimas."""

from pathlib import PurePosixPath

from app.services.project_file_import.models import ProjectFileBatch, ProjectImportedFile


def export_folder(path):
    from app.services.project_file_import.archive import safe_path
    path = safe_path(path)
    if path.split("/")[0].casefold() in {"expediente.json", "pendientes.txt"}:
        return "Archivos_importados/" + path
    return path


def imported_sources(project, db):
    sources = db.query(ProjectImportedFile).join(ProjectFileBatch).filter(ProjectFileBatch.proyecto_id == project.id).all()
    folders = {path for batch in db.query(ProjectFileBatch).filter_by(proyecto_id=project.id) for path in batch.carpetas}
    return {str(source.documento_id): source for source in sources}, folders


def export_path(path, document_id, used):
    from app.services.project_file_import.archive import safe_path
    try:
        path = safe_path(path)
    except ValueError:
        path = f"7Borradoresyvarios/{document_id}_archivo"
    target = PurePosixPath(path)
    if len(target.parts) > 1:
        path = export_folder(str(target.parent)) + "/" + target.name
        target = PurePosixPath(path)
    if any(str(parent).casefold() in used for parent in target.parents if str(parent) != "."):
        path = f"Archivos_importados/{document_id}/{path}"
    target = PurePosixPath(path)
    counter = 0
    while path.casefold() in used or path.casefold() + "/" in used:
        counter += 1
        prefix = document_id if counter == 1 else f"{document_id}_{counter}"
        suffix = target.suffix[:12]
        limit = min(255, 1024 - len(str(target.parent)) - 1) - len(prefix) - len(suffix) - 1
        if limit < 1:
            target = PurePosixPath("Archivos_importados") / target.name
            limit = 200 - len(prefix) - len(suffix)
        path = str(target.with_name(f"{prefix}_{target.stem[:limit]}{suffix}"))
    try:
        path = safe_path(path)
    except ValueError:
        path = f"Archivos_importados/{document_id}/{target.name[:200]}"
    used.add(path.casefold())
    return path
