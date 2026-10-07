"""Análisis sin escrituras e importación transaccional del expediente."""

import hashlib
import logging
import math
import uuid
from pathlib import Path

from fastapi import HTTPException

from app.config import get_settings
from app.models import Documento
from app.services.documentation_commands import lock_project
from app.services.project_evidence_service import STAGES, document_bytes
from app.services.project_file_import.archive import read_uploads
from app.services.project_file_import.data import apply_detected_data
from app.services.project_file_import.models import ProjectFileBatch, ProjectImportedFile
from app.services.project_file_import.reader import analyze_file

logger = logging.getLogger(__name__)


def analyze_uploads(project, uploads, folder="", kind=""):
    try:
        package = read_uploads(uploads, folder)
        entries = [dict(entry, **analyze_file(entry, kind or None)) for entry in package["files"]]
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    folders = package["carpetas"]
    return {"proyecto_id": str(project.id), "archivos": entries, "carpetas": folders,
            "carpetas_faltantes": [stage[1] for stage in STAGES if stage[1] not in folders]}


def public_analysis(analysis):
    return {**analysis, "archivos": [{key: value for key, value in entry.items() if key != "content"}
                                    for entry in analysis["archivos"]]}


def reviewed_entries(project, analysis, selection):
    indexed = {entry["ruta"]: entry for entry in analysis["archivos"]}
    chosen = []
    seen = set()
    for item in selection:
        entry = indexed.get(item.ruta)
        if entry is None or entry["sha256"] != item.sha256:
            raise HTTPException(status_code=409, detail="Los archivos cambiaron desde el análisis. Analícelos nuevamente antes de guardar.")
        if item.ruta in seen:
            raise HTTPException(status_code=422, detail="La selección contiene un archivo repetido.")
        seen.add(item.ruta)
        period = item.periodo_bimestre
        if entry["tipo"] == "informe_bimensual":
            maximum = math.ceil(project.vigencia / 2) if project.vigencia and project.vigencia > 0 else None
            if period is None or period < 1 or (maximum is not None and period > maximum):
                raise HTTPException(status_code=422, detail=f"{item.ruta}: indique un bimestre válido dentro de la duración del proyecto.")
        elif period is not None:
            raise HTTPException(status_code=422, detail="El bimestre solo corresponde a informes bimensuales.")
        chosen.append((entry, item))
    return chosen


def store_original(db, project, user, batch, entry, period, written):
    identifier = str(uuid.uuid4())
    root = Path(get_settings().STORAGE_DIR).resolve() / "documentos"
    root.mkdir(parents=True, exist_ok=True)
    path = root / (identifier + Path(entry["nombre_archivo"]).suffix.lower())
    with path.open("xb") as target:
        written.append(path)
        target.write(entry["content"])
    document = Documento(id=identifier, entidad_tipo="proyecto", entidad_id=project.id,
                         tipo=entry["tipo"], nombre_archivo=entry["nombre_archivo"],
                         descripcion=f"Archivo importado: {entry['ruta']}", periodo_bimestre=period,
                         content_type=entry["content_type"], file_path=str(path), owner_id=user.id)
    document.importacion = ProjectImportedFile(lote=batch, ruta=entry["ruta"], sha256=entry["sha256"],
                                               texto_extraido=entry["texto_extraido"], propuesta=entry["propuesta"])
    db.add(document)


def import_uploads(project, db, user, analysis, selection):
    written = []
    warnings = []
    try:
        project = lock_project(project, db)
        initial_duration = project.vigencia
        chosen = reviewed_entries(project, analysis, selection)
        sources = db.query(ProjectImportedFile).join(ProjectFileBatch).filter(ProjectFileBatch.proyecto_id == project.id).all()
        existing = {(source.ruta.casefold(), source.sha256): source for source in sources}
        folders = sorted(set(analysis["carpetas"]) - {path for batch in project.cargas_archivos for path in batch.carpetas})
        batch = ProjectFileBatch(proyecto_id=project.id, carpetas=folders, created_by=user.id)
        created, skipped, fields = 0, 0, 0
        for entry, item in chosen:
            warnings.extend(f"{entry['ruta']}: {warning}" for warning in entry["advertencias"])
            previous = existing.get((entry["ruta"].casefold(), entry["sha256"]))
            content = document_bytes(previous.documento) if previous else None
            if content and hashlib.sha256(content).hexdigest() == entry["sha256"]:
                skipped += 1
                if previous.documento.periodo_bimestre != item.periodo_bimestre or previous.documento.tipo != entry["tipo"]:
                    warnings.append(f"{entry['ruta']}: el archivo ya existe; se conserva su clasificación y bimestre registrados.")
                    continue
            else:
                if any(source.ruta.casefold() == entry["ruta"].casefold() for source in sources):
                    warnings.append(f"{entry['ruta']}: se conserva también la copia anterior; la descarga distinguirá ambas versiones.")
                store_original(db, project, user, batch, entry, item.periodo_bimestre, written)
                created += 1
            if item.importar_datos:
                fields += apply_detected_data(project, db, user, entry, item.periodo_bimestre, warnings)
        if created or folders:
            db.add(batch)
        reviewed_entries(project, analysis, selection)
        if project.vigencia and project.vigencia != initial_duration:
            outside_period = db.query(Documento).filter(
                Documento.entidad_tipo == "proyecto", Documento.entidad_id == str(project.id),
                Documento.tipo.in_(["informe_bimensual", "informe_bimestral"]),
                Documento.periodo_bimestre > math.ceil(project.vigencia / 2),
            ).first()
            if outside_period:
                raise HTTPException(status_code=422, detail="La duración detectada deja informes registrados fuera del proyecto. Revise la duración o importe sin completar datos.")
        db.commit()
    except Exception as error:
        db.rollback()
        for path in written:
            try:
                path.unlink(missing_ok=True)
            except OSError:
                logger.exception("No fue posible retirar un archivo de la carga revertida")
        if isinstance(error, HTTPException):
            raise
        raise HTTPException(status_code=500, detail="No fue posible guardar la carga. Se revirtió el registro; intente nuevamente.") from error
    return {"archivos_importados": created, "archivos_omitidos": skipped,
            "campos_registrados": fields, "advertencias": list(dict.fromkeys(warnings))}
