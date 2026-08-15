"""Read-only product routes."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import Producto, User
from app.routers.productos_common import make_producto_dict

router = APIRouter(prefix="/productos")


@router.get("")
def list_productos(
    skip: int = 0,
    limit: int = 100,
    tipo: Optional[str] = None,
    proyecto_id: Optional[str] = None,
    owner_id: Optional[str] = None,
    is_verificado: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Listar productos de investigación con datos conectados."""
    query = db.query(Producto).options(
        joinedload(Producto.proyecto),
        joinedload(Producto.owner),
    )
    if current_user.rol != "admin":
        query = query.filter(
            (Producto.owner_id == current_user.id) | (Producto.is_verificado == True)
        )
    if tipo:
        query = query.filter(Producto.tipo == tipo)
    if proyecto_id:
        query = query.filter(Producto.proyecto_id == str(proyecto_id))
    if owner_id:
        query = query.filter(Producto.owner_id == str(owner_id))
    if is_verificado is not None:
        query = query.filter(Producto.is_verificado == is_verificado)
    productos = (
        query.order_by(Producto.created_at.desc()).offset(skip).limit(limit).all()
    )
    return [make_producto_dict(producto) for producto in productos]


@router.get("/{producto_id}")
def get_producto(
    producto_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Obtener detalle de un producto."""
    producto = db.query(Producto).filter(Producto.id == str(producto_id)).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if (
        not producto.is_verificado
        and current_user.rol != "admin"
        and str(producto.owner_id) != str(current_user.id)
    ):
        raise HTTPException(status_code=403, detail="Sin acceso a este producto")
    return make_producto_dict(producto)
