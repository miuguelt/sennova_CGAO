"""Create, update and delete product routes."""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Notificacion, Producto, Proyecto, User
from app.schemas import ProductoCreate, ProductoUpdate
from app.services import EmailService
from app.utils import log_actividad
from app.routers.productos_common import make_producto_dict

router = APIRouter(prefix="/productos")


def _resolve_project_name(
    producto_data: ProductoCreate, current_user: User, db: Session
) -> str:
    """Validate project access and return the display name for notifications."""
    if not producto_data.proyecto_id:
        return "Sin Proyecto"
    proyecto = (
        db.query(Proyecto).filter(Proyecto.id == str(producto_data.proyecto_id)).first()
    )
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    has_access = (
        current_user.rol == "admin"
        or str(proyecto.owner_id) == str(current_user.id)
        or any(str(member.id) == str(current_user.id) for member in proyecto.equipo)
    )
    if not has_access:
        raise HTTPException(status_code=403, detail="Sin acceso al proyecto")
    return proyecto.nombre_corto or proyecto.nombre


def _build_producto(producto_data: ProductoCreate, current_user: User) -> Producto:
    """Build an unverified product entity from the request contract."""
    return Producto(
        tipo=producto_data.tipo,
        nombre=producto_data.nombre,
        descripcion=producto_data.descripcion,
        fecha_publicacion=producto_data.fecha_publicacion,
        doi=producto_data.doi,
        url=producto_data.url,
        proyecto_id=str(producto_data.proyecto_id)
        if producto_data.proyecto_id
        else None,
        owner_id=str(current_user.id),
        is_verificado=False,
    )


def _persist_producto(producto: Producto, db: Session) -> None:
    """Persist a product and translate unexpected failures to an API error."""
    try:
        db.add(producto)
        db.commit()
        db.refresh(producto)
    except (OperationalError, SQLAlchemyError):
        db.rollback()
        raise
    except Exception as error:
        db.rollback()
        print(f"Error al crear producto: {error}")
        raise HTTPException(status_code=500, detail="Error interno al crear producto")


def _admin_notification(
    producto: Producto, admin_usr: User, proyecto_nombre: str, current_user: User
) -> Notificacion:
    """Build the pending-verification notification for one administrator."""
    return Notificacion(
        user_id=str(admin_usr.id),
        tipo="producto",
        titulo="Nuevo Producto por Verificar",
        mensaje=f"El investigador {current_user.nombre} ha registrado el producto '{producto.nombre}' ({producto.tipo}) en el proyecto '{proyecto_nombre}'. Requiere verificación.",
        entidad_tipo="producto",
        entidad_id=str(producto.id),
        prioridad="normal",
    )


def _admin_email_body(
    producto: Producto, proyecto_nombre: str, current_user: User
) -> str:
    """Render the pending-verification email body."""
    return f"""
    <h3>Hola Administrador,</h3>
    <p>Se ha registrado un nuevo producto científico en la plataforma SENNOVA CGAO:</p>
    <ul>
        <li><b>Registrado por:</b> {current_user.nombre}</li>
        <li><b>Nombre del Producto:</b> {producto.nombre}</li>
        <li><b>Tipo:</b> {producto.tipo}</li>
        <li><b>Proyecto:</b> {proyecto_nombre}</li>
    </ul>
    <p>Por favor, ingresa a la plataforma para verificar los requisitos de este producto.</p>
    <br/>
    <p>Atentamente,<br/>Plataforma SENNOVA CGAO</p>
    """


def _notify_admins(
    producto: Producto,
    proyecto_nombre: str,
    current_user: User,
    background_tasks: BackgroundTasks,
    db: Session,
) -> None:
    """Create pending notifications and queue the corresponding emails."""
    try:
        admins = (
            db.query(User).filter(User.rol == "admin", User.is_active == True).all()
        )
        for admin_usr in admins:
            db.add(
                _admin_notification(producto, admin_usr, proyecto_nombre, current_user)
            )
            EmailService.send_email_async(
                admin_usr.email,
                "Nuevo Producto Pendiente de Verificación",
                _admin_email_body(producto, proyecto_nombre, current_user),
                background_tasks,
            )
        db.commit()
    except Exception as error:
        print(f"Error al notificar sobre nuevo producto: {error}")


def _apply_product_update(
    producto: Producto, producto_update: ProductoUpdate, db: Session
) -> None:
    """Apply allowed fields and persist the product update."""
    update_data = producto_update.model_dump(exclude_unset=True) if hasattr(producto_update, 'model_dump') else producto_update.dict(exclude_unset=True)
    if producto.is_verificado:
        update_data.pop("proyecto_id", None)
    for field, value in update_data.items():
        setattr(producto, field, value)
    try:
        db.commit()
        db.refresh(producto)
    except (OperationalError, SQLAlchemyError):
        db.rollback()
        raise
    except Exception as error:
        db.rollback()
        print(f"Error al actualizar producto: {error}")
        raise HTTPException(
            status_code=500, detail="Error interno al actualizar producto"
        )


@router.post("", status_code=201)
def create_producto(
    producto_data: ProductoCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Crear un nuevo producto."""
    if current_user.rol == "aprendiz":
        raise HTTPException(
            status_code=403,
            detail="Los aprendices no tienen permiso para crear productos",
        )
    proyecto_nombre = _resolve_project_name(producto_data, current_user, db)
    producto = _build_producto(producto_data, current_user)
    _persist_producto(producto, db)

    log_actividad(
        db,
        current_user.id,
        "crear_producto",
        f"Registró un nuevo producto: {producto.nombre} ({producto.tipo})",
        entidad_tipo="producto",
        entidad_id=str(producto.id),
    )
    _notify_admins(producto, proyecto_nombre, current_user, background_tasks, db)
    return make_producto_dict(producto)


@router.put("/{producto_id}")
def update_producto(
    producto_id: str,
    producto_update: ProductoUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Actualizar un producto."""
    producto = db.query(Producto).filter(Producto.id == str(producto_id)).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if current_user.rol == "aprendiz":
        raise HTTPException(
            status_code=403,
            detail="Los aprendices no tienen permiso para modificar productos",
        )
    if current_user.rol != "admin" and str(producto.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso para editar")
    _apply_product_update(producto, producto_update, db)
    log_actividad(
        db,
        current_user.id,
        "actualizar_producto",
        f"Acción sobre el producto: {producto.nombre}",
        entidad_tipo="producto",
        entidad_id=str(producto.id),
    )
    return make_producto_dict(producto)


@router.delete("/{producto_id}")
def delete_producto(
    producto_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Eliminar un producto."""
    producto = db.query(Producto).filter(Producto.id == str(producto_id)).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if current_user.rol == "aprendiz":
        raise HTTPException(
            status_code=403,
            detail="Los aprendices no tienen permiso para eliminar productos",
        )
    if producto.is_verificado and current_user.rol != "admin":
        raise HTTPException(
            status_code=403, detail="Producto verificado, solo admin puede eliminar"
        )
    if current_user.rol != "admin" and str(producto.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso para eliminar")
    try:
        db.delete(producto)
        db.commit()
    except (OperationalError, SQLAlchemyError):
        db.rollback()
        raise
    except Exception as error:
        db.rollback()
        print(f"Error al eliminar producto: {error}")
        raise HTTPException(
            status_code=500, detail="Error interno al eliminar producto"
        )
    return {"message": "Producto eliminado"}
