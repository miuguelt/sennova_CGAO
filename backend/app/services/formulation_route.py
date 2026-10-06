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
    {"id": "identificacion", "titulo": "Identificación del proyecto", "fuente": "proyecto",
     "campos": ["nombre", "vigencia", "presupuesto_total"],
     "bloques": [
         {"id": "datos-basicos", "titulo": "Datos básicos", "descripcion": "Registra el nombre y la duración confirmada del proyecto.", "campos": ["nombre", "vigencia"]},
         {"id": "presupuesto-total", "titulo": "Presupuesto total", "descripcion": "Usa el valor respaldado por la fuente del proyecto; después lo contrastarás con el desglose.", "campos": ["presupuesto_total"]},
     ],
     "proposito": "Identifica el proyecto y sus datos de referencia antes de construir el contenido."},
    {"id": "institucional", "titulo": "Datos institucionales y equipo", "fuente": "comunes",
     "campos": ["codigo_cap", "centro", "regional", "ciudad", "responsable", "fecha_inicio", "fecha_fin", "equipo",
                "nivel_formacion", "programa_formacion", "competencia", "resultados_aprendizaje",
                "fase_proyecto_formativo", "categoria_proyecto", "area_investigacion"],
     "bloques": [
         {"id": "institucion-periodo", "titulo": "Centro y periodo", "descripcion": "Ubica la institución, el territorio y las fechas confirmadas del proyecto.", "campos": ["codigo_cap", "centro", "regional", "ciudad", "responsable", "fecha_inicio", "fecha_fin"]},
         {"id": "equipo", "titulo": "Personas y responsabilidades", "descripcion": "Relaciona a cada integrante con el rol y las actividades que tiene asignadas.", "campos": ["equipo"]},
         {"id": "formacion-convocatoria", "titulo": "Datos de formación y convocatoria (cuando apliquen)", "descripcion": "Completa estos datos solo si el proyecto o la convocatoria los solicita y puedes confirmarlos en una fuente institucional.", "campos": ["nivel_formacion", "programa_formacion", "competencia", "resultados_aprendizaje", "fase_proyecto_formativo", "categoria_proyecto", "area_investigacion"]},
     ],
     "proposito": "Completa la información general, las personas responsables y, cuando corresponda, los datos formativos o de convocatoria de la ficha inicial."},
    {"id": "problema", "titulo": "Introducción, problema y justificación", "fuente": "formulacion",
     "campos": ["introduccion", "contexto", "planteamiento_problema", "justificacion"],
     "bloques": [
         {"id": "introduccion-contexto", "titulo": "Introducción y contexto", "descripcion": "Presenta el tema, la necesidad y el entorno donde ocurre.", "campos": ["introduccion", "contexto"]},
         {"id": "problema-justificacion", "titulo": "Problema y justificación", "descripcion": "Delimita la situación que se atenderá y explica por qué vale la pena abordarla.", "campos": ["planteamiento_problema", "justificacion"]},
     ],
     "proposito": "Construye primero el diagnóstico: el ejemplo CAP-14 presenta la introducción, el problema y la justificación antes de los objetivos."},
    {"id": "objetivos", "titulo": "Objetivos del proyecto", "fuente": "proyecto",
     "campos": ["objetivo_general", "objetivos_especificos"],
     "bloques": [
         {"id": "objetivo-general", "titulo": "Objetivo general", "descripcion": "Resume el resultado principal y el alcance que busca el proyecto.", "campos": ["objetivo_general"]},
         {"id": "objetivos-especificos", "titulo": "Objetivos específicos", "descripcion": "Desglosa resultados parciales que contribuyen al objetivo general.", "campos": ["objetivos_especificos"]},
     ],
     "proposito": "Convierte la necesidad descrita en un resultado principal y en objetivos parciales relacionados."},
    {"id": "marco", "titulo": "Referentes teóricos y normativos", "fuente": "formulacion",
     "campos": ["referente_teorico", "marco_normativo"],
     "bloques": [
         {"id": "referentes", "titulo": "Referente teórico", "descripcion": "Conecta conceptos y antecedentes consultados con el problema y la solución propuesta.", "campos": ["referente_teorico"]},
         {"id": "normativa", "titulo": "Marco normativo", "descripcion": "Registra normas o lineamientos solo cuando hayas confirmado su pertinencia y vigencia.", "campos": ["marco_normativo"]},
     ],
     "proposito": "Sustenta las ideas del proyecto con referentes y fuentes verificables."},
    {"id": "metodologia", "titulo": "Metodología", "fuente": "formulacion",
     "campos": ["metodologia", "poblacion_muestra", "tecnicas_recoleccion", "fases"],
     "bloques": [
         {"id": "diseno", "titulo": "Diseño del trabajo", "descripcion": "Explica el enfoque, el grupo o las unidades de análisis y las técnicas previstas.", "campos": ["metodologia", "poblacion_muestra", "tecnicas_recoleccion"]},
         {"id": "fases", "titulo": "Fases del proyecto", "descripcion": "Ordena el trabajo en etapas y conecta cada una con los objetivos.", "campos": ["fases"]},
     ],
     "proposito": "Describe cómo se desarrollará el proyecto y cómo se comprobará cada resultado."},
    {"id": "resultados", "titulo": "Resultados e impactos esperados", "fuente": "formulacion",
     "campos": ["resultados_esperados", "impactos", "conclusiones"],
     "bloques": [
         {"id": "resultados-esperados", "titulo": "Resultados esperados", "descripcion": "Describe productos o cambios previstos, con indicadores, metas y medios de verificación cuando estén definidos.", "campos": ["resultados_esperados"]},
         {"id": "impactos-coherencia", "titulo": "Impactos y coherencia del proyecto", "descripcion": "Distingue los impactos que se esperan de los resultados que ya se han comprobado.", "campos": ["impactos", "conclusiones"]},
     ],
     "proposito": "Formula los resultados esperados después de definir el método, sin presentarlos como logros ya alcanzados."},
    {"id": "recursos", "titulo": "Presupuesto y cronograma", "fuente": "comunes", "campos": ["presupuesto", "cronograma"],
     "bloques": [
         {"id": "presupuesto", "titulo": "Desglose presupuestal", "descripcion": "Relaciona rubros, valores y usos con el presupuesto total confirmado.", "campos": ["presupuesto"]},
         {"id": "cronograma", "titulo": "Actividades y entregables", "descripcion": "Ordena actividades por periodo y asigna responsables y resultados verificables.", "campos": ["cronograma"]},
     ],
     "proposito": "Conecta recursos, actividades y tiempos; en el ejemplo CAP-14, el cronograma aparece después de los resultados esperados."},
    {"id": "referencias", "titulo": "Referencias", "fuente": "formulacion", "campos": ["referencias"],
     "bloques": [
         {"id": "fuentes", "titulo": "Fuentes consultadas", "descripcion": "Incluye las referencias de las fuentes citadas en el proyecto.", "campos": ["referencias"]},
     ],
     "proposito": "Cierra la formulación con la lista de fuentes que sustentan sus apartados."},
    {"id": "generar", "titulo": "Revisar y generar documentos", "fuente": "generacion", "campos": [],
     "proposito": "Revisa los campos pendientes y genera borradores en Word y PowerPoint para contrastarlos con el formato que corresponda."},
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
    return [f"Completa {field['label'].lower()}." for field in PROJECT_FIELDS
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
        return ["Revisa los valores planeados del presupuesto; hay montos no numéricos."]
    if total != Decimal(str(project.presupuesto_total)):
        expected = Decimal(str(project.presupuesto_total))
        return [f"El desglose suma {_cop(total)} y el presupuesto total es {_cop(expected)}. Ajusta los valores para que coincidan."]
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
                pending = ["Genera la formulación del proyecto con los datos actuales."]
            else:
                pending = ["Completa los pasos anteriores para habilitar la generación de documentos."]
        steps.append(dict(definition, numero=number, completo=not pending, faltantes=pending, advertencias=warnings))
    done = sum(step["completo"] for step in steps)
    following = next((step["id"] for step in steps if not step["completo"]), None)
    return {
        "pasos": steps, "completados": done, "total": len(steps),
        "porcentaje": round(done / len(steps) * 100, 1), "siguiente_paso": following,
        "campos_proyecto": list(PROJECT_FIELDS), "valores_proyecto": values,
        "documento_clave": FORMULATION_KEY, "formato_cargado": uploaded_source,
    }
