"""Completa explícitamente una referencia CAP-14 sin convertir propuestas en hechos."""

import copy
import uuid
from datetime import date

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.documentation_models import ProjectDocumentDraft
from app.models import Entregable, Producto, Proyecto, User
from app.services.cap14_reference_content import (
    ACTIVITIES, BUDGET, CLOSE, EVIDENCE, FINAL, FORMULATION, NOTICE, POSTER,
    PRODUCT_REPORT, PRODUCTS, REPORT, START,
)
from app.services.documentation_catalog import COMMON_FIELDS, DOCUMENT_DEFINITIONS
from app.services.documentation_state import document_slots, generation_pending
from app.services.documentation_validation import validate_fields

MARKER = "cap14_completion_v1"
PERIODS = (("2026-05-29", "2026-07-28"), ("2026-07-29", "2026-09-28"), ("2026-09-29", "2026-11-28"))


def _complete_common(common):
    values = copy.deepcopy(common)
    values.update(fecha_inicio="2026-05-29", fecha_fin="2026-11-28", regional="Santander",
                  centro="Centro de Gestión Agroempresarial del Oriente (CGAO) - Subsede Vélez", ciudad="Vélez",
                  presupuesto=BUDGET, cronograma=[{key: row[key] for key in ("fase", "actividad", "encargado", "fecha_textual", "resultado")} for row in ACTIVITIES])
    values["inconsistencias_fuente"] = NOTICE
    for member in values.get("equipo", []):
        if member.get("programa") == "Todos":
            member["programa"] = "Equipo de investigación CGAO; vinculación formativa por confirmar"
    return validate_fields(values, COMMON_FIELDS)


def _complete_drafts(project, db, actor):
    templates = {"formulacion_proyecto": FORMULATION, "presentacion_proyecto": FORMULATION,
                 "acta_inicio": START, "acta_cierre": CLOSE, "informe_final": FINAL,
                 "registro_evidencias": EVIDENCE, "producto_resultado": PRODUCT_REPORT, "poster_producto": POSTER}
    drafts = {row.clave: row for row in project.borradores_documentales}
    for slot in document_slots(project):
        data = copy.deepcopy(REPORT if slot["tipo"] == "informe_bimensual" else templates[slot["tipo"]])
        if slot["periodo_bimestre"]:
            data["periodo_desde"], data["periodo_hasta"] = PERIODS[slot["periodo_bimestre"] - 1]
            data["antecedentes"] += f" Período propuesto {slot['periodo_bimestre']}: {data['periodo_desde']} a {data['periodo_hasta']}."
        data = validate_fields(data, DOCUMENT_DEFINITIONS[slot["tipo"]]["fields"])
        pending = generation_pending(project, slot, project.documentacion.datos, data)
        if pending:
            raise HTTPException(422, "El escenario no cumple el contrato documental: " + "; ".join(item["mensaje"] for item in pending))
        draft = drafts.get(slot["clave"])
        if draft is None:
            draft = ProjectDocumentDraft(proyecto_id=project.id, clave=slot["clave"], tipo=slot["tipo"],
                                         producto_id=slot["producto_id"], periodo_bimestre=slot["periodo_bimestre"], revision=0, updated_by=actor.id)
            db.add(draft)
        draft.datos, draft.revision, draft.updated_by = data, (draft.revision or 0) + 1, actor.id


def complete_cap14_reference(db, user, project_id):
    """Aplica el escenario una vez, en una transacción, únicamente a CAP-14 privado."""
    try:
        actor = db.get(User, user.id)
        if not actor or not actor.is_active or actor.rol != "admin":
            raise HTTPException(403, "Solo un administrador activo puede completar esta referencia de validación.")
        identifier = uuid.UUID(str(project_id)) if db.get_bind().dialect.name == "postgresql" else str(project_id)
        project = db.query(Proyecto).filter_by(id=identifier).with_for_update().one_or_none()
        if not project:
            raise HTTPException(404, "No se encontró la referencia CAP-14.")
        row = project.documentacion
        if project.estado != "Referencia" or project.is_publico or not row or not row.fuente_snapshot or row.datos.get("codigo_cap") != "CAP-14-2026":
            raise HTTPException(422, "La compleción solo admite la referencia privada CAP-14 con su fuente preservada.")
        if any(item.get("campo") == MARKER for item in project.modificaciones_log or []):
            return {"proyecto_id": str(project.id), "actualizado": False}
        previous = {"comunes": copy.deepcopy(row.datos), "borradores": {draft.clave: copy.deepcopy(draft.datos) for draft in project.borradores_documentales}}
        row.datos, row.revision, row.updated_by = _complete_common(row.datos), row.revision + 1, actor.id
        project.vigencia, project.año, project.año_fin = 6, 2026, 2026
        for item in PRODUCTS:
            product_id = uuid.uuid5(uuid.NAMESPACE_URL, f"sennova/{project.id}/{item['nombre']}")
            if db.get_bind().dialect.name != "postgresql":
                product_id = str(product_id)
            product = db.get(Producto, product_id)
            if not product:
                project.productos.append(Producto(id=product_id, proyecto_id=project.id, owner_id=actor.id, is_verificado=False, **item))
        for item in ACTIVITIES:
            deliverable_id = uuid.uuid5(uuid.NAMESPACE_URL, f"sennova/{project.id}/{item['resultado']}")
            if db.get_bind().dialect.name != "postgresql":
                deliverable_id = str(deliverable_id)
            if not db.get(Entregable, deliverable_id):
                db.add(Entregable(id=deliverable_id, proyecto_id=project.id, fase=item["fase"], titulo=item["resultado"],
                                 descripcion=item["actividad"], fecha_entrega=date.fromisoformat(item["fecha"]), estado="pendiente",
                                 observaciones="Planeación propuesta para validar el recorrido. Responsable previsto: " + item["encargado"]))
        db.flush()
        _complete_drafts(project, db, actor)
        project.modificaciones_log = [*(project.modificaciones_log or []), {"campo": MARKER, "autor": str(actor.id), "fecha": "2026-10-05", "descripcion": NOTICE, "antes": previous}]
        db.commit()
        return {"proyecto_id": str(project.id), "actualizado": True}
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(500, "No se pudo completar la referencia; se revirtieron todos los cambios.") from error
    except Exception:
        db.rollback()
        raise
