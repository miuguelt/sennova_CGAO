"""Reglas locales para orientar la redacción metodológica de proyectos."""

def get_field_recommendations(field_key: str, current_text: str) -> list[str]:
    """Devuelve recomendaciones basadas en reglas, sin simular una consulta de IA."""
    tips = []
    text_len = len(current_text.strip())
    
    if field_key == "planteamiento_problema":
        if text_len < 100:
            tips.append("El planteamiento es muy breve. Describe detalladamente el contexto, los síntomas del problema y las causas principales.")
        if "SENA" not in current_text and "formación" not in current_text:
            tips.append("Recuerda articular cómo este problema afecta la formación profesional o el entorno tecnológico del SENA.")
        if "?" not in current_text:
            tips.append("Es recomendable cerrar el planteamiento con una pregunta de investigación o pregunta problematizadora clara.")
            
    elif field_key == "justificacion":
        if text_len < 100:
            tips.append("La justificación debe argumentar el 'por qué' y el 'para qué'. Expande los beneficios esperados.")
        if "impacto" not in current_text.lower():
            tips.append("Menciona explícitamente el impacto (social, tecnológico, económico o ambiental) que tendrá la solución.")
            
    elif field_key == "objetivo_general" or "objetivo" in field_key:
        if not current_text:
            tips.append("El objetivo debe iniciar con un verbo en infinitivo (ej: Desarrollar, Implementar, Diseñar).")
        else:
            first_word = current_text.strip().split()[0].lower()
            if not first_word.endswith(("ar", "er", "ir")):
                tips.append(f"Parece que '{first_word}' no es un verbo en infinitivo. Usa verbos medibles (ej: Diseñar, Evaluar).")
        if "para" not in current_text.lower():
            tips.append("Asegúrate de incluir el propósito (el 'para qué') dentro del objetivo.")
            
    elif field_key == "metodologia":
        if "fase" not in current_text.lower() and "etapa" not in current_text.lower():
            tips.append("Organiza la metodología por fases o etapas lógicas que conduzcan al cumplimiento de los objetivos.")
            
    if not tips:
        if text_len == 0:
            tips.append("Ingresa algo de texto para que la IA pueda analizarlo y darte recomendaciones más precisas.")
        else:
            tips.append("El texto tiene buena estructura preliminar. Revisa que la ortografía y redacción técnica sean adecuadas para un proyecto de investigación.")
            
    return tips
