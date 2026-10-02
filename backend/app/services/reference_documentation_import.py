"""Importación explícita de la referencia local, sin poblar plantillas globales."""

import copy
import hashlib
import json
import re
import uuid
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.documentation_models import ProjectDocumentation, ProjectDocumentDraft
from app.models import Proyecto, User
from app.services.documentation_catalog import COMMON_FIELDS, DOCUMENT_DEFINITIONS
from app.services.documentation_validation import validate_fields

SOURCE_DIRECTORY = "docs/CAP-05-2026_FortalecimeintoArchivo"
ADDITIONAL_SOURCE_DIRECTORY = "docs/CAP-14-2026 Sistemade Información Investigación"
SUPPORTED_SOURCE_DIRECTORIES = {SOURCE_DIRECTORY, ADDITIONAL_SOURCE_DIRECTORY}
PERIOD_WARNING = (
    "El informe se guarda temporalmente en el bimestre 1. "
    "La fuente no confirma su número formal ni sus fechas; complete el período "
    "y concilie las inconsistencias antes de generar o revisar una versión."
)


class ReferenceImportError(RuntimeError):
    """La referencia no se puede importar con las garantías requeridas."""


def _text(value):
    """Conserva párrafos y listas narrativas sin agregar hechos."""
    if isinstance(value, list):
        return "\n".join(item for item in value if isinstance(item, str))
    return value if isinstance(value, str) else ""


def _date(value):
    """Adapta fechas completas de la fuente; una fecha parcial queda pendiente."""
    if not isinstance(value, str) or not value.strip():
        return ""
    for pattern in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(value.strip(), pattern).date().isoformat()
        except ValueError:
            continue
    return ""


def _amount(value):
    """Convierte únicamente cantidades monetarias explícitas de la fuente."""
    if value is None or value == "" or isinstance(value, bool):
        return ""
    normalized = str(value).strip().replace("$", "").replace(" ", "")
    if re.fullmatch(r"\d{1,3}(?:\.\d{3})+(?:,\d+)?", normalized):
        normalized = normalized.replace(".", "").replace(",", ".")
    try:
        amount = Decimal(normalized)
        return format(amount, "f") if amount.is_finite() and amount >= 0 else ""
    except InvalidOperation:
        return ""


def _blank_fields(fields):
    return {field["key"]: [] if field["type"] == "rows" else "" for field in fields}


def _mapped_rows(source, field, mapping):
    """Mantiene filas y celdas vacías con los nombres del catálogo vigente."""
    if not isinstance(source, list):
        return []
    result = []
    for row in source:
        if not isinstance(row, dict):
            raise ReferenceImportError("Las filas de la referencia deben ser objetos con campos identificados.")
        target = _blank_fields(field["columns"])
        for destination, original in mapping.items():
            definition = next(item for item in field["columns"] if item["key"] == destination)
            value = row.get(original)
            target[destination] = _amount(value) if definition["type"] == "number" else _text(value)
        result.append(target)
    return result


def _reference_identity(payload):
    source_directory = payload.get("source_directory") if isinstance(payload, dict) else None
    if source_directory not in SUPPORTED_SOURCE_DIRECTORIES:
        raise ReferenceImportError("La importación sólo admite las dos referencias locales de proyectos indicadas.")
    sources = payload.get("source_blocks")
    if not isinstance(sources, list) or not sources:
        raise ReferenceImportError("La referencia debe conservar sus archivos fuente y sus hashes SHA-256.")
    identities = []
    for source in sources:
        if not isinstance(source, dict):
            raise ReferenceImportError("Cada archivo fuente debe tener ruta y hash SHA-256.")
        path, digest = source.get("path"), source.get("sha256")
        if not isinstance(path, str) or not path.startswith(source_directory + "/") or ".." in path.split("/"):
            raise ReferenceImportError("La ruta de un archivo fuente no corresponde a la referencia indicada.")
        if not isinstance(digest, str) or not re.fullmatch(r"[a-fA-F0-9]{64}", digest):
            raise ReferenceImportError("Un archivo fuente no tiene un hash SHA-256 válido.")
        identities.append((path, digest.lower()))
    if len({path for path, _ in identities}) != len(identities):
        raise ReferenceImportError("La referencia repite una ruta de archivo fuente.")
    source_hash = hashlib.sha256(json.dumps(sorted(identities), ensure_ascii=False).encode()).hexdigest()
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "sennova/reference-documentation/" + source_hash))


