"""Reglas locales para orientar la redacción metodológica de proyectos."""

FIELD_GUIDANCE = {
    "introduccion": "Presenta el tema, la necesidad, el propósito y el alcance. ¿Qué necesita saber quien leerá el proyecto antes del diagnóstico?",
    "contexto": "Delimita el territorio, la población y las condiciones observadas. Incluye la fuente de cada dato que sustenta la necesidad.",
    "planteamiento_problema": "Contrasta el problema con sus fuentes y delimita la pregunta que el proyecto puede responder.",
    "justificacion": "Relaciona los beneficios esperados con la necesidad y explica por qué la propuesta es pertinente y factible.",
    "objetivo_general": "Comprueba que el resultado principal responda al problema y tenga un alcance que pueda verificarse.",
    "objetivos_especificos": "Escribe un objetivo por línea y relaciona cada uno con actividades y resultados verificables.",
    "referente_teorico": "Explica cómo los conceptos y antecedentes consultados orientan el problema y el método. Identifica sus autores y fuentes.",
    "marco_normativo": "Identifica la fuente oficial y la vigencia de cada norma, y explica su relación con el alcance del proyecto.",
    "metodologia": "Relaciona cada fase con un objetivo, sus actividades, instrumentos y la forma de verificar el resultado.",
    "poblacion_muestra": "Delimita las unidades de análisis y explica los criterios de selección, el tamaño previsto y sus limitaciones.",
    "tecnicas_recoleccion": "Describe qué datos obtendrás, con qué instrumento, quién lo aplicará y cómo analizarás la información autorizada.",
    "fases": "Ordena las fases e indica las actividades, responsables, tiempos y entregables que aportan a cada objetivo.",
    "resultados_esperados": "Relaciona cada resultado con un objetivo específico, un indicador, una meta, su unidad y el medio de verificación previsto.",
    "impactos": "Distingue resultados directos de efectos posteriores esperados. Explica beneficiarios, condiciones y cómo recogerías evidencia.",
    "conclusiones": "Resume la relación entre problema, objetivos, método y resultados previstos. Conserva como pendientes los datos que requieren soporte.",
    "referencias": "Comprueba que cada cita tenga una referencia con autor, título, año y enlace o identificador, y que corresponda a una fuente consultada.",
}


def get_field_recommendations(field_key: str, current_text: str) -> list[str]:
    """Devuelve recomendaciones basadas en reglas, sin simular una consulta de IA."""
    tips = []
    text = current_text.strip()
    lower_text = text.casefold()
    text_len = len(text)
    
    if field_key == "planteamiento_problema":
        if text_len < 100:
            tips.append("El planteamiento es muy breve. Describe detalladamente el contexto, los síntomas del problema y las causas principales.")
        if "sena" not in lower_text and "formación" not in lower_text:
            tips.append("Recuerda articular cómo este problema afecta la formación profesional o el entorno tecnológico del SENA.")
        if "?" not in text:
            tips.append("Es recomendable cerrar el planteamiento con una pregunta de investigación o pregunta problematizadora clara.")
            
    elif field_key == "justificacion":
        if text_len < 100:
            tips.append("La justificación debe argumentar el 'por qué' y el 'para qué'. Expande los beneficios esperados.")
        if "impacto" not in lower_text:
            tips.append("Menciona explícitamente el impacto (social, tecnológico, económico o ambiental) que tendrá la solución.")
            
    elif field_key == "objetivo_general" or "objetivo" in field_key:
        if not text:
            tips.append("El objetivo debe iniciar con un verbo en infinitivo (ej: Desarrollar, Implementar, Diseñar).")
        else:
            first_word = text.split()[0].casefold()
            if not first_word.endswith(("ar", "er", "ir")):
                tips.append(f"Parece que '{first_word}' no es un verbo en infinitivo. Usa verbos medibles (ej: Diseñar, Evaluar).")
        if "para" not in lower_text:
            tips.append("Asegúrate de incluir el propósito (el 'para qué') dentro del objetivo.")
            
    elif field_key == "metodologia":
        if "fase" not in lower_text and "etapa" not in lower_text:
            tips.append("Organiza la metodología por fases o etapas lógicas que conduzcan al cumplimiento de los objetivos.")
            
    if not tips:
        if field_key in FIELD_GUIDANCE:
            tips.append("Orientación: " + FIELD_GUIDANCE[field_key] + " Esta ayuda local no constituye una validación del contenido ni de la coherencia del proyecto.")
        elif text_len == 0:
            tips.append("Ingresa algo de texto y consulta la guía del apartado para empezar. Esta orientación usa reglas locales y no constituye una validación del contenido.")
        else:
            tips.append("Consulta la guía del apartado y contrasta el texto con sus fuentes. Esta orientación local no cuenta con una regla específica para validar este campo.")
            
    return tips
