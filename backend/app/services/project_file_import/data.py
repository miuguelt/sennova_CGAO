"""Registra propuestas en campos vacíos sin reemplazar decisiones previas."""

from fastapi import HTTPException

from app.documentation_models import ProjectDocumentation, ProjectDocumentDraft
from app.services.documentation_catalog import COMMON_FIELDS, DOCUMENT_DEFINITIONS
from app.services.documentation_state import document_slots
from app.services.documentation_validation import validate_fields

EMPTY = (None, "", [])


def merge_empty(current, incoming, source, warnings):
    merged = dict(current or {})
    count = 0
    for key, value in incoming.items():
        if value in EMPTY:
            continue
        if merged.get(key) in EMPTY:
            merged[key] = value
            count += 1
        elif merged[key] != value:
            warnings.append(f"{source}: se conservó el valor registrado de {key}; revise la diferencia con el archivo.")
    return merged, count


def merge_form(row, incoming, fields, source, warnings, user):
    merged, count = merge_empty(row.datos, incoming, source, warnings)
    if not count:
        return 0
    try:
        normalized = validate_fields(merged, fields)
    except HTTPException:
        warnings.append(f"{source}: los datos propuestos no son compatibles con el formulario actual; revise el archivo y complete los campos manualmente.")
        return 0
    row.datos = normalized
    row.revision = (row.revision or 0) + 1
    row.updated_by = user.id
    return count


def apply_detected_data(project, db, user, entry, period, warnings):
    proposal = entry["propuesta"]
    source = entry["ruta"]
    count = 0
    for key in ("nombre", "codigo_sgps", "objetivo_general", "objetivos_especificos", "descripcion", "vigencia", "presupuesto_total"):
        value = proposal.get("proyecto", {}).get(key)
        if key == "objetivos_especificos" and isinstance(value, str):
            value = [line.strip() for line in value.splitlines() if line.strip()]
        if value in EMPTY:
            continue
        if key == "presupuesto_total":
            value = float(value)
        merged, added = merge_empty({key: getattr(project, key)}, {key: value}, source, warnings)
        if added:
            setattr(project, key, merged[key])
            count += added
    common = proposal.get("comunes", {})
    if common:
        row = db.query(ProjectDocumentation).filter_by(proyecto_id=project.id).first()
        if row is None:
            row = ProjectDocumentation(proyecto_id=project.id, revision=0, datos={}, updated_by=user.id)
            db.add(row)
        count += merge_form(row, common, COMMON_FIELDS, source, warnings, user)
    data = proposal.get("borrador", {})
    if not data:
        return count
    slot = next((slot for slot in document_slots(project) if slot["tipo"] == entry["tipo"]
                 and slot["periodo_bimestre"] == period and slot["producto_id"] is None), None)
    if slot is None:
        warnings.append(f"{source}: el contenido se conserva como fuente; seleccione el producto o configure la duración antes de completar su formulario.")
        return count
    row = db.query(ProjectDocumentDraft).filter_by(proyecto_id=project.id, clave=slot["clave"]).first()
    if row is None:
        row = ProjectDocumentDraft(proyecto_id=project.id, clave=slot["clave"], tipo=entry["tipo"],
                                   periodo_bimestre=period, revision=0, datos={}, updated_by=user.id)
        db.add(row)
    return count + merge_form(row, data, DOCUMENT_DEFINITIONS[entry["tipo"]]["fields"], source, warnings, user)
