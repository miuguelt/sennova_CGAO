from uuid import UUID
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_current_admin
from app.database import get_db
from app.models import Grupo, User, grupo_integrantes
from app.schemas import GrupoCreate, GrupoUpdate, GrupoResponse
from app.utils import log_actividad

router = APIRouter(prefix="/grupos", tags=["Grupos de Investigación"])


def _make_grupo_dict(grupo: Grupo, db: Session) -> dict:
    """Convierte un objeto Grupo a diccionario para serialización correcta."""
    # Obtener integrantes con info de la tabla de asociación
    integrantes = []
    for user in grupo.integrantes:
        # Buscar info de la tabla de asociación
        result = db.execute(
            grupo_integrantes.select().where(
                grupo_integrantes.c.grupo_id == str(grupo.id),
                grupo_integrantes.c.user_id == str(user.id)
            )
        ).fetchone()
        
        integrante_info = {
            "id": str(user.id),
            "nombre": user.nombre,
            "email": user.email,
            "rol_en_grupo": result.rol_en_grupo if result else "Miembro",
            "fecha_vinculacion": result.fecha_vinculacion if result else None
        }
        integrantes.append(integrante_info)
    
    return {
        "id": str(grupo.id),
        "nombre": grupo.nombre,
        "nombre_completo": grupo.nombre_completo,
        "codigo_gruplac": grupo.codigo_gruplac,
        "clasificacion": grupo.clasificacion,
        "gruplac_url": grupo.gruplac_url,
        "lineas_investigacion": grupo.lineas_investigacion or [],
        "is_publico": grupo.is_publico,
        "estado": grupo.estado,
        "owner_id": str(grupo.owner_id),
        "owner": None,  # Simplificado para evitar recursión
        "integrantes": integrantes,
        "total_integrantes": len(integrantes),
        "created_at": grupo.created_at
    }


@router.get("")
def list_grupos(
    skip: int = 0,
    limit: int = 100,
    clasificacion: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar grupos de investigación."""
    query = db.query(Grupo)
    
    if clasificacion:
        query = query.filter(Grupo.clasificacion == clasificacion)
    
    grupos = query.offset(skip).limit(limit).all()
    
    # Convertir a diccionarios para serialización correcta
    return [_make_grupo_dict(g, db) for g in grupos]


@router.get("/{grupo_id}")
def get_grupo(
    grupo_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener detalle de un grupo."""
    grupo = db.query(Grupo).filter(Grupo.id == str(grupo_id)).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    return _make_grupo_dict(grupo, db)


@router.post("", status_code=201)
def create_grupo(
    grupo_data: GrupoCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear un nuevo grupo de investigación."""
    grupo = Grupo(
        nombre=grupo_data.nombre,
        nombre_completo=grupo_data.nombre_completo,
        codigo_gruplac=grupo_data.codigo_gruplac,
        clasificacion=grupo_data.clasificacion,
        gruplac_url=grupo_data.gruplac_url,
        lineas_investigacion=grupo_data.lineas_investigacion,
        is_publico=grupo_data.is_publico,
        owner_id=str(current_user.id)
    )
    
    db.add(grupo)
    db.commit()
    db.refresh(grupo)
    
    # Owner es automáticamente líder del grupo
    db.execute(
        grupo_integrantes.insert().values(
            grupo_id=str(grupo.id),
            user_id=str(current_user.id),
            rol_en_grupo='Líder'
        )
    )
    db.commit()
    db.refresh(grupo)
    
    # Registrar actividad
    log_actividad(
        db, 
        current_user.id, 
        "accion_grupo", 
        f"Realizó una acción sobre el grupo: {grupo.nombre}",
        entidad_tipo="grupo",
        entidad_id=str(grupo.id)
    )
    
    return _make_grupo_dict(grupo, db)


@router.put("/{grupo_id}")
def update_grupo(
    grupo_id: str,
    grupo_update: GrupoUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar un grupo."""
    grupo = db.query(Grupo).filter(Grupo.id == str(grupo_id)).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    # Solo admin o owner pueden editar
    if current_user.rol != "admin" and str(grupo.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso para editar")
    
    update_data = grupo_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(grupo, field, value)
    
    db.commit()
    db.refresh(grupo)
    
    # Registrar actividad
    log_actividad(
        db, 
        current_user.id, 
        "accion_grupo", 
        f"Realizó una acción sobre el grupo: {grupo.nombre}",
        entidad_tipo="grupo",
        entidad_id=str(grupo.id)
    )
    
    return _make_grupo_dict(grupo, db)


@router.delete("/{grupo_id}")
def delete_grupo(
    grupo_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar un grupo."""
    grupo = db.query(Grupo).filter(Grupo.id == str(grupo_id)).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    if current_user.rol != "admin" and str(grupo.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso para eliminar")
    
    db.delete(grupo)
    db.commit()
    
    return {"message": "Grupo eliminado"}


# ==========================================
# GESTIÓN DE INTEGRANTES
# ==========================================

@router.post("/{grupo_id}/integrantes")
def add_integrante(
    grupo_id: str,
    user_id: str,
    rol_en_grupo: str = "Miembro",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Agregar integrante al grupo."""
    grupo = db.query(Grupo).filter(Grupo.id == str(grupo_id)).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    # Solo admin o owner pueden agregar integrantes
    if current_user.rol != "admin" and str(grupo.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Verificar si ya es integrante
    existing = db.query(grupo_integrantes).filter(
        grupo_integrantes.c.grupo_id == str(grupo_id),
        grupo_integrantes.c.user_id == str(user_id)
    ).first()
    
    from datetime import date
    if existing:
        # Actualizar rol si ya existe
        db.execute(
            grupo_integrantes.update().where(
                grupo_integrantes.c.grupo_id == str(grupo_id),
                grupo_integrantes.c.user_id == str(user_id)
            ).values(rol_en_grupo=rol_en_grupo)
        )
        db.commit()
        return {"message": "Rol de integrante actualizado"}
    
    db.execute(
        grupo_integrantes.insert().values(
            grupo_id=str(grupo.id),
            user_id=str(user.id),
            rol_en_grupo=rol_en_grupo,
            fecha_vinculacion=date.today()
        )
    )
    db.commit()
    
    return {"message": "Integrante agregado"}


@router.delete("/{grupo_id}/integrantes/{user_id}")
def remove_integrante(
    grupo_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remover integrante del grupo."""
    grupo = db.query(Grupo).filter(Grupo.id == str(grupo_id)).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    if current_user.rol != "admin" and str(grupo.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso")
    
    # No permitir remover al owner/líder
    if str(grupo.owner_id) == user_id:
        raise HTTPException(status_code=400, detail="No se puede remover al líder del grupo")
    
    db.execute(
        grupo_integrantes.delete().where(
            grupo_integrantes.c.grupo_id == grupo_id,
            grupo_integrantes.c.user_id == user_id
        )
    )
    db.commit()
    
    return {"message": "Integrante removido"}
