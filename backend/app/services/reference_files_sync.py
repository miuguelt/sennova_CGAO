# -*- coding: utf-8 -*-
"""Sincroniza y registra en la base de datos los archivos base físicos de los proyectos de referencia."""

import mimetypes
import shutil
import uuid
from pathlib import Path
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Documento, Proyecto


MIME_MAP = {
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".mp4": "video/mp4",
}


def _determine_document_type(rel_path_str: str, filename: str) -> tuple[str, int | None]:
    """Determina el tipo documental y período según la carpeta de SharePoint y el nombre del archivo."""
    lower_path = rel_path_str.lower().replace("\\", "/")
    lower_name = filename.lower()
    periodo = None

    if "1ProyectoFormulado" in lower_path or "1proyectoformulado" in lower_path:
        if lower_name.endswith(".pptx"):
            return "presentacion_proyecto", None
        return "formulacion_proyecto", None

    if "2actadeinicio" in lower_path:
        return "acta_inicio", None

    if "3productos" in lower_path:
        if lower_name.endswith(".pptx") or "poster" in lower_name:
            return "poster_producto", None
        if "informe" in lower_name:
            return "producto_resultado", None
        return "soporte_minciencias", None

    if "4informesbimensuales" in lower_path:
        return "informe_bimensual", 1

    if "5actacierre" in lower_path:
        if "informe" in lower_name:
            return "informe_final", None
        return "acta_cierre", None

    if "6evidenciasfotograficas" in lower_path:
        if lower_name.endswith(".mp4"):
            return "evidencia_video", None
        return "evidencia_fotografica", None

    if "7borradoresyvarios" in lower_path:
        return "borrador_varios", None

    if "informe_final" in lower_name or "gcdtp-f-023" in lower_name:
        return "informe_final", None

    return "borrador_varios", None


def sync_reference_project_files(db: Session) -> dict:
    """Busca los proyectos de referencia y registra sus archivos físicos si aún no existen."""
    settings = get_settings()
    storage_root = Path(settings.STORAGE_DIR).resolve()
    docs_dir = storage_root / "documentos"
    docs_dir.mkdir(parents=True, exist_ok=True)

    # Identificar carpetas de referencia en docs/
    project_root = Path(__file__).resolve().parents[3]
    reference_dirs = [
        ("CAP-14-2026", project_root / "docs" / "CAP-14-2026 Sistemade Información Investigación"),
        ("CAP-05-2026", project_root / "docs" / "CAP-05-2026_FortalecimeintoArchivo"),
    ]

    synced_count = 0
    projects_found = []

    for code_pattern, source_path in reference_dirs:
        if not source_path.is_dir():
            continue

        # Buscar el proyecto en la BD
        project = db.query(Proyecto).filter(
            Proyecto.nombre.ilike(f"%{code_pattern}%")
        ).first()

        if not project:
            # Búsqueda alternativa por nombre clave
            if code_pattern == "CAP-14-2026":
                project = db.query(Proyecto).filter(
                    Proyecto.nombre.ilike("%Sistema de información para la gestión de proyectos de investigación%")
                ).first()
            elif code_pattern == "CAP-05-2026":
                project = db.query(Proyecto).filter(
                    Proyecto.nombre.ilike("%Fortalecimiento de los procesos de organización documental%")
                ).first()

        if not project:
            continue

        projects_found.append(str(project.id))

        # Recorrer todos los archivos dentro del directorio de referencia
        for file_path in source_path.rglob("*"):
            if not file_path.is_file():
                continue

            rel_path = file_path.relative_to(source_path)
            rel_path_str = str(rel_path)
            filename = file_path.name
            ext = file_path.suffix.lower()

            doc_type, periodo = _determine_document_type(rel_path_str, filename)
            content_type = MIME_MAP.get(ext) or mimetypes.guess_type(filename)[0] or "application/octet-stream"

            # Generar UUID determinista por proyecto y ruta relativa
            doc_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{project.id}:{rel_path_str}"))

            # Verificar si ya existe en la BD
            existing = db.query(Documento).filter(
                (Documento.id == doc_uuid) |
                ((Documento.entidad_id == str(project.id)) & (Documento.nombre_archivo == filename))
            ).first()

            # Destino seguro en storage/documentos/
            safe_target_filename = f"{doc_uuid}_{filename}"
            dest_file = docs_dir / safe_target_filename
            rel_storage_path = f"documentos/{safe_target_filename}"

            # Copiar archivo si no existe en storage
            if not dest_file.exists():
                shutil.copy2(file_path, dest_file)

            if existing is None:
                doc = Documento(
                    id=doc_uuid,
                    entidad_tipo="proyecto",
                    entidad_id=str(project.id),
                    tipo=doc_type,
                    nombre_archivo=filename,
                    descripcion=f"Archivo base de referencia: {rel_path_str}",
                    periodo_bimestre=periodo,
                    content_type=content_type,
                    file_path=rel_storage_path,
                    owner_id=project.owner_id,
                )
                db.add(doc)
                synced_count += 1
            else:
                # Asegurar que file_path y tipo sean correctos
                if not existing.file_path or not (storage_root / existing.file_path).is_file():
                    existing.file_path = rel_storage_path
                if existing.tipo != doc_type and doc_type != "borrador_varios":
                    existing.tipo = doc_type
                if periodo is not None and existing.periodo_bimestre is None:
                    existing.periodo_bimestre = periodo

    if synced_count > 0:
        db.commit()

    return {
        "proyectos_afectados": projects_found,
        "documentos_sincronizados": synced_count,
    }
