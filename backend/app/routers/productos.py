from uuid import UUID
from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.auth import get_current_user, get_current_admin
from app.database import get_db
from app.models import Producto, Proyecto, User
from app.schemas import ProductoCreate, ProductoUpdate, ProductoResponse, ProductoVerificar
from app.utils import log_actividad

router = APIRouter(prefix="/productos", tags=["Productos de Investigación"])


@router.get("")
def list_productos(
    skip: int = 0,
    limit: int = 100,
    tipo: Optional[str] = None,
    proyecto_id: Optional[str] = None,
    owner_id: Optional[str] = None,
    is_verificado: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar productos de investigación con datos conectados."""
    from sqlalchemy.orm import joinedload
    
    # Eager load proyecto y owner
    query = db.query(Producto).options(
        joinedload(Producto.proyecto),
        joinedload(Producto.owner)
    )
    
    # Si es investigador, solo ver los suyos o los verificados
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
    
    productos = query.order_by(Producto.created_at.desc()).offset(skip).limit(limit).all()
    return [_make_producto_dict(p) for p in productos]


def _make_producto_dict(producto: Producto) -> dict:
    """Convierte un Producto a diccionario con información conectada."""
    return {
        "id": str(producto.id),
        "tipo": producto.tipo,
        "nombre": producto.nombre,
        "descripcion": producto.descripcion,
        "fecha_publicacion": producto.fecha_publicacion,
        "doi": producto.doi,
        "url": producto.url,
        "is_verificado": producto.is_verificado,
        "verificado_por": str(producto.verificado_por) if producto.verificado_por else None,
        "fecha_verificacion": producto.fecha_verificacion,
        "proyecto_id": str(producto.proyecto_id) if producto.proyecto_id else None,
        "proyecto_nombre": producto.proyecto.nombre_corto or producto.proyecto.nombre if producto.proyecto else "Sin Proyecto",
        "owner_id": str(producto.owner_id),
        "owner_nombre": producto.owner.nombre if producto.owner else "Desconocido",
        "created_at": producto.created_at
    }


@router.get("/{producto_id}")
def get_producto(
    producto_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener detalle de un producto."""
    producto = db.query(Producto).filter(Producto.id == str(producto_id)).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Si no es verificado, solo owner o admin pueden verlo
    if not producto.is_verificado:
        if current_user.rol != "admin" and str(producto.owner_id) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Sin acceso a este producto")
    
    return _make_producto_dict(producto)


@router.post("", status_code=201)
def create_producto(
    producto_data: ProductoCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear un nuevo producto."""
    # Verificar que el proyecto existe y pertenece al usuario
    if producto_data.proyecto_id:
        proyecto = db.query(Proyecto).filter(Proyecto.id == str(producto_data.proyecto_id)).first()
        if not proyecto:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        
        # Verificar acceso al proyecto
        has_access = (
            current_user.rol == "admin" or
            str(proyecto.owner_id) == str(current_user.id) or
            any(str(m.id) == str(current_user.id) for m in proyecto.equipo)
        )
        if not has_access:
            raise HTTPException(status_code=403, detail="Sin acceso al proyecto")
    
    producto = Producto(
        tipo=producto_data.tipo,
        nombre=producto_data.nombre,
        descripcion=producto_data.descripcion,
        fecha_publicacion=producto_data.fecha_publicacion,
        doi=producto_data.doi,
        url=producto_data.url,
        proyecto_id=str(producto_data.proyecto_id) if producto_data.proyecto_id else None,
        owner_id=str(current_user.id),
        is_verificado=False  # Siempre falso al crear
    )
    
    db.add(producto)
    db.commit()
    db.refresh(producto)
    
    # Registrar actividad
    log_actividad(
        db, 
        current_user.id, 
        "crear_producto", 
        f"Registró un nuevo producto: {producto.nombre} ({producto.tipo})",
        entidad_tipo="producto",
        entidad_id=str(producto.id)
    )
    
    return _make_producto_dict(producto)


@router.put("/{producto_id}")
def update_producto(
    producto_id: str,
    producto_update: ProductoUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar un producto."""
    producto = db.query(Producto).filter(Producto.id == str(producto_id)).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Solo admin o owner pueden editar
    if current_user.rol != "admin" and str(producto.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso para editar")
    
    update_data = producto_update.dict(exclude_unset=True)
    
    # No permitir cambiar proyecto_id si ya está verificado
    if producto.is_verificado and "proyecto_id" in update_data:
        del update_data["proyecto_id"]
    
    for field, value in update_data.items():
        setattr(producto, field, value)
    
    db.commit()
    db.refresh(producto)
    
    # Registrar actividad
    log_actividad(
        db, 
        current_user.id, 
        "actualizar_producto", 
        f"Acción sobre el producto: {producto.nombre}",
        entidad_tipo="producto",
        entidad_id=str(producto.id)
    )
    
    return _make_producto_dict(producto)


@router.delete("/{producto_id}")
def delete_producto(
    producto_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar un producto."""
    producto = db.query(Producto).filter(Producto.id == str(producto_id)).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Si está verificado, solo admin puede eliminar
    if producto.is_verificado and current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Producto verificado, solo admin puede eliminar")
    
    # Solo admin o owner pueden eliminar
    if current_user.rol != "admin" and str(producto.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso para eliminar")
    
    db.delete(producto)
    db.commit()
    
    return {"message": "Producto eliminado"}


# ==========================================
# VERIFICACIÓN (solo admin)
# ==========================================

@router.post("/{producto_id}/verificar")
def verificar_producto(
    producto_id: str,
    verificacion: ProductoVerificar,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Verificar o desverificar un producto (solo admin)."""
    producto = db.query(Producto).filter(Producto.id == str(producto_id)).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    producto.is_verificado = verificacion.is_verificado
    if verificacion.is_verificado:
        producto.verificado_por = str(admin.id)
        producto.fecha_verificacion = datetime.now(timezone.utc)
    else:
        producto.verificado_por = None
        producto.fecha_verificacion = None
    
    db.commit()
    db.refresh(producto)
    
    # Registrar actividad
    log_actividad(
        db, 
        admin.id, 
        "actualizar_producto", 
        f"Acción sobre el producto: {producto.nombre}",
        entidad_tipo="producto",
        entidad_id=str(producto.id)
    )
    
    return _make_producto_dict(producto)


# ==========================================
# ESTADÍSTICAS
# ==========================================

@router.get("/stats/resumen")
def get_productos_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Estadísticas de productos."""
    query = db.query(Producto)
    
    # Si es investigador, filtrar
    if current_user.rol != "admin":
        query = query.filter(
            (Producto.owner_id == current_user.id) | (Producto.is_verificado == True)
        )
    
    # Convertir Rows a diccionarios
    por_tipo_rows = db.query(
        Producto.tipo,
        func.count(Producto.id).label("cantidad")
    ).filter(
        (current_user.rol == "admin") | 
        (Producto.owner_id == str(current_user.id)) |
        (Producto.is_verificado == True)
    ).group_by(Producto.tipo).all()
    
    por_tipo = [{"tipo": row[0], "cantidad": row[1]} for row in por_tipo_rows]
    
    stats = {
        "total": query.count(),
        "verificados": query.filter(Producto.is_verificado == True).count(),
        "pendientes": query.filter(Producto.is_verificado == False).count(),
        "por_tipo": por_tipo
    }
    
    return stats


@router.get("/mis-productos/list")
def get_mis_productos(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener solo los productos del usuario actual."""
    productos = db.query(Producto).filter(
        Producto.owner_id == current_user.id
    ).order_by(Producto.created_at.desc()).all()
    
    return productos
@router.post("/proyecto/{proyecto_id}/generate-template")
def generar_productos_base(
    proyecto_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Genera automáticamente productos placeholder basados en la tipología del proyecto."""
    proyecto = db.query(Proyecto).filter(Proyecto.id == proyecto_id).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Verificar acceso al proyecto
    has_access = (
        current_user.rol == "admin" or
        str(proyecto.owner_id) == str(current_user.id) or
        any(str(m.id) == str(current_user.id) for m in proyecto.equipo)
    )
    if not has_access:
        raise HTTPException(status_code=403, detail="Sin acceso al proyecto")

    # Verificar si ya tiene productos
    existentes = db.query(Producto).filter(Producto.proyecto_id == proyecto_id).count()
    if existentes > 0:
        raise HTTPException(status_code=400, detail="El proyecto ya cuenta con productos registrados")

    # Definir Plantillas Institucionales (Placeholders)
    PLANTILLAS = {
        "Investigación": [
            {"tipo": "articulo", "nombre": "Artículo de Investigación (Publicación Q1/Q2)", "desc": "Resultado principal de la investigación para revista indexada."},
            {"tipo": "ponencia", "nombre": "Ponencia en Evento Internacional", "desc": "Divulgación de resultados en congreso especializado."},
            {"tipo": "capitulo_libro", "nombre": "Capítulo de Libro de Investigación", "desc": "Consolidación teórica y resultados finales."}
        ],
        "Innovación": [
            {"tipo": "software", "nombre": "Registro de Software / Aplicativo", "desc": "Desarrollo tecnológico funcional resultante del proyecto."},
            {"tipo": "prototipo", "nombre": "Prototipo Industrial / Funcional", "desc": "Validación en entorno relevante o cuasi-real."},
            {"tipo": "manual", "nombre": "Manual de Usuario y Guía Técnica", "desc": "Documentación para la transferencia tecnológica."}
        ],
        "Modernización": [
            {"tipo": "informe", "nombre": "Informe de Impacto Tecnológico", "desc": "Evaluación de la mejora en la capacidad instalada del centro."},
            {"tipo": "video", "nombre": "Video de Transferencia de Conocimiento", "desc": "Material audiovisual para la formación profesional."}
        ],
        "Cultura": [
            {"tipo": "video", "nombre": "Video de Apropiación Social del Conocimiento", "desc": "Divulgación de resultados para la comunidad general."},
            {"tipo": "ponencia", "nombre": "Taller de Divulgación y Sensibilización", "desc": "Evento de transferencia a actores locales."}
        ]
    }

    # Seleccionar plantilla
    tipo = proyecto.tipologia or "Investigación"
    items = next((v for k, v in PLANTILLAS.items() if k.lower() in tipo.lower()), PLANTILLAS["Investigación"])
    
    nuevos_productos = []
    for item in items:
        producto = Producto(
            tipo=item["tipo"],
            nombre=f"[PROYECTADO] {item['nombre']}",
            descripcion=item["desc"],
            proyecto_id=proyecto_id,
            owner_id=str(current_user.id),
            is_verificado=False
        )
        db.add(producto)
        nuevos_productos.append(producto)

    db.commit()
    
    # Log
    log_actividad(
        db, current_user.id, "generate_products", 
        f"Generó productos automáticos ({len(items)}) para proyecto: {proyecto.nombre_corto or proyecto.id}",
        entidad_tipo="proyecto", entidad_id=proyecto_id
    )

    return {"message": f"Productos proyectados generados exitosamente ({len(items)})", "count": len(items)}
