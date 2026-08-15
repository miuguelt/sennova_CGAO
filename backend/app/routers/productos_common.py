"""Shared response mapping for product routes."""

from app.models import Producto


def make_producto_dict(producto: Producto) -> dict:
    """Convert a product to the public API representation."""
    return {
        "id": str(producto.id),
        "tipo": producto.tipo,
        "nombre": producto.nombre,
        "descripcion": producto.descripcion,
        "fecha_publicacion": producto.fecha_publicacion,
        "doi": producto.doi,
        "url": producto.url,
        "is_verificado": producto.is_verificado,
        "verificado_por": str(producto.verificado_por)
        if producto.verificado_por
        else None,
        "fecha_verificacion": producto.fecha_verificacion,
        "proyecto_id": str(producto.proyecto_id) if producto.proyecto_id else None,
        "proyecto_nombre": producto.proyecto.nombre_corto or producto.proyecto.nombre
        if producto.proyecto
        else "Sin Proyecto",
        "owner_id": str(producto.owner_id),
        "owner_nombre": producto.owner.nombre if producto.owner else "Desconocido",
        "created_at": producto.created_at,
    }
