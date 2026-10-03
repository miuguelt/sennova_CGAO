"""Escrituras con control de revisión y generación atómica de archivos y versiones."""

import hashlib
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.config import get_settings
from app.documentation_models import ProjectDocumentation, ProjectDocumentDraft, ProjectDocumentVersion
from app.models import Documento, Proyecto
from app.services.documentation_catalog import COMMON_FIELDS, DOCUMENT_DEFINITIONS
from app.services.documentation_renderers import render_document
from app.services.documentation_state import (consistency_issues, current_snapshot, generation_pending, slot_for_key, version_is_current)
from app.services.documentation_validation import validate_fields
from app.services.project_evidence_service import document_bytes, project_documents


def lock_project(project, db):
    return db.query(Proyecto).filter(Proyecto.id == project.id).populate_existing().with_for_update().one()


def expect_revision(actual, expected):
    if actual != expected:
        raise HTTPException(status_code=409, detail="Otra persona guardó cambios. Recargue el formulario y concilie sus datos antes de volver a guardar.")


def commit_edit(db):
    try:
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail="No fue posible guardar el formulario. Sus cambios no se confirmaron; intente de nuevo.") from error


def save_common(project, db, user, revision, data):
    normalized = validate_fields(data, COMMON_FIELDS)
    lock_project(project, db)
    row = db.query(ProjectDocumentation).filter_by(proyecto_id=project.id).first()
    expect_revision(row.revision if row else 0, revision)
    if row is None:
        row = ProjectDocumentation(proyecto_id=project.id, revision=0, updated_by=user.id)
        db.add(row)
    row.datos, row.revision, row.updated_by = normalized, revision + 1, user.id
    commit_edit(db)
    return {"revision": row.revision, "datos": row.datos}


def save_draft(project, db, user, key, revision, data):
    slot = slot_for_key(project, key)
    normalized = validate_fields(data, DOCUMENT_DEFINITIONS[slot["tipo"]]["fields"])
    lock_project(project, db)
    row = db.query(ProjectDocumentDraft).filter_by(proyecto_id=project.id, clave=key).first()
    expect_revision(row.revision if row else 0, revision)
    if row is None:
        row = ProjectDocumentDraft(proyecto_id=project.id, clave=key, tipo=slot["tipo"], periodo_bimestre=slot["periodo_bimestre"], producto_id=slot["producto_id"], revision=0, updated_by=user.id)
        db.add(row)
    row.datos, row.revision, row.updated_by = normalized, revision + 1, user.id
    commit_edit(db)
    return {"revision": row.revision, "datos": row.datos}


def generation_images(project, db):
    images = []
    for document in project_documents(project, db):
        if document.tipo == "evidencia_fotografica" and document.content_type in {"image/jpeg", "image/png"}:
            content = document_bytes(document)
            if content:
                images.append({"content": content, "caption": document.descripcion or document.nombre_archivo or "Evidencia fotográfica", "documento_id": str(document.id)})
    return images


def version_result(version):
    return {"documento_id": str(version.documento_id), "version": version.version,
            "nombre_archivo": version.documento.nombre_archivo, "estado": version.estado}


def generate_version(project, db, user, key, revision, common_revision):
    project = lock_project(project, db)
    slot = slot_for_key(project, key)
    common_row = db.query(ProjectDocumentation).filter_by(proyecto_id=project.id).first()
    draft = db.query(ProjectDocumentDraft).filter_by(proyecto_id=project.id, clave=key).first()
    expect_revision(common_row.revision if common_row else 0, common_revision)
    expect_revision(draft.revision if draft else 0, revision)
    common, data = common_row.datos if common_row else {}, draft.datos if draft else {}
    pending = generation_pending(project, slot, common, data)
    if pending:
        raise HTTPException(status_code=422, detail=" ".join(item["mensaje"] for item in pending))
    snapshot = current_snapshot(project, slot, common, data)
    versions = sorted(draft.versiones, key=lambda item: item.version, reverse=True) if draft else []
    if versions and version_is_current(versions[0], snapshot, common_revision, revision) and versions[0].documento:
        previous_content = document_bytes(versions[0].documento)
        if previous_content and hashlib.sha256(previous_content).hexdigest() == versions[0].sha256:
            return version_result(versions[0])
    number = versions[0].version + 1 if versions else 1
    path = None
    file_created = False
    try:
        context = dict(snapshot["contexto"], version=number)
        images = generation_images(project, db) if slot["tipo"] == "registro_evidencias" else None
        content, mime = render_document(slot["tipo"], context, common, data, images=images)
        if not content or len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=422, detail="El documento generado supera los 10 MB o está vacío. Reduzca sus evidencias y vuelva a generar.")
        extension = DOCUMENT_DEFINITIONS[slot["tipo"]]["format"]
        identifier = uuid.uuid4()
        root = Path(get_settings().STORAGE_DIR).resolve() / "documentos"
        root.mkdir(parents=True, exist_ok=True)
        path = root / f"{identifier}.{extension}"
        with path.open("xb") as target:
            file_created = True
            target.write(content)
        name = f"{key}_v{number}.{extension}"
        document = Documento(id=str(identifier), entidad_tipo="producto" if slot["producto_id"] else "proyecto", entidad_id=slot["producto_id"] or project.id, tipo=slot["tipo"], nombre_archivo=name, descripcion=f"{slot['titulo']} · Versión {number} generada para revisión", periodo_bimestre=slot["periodo_bimestre"], content_type=mime, file_path=str(path), owner_id=user.id)
        if draft is None:
            draft = ProjectDocumentDraft(proyecto_id=project.id, clave=key, tipo=slot["tipo"], periodo_bimestre=slot["periodo_bimestre"], producto_id=slot["producto_id"], revision=0, datos={}, updated_by=user.id)
            db.add(draft)
        db.add(document)
        db.flush()
        version = ProjectDocumentVersion(borrador_id=draft.id, documento_id=document.id, version=number, revision_comunes=common_revision, revision_borrador=revision, snapshot=snapshot, sha256=hashlib.sha256(content).hexdigest(), created_by=user.id)
        db.add(version)
        db.flush()
        result = {"documento_id": str(document.id), "version": number, "nombre_archivo": name, "estado": "borrador"}
        db.commit()
        return result
    except Exception as error:
        db.rollback()
        if file_created:
            path.unlink(missing_ok=True)
        if isinstance(error, HTTPException):
            raise
        raise HTTPException(status_code=500, detail="No fue posible generar y guardar el documento. No se confirmó una versión nueva; intente de nuevo.") from error


