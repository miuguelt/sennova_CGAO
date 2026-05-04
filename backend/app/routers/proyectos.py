from uuid import UUID
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_current_admin
from app.database import get_db
from app.models import Proyecto, User, proyecto_equipo, Convocatoria
from app.schemas import (
    ProyectoCreate, ProyectoUpdate, ProyectoResponse,
    EquipoMiembro, EquipoMiembroInfo
)
from app.utils import log_actividad

router = APIRouter(prefix="/proyectos", tags=["Proyectos"])


def check_proyecto_access(proyecto: Proyecto, user: User) -> bool:
    """Verifica si el usuario tiene acceso al proyecto."""
    if user.rol == "admin":
        return True
    if proyecto.owner_id == user.id:
        return True
    # Verificar si es miembro del equipo
    for member in proyecto.equipo:
        if member.id == user.id:
            return True
    return False


@router.get("")
def list_proyectos(
    skip: int = 0,
    limit: int = 100,
    estado: Optional[str] = None,
    convocatoria_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar proyectos (todos si admin, solo propios/miembro si investigador)."""
    query = db.query(Proyecto)
    
    if current_user.rol != "admin":
        # Ver proyectos donde es owner
        query = query.filter(Proyecto.owner_id == str(current_user.id))
    
    if estado:
        query = query.filter(Proyecto.estado == estado)
    if convocatoria_id:
        query = query.filter(Proyecto.convocatoria_id == str(convocatoria_id))
    
    proyectos = query.offset(skip).limit(limit).all()
    
    # Construir respuesta manualmente para evitar errores de serialización
    result = []
    for p in proyectos:
        equipo = []
        for m in p.equipo:
            # Buscar info de la tabla de asociación
            eq_info = db.execute(
                proyecto_equipo.select().where(
                    proyecto_equipo.c.proyecto_id == str(p.id),
                    proyecto_equipo.c.user_id == str(m.id)
                )
            ).fetchone()
            equipo.append({
                "id": str(m.id),
                "nombre": m.nombre,
                "email": m.email,
                "rol_en_proyecto": eq_info.rol_en_proyecto if eq_info else None,
                "horas_dedicadas": eq_info.horas_dedicadas if eq_info else None
            })
        
        result.append({
            "id": str(p.id),
            "nombre": p.nombre,
            "nombre_corto": p.nombre_corto,
            "codigo_sgps": p.codigo_sgps,
            "estado": p.estado,
            "vigencia": p.vigencia,
            "presupuesto_total": p.presupuesto_total,
            "tipologia": p.tipologia,
            "linea_investigacion": p.linea_investigacion,
            "red_conocimiento": p.red_conocimiento,
            "descripcion": p.descripcion,
            "objetivo_general": p.objetivo_general,
            "objetivos_especificos": p.objetivos_especificos or [],
            "is_publico": p.is_publico,
            "presupuesto_detallado": p.presupuesto_detallado or {},
            "linea_programatica": p.linea_programatica,
            "reto_origen_id": str(p.reto_origen_id) if p.reto_origen_id else None,
            "convocatoria_id": str(p.convocatoria_id) if p.convocatoria_id else None,
            "owner_id": str(p.owner_id),
            "owner": None,
            "equipo": equipo,
            "total_equipo": len(equipo),
            "total_productos": len(p.productos),
            "created_at": p.created_at,
            "updated_at": p.updated_at
        })
    
    return result


@router.get("/{proyecto_id}")
def get_proyecto(
    proyecto_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener detalle de un proyecto."""
    proyecto = db.query(Proyecto).filter(Proyecto.id == str(proyecto_id)).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    if not check_proyecto_access(proyecto, current_user):
        raise HTTPException(status_code=403, detail="Sin acceso a este proyecto")
    
    # Construir respuesta manualmente
    equipo = []
    for m in proyecto.equipo:
        eq_info = db.execute(
            proyecto_equipo.select().where(
                proyecto_equipo.c.proyecto_id == str(proyecto.id),
                proyecto_equipo.c.user_id == str(m.id)
            )
        ).fetchone()
        equipo.append({
            "id": str(m.id),
            "nombre": m.nombre,
            "email": m.email,
            "rol_en_proyecto": eq_info.rol_en_proyecto if eq_info else None,
            "horas_dedicadas": eq_info.horas_dedicadas if eq_info else None
        })
    
    return {
        "id": str(proyecto.id),
        "nombre": proyecto.nombre,
        "nombre_corto": proyecto.nombre_corto,
        "codigo_sgps": proyecto.codigo_sgps,
        "estado": proyecto.estado,
        "vigencia": proyecto.vigencia,
        "presupuesto_total": proyecto.presupuesto_total,
        "tipologia": proyecto.tipologia,
        "linea_investigacion": proyecto.linea_investigacion,
        "red_conocimiento": proyecto.red_conocimiento,
        "descripcion": proyecto.descripcion,
        "objetivo_general": proyecto.objetivo_general,
        "objetivos_especificos": proyecto.objetivos_especificos or [],
        "is_publico": proyecto.is_publico,
        "presupuesto_detallado": proyecto.presupuesto_detallado or {},
        "linea_programatica": proyecto.linea_programatica,
        "reto_origen_id": str(proyecto.reto_origen_id) if proyecto.reto_origen_id else None,
        "convocatoria_id": str(proyecto.convocatoria_id) if proyecto.convocatoria_id else None,
        "owner_id": str(proyecto.owner_id),
        "owner": None,
        "equipo": equipo,
        "total_equipo": len(equipo),
        "total_productos": len(proyecto.productos),
        "created_at": proyecto.created_at,
        "updated_at": proyecto.updated_at
    }


@router.post("", status_code=201)
def create_proyecto(
    proyecto_data: ProyectoCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear un nuevo proyecto."""
    # Convertir UUID a string para SQLite
    convocatoria_id_str = str(proyecto_data.convocatoria_id) if proyecto_data.convocatoria_id else None
    
    proyecto = Proyecto(
        nombre=proyecto_data.nombre,
        nombre_corto=proyecto_data.nombre_corto,
        codigo_sgps=proyecto_data.codigo_sgps,
        estado=proyecto_data.estado,
        vigencia=proyecto_data.vigencia,
        presupuesto_total=proyecto_data.presupuesto_total,
        tipologia=proyecto_data.tipologia,
        linea_investigacion=proyecto_data.linea_investigacion,
        red_conocimiento=proyecto_data.red_conocimiento,
        descripcion=proyecto_data.descripcion,
        objetivo_general=proyecto_data.objetivo_general,
        objetivos_especificos=proyecto_data.objetivos_especificos,
        is_publico=proyecto_data.is_publico,
        presupuesto_detallado=proyecto_data.presupuesto_detallado,
        linea_programatica=proyecto_data.linea_programatica,
        reto_origen_id=str(proyecto_data.reto_origen_id) if proyecto_data.reto_origen_id else None,
        convocatoria_id=convocatoria_id_str,
        owner_id=str(current_user.id)
    )
    
    db.add(proyecto)
    db.flush()  # Para obtener el ID
    proyecto_id_str = str(proyecto.id)
    
    # Agregar equipo si se especificó
    if proyecto_data.equipo:
        for miembro_data in proyecto_data.equipo:
            miembro_user_id = str(miembro_data.user_id)
            miembro = db.query(User).filter(User.id == miembro_user_id).first()
            if miembro:
                db.execute(
                    proyecto_equipo.insert().values(
                        proyecto_id=proyecto_id_str,
                        user_id=str(miembro.id),
                        rol_en_proyecto=miembro_data.rol_en_proyecto,
                        horas_dedicadas=miembro_data.horas_dedicadas
                    )
                )
    
    db.commit()
    db.refresh(proyecto)
    
    # Registrar actividad
    log_actividad(
        db, 
        current_user.id, 
        "crear_proyecto", 
        f"Creó el proyecto: {proyecto.nombre}",
        entidad_tipo="proyecto",
        entidad_id=str(proyecto.id)
    )
    
    return {
        "id": proyecto_id_str,
        "nombre": proyecto.nombre,
        "nombre_corto": proyecto.nombre_corto,
        "codigo_sgps": proyecto.codigo_sgps,
        "estado": proyecto.estado,
        "vigencia": proyecto.vigencia,
        "presupuesto_total": proyecto.presupuesto_total,
        "tipologia": proyecto.tipologia,
        "linea_investigacion": proyecto.linea_investigacion,
        "red_conocimiento": proyecto.red_conocimiento,
        "descripcion": proyecto.descripcion,
        "objetivo_general": proyecto.objetivo_general,
        "objetivos_especificos": proyecto.objetivos_especificos or [],
        "is_publico": proyecto.is_publico,
        "presupuesto_detallado": proyecto.presupuesto_detallado or {},
        "linea_programatica": proyecto.linea_programatica,
        "reto_origen_id": str(proyecto.reto_origen_id) if proyecto.reto_origen_id else None,
        "convocatoria_id": str(proyecto.convocatoria_id) if proyecto.convocatoria_id else None,
        "owner_id": str(proyecto.owner_id),
        "owner": None,
        "equipo": [],
        "total_equipo": 0,
        "total_productos": 0,
        "created_at": proyecto.created_at,
        "updated_at": proyecto.updated_at
    }


@router.put("/{proyecto_id}")
def update_proyecto(
    proyecto_id: str,
    proyecto_update: ProyectoUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar un proyecto."""
    proyecto = db.query(Proyecto).filter(Proyecto.id == str(proyecto_id)).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Solo admin o owner pueden editar
    if current_user.rol != "admin" and str(proyecto.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso para editar")
    
    update_data = proyecto_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field != "equipo":  # Equipo se maneja separado
            # Si el campo es convocatoria_id, asegurar que sea string para SQLite
            if field == "convocatoria_id" and value:
                value = str(value)
            setattr(proyecto, field, value)
    
    db.commit()
    db.refresh(proyecto)

    # Registrar actividad
    log_actividad(
        db, 
        current_user.id, 
        "actualizar_proyecto", 
        f"Actualizó el proyecto: {proyecto.nombre}",
        entidad_tipo="proyecto",
        entidad_id=str(proyecto.id)
    )

    # Retornar el detalle completo (usando el mismo formato que get_proyecto)
    return get_proyecto(proyecto_id, current_user, db)


@router.delete("/{proyecto_id}")
def delete_proyecto(
    proyecto_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar un proyecto."""
    proyecto = db.query(Proyecto).filter(Proyecto.id == str(proyecto_id)).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    # Solo admin o owner pueden eliminar
    if current_user.rol != "admin" and str(proyecto.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso para eliminar")

    # Guardar nombre para el log antes de borrar
    nombre_proyecto = proyecto.nombre

    db.delete(proyecto)
    db.commit()

    # Registrar actividad
    log_actividad(
        db, 
        current_user.id, 
        "eliminar_proyecto", 
        f"Eliminó el proyecto: {nombre_proyecto}",
        entidad_tipo="proyecto",
        entidad_id=str(proyecto_id)
    )

    return {"message": "Proyecto eliminado"}



# ==========================================
# GESTIÓN DE EQUIPO
# ==========================================

@router.post("/{proyecto_id}/equipo")
def add_proyecto_miembro(
    proyecto_id: str,
    miembro_data: EquipoMiembro,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Añadir un miembro al equipo del proyecto."""
    proyecto = db.query(Proyecto).filter(Proyecto.id == str(proyecto_id)).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Solo admin o owner pueden añadir miembros
    if current_user.rol != "admin" and str(proyecto.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso para editar equipo")
    
    # Verificar si el usuario ya es miembro
    for m in proyecto.equipo:
        if str(m.id) == str(miembro_data.user_id):
            raise HTTPException(status_code=400, detail="El usuario ya es miembro del proyecto")
    
    # Añadir a la tabla de asociación
    db.execute(
        proyecto_equipo.insert().values(
            proyecto_id=str(proyecto_id),
            user_id=str(miembro_data.user_id),
            rol_en_proyecto=miembro_data.rol_en_proyecto,
            horas_dedicadas=miembro_data.horas_dedicadas
        )
    )
    db.commit()
    
    return {"message": "Miembro añadido correctamente"}


@router.delete("/{proyecto_id}/equipo/{user_id}")
def remove_proyecto_miembro(
    proyecto_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar un miembro del equipo."""
    proyecto = db.query(Proyecto).filter(Proyecto.id == str(proyecto_id)).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Solo admin o owner pueden quitar miembros
    if current_user.rol != "admin" and str(proyecto.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso para editar equipo")
    
    # No permitir quitar al dueño
    if str(proyecto.owner_id) == str(user_id):
        raise HTTPException(status_code=400, detail="No se puede eliminar al dueño del proyecto")
    
    db.execute(
        proyecto_equipo.delete().where(
            proyecto_equipo.c.proyecto_id == str(proyecto_id),
            proyecto_equipo.c.user_id == str(user_id)
        )
    )
    db.commit()
    
    return {"message": "Miembro eliminado correctamente"}
