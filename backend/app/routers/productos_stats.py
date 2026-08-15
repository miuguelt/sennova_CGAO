"""Product statistics and project template routes."""

from typing import TypeAlias

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Producto, Proyecto, User
from app.utils import log_actividad

router = APIRouter(prefix="/productos")
Template: TypeAlias = tuple[str, str, str]
PRODUCT_TEMPLATES: dict[str, tuple[Template, ...]] = {
    "Investigación": (
        (
            "articulo",
            "Artículo de Investigación (Publicación Q1/Q2)",
            "Resultado principal de la investigación para revista indexada.",
        ),
        (
            "ponencia",
            "Ponencia en Evento Internacional",
            "Divulgación de resultados en congreso especializado.",
        ),
        (
            "capitulo_libro",
            "Capítulo de Libro de Investigación",
            "Consolidación teórica y resultados finales.",
        ),
    ),
    "Innovación": (
        (
            "software",
            "Registro de Software / Aplicativo",
            "Desarrollo tecnológico funcional resultante del proyecto.",
        ),
        (
            "prototipo",
            "Prototipo Industrial / Funcional",
            "Validación en entorno relevante o cuasi-real.",
        ),
        (
            "manual",
            "Manual de Usuario y Guía Técnica",
            "Documentación para la transferencia tecnológica.",
        ),
    ),
    "Modernización": (
        (
            "informe",
            "Informe de Impacto Tecnológico",
            "Evaluación de la mejora en la capacidad instalada del centro.",
        ),
        (
            "video",
            "Video de Transferencia de Conocimiento",
            "Material audiovisual para la formación profesional.",
        ),
    ),
    "Cultura": (
        (
            "video",
            "Video de Apropiación Social del Conocimiento",
            "Divulgación de resultados para la comunidad general.",
        ),
        (
            "ponencia",
            "Taller de Divulgación y Sensibilización",
            "Evento de transferencia a actores locales.",
        ),
    ),
}


def _validate_template_request(
    proyecto_id: str, current_user: User, db: Session
) -> Proyecto:
    """Validate the caller and return an empty project eligible for templates."""
    if current_user.rol == "aprendiz":
        raise HTTPException(
            status_code=403,
            detail="Los aprendices no tienen permiso para generar productos",
        )
    proyecto = db.query(Proyecto).filter(Proyecto.id == proyecto_id).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    has_access = (
        current_user.rol == "admin"
        or str(proyecto.owner_id) == str(current_user.id)
        or any(str(member.id) == str(current_user.id) for member in proyecto.equipo)
    )
    if not has_access:
        raise HTTPException(status_code=403, detail="Sin acceso al proyecto")
    if db.query(Producto).filter(Producto.proyecto_id == proyecto_id).count() > 0:
        raise HTTPException(
            status_code=400, detail="El proyecto ya cuenta con productos registrados"
        )
    return proyecto


def _select_template(tipologia: str | None) -> tuple[Template, ...]:
    """Select the institutional template matching a project typology."""
    tipo = tipologia or "Investigación"
    return next(
        (
            values
            for key, values in PRODUCT_TEMPLATES.items()
            if key.lower() in tipo.lower()
        ),
        PRODUCT_TEMPLATES["Investigación"],
    )


def _add_template_products(
    items: tuple[Template, ...], proyecto_id: str, owner_id: str, db: Session
) -> None:
    """Add projected products to the current transaction."""
    for product_type, name, description in items:
        db.add(
            Producto(
                tipo=product_type,
                nombre=f"[PROYECTADO] {name}",
                descripcion=description,
                proyecto_id=proyecto_id,
                owner_id=owner_id,
                is_verificado=False,
            )
        )


@router.get("/stats/resumen")
def get_productos_stats(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Estadísticas de productos."""
    query = db.query(Producto)
    if current_user.rol != "admin":
        query = query.filter(
            (Producto.owner_id == current_user.id) | (Producto.is_verificado == True)
        )
    rows = (
        db.query(Producto.tipo, func.count(Producto.id).label("cantidad"))
        .filter(
            (current_user.rol == "admin")
            | (Producto.owner_id == str(current_user.id))
            | (Producto.is_verificado == True)
        )
        .group_by(Producto.tipo)
        .all()
    )
    return {
        "total": query.count(),
        "verificados": query.filter(Producto.is_verificado == True).count(),
        "pendientes": query.filter(Producto.is_verificado == False).count(),
        "por_tipo": [{"tipo": row[0], "cantidad": row[1]} for row in rows],
    }


@router.get("/mis-productos/list")
def get_mis_productos(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Obtener solo los productos del usuario actual."""
    return (
        db.query(Producto)
        .filter(Producto.owner_id == current_user.id)
        .order_by(Producto.created_at.desc())
        .all()
    )


@router.post("/proyecto/{proyecto_id}/generate-template")
def generar_productos_base(
    proyecto_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Genera productos placeholder basados en la tipología del proyecto."""
    proyecto = _validate_template_request(proyecto_id, current_user, db)
    items = _select_template(proyecto.tipologia)
    _add_template_products(items, proyecto_id, str(current_user.id), db)
    db.commit()
    log_actividad(
        db,
        current_user.id,
        "generate_products",
        f"Generó productos automáticos ({len(items)}) para proyecto: {proyecto.nombre_corto or proyecto.id}",
        entidad_tipo="proyecto",
        entidad_id=proyecto_id,
    )
    return {
        "message": f"Productos proyectados generados exitosamente ({len(items)})",
        "count": len(items),
    }
