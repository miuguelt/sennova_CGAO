"""Ruta guiada y progresiva para formular un proyecto con los datos persistidos.

El orden de los pasos y su estado se calculan aquí para que la interfaz no
duplique reglas: cada paso indica qué campos usa, qué falta y cuál sigue.
"""

from decimal import Decimal, InvalidOperation

from app.services.documentation_catalog import COMMON_FIELDS, DOCUMENT_DEFINITIONS, _field
from app.services.documentation_validation import missing_fields

FORMULATION_KEY = "formulacion_proyecto"

PROJECT_FIELDS = (
    _field("nombre", "Título del proyecto", help="Escribe el título completo, tal como se presentará en la convocatoria."),
    _field("objetivo_general", "Objetivo general", "textarea",
           help="Inicia con un verbo en infinitivo y expresa qué logrará el proyecto, en qué población o entidad y con qué alcance."),
    _field("objetivos_especificos", "Objetivos específicos", "textarea",
           help="Escribe un objetivo por línea. Cada uno debe iniciar con un verbo en infinitivo y aportar al objetivo general."),
    _field("vigencia", "Duración en meses", "number", min=1, max=60,
           help="Indica la duración planeada. Con este dato se calculan los informes bimensuales requeridos."),
    _field("presupuesto_total", "Presupuesto total (COP)", "number", unit="COP",
           help="Registra el valor total aprobado o solicitado. El desglose del paso de recursos debe sumar este valor."),
)

FORMULATION_STEPS = (
    {"id": "identificacion", "titulo": "Identificación y objetivos", "fuente": "proyecto",
     "campos": ["nombre", "objetivo_general", "objetivos_especificos", "vigencia", "presupuesto_total"],
     "proposito": "Defina qué se va a lograr y en cuánto tiempo. Los objetivos orientan todos los pasos siguientes."},
    {"id": "institucional", "titulo": "Datos institucionales", "fuente": "comunes",
     "campos": ["codigo_cap", "centro", "regional", "ciudad", "responsable", "fecha_inicio", "fecha_fin"],
     "proposito": "Ubique el proyecto en el centro, la regional y el período de ejecución. Estos datos se reutilizan en todos los documentos."},
    {"id": "problema", "titulo": "Problema y justificación", "fuente": "formulacion",
     "campos": ["introduccion", "contexto", "planteamiento_problema", "justificacion"],
     "proposito": "Explique la necesidad que origina el proyecto, dónde ocurre y por qué conviene resolverla."},
    {"id": "marco", "titulo": "Marco teórico y normativo", "fuente": "formulacion",
     "campos": ["referente_teorico", "marco_normativo"],
     "proposito": "Sustente el proyecto con conceptos, autores y normas pertinentes al problema planteado."},
    {"id": "metodologia", "titulo": "Metodología", "fuente": "formulacion",
     "campos": ["metodologia", "poblacion_muestra", "tecnicas_recoleccion", "fases"],
     "proposito": "Describa cómo se alcanzará cada objetivo: enfoque, población, técnicas y fases de trabajo."},
    {"id": "equipo", "titulo": "Equipo del proyecto", "fuente": "comunes", "campos": ["equipo"],
     "proposito": "Registre a las personas vinculadas, su rol y las actividades que liderarán según la metodología."},
    {"id": "recursos", "titulo": "Presupuesto y cronograma", "fuente": "comunes", "campos": ["presupuesto", "cronograma"],
     "proposito": "Asigne recursos y tiempos a las actividades. El desglose debe coincidir con el presupuesto total."},
    {"id": "resultados", "titulo": "Resultados e impactos", "fuente": "formulacion",
     "campos": ["resultados_esperados", "impactos", "conclusiones", "referencias"],
     "proposito": "Relacione los resultados esperados con indicadores y metas, los impactos previstos y las fuentes citadas."},
    {"id": "generar", "titulo": "Revisar y generar documentos", "fuente": "generacion", "campos": [],
     "proposito": "Revise los pendientes y genere la formulación en Word y la presentación en PowerPoint para su revisión."},
)


def _blank(value):
    return value is None or value == "" or value == []


def project_values(project):
    """Valores editables del proyecto en el formato que usa el formulario."""
    return {
        "nombre": project.nombre or "",
        "objetivo_general": project.objetivo_general or "",
        "objetivos_especificos": "\n".join(str(item).strip() for item in (project.objetivos_especificos or []) if str(item).strip()),
        "vigencia": project.vigencia if project.vigencia else "",
        "presupuesto_total": project.presupuesto_total if project.presupuesto_total is not None else "",
    }


def _project_pending(values, keys):
    return [f"Complete {field['label'].lower()}." for field in PROJECT_FIELDS
            if field["key"] in keys and _blank(values.get(field["key"]))]


def _section_pending(fields, data, keys):
    selected = [field for field in fields if field["key"] in keys]
    return [item["mensaje"] for item in missing_fields(data or {}, selected)]


def _budget_warning(project, common):
    rows = (common or {}).get("presupuesto") or []
    if not rows or project.presupuesto_total is None:
        return []
    try:
        total = sum(Decimal(str(row.get("valor_planeado") or 0)) for row in rows)
    except (InvalidOperation, ValueError):
        return ["Revise los valores planeados del presupuesto; hay montos no numéricos."]
    if total != Decimal(str(project.presupuesto_total)):
        expected = Decimal(str(project.presupuesto_total))
        return [f"El desglose suma {_cop(total)} y el presupuesto total es {_cop(expected)}. Ajuste los valores para que coincidan."]
    return []


def _cop(amount):
    return "$ " + f"{amount:,.0f}".replace(",", ".") + " COP"


def formulation_route(project, common, formulation_slot, uploaded_source=None):
    """Calcula el estado de cada paso y el siguiente paso recomendado."""
    required_common = set(DOCUMENT_DEFINITIONS[FORMULATION_KEY]["required_common"])
    common_fields = [dict(field, required=field["key"] in required_common) for field in COMMON_FIELDS]
    formulation_fields = DOCUMENT_DEFINITIONS[FORMULATION_KEY]["fields"]
    data = (formulation_slot or {}).get("datos") or {}
    values = project_values(project)
    steps = []
    for number, definition in enumerate(FORMULATION_STEPS, start=1):
        source = definition["fuente"]
        warnings = []
        if source == "proyecto":
            pending = _project_pending(values, definition["campos"])
        elif source == "comunes":
            pending = _section_pending(common_fields, common, definition["campos"])
            if definition["id"] == "recursos":
                warnings = _budget_warning(project, common)
        elif source == "formulacion":
            pending = _section_pending(formulation_fields, data, definition["campos"])
        else:
            history = (formulation_slot or {}).get("historial") or []
            if any(item.get("vigente") for item in history):
                pending = []
            elif (formulation_slot or {}).get("generable"):
                pending = ["Genere la formulación del proyecto con los datos actuales."]
            else:
                pending = ["Complete los pasos anteriores para habilitar la generación de documentos."]
        steps.append(dict(definition, numero=number, completo=not pending, faltantes=pending, advertencias=warnings))
    done = sum(step["completo"] for step in steps)
    following = next((step["id"] for step in steps if not step["completo"]), None)
    return {
        "pasos": steps, "completados": done, "total": len(steps),
        "porcentaje": round(done / len(steps) * 100, 1), "siguiente_paso": following,
        "campos_proyecto": list(PROJECT_FIELDS), "valores_proyecto": values,
        "documento_clave": FORMULATION_KEY, "formato_cargado": uploaded_source,
    }
