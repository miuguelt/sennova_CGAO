"""
Router de Usuarios (Admin)
Gestión completa de usuarios del sistema
Solo accesible por administradores
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.auth import get_current_user, get_current_admin, get_password_hash
from app.database import get_db
from app.models import User, Proyecto, Grupo, Semillero, Producto, Actividad, Documento
from app.schemas import UserCreate, UserUpdate, UserResponse, ActividadResponse

router = APIRouter(prefix="/usuarios", tags=["Usuarios - Admin Only"])


def _make_user_dict(user: User, db: Session = None) -> dict:
    """Convierte un User a diccionario para serialización."""
    cv_pdf_id = None
    if db:
        cv_doc = db.query(Documento).filter(
            Documento.entidad_tipo == "user",
            Documento.entidad_id == user.id,
            Documento.tipo == "cvlac_pdf"
        ).order_by(Documento.created_at.desc()).first()
        if cv_doc:
            cv_pdf_id = str(cv_doc.id)

    return {
        "id": str(user.id),
        "email": user.email,
        "nombre": user.nombre,
        "rol": user.rol,
        "sede": user.sede,
        "regional": user.regional,
        "is_active": user.is_active,
        "cv_lac_url": user.cv_lac_url,
        "estado_cv_lac": user.estado_cv_lac,
        "cv_pdf_id": cv_pdf_id,
        "nivel_academico": user.nivel_academico,
        "rol_sennova": user.rol_sennova,
        "created_at": user.created_at,
        "updated_at": user.updated_at
    }


@router.get("")
def list_usuarios(
    skip: int = 0,
    limit: int = 100,
    rol: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Listar todos los usuarios (solo admin)."""
    query = db.query(User)
    
    if rol:
        query = query.filter(User.rol == rol)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (User.nombre.ilike(search_filter)) |
            (User.email.ilike(search_filter))
        )
    
    usuarios = query.offset(skip).limit(limit).all()
    return [_make_user_dict(u, db) for u in usuarios]


