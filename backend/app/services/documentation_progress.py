"""Avance documental autoritativo a partir de requisitos y versiones persistidas."""

import hashlib
import math

from fastapi import HTTPException

from app.services.documentation_catalog import COMMON_FIELDS, DOCUMENT_DEFINITIONS
from app.services.documentation_validation import missing_fields, normalize_value
from app.services.project_evidence_service import document_bytes


PROGRESS_DESCRIPTION = (
    "El avance corresponde en un 80 % a los campos obligatorios guardados y válidos, "
    "en un 10 % a los documentos generados vigentes y en un 10 % a su revisión vigente. "
    "Cada tabla se completa cuando todas sus filas contienen la información obligatoria."
)


def validated_completion(data, fields):
    """Cuenta cada campo una vez y exige que sus filas y valores sean válidos."""
    data = data if isinstance(data, dict) else {}
    completion, normalized = {}, {}
    for field in fields:
        key = field["key"]
        try:
            value = normalize_value(data.get(key), field, field["label"])
            normalized[key] = value
            completion[key] = not missing_fields({key: value}, [dict(field, required=True)])
        except HTTPException:
            completion[key] = False
    for start, end in (("fecha_inicio", "fecha_fin"), ("periodo_desde", "periodo_hasta")):
        if normalized.get(start) and normalized.get(end) and normalized[start] > normalized[end]:
            completion[start] = completion[end] = False
    return completion


def project_requirements(project):
    """Valida los cuatro requisitos del proyecto usados por los documentos."""
    objectives = project.objetivos_especificos
    return {
        "objetivo_general": isinstance(project.objetivo_general, str) and bool(project.objetivo_general.strip()),
        "objetivos_especificos": isinstance(objectives, list) and bool(objectives)
        and all(isinstance(item, str) and bool(item.strip()) for item in objectives),
        "vigencia": isinstance(project.vigencia, int) and not isinstance(project.vigencia, bool) and project.vigencia > 0,
        "productos": bool(project.productos),
    }


def current_version_status(project, slot, draft, common, common_revision):
    """Comprueba la última versión, su snapshot, su archivo y su revisión."""
    from app.services.documentation_state import consistency_issues, current_snapshot, version_is_current

    if draft is None or not draft.versiones:
        return False, False
    version = max(draft.versiones, key=lambda item: item.version)
    snapshot = current_snapshot(project, slot, common, draft.datos)
    if not version_is_current(version, snapshot, common_revision, draft.revision) or version.documento is None:
        return False, False
    content = document_bytes(version.documento)
    if not content or hashlib.sha256(content).hexdigest() != version.sha256:
        return False, False
    reviewed = version.estado == "revisado" and not consistency_issues(snapshot["contexto"], common)
    return True, reviewed


def documentation_progress(project, *, common_row=None, drafts=None):
    """Combina captura (80 %), generación (10 %) y revisión (10 %) sin autoevaluaciones."""
    from app.services.documentation_state import document_slots, generation_pending

    if common_row is None:
        common_row = project.documentacion
    if drafts is None:
        drafts = {draft.clave: draft for draft in project.borradores_documentales}
    common, common_revision = (common_row.datos, common_row.revision) if common_row else ({}, 0)
    common_complete = validated_completion(common, COMMON_FIELDS)
    project_complete = project_requirements(project)
    required_common = {key for definition in DOCUMENT_DEFINITIONS.values() for key in definition["required_common"]}
    completed = sum(common_complete[key] for key in required_common) + sum(project_complete.values())
    total = len(required_common) + len(project_complete)
    ready = generated = reviewed = 0
    slots = document_slots(project)
    for slot in slots:
        definition = DOCUMENT_DEFINITIONS[slot["tipo"]]
        draft = drafts.get(slot["clave"])
        data = draft.datos if draft else {}
        fields_complete = validated_completion(data, definition["fields"])
        required = [field["key"] for field in definition["fields"] if field["required"]]
        total += len(required)
        completed += sum(fields_complete[key] for key in required)
        project_keys = ["objetivo_general"]
        if slot["tipo"] in {"formulacion_proyecto", "presentacion_proyecto", "informe_final"}:
            project_keys.append("objetivos_especificos")
        if slot["tipo"] == "informe_bimensual":
            project_keys.append("vigencia")
        if slot["tipo"] in {"producto_resultado", "poster_producto"}:
            project_keys.append("productos")
        populated = [key for key, value in data.items() if value is not None and value != "" and value != []]
        is_ready = (all(common_complete[key] for key in definition["required_common"])
                    and all(project_complete[key] for key in project_keys)
                    and all(fields_complete[key] for key in required)
                    and all(fields_complete.get(key, False) for key in populated)
                    and not generation_pending(project, slot, common, data))
        ready += is_ready
        if is_ready:
            is_generated, is_reviewed = current_version_status(project, slot, draft, common, common_revision)
            generated += is_generated
            reviewed += is_reviewed
    capture = completed / total if total else 0
    document_count = len(slots)
    percentage = 80 * capture + (10 * (generated + reviewed) / document_count if document_count else 0)
    return {
        "porcentaje": math.floor(percentage), "porcentaje_captura": math.floor(100 * capture),
        "campos_completados": completed, "campos_totales": total, "documentos_totales": document_count,
        "documentos_listos": ready, "documentos_generados": generated, "documentos_revisados": reviewed,
        "descripcion": PROGRESS_DESCRIPTION,
    }
