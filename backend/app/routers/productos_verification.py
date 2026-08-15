"""Administrative product verification route."""

from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.database import get_db
from app.models import Notificacion, Producto, User
from app.routers.productos_common import make_producto_dict
from app.schemas import ProductoVerificar
from app.services import EmailService
from app.services.proyectos_service import evaluar_y_auto_finalizar_proyecto
from app.utils import log_actividad

router = APIRouter(prefix="/productos")


def _set_verification_state(
    producto: Producto, verificacion: ProductoVerificar, admin: User
) -> None:
    """Apply the verification state and audit fields to a product."""
    producto.is_verificado = verificacion.is_verificado
    if verificacion.is_verificado:
        producto.verificado_por = str(admin.id)
        producto.fecha_verificacion = datetime.now(timezone.utc)
    else:
        producto.verificado_por = None
        producto.fecha_verificacion = None


def _commit_verification(
    producto: Producto, verificacion: ProductoVerificar, db: Session
) -> None:
    """Persist verification and trigger project completion evaluation."""
    try:
        db.commit()
        db.refresh(producto)
        if verificacion.is_verificado and producto.proyecto_id:
            evaluar_y_auto_finalizar_proyecto(str(producto.proyecto_id), db)
    except (OperationalError, SQLAlchemyError):
        db.rollback()
        raise


def _owner_email_body(producto: Producto, estado: str, admin: User, owner: User) -> str:
    """Render the verification result email."""
    return f"""
    <h3>Hola {owner.nombre},</h3>
    <p>El estado de verificación de tu producto científico en SENNOVA ha sido actualizado:</p>
    <ul>
        <li><b>Producto:</b> {producto.nombre}</li>
        <li><b>Tipo:</b> {producto.tipo}</li>
        <li><b>Nuevo Estado:</b> {estado}</li>
        <li><b>Revisado por:</b> {admin.nombre}</li>
    </ul>
    <p>Puedes ver los detalles e ingresar evidencias adicionales en tu tablero de investigador.</p>
    <br/>
    <p>Atentamente,<br/>Coordinación SENNOVA CGAO</p>
    """


def _owner_notification(
    producto: Producto, verificacion: ProductoVerificar, owner: User, estado: str
) -> Notificacion:
    """Build the verification notification for the product owner."""
    return Notificacion(
        user_id=str(owner.id),
        tipo="producto",
        titulo=f"Producto Verificado: {producto.nombre}"
        if verificacion.is_verificado
        else f"Producto Rechazado: {producto.nombre}",
        mensaje=f"Tu producto científico '{producto.nombre}' ({producto.tipo}) ha sido verificado como '{estado}' por la coordinación.",
        entidad_tipo="producto",
        entidad_id=str(producto.id),
        prioridad="alta" if verificacion.is_verificado else "normal",
    )


def _notify_owner(
    producto: Producto,
    verificacion: ProductoVerificar,
    admin: User,
    background_tasks: BackgroundTasks,
    db: Session,
) -> None:
    """Notify the product owner without failing the verification response."""
    try:
        owner = db.query(User).filter(User.id == producto.owner_id).first()
        if not owner:
            return
        estado = (
            "Aprobado / Verificado"
            if verificacion.is_verificado
            else "Marcado como Pendiente de Revisión"
        )
        db.add(_owner_notification(producto, verificacion, owner, estado))
        db.commit()
        EmailService.send_email_async(
            owner.email,
            f"Actualización de Producto: {producto.nombre}",
            _owner_email_body(producto, estado, admin, owner),
            background_tasks,
        )
    except Exception as error:
        print(f"Error al notificar al propietario del producto: {error}")


@router.post("/{producto_id}/verificar")
def verificar_producto(
    producto_id: str,
    verificacion: ProductoVerificar,
    background_tasks: BackgroundTasks,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Verificar o desverificar un producto (solo admin)."""
    producto = db.query(Producto).filter(Producto.id == str(producto_id)).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    _set_verification_state(producto, verificacion, admin)
    _commit_verification(producto, verificacion, db)
    log_actividad(
        db,
        admin.id,
        "actualizar_producto",
        f"Acción sobre el producto: {producto.nombre}",
        entidad_tipo="producto",
        entidad_id=str(producto.id),
    )
    _notify_owner(producto, verificacion, admin, background_tasks, db)
    return make_producto_dict(producto)
