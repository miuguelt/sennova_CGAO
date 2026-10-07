"""Proyección del cronograma y los entregables persistidos de un proyecto autorizado."""


def project_timeline_data(project):
    """Distingue entregables registrados de actividades documentales previstas."""
    deliverables = project.entregables.order_by("fecha_entrega", "titulo").all()
    common = project.documentacion.datos if project.documentacion else {}
    return {
        "entregables": [{
            "id": str(row.id), "fase": row.fase, "titulo": row.titulo,
            "descripcion": row.descripcion, "tipo": row.tipo, "estado": row.estado,
            "fecha_entrega": row.fecha_entrega.isoformat(),
            "responsable_nombre": row.responsable.nombre if row.responsable else None,
            "observaciones": row.observaciones,
        } for row in deliverables],
        "cronograma_documental": common.get("cronograma", []),
    }
