from typing import Optional

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import Proyecto, User, proyecto_equipo, Entregable, Grupo, Semillero
from app.schemas import (
    ProyectoCreate, ProyectoUpdate, EquipoMiembro
)
from app.utils import log_actividad
from app.services.proyectos_service import (
    evaluar_requisitos_liquidacion,
    evaluar_y_auto_finalizar_proyecto,
    calcular_estatus_elaboracion
)

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


def can_edit_proyecto(proyecto: Proyecto, user: User) -> bool:
    """Solo admin o owner pueden editar/eliminar/liquidar un proyecto."""
    return user.rol == "admin" or str(proyecto.owner_id) == str(user.id)


def _format_proyecto_dict(
    p: Proyecto,
    equipo_map: dict = None,
    entregables_info: dict = None
) -> dict:
    """Construye un diccionario serializable y enriquecido para un proyecto."""
    p_id_str = str(p.id)
    
    # 1. Integrantes del equipo
    equipo = []
    if p.equipo:
        for m in p.equipo:
            info = equipo_map.get(str(m.id)) if equipo_map else None
            equipo.append({
                "id": str(m.id),
                "nombre": m.nombre,
                "email": m.email,
                "rol": getattr(m, 'rol', None),
                "rol_sennova": getattr(m, 'rol_sennova', None),
                "sede": getattr(m, 'sede', None),
                "rol_en_proyecto": info.rol_en_proyecto if info else "Miembro",
                "horas_dedicadas": info.horas_dedicadas if info else 0,
                "ficha": getattr(m, 'ficha', None),
                "programa_formacion": getattr(m, 'programa_formacion', None)
            })

    # 2. Resolución de Grupo y Semillero
    grupo_id_resolved = str(p.grupo_id) if p.grupo_id else (
        str(p.semillero.grupo_id) if p.semillero and p.semillero.grupo_id else None
    )
    grupo_nombre_resolved = p.grupo.nombre if p.grupo else (
        p.semillero.grupo.nombre if p.semillero and p.semillero.grupo else None
    )
    semillero_nombre_resolved = p.semillero.nombre if p.semillero else None

    # 3. Avance técnico / Cumplimiento de entregables
    total_entregables = 0
    entregables_aprobados = 0
    if entregables_info:
        total_entregables = entregables_info.get("total", 0)
        entregables_aprobados = entregables_info.get("aprobados", 0)
    elif hasattr(p, 'entregables') and p.entregables is not None:
        try:
            entregables_list = list(p.entregables)
            total_entregables = len(entregables_list)
            entregables_aprobados = sum(1 for e in entregables_list if e.estado == 'aprobado')
        except Exception:
            pass

    if total_entregables > 0:
        avance_porcentaje = int((entregables_aprobados / total_entregables) * 100)
    elif str(p.estado).lower() in ("finalizado", "completado"):
        avance_porcentaje = 100
    else:
        avance_porcentaje = 0

    return {
        "id": p_id_str,
        "nombre": p.nombre,
        "nombre_corto": p.nombre_corto,
        "codigo_sgps": p.codigo_sgps,
        "estado": p.estado,
        "vigencia": p.vigencia,
        "presupuesto_total": p.presupuesto_total,
        "año": p.año,
        "año_fin": p.año_fin,
        "continua_siguiente_año": p.continua_siguiente_año,
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
        "semillero_id": str(p.semillero_id) if p.semillero_id else None,
        "semillero_nombre": semillero_nombre_resolved,
        "grupo_id": grupo_id_resolved,
        "grupo_nombre": grupo_nombre_resolved,
        "convocatoria_id": str(p.convocatoria_id) if p.convocatoria_id else None,
        "owner_id": str(p.owner_id),
        "owner": {
            "id": str(p.owner.id),
            "nombre": p.owner.nombre,
            "email": p.owner.email
        } if p.owner else None,
        "equipo": equipo,
        "total_equipo": len(equipo),
        "total_productos": len(p.productos) if p.productos else 0,
        "total_entregables": total_entregables,
        "entregables_aprobados": entregables_aprobados,
        "avance_porcentaje": avance_porcentaje,
        "created_at": p.created_at,
        "updated_at": p.updated_at
    }


