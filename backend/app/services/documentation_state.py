"""Estado del editor desde el proyecto, sus campos y sus versiones persistidas."""

import math
from decimal import Decimal

from app.documentation_models import ProjectDocumentation, ProjectDocumentDraft
from app.services.documentation_catalog import COMMON_FIELDS, DOCUMENT_DEFINITIONS
from app.services.documentation_validation import missing_fields
from app.services.project_evidence_service import document_bytes


def project_context(project, slot=None):
    context = {
        "id": str(project.id), "nombre": project.nombre, "codigo_sgps": project.codigo_sgps,
        "vigencia": project.vigencia, "presupuesto_total": project.presupuesto_total,
        "descripcion": project.descripcion, "objetivo_general": project.objetivo_general,
        "objetivos_especificos": project.objetivos_especificos or [],
        "grupo": project.grupo.nombre if project.grupo else None,
        "semillero": project.semillero.nombre if project.semillero else None,
        "linea_investigacion": project.linea_investigacion, "tipologia": project.tipologia,
    }
    if slot:
        context["periodo_bimestre"] = slot["periodo_bimestre"]
        product = next((item for item in project.productos if str(item.id) == slot["producto_id"]), None)
        context["producto"] = {"id": str(product.id), "nombre": product.nombre, "tipo": product.tipo, "descripcion": product.descripcion} if product else None
    return context


def document_slots(project):
    slots = []
    for kind, definition in DOCUMENT_DEFINITIONS.items():
        targets = [(None, None)]
        if kind == "informe_bimensual" and project.vigencia and project.vigencia > 0:
            targets = [(period, None) for period in range(1, math.ceil(project.vigencia / 2) + 1)]
        if kind in {"producto_resultado", "poster_producto"} and project.productos:
            targets = [(None, product) for product in project.productos]
        for period, product in targets:
            key = kind + (f"__b{period}" if period else f"__p{product.id}" if product else "")
            title = definition["title"] + (f" · Bimestre {period}" if period else f" · {product.nombre}" if product else "")
            slots.append({"clave": key, "tipo": kind, "titulo": title, "carpeta": definition["folder"], "formato": definition["format"], "periodo_bimestre": period, "producto_id": str(product.id) if product else None})
    return slots


def slot_for_key(project, key):
    from fastapi import HTTPException
    slot = next((item for item in document_slots(project) if item["clave"] == key), None)
    if slot is None:
        raise HTTPException(status_code=404, detail="Formulario no encontrado para este proyecto, bimestre o producto.")
    return slot


def consistency_issues(context, common):
    issues = []
    if common.get("inconsistencias_fuente"):
        issues.append("Concilie las inconsistencias de los documentos de referencia antes de marcar una versión como revisada.")
    budget = common.get("presupuesto", [])
    if budget and context.get("presupuesto_total") is not None:
        total = sum(Decimal(str(row.get("valor_planeado") or 0)) for row in budget)
        if total != Decimal(str(context["presupuesto_total"])):
            issues.append("El desglose del presupuesto no coincide con el presupuesto total del proyecto.")
    return issues


def generation_pending(project, slot, common, data):
    definition = DOCUMENT_DEFINITIONS[slot["tipo"]]
    required_common = set(definition.get("required_common", []))
    fields = [dict(field, required=field["key"] in required_common) for field in COMMON_FIELDS]
    pending = missing_fields(common, fields, prefix="comunes.") + missing_fields(data, definition["fields"])
    if not project.objetivo_general:
        pending.append({"campo": "proyecto.objetivo_general", "mensaje": "Complete el objetivo general en la información del proyecto."})
    if slot["tipo"] in {"formulacion_proyecto", "presentacion_proyecto", "informe_final"} and (
        not project.objetivos_especificos or any(not str(objective or "").strip() for objective in project.objetivos_especificos)
    ):
        pending.append({"campo": "proyecto.objetivos_especificos", "mensaje": "Complete los objetivos específicos en la información del proyecto antes de generar este documento."})
    if slot["tipo"] == "informe_bimensual" and slot["periodo_bimestre"] is None:
        pending.append({"campo": "proyecto.vigencia", "mensaje": "Defina la vigencia en meses en la información del proyecto."})
    if slot["tipo"] in {"producto_resultado", "poster_producto"} and not slot["producto_id"]:
        pending.append({"campo": "proyecto.productos", "mensaje": "Registre el producto que documentará en el módulo de productos."})
    return pending


def current_snapshot(project, slot, common, data):
    return {"contexto": project_context(project, slot), "comunes": common, "datos": data, "plantilla_version": 1}


def version_is_current(version, snapshot, common_revision, draft_revision):
    return version.revision_comunes == common_revision and version.revision_borrador == draft_revision and version.snapshot == snapshot


def documentation_view(project, db):
    common_row = db.query(ProjectDocumentation).filter_by(proyecto_id=project.id).first()
    common, common_revision = (common_row.datos, common_row.revision) if common_row else ({}, 0)
    drafts = {row.clave: row for row in db.query(ProjectDocumentDraft).filter_by(proyecto_id=project.id).all()}
    documents = []
    for slot in document_slots(project):
        draft = drafts.get(slot["clave"])
        data, revision = (draft.datos, draft.revision) if draft else ({}, 0)
        snapshot = current_snapshot(project, slot, common, data)
        history = [{
            "documento_id": str(version.documento_id) if version.documento_id else None,
            "version": version.version, "estado": version.estado,
            "nombre_archivo": version.documento.nombre_archivo if version.documento else None,
            "vigente": version_is_current(version, snapshot, common_revision, revision),
            "disponible": bool(version.documento and document_bytes(version.documento)),
            "created_at": version.created_at.isoformat(), "sha256": version.sha256,
            "observacion_revision": version.observacion_revision,
        } for version in sorted(draft.versiones, key=lambda item: item.version, reverse=True)] if draft else []
        pending = generation_pending(project, slot, common, data)
        documents.append(dict(slot, datos=data, revision=revision, campos=DOCUMENT_DEFINITIONS[slot["tipo"]]["fields"], faltantes=pending, generable=not pending, historial=history))
    return {"proyecto": project_context(project), "revision": common_revision, "comunes": common,
            "campos_comunes": COMMON_FIELDS, "documentos": documents,
            "advertencias": consistency_issues(project_context(project), common)}