def review_version(project, db, user, document_id, observation):
    project = lock_project(project, db)
    version = db.query(ProjectDocumentVersion).join(ProjectDocumentDraft).filter(ProjectDocumentDraft.proyecto_id == project.id, ProjectDocumentVersion.documento_id == document_id).first()
    if version is None or not version.documento or document_bytes(version.documento) is None:
        raise HTTPException(status_code=404, detail="Versión generada no disponible en este proyecto.")
    if hashlib.sha256(document_bytes(version.documento)).hexdigest() != version.sha256:
        raise HTTPException(status_code=409, detail="El archivo cambió después de generarlo. Genere una nueva versión antes de revisarla.")
    slot = slot_for_key(project, version.borrador.clave)
    common_row = db.query(ProjectDocumentation).filter_by(proyecto_id=project.id).first()
    common, revision = (common_row.datos, common_row.revision) if common_row else ({}, 0)
    snapshot = current_snapshot(project, slot, common, version.borrador.datos)
    if not version_is_current(version, snapshot, revision, version.borrador.revision):
        raise HTTPException(status_code=409, detail="Los datos cambiaron después de generar esta versión. Genere una nueva antes de revisarla.")
    issues = consistency_issues(snapshot["contexto"], common)
    if issues:
        raise HTTPException(status_code=422, detail=" ".join(issues))
    version.estado, version.reviewed_by = "revisado", user.id
    version.reviewed_at, version.observacion_revision = datetime.now(timezone.utc), observation.strip()
    result = version_result(version)
    commit_edit(db)
    return result


def update_project_identification(project, db, user, data):
    lock_project(project, db)
    if "nombre" in data and data["nombre"] is not None:
        project.nombre = str(data["nombre"]).strip()
    if "objetivo_general" in data and data["objetivo_general"] is not None:
        project.objetivo_general = str(data["objetivo_general"]).strip()
    if "objetivos_especificos" in data and data["objetivos_especificos"] is not None:
        raw = data["objetivos_especificos"]
        if isinstance(raw, str):
            objectives = [line.strip() for line in raw.splitlines() if line.strip()]
        elif isinstance(raw, list):
            objectives = [str(item).strip() for item in raw if str(item).strip()]
        else:
            objectives = []
        project.objetivos_especificos = objectives
    if "vigencia" in data and data["vigencia"] is not None:
        try:
            val = int(data["vigencia"]) if data["vigencia"] != "" else None
            project.vigencia = val
        except (ValueError, TypeError):
            pass
    if "presupuesto_total" in data and data["presupuesto_total"] is not None:
        try:
            val = float(data["presupuesto_total"]) if data["presupuesto_total"] != "" else None
            project.presupuesto_total = val
        except (ValueError, TypeError):
            pass
    commit_edit(db)
    from app.services.documentation_state import documentation_view
    return documentation_view(project, db)


def apply_formulation_proposal(project, db, user, draft_data, project_data):
    from app.services.formulation_route import FORMULATION_KEY
    lock_project(project, db)
    if project_data:
        if "nombre" in project_data and project_data["nombre"]:
            project.nombre = str(project_data["nombre"]).strip()
        if "objetivo_general" in project_data and project_data["objetivo_general"]:
            project.objetivo_general = str(project_data["objetivo_general"]).strip()
        if "objetivos_especificos" in project_data and project_data["objetivos_especificos"]:
            raw = project_data["objetivos_especificos"]
            if isinstance(raw, str):
                objectives = [line.strip() for line in raw.splitlines() if line.strip()]
            elif isinstance(raw, list):
                objectives = [str(item).strip() for item in raw if str(item).strip()]
            else:
                objectives = []
            if objectives:
                project.objetivos_especificos = objectives
    if draft_data:
        slot = slot_for_key(project, FORMULATION_KEY)
        draft = db.query(ProjectDocumentDraft).filter_by(proyecto_id=project.id, clave=FORMULATION_KEY).first()
        current_data = dict(draft.datos) if draft and draft.datos else {}
        for key, val in draft_data.items():
            if val is not None and val != "" and val != []:
                current_data[key] = val
        normalized = validate_fields(current_data, DOCUMENT_DEFINITIONS[slot["tipo"]]["fields"])
        if draft is None:
            draft = ProjectDocumentDraft(
                proyecto_id=project.id,
                clave=FORMULATION_KEY,
                tipo=slot["tipo"],
                periodo_bimestre=None,
                producto_id=None,
                revision=1,
                datos=normalized,
                updated_by=user.id,
            )
            db.add(draft)
        else:
            draft.datos = normalized
            draft.revision += 1
            draft.updated_by = user.id
    commit_edit(db)
    from app.services.documentation_state import documentation_view
    return documentation_view(project, db)