@router.get("")
def list_proyectos(
    skip: int = 0,
    limit: int = 100,
    estado: Optional[str] = None,
    convocatoria_id: Optional[str] = None,
    grupo_id: Optional[str] = None,
    semillero_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar proyectos con sus relaciones, equipo, grupo y avance técnico."""
    query = db.query(Proyecto).options(
        joinedload(Proyecto.equipo),
        joinedload(Proyecto.productos),
        joinedload(Proyecto.semillero).joinedload(Semillero.grupo),
        joinedload(Proyecto.grupo),
        joinedload(Proyecto.owner)
    )
    
    if current_user.rol != "admin":
        # Ver proyectos donde es owner o miembro del equipo
        query = query.filter(
            (Proyecto.owner_id == str(current_user.id)) | 
            (Proyecto.equipo.any(User.id == current_user.id))
        )
    
    if estado:
        query = query.filter(Proyecto.estado == estado)
    if convocatoria_id:
        query = query.filter(Proyecto.convocatoria_id == str(convocatoria_id))
    if semillero_id:
        query = query.filter(Proyecto.semillero_id == str(semillero_id))
    if grupo_id:
        query = query.filter(
            (Proyecto.grupo_id == str(grupo_id)) |
            (Proyecto.semillero.has(Semillero.grupo_id == str(grupo_id)))
        )
    
    proyectos = query.offset(skip).limit(limit).all()
    
    # Pre-cargar toda la tabla de asociación de equipo para evitar consultas repetitivas
    proyecto_ids = [str(p.id) for p in proyectos]
    equipo_data_all = []
    if proyecto_ids:
        stmt = proyecto_equipo.select().where(proyecto_equipo.c.proyecto_id.in_(proyecto_ids))
        equipo_data_all = db.execute(stmt).fetchall()
    
    # Mapa de {proyecto_id: {user_id: row}}
    equipo_master_map = {}
    for row in equipo_data_all:
        p_id = str(row.proyecto_id)
        u_id = str(row.user_id)
        if p_id not in equipo_master_map:
            equipo_master_map[p_id] = {}
        equipo_master_map[p_id][u_id] = row

    # Pre-cargar estadísticas de entregables de forma agregada
    entregables_map = {}
    if proyecto_ids:
        entregables_query = db.query(
            Entregable.proyecto_id,
            sa.func.count(Entregable.id).label('total'),
            sa.func.sum(sa.case((Entregable.estado == 'aprobado', 1), else_=0)).label('aprobados')
        ).filter(Entregable.proyecto_id.in_(proyecto_ids)).group_by(Entregable.proyecto_id).all()
        
        for row in entregables_query:
            entregables_map[str(row.proyecto_id)] = {
                "total": int(row.total or 0),
                "aprobados": int(row.aprobados or 0)
            }

    result = []
    for p in proyectos:
        p_id_str = str(p.id)
        equipo_map = equipo_master_map.get(p_id_str, {})
        e_info = entregables_map.get(p_id_str, {"total": 0, "aprobados": 0})
        result.append(_format_proyecto_dict(p, equipo_map=equipo_map, entregables_info=e_info))
    
    return result


@router.get("/{proyecto_id}")
def get_proyecto(
    proyecto_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener detalle enriquecido de un proyecto."""
    proyecto = db.query(Proyecto).options(
        joinedload(Proyecto.equipo),
        joinedload(Proyecto.productos),
        joinedload(Proyecto.semillero).joinedload(Semillero.grupo),
        joinedload(Proyecto.grupo),
        joinedload(Proyecto.owner)
    ).filter(Proyecto.id == str(proyecto_id)).first()
    
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    if not check_proyecto_access(proyecto, current_user):
        raise HTTPException(status_code=403, detail="Sin acceso a este proyecto")
    
    # Obtener equipo
    stmt = proyecto_equipo.select().where(proyecto_equipo.c.proyecto_id == str(proyecto.id))
    equipo_res = db.execute(stmt).fetchall()
    equipo_map = {str(row.user_id): row for row in equipo_res}

    # Entregables del proyecto
    entregables_list = list(proyecto.entregables or [])
    e_info = {
        "total": len(entregables_list),
        "aprobados": sum(1 for e in entregables_list if e.estado == 'aprobado')
    }

    return _format_proyecto_dict(proyecto, equipo_map=equipo_map, entregables_info=e_info)


@router.post("", status_code=201)
def create_proyecto(
    proyecto_data: ProyectoCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear un nuevo proyecto vinculándolo a su grupo y semillero."""
    if current_user.rol == 'aprendiz':
        raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para crear proyectos")
        
    convocatoria_id_str = str(proyecto_data.convocatoria_id) if proyecto_data.convocatoria_id else None
    grupo_id_str = str(proyecto_data.grupo_id) if proyecto_data.grupo_id else None
    semillero_id_str = str(proyecto_data.semillero_id) if proyecto_data.semillero_id else None

    # Si se especificó semillero pero no grupo, resolver automáticamente el grupo del semillero
    if semillero_id_str and not grupo_id_str:
        semillero_obj = db.query(Semillero).filter(Semillero.id == semillero_id_str).first()
        if semillero_obj and semillero_obj.grupo_id:
            grupo_id_str = str(semillero_obj.grupo_id)
    
    # Si aún no hay grupo_id, asignar el primer grupo disponible
    if not grupo_id_str:
        first_grupo = db.query(Grupo).first()
        if first_grupo:
            grupo_id_str = str(first_grupo.id)
    
    proyecto = Proyecto(
        nombre=proyecto_data.nombre,
        nombre_corto=proyecto_data.nombre_corto,
        codigo_sgps=proyecto_data.codigo_sgps,
        estado=proyecto_data.estado,
        vigencia=proyecto_data.vigencia,
        presupuesto_total=proyecto_data.presupuesto_total,
        año=proyecto_data.año,
        año_fin=proyecto_data.año_fin,
        continua_siguiente_año=proyecto_data.continua_siguiente_año,
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
        semillero_id=semillero_id_str,
        grupo_id=grupo_id_str,
        convocatoria_id=convocatoria_id_str,
        owner_id=str(current_user.id)
    )
    
    try:
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
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear proyecto: {str(e)}")
    
    # Registrar actividad
    log_actividad(
        db, 
        current_user.id, 
        "crear_proyecto", 
        f"Creó el proyecto: {proyecto.nombre}",
        entidad_tipo="proyecto",
        entidad_id=str(proyecto.id)
    )
    
    return get_proyecto(str(proyecto.id), current_user, db)


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
    if not can_edit_proyecto(proyecto, current_user):
        raise HTTPException(status_code=403, detail="Sin permiso para editar")

    # Los aprendices no pueden cambiar estados de proyectos
    if current_user.rol == 'aprendiz':
        raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para modificar proyectos")
    
    update_data = proyecto_update.model_dump(exclude_unset=True)
    
    # Validación de Liquidación (Finalizado)
    if update_data.get("estado") == "Finalizado":
        try:
            check = check_liquidacion(proyecto_id, db, current_user)
            if not check["can_liquidate"]:
                raise HTTPException(
                    status_code=400, 
                    detail=f"No se puede finalizar el proyecto. {check['message']}"
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error al validar liquidación: {str(e)}"
            )

    for field, value in update_data.items():
        if field != "equipo":  # Equipo se maneja separado
            if field in ("convocatoria_id", "reto_origen_id", "semillero_id", "grupo_id"):
                if value is not None and str(value).strip() not in ("", "null", "None"):
                    value = str(value)
                else:
                    value = None
            setattr(proyecto, field, value)
            
    # Si cambió semillero_id y no se pasó grupo_id explícitamente, actualizar grupo_id
    if "semillero_id" in update_data and proyecto.semillero_id and not update_data.get("grupo_id"):
        semillero_obj = db.query(Semillero).filter(Semillero.id == str(proyecto.semillero_id)).first()
        if semillero_obj and semillero_obj.grupo_id:
            proyecto.grupo_id = str(semillero_obj.grupo_id)
    
    try:
        db.commit()
        db.refresh(proyecto)
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al actualizar proyecto: {str(e)}")

    # Registrar actividad
    log_actividad(
        db, 
        current_user.id, 
        "actualizar_proyecto", 
        f"Actualizó el proyecto: {proyecto.nombre}",
        entidad_tipo="proyecto",
        entidad_id=str(proyecto.id)
    )

    # Retornar el detalle completo
    return get_proyecto(proyecto_id, current_user, db)


@router.get("/{proyecto_id}/liquidar/check")
@router.get("/{proyecto_id}/check-liquidacion")
def check_liquidacion(
    proyecto_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Verifica si un proyecto cumple con todos los requisitos institucionales SENNOVA para ser liquidado (Finalizado).
    Si cumple el 100%, activa la transición automática a estado Finalizado.
    """
    try:
        proyecto = db.query(Proyecto).filter(Proyecto.id == str(proyecto_id)).first()
        if not proyecto:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        
        # Solo admin o owner pueden verificar liquidación
        if not can_edit_proyecto(proyecto, current_user):
            raise HTTPException(status_code=403, detail="No tienes permiso para verificar liquidación de este proyecto")
        
        # Ejecutar evaluación y auto-finalización
        auto_res = evaluar_y_auto_finalizar_proyecto(proyecto_id, db)
        eval_res = evaluar_requisitos_liquidacion(proyecto, db)
        
        return {
            "can_liquidate": eval_res["can_liquidate"],
            "porcentaje_completitud": eval_res["porcentaje_completitud"],
            "items_cumplidos": eval_res["items_cumplidos"],
            "total_items": eval_res["total_items"],
            "checklist": eval_res["checklist"],
            "auto_finalizado": auto_res.get("auto_finalizado", False),
            "message": eval_res["message"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al verificar liquidación: {str(e)}")


@router.get("/{proyecto_id}/elaboracion-status")
def get_elaboracion_status(
    proyecto_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene el diagnóstico de calidad y completitud en la elaboración/formulación del proyecto.
    """
    proyecto = db.query(Proyecto).filter(Proyecto.id == str(proyecto_id)).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    if not check_proyecto_access(proyecto, current_user):
        raise HTTPException(status_code=403, detail="Sin acceso a este proyecto")
    
    return calcular_estatus_elaboracion(proyecto, db)



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
    if not can_edit_proyecto(proyecto, current_user):
        raise HTTPException(status_code=403, detail="Sin permiso para eliminar")

    # Guardar nombre para el log antes de borrar
    nombre_proyecto = proyecto.nombre

    try:
        db.delete(proyecto)
        db.commit()
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar proyecto: {str(e)}")

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
    if not can_edit_proyecto(proyecto, current_user):
        raise HTTPException(status_code=403, detail="Sin permiso para editar equipo")
    
    # Verificar si el usuario ya es miembro
    for m in proyecto.equipo:
        if str(m.id) == str(miembro_data.user_id):
            raise HTTPException(status_code=400, detail="El usuario ya es miembro del proyecto")
    
    try:
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
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al añadir miembro: {str(e)}")
    
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
    if not can_edit_proyecto(proyecto, current_user):
        raise HTTPException(status_code=403, detail="Sin permiso para editar equipo")
    
    # No permitir quitar al dueño
    if str(proyecto.owner_id) == str(user_id):
        raise HTTPException(status_code=400, detail="No se puede eliminar al dueño del proyecto")
    
    try:
        db.execute(
            proyecto_equipo.delete().where(
                proyecto_equipo.c.proyecto_id == str(proyecto_id),
                proyecto_equipo.c.user_id == str(user_id)
            )
        )
        db.commit()
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar miembro: {str(e)}")
    
    return {"message": "Miembro eliminado correctamente"}
@router.post("/{proyecto_id}/generate-budget-template")
@router.post("/{proyecto_id}/generar-presupuesto-plantilla")
def generate_budget_template(
    proyecto_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Genera una estructura base de presupuesto según la tipología del proyecto."""
    proyecto = db.query(Proyecto).filter(Proyecto.id == str(proyecto_id)).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    if not check_proyecto_access(proyecto, current_user):
        raise HTTPException(status_code=403, detail="Sin acceso")

    # Plantillas base de rubros SENNOVA
    rubros_base = [
        {"categoria": "Talento Humano", "item": "Investigador Principal", "valor": 0, "descripcion": "Honorarios o descarga horaria"},
        {"categoria": "Materiales", "item": "Insumos de Laboratorio", "valor": 0, "descripcion": "Materiales consumibles"},
        {"categoria": "Equipos", "item": "Adquisición de Equipos", "valor": 0, "descripcion": "Maquinaria o hardware especializado"},
        {"categoria": "Software", "item": "Licencias de Software", "valor": 0, "descripcion": "Suscripciones o licencias perpetuas"},
        {"categoria": "Servicios", "item": "Servicios Tecnológicos", "valor": 0, "descripcion": "Pruebas externas o asesorías"},
        {"categoria": "Viajes", "item": "Viáticos y Salidas de Campo", "valor": 0, "descripcion": "Transporte y estadía"},
    ]
    
    # Ajustar según tipología
    if proyecto.tipologia == "Innovación":
        rubros_base.append({"categoria": "Propiedad Intelectual", "item": "Registro de Patente/Marca", "valor": 0, "descripcion": "Costos notariales y de registro"})
    elif proyecto.tipologia == "Modernización":
        rubros_base.append({"categoria": "Infraestructura", "item": "Adecuaciones Locativas", "valor": 0, "descripcion": "Mejoras al ambiente de formación"})

    try:
        proyecto.presupuesto_detallado = {"items": rubros_base, "total_estimado": 0}
        db.commit()
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al generar plantilla: {str(e)}")
    
    return {"status": "template_generated", "items_count": len(rubros_base)}