def _build_form_data(examples, warnings):
    start = examples["acta_inicio"]
    common = _blank_fields(COMMON_FIELDS)
    for key in ("codigo_cap", "centro", "regional", "ciudad", "responsable"):
        common[key] = _text(start.get(key))
    common["fecha_inicio"] = _date(start.get("fecha_inicio_textual"))
    common["fecha_fin"] = _date(start.get("fecha_fin_textual"))
    common["inconsistencias_fuente"] = "\n".join(warnings)
    for key, original, mapping in (
        ("equipo", "equipo", {"nombre": "nombre", "rol": "rol", "actividades": "actividades_a_liderar", "programa": "programa"}),
        ("presupuesto", "presupuesto", {"rubro": "rubro", "valor_planeado": "valor_planeado_textual", "uso": "descripcion_uso", "fecha_ejecucion": "fecha_ejecucion_textual"}),
        ("cronograma", "actividades", {"actividad": "actividad", "encargado": "encargado", "fecha_textual": "fecha_textual"}),
    ):
        field = next(item for item in COMMON_FIELDS if item["key"] == key)
        common[key] = _mapped_rows(start.get(original), field, mapping)

    drafts = {}
    presentation = examples.get("presentacion_proyecto")
    if isinstance(presentation, dict):
        data = _blank_fields(DOCUMENT_DEFINITIONS["formulacion_proyecto"]["fields"])
        for key, original in {
            "introduccion": "introduccion", "contexto": "contexto_problema",
            "planteamiento_problema": "problema_investigacion", "justificacion": "justificacion",
            "referente_teorico": "referente_teorico", "marco_normativo": "marco_normativo",
            "metodologia": "metodologia_poblacion_muestra", "poblacion_muestra": "metodologia_poblacion_muestra",
            "tecnicas_recoleccion": "tecnicas_recoleccion", "fases": "fases_cronograma",
            "conclusiones": "conclusiones", "referencias": "referencias",
        }.items():
            data[key] = _text(presentation.get(original))
        impacts = presentation.get("impactos_texto_en_imagen", {})
        data["impactos"] = "\n".join(f"{key}: {_text(value)}" for key, value in impacts.items()) if isinstance(impacts, dict) else ""
        data["resultados_esperados"] = [dict(resultado=item, indicador="", meta="", unidad="", medio_verificacion="")
                                        for item in presentation.get("resultados_esperados", []) if isinstance(item, str)]
        drafts["formulacion_proyecto"] = ("formulacion_proyecto", None, data)
        drafts["presentacion_proyecto"] = ("presentacion_proyecto", None, copy.deepcopy(data))

    for kind, source_key in (("acta_inicio", "acta_inicio"), ("acta_cierre", "acta_cierre"),
                             ("informe_bimensual", "informe_bimensual"), ("poster_producto", "poster")):
        source = examples.get(source_key)
        if not isinstance(source, dict):
            continue
        definition = DOCUMENT_DEFINITIONS[kind]
        data = _blank_fields(definition["fields"])
        if kind in {"acta_inicio", "acta_cierre"}:
            data["fecha_reunion"] = _date(source.get("fecha_reunion_textual") or source.get("fecha_reunion_iso"))
            for key, original in {"hora_inicio": "hora_inicio", "hora_fin": "hora_fin", "lugar": "lugar",
                                  "temas": "temas", "objetivo_reunion": "objetivos_reunion",
                                  "observaciones": "observaciones_conclusiones"}.items():
                data[key] = _text(source.get(original))
            for key, mapping in (("asistentes", {"nombre": "nombre", "cargo_dependencia_entidad": "cargo_dependencia_entidad"}),
                                 ("invitados", {"nombre": "nombre", "cargo": "cargo", "entidad": "entidad"})):
                data[key] = _mapped_rows(source.get(key), next(field for field in definition["fields"] if field["key"] == key), mapping)
        if kind == "acta_inicio":
            data["alcance_sector_productivo"] = _text(source.get("alcance_sector_productivo"))
            data["alcance_formacion"] = _text(source.get("alcance_academia_formacion"))
        elif kind == "acta_cierre":
            data["tipo_cierre"] = "parcial"
            for key in ("fortalezas", "dificultades", "acciones_futuras", "lecciones_aprendidas"):
                data[key] = _text(source.get(key))
            data["evaluacion_actividades"] = _mapped_rows(source.get("evaluacion_actividades"), next(field for field in definition["fields"] if field["key"] == "evaluacion_actividades"), {"actividad_etapa": "actividad_etapa", "entregable": "entregable", "observacion": "observacion"})
            data["balance"] = _mapped_rows(source.get("balance_presupuestal"), next(field for field in definition["fields"] if field["key"] == "balance"), {"rubro": "rubro", "valor_planeado": "valor_planeado_textual", "valor_real": "valor_real_textual", "observacion": "valor_real_textual"})
            data["listado_activos"] = [dict(activo=item, estado="", custodio="", soporte="") for item in source.get("listado_activos", []) if isinstance(item, str)]
        elif kind == "informe_bimensual":
            for key in ("antecedentes", "metodologia", "discusion", "fortalezas", "dificultades", "acciones_futuras", "lecciones_aprendidas", "referencias"):
                data[key] = _text(source.get(key))
            data["conclusiones"] = _text(source.get("conclusion"))
            data["resultados"] = _mapped_rows(source.get("tabla_avances"), next(field for field in definition["fields"] if field["key"] == "resultados"), {"entidad": "entidad", "actividades_ejecutadas": "actividades_ejecutadas", "resultados_alcanzados": "resultados_alcanzados", "evidencia": "evidencia"})
        else:
            for key in ("introduccion", "planteamiento_problema", "justificacion", "referente_teorico", "metodologia", "bibliografia"):
                data[key] = _text(source.get(key))
            data["avances"] = _text(source.get("avances_confirmados"))
            data["links_acceso"] = _text(source.get("links_acceso_confirmados"))
        key = "informe_bimensual__b1" if kind == "informe_bimensual" else kind
        drafts[key] = (kind, 1 if kind == "informe_bimensual" else None, data)
    return validate_fields(common, COMMON_FIELDS), drafts


