"""Estado del editor desde el proyecto, sus campos y sus versiones persistidas."""

import math
from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

from fastapi import HTTPException

from app.documentation_models import ProjectDocumentation, ProjectDocumentDraft
from app.services.documentation_catalog import COMMON_FIELDS, DOCUMENT_DEFINITIONS
from app.services.documentation_validation import missing_fields, validate_fields
from app.services.project_evidence_service import document_bytes
from app.services.project_general_data import general_project_data


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


def consistency_issues(context, common, *, include_source=True):
    from app.services.source_resolution import source_is_resolved

    issues = []
    if include_source and common.get("inconsistencias_fuente") and not source_is_resolved(common):
        issues.append("Concilie las inconsistencias de los documentos de referencia antes de marcar una versión como revisada.")
    budget = common.get("presupuesto", [])
    if budget and context.get("presupuesto_total") is not None:
        try:
            total = sum(Decimal(str(row.get("valor_planeado") or 0)) for row in budget)
            if total != Decimal(str(context["presupuesto_total"])):
                issues.append("El desglose del presupuesto no coincide con el presupuesto total del proyecto.")
        except (InvalidOperation, TypeError, ValueError, AttributeError):
            issues.append("El presupuesto contiene valores que no se pueden verificar. Corrige los rubros antes de generar o revisar documentos.")
    return issues


def _month_offset(start, months):
    """Avanza meses calendario y conserva el día cuando existe en el mes destino."""
    month_index = start.year * 12 + start.month - 1 + months
    year, month = divmod(month_index, 12)
    return date(year, month + 1, min(start.day, monthrange(year, month + 1)[1]))


def _period_pending(slot, common, data):
    """Impide atribuir resultados a otro bimestre o cerrar períodos fuera del plan."""
    pending = []
    if slot["tipo"] not in {"informe_bimensual", "acta_cierre"}:
        return pending
    if not all(common.get(key) for key in ("fecha_inicio", "fecha_fin")):
        return pending
    start, end = date.fromisoformat(common["fecha_inicio"]), date.fromisoformat(common["fecha_fin"])
    period = slot.get("periodo_bimestre")
    if slot["tipo"] == "informe_bimensual" and period:
        minimum = _month_offset(start, 2 * (period - 1))
        maximum = min(_month_offset(start, 2 * period) - timedelta(days=1), end)
    else:
        minimum, maximum = start, end
    for key in ("periodo_desde", "periodo_hasta"):
        if data.get(key) and not minimum <= date.fromisoformat(data[key]) <= maximum:
            pending.append({"campo": key, "mensaje": f"El período debe estar entre {minimum.isoformat()} y {maximum.isoformat()} para este documento."})
    if slot["tipo"] == "acta_cierre":
        if data.get("tipo_cierre") == "final":
            for key, expected in (("periodo_desde", start), ("periodo_hasta", end)):
                if data.get(key) and date.fromisoformat(data[key]) != expected:
                    pending.append({"campo": key, "mensaje": "El cierre final debe abarcar todo el período del proyecto. Selecciona cierre parcial si solo documentas un período."})
        if data.get("fecha_reunion") and data.get("periodo_hasta") and data["fecha_reunion"] < data["periodo_hasta"]:
            pending.append({"campo": "fecha_reunion", "mensaje": "La reunión de cierre debe ocurrir al terminar el período que se cierra o después."})
    return pending


def _closure_balance_pending(context, data):
    """Conserva montos pendientes explícitos y concilia la planeación del cierre final."""
    pending = []
    rows = data.get("balance", [])
    for index, row in enumerate(rows):
        if row.get("valor_real") in (None, "") and not row.get("observacion"):
            pending.append({"campo": f"balance.{index}.valor_real", "mensaje": "Registra el valor real del rubro o explica qué monto falta por confirmar en la observación."})
    if data.get("tipo_cierre") == "final" and rows and context.get("presupuesto_total") is not None:
        total = sum(Decimal(str(row.get("valor_planeado") or 0)) for row in rows)
        if total != Decimal(str(context["presupuesto_total"])):
            pending.append({"campo": "balance", "mensaje": "El valor planeado del balance de cierre final debe coincidir con el presupuesto total del proyecto."})
    return pending


def generation_pending(project, slot, common, data):
    definition = DOCUMENT_DEFINITIONS[slot["tipo"]]
    required_common = set(definition.get("required_common", []))
    fields = [dict(field, required=field["key"] in required_common) for field in COMMON_FIELDS]
    try:
        common = validate_fields(common, fields)
        data = validate_fields(data, definition["fields"])
    except HTTPException as error:
        return [{"campo": "formulario", "mensaje": str(error.detail)}]
    pending = missing_fields(common, fields, prefix="comunes.") + missing_fields(data, definition["fields"])
    context = {"presupuesto_total": getattr(project, "presupuesto_total", None)}
    pending.extend({"campo": "comunes.presupuesto", "mensaje": issue} for issue in consistency_issues(context, common, include_source=False))
    pending.extend(_period_pending(slot, common, data))
    if slot["tipo"] == "acta_cierre":
        pending.extend(_closure_balance_pending(context, data))
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
    return {"contexto": project_context(project, slot), "comunes": common, "datos": data, "plantilla_version": 2}


def version_is_current(version, snapshot, common_revision, draft_revision):
    return version.revision_comunes == common_revision and version.revision_borrador == draft_revision and version.snapshot == snapshot


def documentation_view(project, db):
    from app.services.documentation_progress import documentation_progress

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
    from app.models import Documento
    from app.services.formulation_route import FORMULATION_KEY, formulation_route
    from app.services.formulation_coherence import coherence_review, relation_options
    uploaded = next((doc for doc in db.query(Documento).filter_by(entidad_tipo="proyecto", entidad_id=str(project.id), tipo=FORMULATION_KEY)
                     .order_by(Documento.created_at.desc()).all() if doc.version_generada is None), None)
    uploaded_source = {"documento_id": str(uploaded.id), "nombre_archivo": uploaded.nombre_archivo} if uploaded else None
    formulation_slot = next((item for item in documents if item["clave"] == FORMULATION_KEY), None)
    coherence = coherence_review(project, common, (formulation_slot or {}).get("datos") or {})
    return {"proyecto": project_context(project), "revision": common_revision, "comunes": common,
            "datos_iniciales": general_project_data(project),
            "campos_comunes": COMMON_FIELDS, "documentos": documents,
            "avance_documental": documentation_progress(project, common_row=common_row, drafts=drafts),
            "advertencias": consistency_issues(project_context(project), common),
            "revision_coherencia": coherence, "opciones_relaciones": relation_options(project, common),
            "ruta_formulacion": formulation_route(project, common, formulation_slot, uploaded_source, coherence)}