@router.get("/{user_id}")
def get_usuario(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener detalle de un usuario (admin o el propio usuario)."""
    # Permitir si es admin O si es el mismo usuario
    if current_user.rol != "admin" and str(current_user.id) != str(user_id):
        raise HTTPException(status_code=403, detail="No tiene permiso para ver este perfil")
        
    user = db.query(User).filter(User.id == str(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return _make_user_dict(user, db)


from app.repositories.user_repository import UserRepository

@router.post("", status_code=201)
def create_usuario(
    user_data: UserCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Crear un nuevo usuario usando Repository Pattern (solo admin)."""
    repo = UserRepository(db)
    
    # Verificar email único
    if repo.get_by_email(user_data.email):
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    user = repo.create(user_data)
    return _make_user_dict(user, db)



@router.put("/{user_id}")
def update_usuario(
    user_id: str,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar un usuario (admin o el propio usuario)."""
    # Permitir si es admin O si es el mismo usuario
    if current_user.rol != "admin" and str(current_user.id) != str(user_id):
        raise HTTPException(status_code=403, detail="No tiene permiso para actualizar este perfil")

    user = db.query(User).filter(User.id == str(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # REGLA DE SEGURIDAD: Solo admin puede cambiar roles o estado activo
    update_data = user_update.dict(exclude_unset=True)
    
    if current_user.rol != "admin":
        # Si no es admin, quitar campos sensibles
        sensitive_fields = ["rol", "is_active", "rol_sennova", "email"]
        for field in sensitive_fields:
            if field in update_data:
                del update_data[field]
    else:
        # Si es admin, aplicar lógica de seguridad para el último admin
        if user.rol == "admin" and update_data.get("rol") == "investigador":
            admin_count = db.query(User).filter(User.rol == "admin").count()
            if admin_count <= 1:
                raise HTTPException(status_code=400, detail="No se puede cambiar el rol del único admin")
    
    # Si viene password, hashearla
    if "password" in update_data and update_data["password"]:
        from app.auth import get_password_hash
        user.password_hash = get_password_hash(update_data["password"])
        del update_data["password"]

    for field, value in update_data.items():
        setattr(user, field, value)
    
    user.updated_at = func.now()
    db.commit()
    db.refresh(user)
    
    return _make_user_dict(user, db)


@router.delete("/{user_id}")
def delete_usuario(
    user_id: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Eliminar un usuario (solo admin)."""
    user = db.query(User).filter(User.id == str(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # No permitir eliminarse a sí mismo
    if str(user.id) == str(admin.id):
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    
    # No permitir eliminar el último admin
    if user.rol == "admin":
        admin_count = db.query(User).filter(User.rol == "admin").count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="No se puede eliminar el único admin")
    
    db.delete(user)
    db.commit()
    
    return {"message": "Usuario eliminado"}


@router.post("/{user_id}/reset-password")
def reset_password(
    user_id: str,
    new_password: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Resetear contraseña de un usuario (solo admin)."""
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Contraseña debe tener al menos 6 caracteres")
    
    user = db.query(User).filter(User.id == str(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    user.password_hash = get_password_hash(new_password)
    user.updated_at = func.now()
    db.commit()
    
    return {"message": "Contraseña actualizada"}


@router.post("/{user_id}/toggle-active")
def toggle_user_active(
    user_id: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Activar/desactivar usuario (solo admin)."""
    user = db.query(User).filter(User.id == str(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # No permitir desactivarse a sí mismo
    if str(user.id) == str(admin.id):
        raise HTTPException(status_code=400, detail="No puedes desactivarte a ti mismo")
    
    user.is_active = not user.is_active
    user.updated_at = func.now()
    db.commit()
    
    return {
        "message": f"Usuario {'activado' if user.is_active else 'desactivado'}",
        "is_active": user.is_active
    }


# ==========================================
# ESTADÍSTICAS Y REPORTES
# ==========================================

@router.get("/stats/resumen")
def get_usuarios_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Estadísticas de usuarios (Acceso investigadores)."""
    # Convertir Rows de SQLAlchemy a diccionarios o listas simples
    por_rol = [
        {"rol": row[0], "count": row[1]} 
        for row in db.query(User.rol, func.count(User.id)).group_by(User.rol).all()
    ]
    
    por_sede = [
        {"sede": row[0], "count": row[1]} 
        for row in db.query(User.sede, func.count(User.id)).filter(User.sede != None).group_by(User.sede).all()
    ]
    
    por_regional = [
        {"regional": row[0], "count": row[1]} 
        for row in db.query(User.regional, func.count(User.id)).filter(User.regional != None).group_by(User.regional).all()
    ]

    return {
        "total": db.query(User).count(),
        "activos": db.query(User).filter(User.is_active == True).count(),
        "inactivos": db.query(User).filter(User.is_active == False).count(),
        "por_rol": por_rol,
        "por_sede": por_sede,
        "por_regional": por_regional,
    }


@router.get("/{user_id}/actividad")
def get_user_actividad(
    user_id: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Obtener actividad completa de un usuario (solo admin)."""
    user = db.query(User).filter(User.id == str(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {
        "usuario": _make_user_dict(user, db),
        "proyectos_creados": db.query(Proyecto).filter(Proyecto.owner_id == str(user.id)).count(),
        "proyectos_miembro": len(user.proyectos_miembro) if user.proyectos_miembro else 0,
        "grupos_creados": db.query(Grupo).filter(Grupo.owner_id == str(user.id)).count(),
        "grupos_miembro": len(user.grupos_miembro) if user.grupos_miembro else 0,
        "semilleros_creados": db.query(Semillero).filter(Semillero.owner_id == str(user.id)).count(),
        "productos_creados": db.query(Producto).filter(Producto.owner_id == str(user.id)).count(),
        "productos_verificados": db.query(Producto).filter(
            Producto.owner_id == str(user.id),
            Producto.is_verificado == True
        ).count()
    }


@router.get("/{user_id}/historial", response_model=List[ActividadResponse])
def get_user_historial(
    user_id: str,
    limit: int = 50,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Obtener el historial de interacciones de un usuario (solo admin)."""
    historial = db.query(Actividad).filter(
        Actividad.user_id == str(user_id)
    ).order_by(Actividad.created_at.desc()).limit(limit).all()
    return historial
