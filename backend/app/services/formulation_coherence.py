"""Orientación sobre relaciones explícitas de planeación, sin aprobar el proyecto."""

from datetime import date


def _text(value):
    return " ".join(str(value or "").split())


def _unique(values):
    options, seen = [], set()
    for value in values:
        text = _text(value)
        if text and text.casefold() not in seen:
            options.append(text)
            seen.add(text.casefold())
    return options


def relation_options(project, common):
    """Ofrece textos existentes sin incorporarlos al contexto de versiones históricas."""
    owner = getattr(project, "owner", None)
    members = [getattr(owner, "nombre", None)]
    members.extend(getattr(member, "nombre", None) for member in (getattr(project, "equipo", None) or []))
    members.extend(row.get("nombre") for row in (common.get("equipo") or []))
    return {
        "objetivos": _unique(getattr(project, "objetivos_especificos", None) or []),
        "integrantes": _unique(members),
        "actividades": _unique(row.get("actividad") for row in (common.get("cronograma") or [])),
    }


def _as_date(value):
    try:
        return date.fromisoformat(value) if value else None
    except (TypeError, ValueError):
        return None


def _relation_issues(value, options, field, step, label):
    text = _text(value)
    if not text:
        return [{"campo": field, "paso": step, "nivel": "orientacion",
                 "mensaje": f"Relaciona {label} con un dato ya registrado; si falta, complétalo en su etapa antes de seleccionarlo."}]
    if text.casefold() not in {_text(option).casefold() for option in options}:
        return [{"campo": field, "paso": step, "nivel": "advertencia",
                 "mensaje": f"La relación «{text}» no coincide con {label} registrado. Comprueba su fuente o selecciona una opción vigente."}]
    return []


def coherence_review(project, common, formulation):
    """Señala relaciones y soportes pendientes; las sugerencias no bloquean la generación."""
    from app.services.documentation_state import consistency_issues
    from app.services.source_resolution import source_is_resolved

    options = relation_options(project, common)
    issues = []
    activities = common.get("cronograma") or []
    resources = common.get("presupuesto") or []
    results = formulation.get("resultados_esperados") or []
    start, end = _as_date(common.get("fecha_inicio")), _as_date(common.get("fecha_fin"))
    for index, row in enumerate(activities):
        prefix = f"comunes.cronograma.{index}."
        issues.extend(_relation_issues(row.get("objetivo_especifico"), options["objetivos"], prefix + "objetivo_especifico", "recursos", "el objetivo específico"))
        issues.extend(_relation_issues(row.get("encargado"), options["integrantes"], prefix + "encargado", "recursos", "el integrante del equipo"))
        if not _text(row.get("resultado")):
            issues.append({"campo": prefix + "resultado", "paso": "recursos", "nivel": "orientacion",
                           "mensaje": "Define qué entregable verificable dejará esta actividad y cómo aportará al resultado esperado."})
        for key in ("fecha_inicio", "fecha_fin"):
            planned = _as_date(row.get(key))
            if planned and ((start and planned < start) or (end and planned > end)):
                issues.append({"campo": prefix + key, "paso": "recursos", "nivel": "advertencia",
                               "mensaje": "La fecha de la actividad queda fuera del período del proyecto. Contrasta las fechas con la planeación confirmada."})
        if resources and not any(_text(resource.get("actividad_relacionada")).casefold() == _text(row.get("actividad")).casefold() for resource in resources):
            issues.append({"campo": prefix + "actividad", "paso": "recursos", "nivel": "orientacion",
                           "mensaje": "Comprueba qué recursos requiere esta actividad y relaciona el rubro correspondiente cuando aplique. Algunas actividades pueden usar recursos ya disponibles."})
    for index, row in enumerate(resources):
        issues.extend(_relation_issues(row.get("actividad_relacionada"), options["actividades"], f"comunes.presupuesto.{index}.actividad_relacionada", "recursos", "la actividad del cronograma"))
    for index, row in enumerate(results):
        prefix = f"formulacion.resultados_esperados.{index}."
        issues.extend(_relation_issues(row.get("objetivo_especifico"), options["objetivos"], prefix + "objetivo_especifico", "resultados", "el objetivo específico"))
        for key, label in (("indicador", "el indicador que medirás"), ("meta", "la cantidad prevista"), ("unidad", "la unidad de la meta"), ("medio_verificacion", "el soporte previsto para verificar el resultado")):
            if row.get(key) is None or row.get(key) == "" or (isinstance(row.get(key), str) and not row[key].strip()):
                issues.append({"campo": prefix + key, "paso": "resultados", "nivel": "orientacion",
                               "mensaje": f"Define {label}. Conserva el dato pendiente si todavía no puedes confirmarlo."})
    for index, objective in enumerate(getattr(project, "objetivos_especificos", None) or []):
        text = _text(objective).casefold()
        if not text:
            continue
        absent = []
        if not any(_text(row.get("objetivo_especifico")).casefold() == text for row in activities):
            absent.append("una actividad del cronograma")
        if not any(_text(row.get("objetivo_especifico")).casefold() == text for row in results):
            absent.append("un resultado esperado con indicador y soporte")
        if absent:
            issues.append({"campo": f"proyecto.objetivos_especificos.{index}", "paso": "objetivos", "nivel": "orientacion",
                           "mensaje": f"El objetivo «{_text(objective)}» todavía no está relacionado con {' y '.join(absent)}. Completa esas relaciones en Resultados y Recursos."})
    context = {"presupuesto_total": getattr(project, "presupuesto_total", None)}
    for message in consistency_issues(context, common, include_source=False):
        issues.append({"campo": "comunes.presupuesto", "paso": "recursos", "nivel": "advertencia", "mensaje": message})
    if _text(common.get("inconsistencias_fuente")) and not source_is_resolved(common):
        issues.append({"campo": "comunes.inconsistencias_fuente", "paso": "institucional", "nivel": "advertencia",
                       "mensaje": "Aclara los datos contradictorios con el soporte de la fuente y registra cómo los conciliaste antes de revisar la versión: " + common["inconsistencias_fuente"]})
        issues.append({"campo": "comunes.aclaraciones_fuente", "paso": "institucional", "nivel": "advertencia",
                       "mensaje": "Registra una aclaración del pendiente vigente con dato confirmado, soporte y ubicación, persona que verificó y fecha. Conserva el texto original; borrar la descripción no resuelve la discrepancia."})
    return issues
