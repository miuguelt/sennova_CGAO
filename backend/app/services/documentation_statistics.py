"""Carga y agrega el avance documental sin sustituir su cálculo autoritativo."""

from sqlalchemy.orm import joinedload, selectinload

from app.documentation_models import ProjectDocumentDraft, ProjectDocumentVersion
from app.models import Proyecto
from app.services.documentation_progress import PROGRESS_DESCRIPTION, documentation_progress


def documentation_loading_options():
    """Anticipa datos comunes, borradores y versiones de todos los proyectos consultados."""
    return (
        selectinload(Proyecto.documentacion),
        selectinload(Proyecto.borradores_documentales).selectinload(ProjectDocumentDraft.versiones)
        .joinedload(ProjectDocumentVersion.documento),
    )


def documentation_statistics_options():
    """Incluye el contexto de snapshots que necesitan las estadísticas documentales."""
    return (*documentation_loading_options(), joinedload(Proyecto.grupo), joinedload(Proyecto.semillero),
            selectinload(Proyecto.productos))


def documentation_statistics(projects):
    """Promedia los porcentajes de cada proyecto y suma sus contadores documentales."""
    progress = {str(project.id): documentation_progress(project) for project in projects}
    count = len(progress)
    result = {
        "porcentaje": sum(item["porcentaje"] for item in progress.values()) // count if count else 0,
        "porcentaje_captura": sum(item["porcentaje_captura"] for item in progress.values()) // count if count else 0,
        "proyectos_totales": count,
        "descripcion": "El porcentaje es el promedio del avance documental de los proyectos vinculados. " + PROGRESS_DESCRIPTION,
    }
    for key in ("campos_completados", "campos_totales", "documentos_totales", "documentos_listos", "documentos_generados", "documentos_revisados"):
        result[key] = sum(item[key] for item in progress.values())
    return result, progress