def import_reference_data(db, user, payload):
    """Crea una referencia privada una sola vez y preserva ediciones posteriores."""
    try:
        actor = db.get(User, user.id)
        if actor is None or not actor.is_active or actor.rol not in {"admin", "investigador"}:
            raise ReferenceImportError("El usuario no tiene permiso para importar una referencia de validación.")
        identifier = _reference_identity(payload)
        if db.get_bind().dialect.name == "postgresql":
            db.execute(text("SELECT pg_advisory_xact_lock(:reference_lock)"), {"reference_lock": int(uuid.UUID(identifier)) % (2**63)})
        examples = payload.get("examples")
        start = examples.get("acta_inicio") if isinstance(examples, dict) else None
        if not isinstance(start, dict) or not _text(start.get("nombre_proyecto")).strip():
            raise ReferenceImportError("El acta de inicio debe aportar el nombre literal del proyecto.")
        warnings = [_text(item.get("description")) for item in payload.get("observations", []) if isinstance(item, dict) and _text(item.get("description"))]
        warnings.append("La referencia no aporta un código SGPS confirmado. El código CAP se conserva en su campo y no se usa como SGPS.")
        if isinstance(examples.get("informe_bimensual"), dict):
            warnings.append(PERIOD_WARNING)
        project = db.get(Proyecto, identifier)
        if project is not None:
            if str(project.owner_id) != str(actor.id) and actor.rol != "admin":
                raise ReferenceImportError("El usuario no tiene permiso para consultar esta referencia privada.")
            db.commit()
            return {"proyecto_id": str(project.id), "creado": False, "advertencias": warnings}
        common, drafts = _build_form_data(examples, warnings)
        presentation = examples.get("presentacion_proyecto")
        presentation = presentation if isinstance(presentation, dict) else {}
        general_objective = _text(presentation.get("objetivo_general"))
        if not general_objective.strip():
            general_objective = _text(start.get("objetivo_general"))
        specific_objectives = presentation.get("objetivos_especificos")
        specific_objectives = [item for item in specific_objectives if isinstance(item, str) and item.strip()] if isinstance(specific_objectives, list) else []
        total = _amount(start.get("valor_total_cop"))
        duration = start.get("duracion_meses_declarada")
        project = Proyecto(
            id=identifier, nombre=_text(start["nombre_proyecto"]) + " (referencia de validación)",
            codigo_sgps=None, estado="Referencia", is_publico=False,
            owner_id=actor.id, objetivo_general=general_objective or None,
            objetivos_especificos=specific_objectives, presupuesto_total=float(total) if total else None,
            vigencia=duration if isinstance(duration, int) and not isinstance(duration, bool) and duration > 0 else None,
            año=date.fromisoformat(common["fecha_inicio"]).year if common["fecha_inicio"] else None,
            año_fin=date.fromisoformat(common["fecha_fin"]).year if common["fecha_fin"] else None,
        )
        db.add(project)
        db.flush()
        db.add(ProjectDocumentation(proyecto_id=project.id, revision=0, datos=common,
                                    fuente_snapshot=copy.deepcopy(payload), updated_by=actor.id))
        for key, (kind, period, data) in drafts.items():
            db.add(ProjectDocumentDraft(proyecto_id=project.id, clave=key, tipo=kind, periodo_bimestre=period,
                                        producto_id=None, revision=0, updated_by=actor.id,
                                        datos=validate_fields(data, DOCUMENT_DEFINITIONS[kind]["fields"])))
        db.commit()
        return {"proyecto_id": str(project.id), "creado": True, "advertencias": warnings}
    except ReferenceImportError:
        db.rollback()
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise ReferenceImportError("No se pudo guardar la referencia. La transacción se revirtió; revise la base de datos antes de reintentar.") from error
    except Exception:
        db.rollback()
        raise
