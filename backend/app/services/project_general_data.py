"""Datos iniciales del centro y del responsable vinculado al proyecto."""

from app.config import get_settings
from app.documentation_models import ProjectDocumentation


def general_project_data(project):
    """Ofrece datos de base, sin inferir fechas, códigos ni información formativa."""
    settings = get_settings()
    values = {
        "centro": settings.PROJECT_DEFAULT_CENTRO,
        "regional": settings.PROJECT_DEFAULT_REGIONAL,
        "ciudad": settings.PROJECT_DEFAULT_CIUDAD,
    }
    owner = getattr(project, "owner", None)
    if owner and owner.nombre:
        values["responsable"] = owner.nombre
    return {key: value.strip() for key, value in values.items() if value and value.strip()}


def initialize_project_documentation(project, db, user):
    """Incluye los datos generales en la misma transacción de creación del proyecto."""
    row = ProjectDocumentation(
        proyecto_id=project.id, revision=0,
        datos=general_project_data(project), updated_by=user.id,
    )
    db.add(row)
    return row
