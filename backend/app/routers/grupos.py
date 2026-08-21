from typing import Optional

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_current_admin
from app.database import get_db
from app.models import Grupo, User, grupo_integrantes
from app.schemas import GrupoCreate, GrupoUpdate
from app.utils import log_actividad

router = APIRouter(prefix="/grupos", tags=["Grupos de Investigación"])


def _make_grupo_dict(grupo: Grupo, db: Session) -> dict:
    """Convierte un objeto Grupo a diccionario para serialización correcta."""
    # Obtener integrantes con info de la tabla de asociación
    integrantes = []
    for user in grupo.integrantes:
        # Buscar info de la tabla de asociación usando query standard para mayor compatibilidad
        result = db.query(grupo_integrantes).filter(
            grupo_integrantes.c.grupo_id == grupo.id,
            grupo_integrantes.c.user_id == user.id
        ).first()
        
        integrante_info = {
            "id": str(user.id),
            "nombre": user.nombre,
            "email": user.email,
            "rol": getattr(user, 'rol', None),
            "rol_sennova": getattr(user, 'rol_sennova', None) or getattr(user, 'rol', None),
            "estado_cv_lac": getattr(user, 'estado_cv_lac', None) or "Sin CVLAC",
            "cv_lac_url": getattr(user, 'cv_lac_url', None),
            "rol_en_grupo": result.rol_en_grupo if result else "Miembro",
            "fecha_vinculacion": result.fecha_vinculacion.isoformat() if result and result.fecha_vinculacion else None
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
        "director_nombre": grupo.director_nombre,
        "director_email": grupo.director_email,
        "fecha_reconocimiento": grupo.fecha_reconocimiento.isoformat() if grupo.fecha_reconocimiento else None,
        "vigencia_hasta": grupo.vigencia_hasta.isoformat() if grupo.vigencia_hasta else None,
        "descripcion_grupo": grupo.descripcion_grupo,
        "mision": grupo.mision,
        "vision": grupo.vision,
        "plan_operativo_path": grupo.plan_operativo_path,
        "mision_path": grupo.mision_path,
        "convocatoria_activa": grupo.convocatoria_activa,
        "is_publico": grupo.is_publico,
        "estado": grupo.estado or 'activo',
        "owner_id": str(grupo.owner_id),
        "owner": {
            "id": str(grupo.owner.id),
            "nombre": grupo.owner.nombre,
            "email": grupo.owner.email
        } if grupo.owner else None,
        "integrantes": integrantes,
        "total_integrantes": len(integrantes),
        "created_at": grupo.created_at.isoformat() if hasattr(grupo.created_at, 'isoformat') and grupo.created_at else str(grupo.created_at)
    }


@router.get("")
def list_grupos(
    clasificacion: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar todos los grupos con sus integrantes."""
    from sqlalchemy.orm import joinedload
    
    query = db.query(Grupo).options(joinedload(Grupo.integrantes))
    
    if clasificacion:
        query = query.filter(Grupo.clasificacion == clasificacion)
    
    grupos = query.offset(skip).limit(limit).all()
    
    # Pre-cargar datos de la tabla de asociación
    grupo_ids = [str(g.id) for g in grupos]
    integrantes_data = []
    if grupo_ids:
        integrantes_data = db.query(grupo_integrantes, User.nombre, User.email).join(
            User, User.id == grupo_integrantes.c.user_id
        ).filter(grupo_integrantes.c.grupo_id.in_(grupo_ids)).all()
    
    # Mapa {grupo_id: [integrante_info, ...]}
    integrantes_map = {}
    for row in integrantes_data:
        g_id = str(row.grupo_id)
        if g_id not in integrantes_map:
            integrantes_map[g_id] = []
        integrantes_map[g_id].append({
            "id": str(row.user_id),
            "nombre": row.nombre,
            "email": row.email,
            "rol_en_grupo": row.rol_en_grupo,
            "fecha_vinculacion": row.fecha_vinculacion.isoformat() if row.fecha_vinculacion else None
        })
    
    result = []
    for g in grupos:
        g_dict = _make_grupo_dict(g, db)
        g_dict["integrantes"] = integrantes_map.get(str(g.id), [])
        g_dict["total_integrantes"] = len(g_dict["integrantes"])
        result.append(g_dict)
        
    return result


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
    current_user: User = Depends(get_current_admin),
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
    
    try:
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
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear grupo: {str(e)}")
    
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
    
    # Solo admin o owner pueden editar (aprendices no)
    if current_user.rol == "aprendiz":
        raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para modificar grupos")
    if current_user.rol != "admin" and str(grupo.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso para editar")
    
    update_data = grupo_update.model_dump(exclude_unset=True) if hasattr(grupo_update, 'model_dump') else grupo_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(grupo, field, value)
    
    try:
        db.commit()
        db.refresh(grupo)
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al actualizar grupo: {str(e)}")
    
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
    
    if current_user.rol == "aprendiz":
        raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para modificar grupos")
    if current_user.rol != "admin" and str(grupo.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso para eliminar")
    
    try:
        db.delete(grupo)
        db.commit()
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar grupo: {str(e)}")
    
    return {"message": "Grupo eliminado"}


# ==========================================
# GESTIÓN DE INTEGRANTES
# ==========================================

@router.get("/{grupo_id}/integrantes")
def get_integrantes(
    grupo_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar integrantes de un grupo de investigación."""
    grupo = db.query(Grupo).filter(Grupo.id == str(grupo_id)).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    return [
        {
            "id": str(u.id),
            "nombre": u.nombre,
            "email": u.email,
            "rol_sennova": getattr(u, 'rol_sennova', None) or u.rol,
            "sede": u.sede
        } for u in grupo.integrantes
    ]


@router.post("/{grupo_id}/integrantes")
def add_integrante(
    grupo_id: str,
    payload: Optional[dict] = None,
    user_id: Optional[str] = None,
    rol_en_grupo: Optional[str] = "Miembro",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Agregar integrante al grupo (soporta JSON body o query params)."""
    # Extraer parámetros de payload si viene como JSON
    if payload and isinstance(payload, dict):
        user_id = payload.get("user_id") or user_id
        rol_en_grupo = payload.get("rol_en_grupo") or payload.get("rol") or rol_en_grupo or "Miembro"

    if not user_id:
        raise HTTPException(status_code=422, detail="El campo user_id es requerido")

    grupo = db.query(Grupo).filter(Grupo.id == str(grupo_id)).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    # Solo admin o owner pueden agregar integrantes
    if current_user.rol == "aprendiz":
        raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para modificar grupos")
    if current_user.rol != "admin" and str(grupo.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso")
    
    user = db.query(User).filter(User.id == str(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Verificar si ya es integrante
    existing = db.query(grupo_integrantes).filter(
        grupo_integrantes.c.grupo_id == str(grupo_id),
        grupo_integrantes.c.user_id == str(user_id)
    ).first()
    
    from datetime import date
    try:
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
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al gestionar integrante: {str(e)}")
    
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
    
    if current_user.rol == "aprendiz":
        raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para modificar grupos")
    if current_user.rol != "admin" and str(grupo.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso")
    
    # No permitir remover al owner/líder
    if str(grupo.owner_id) == user_id:
        raise HTTPException(status_code=400, detail="No se puede remover al líder del grupo")
    
    try:
        db.execute(
            grupo_integrantes.delete().where(
                grupo_integrantes.c.grupo_id == grupo_id,
                grupo_integrantes.c.user_id == user_id
            )
        )
        db.commit()
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al remover integrante: {str(e)}")
    
    return {"message": "Integrante removido"}


@router.get("/{grupo_id}/stats")
def get_grupo_stats(
    grupo_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calcula estadísticas e impacto real de un grupo de investigación desde la BD."""
    from app.models import Semillero, Proyecto, Producto, Aprendiz, Entregable
    from collections import Counter
    
    grupo = db.query(Grupo).filter(Grupo.id == str(grupo_id)).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    # 1. Semilleros del grupo
    semilleros = db.query(Semillero).filter(Semillero.grupo_id == str(grupo.id)).all()
    semillero_ids = [str(s.id) for s in semilleros]
    
    # 2. Integrantes del grupo
    integrantes = list(grupo.integrantes)
    if grupo.owner and grupo.owner not in integrantes:
        integrantes.append(grupo.owner)
    integrantes_ids = [str(u.id) for u in integrantes]
    
    # 3. Proyectos vinculados directamente al grupo, a sus semilleros o liderados por integrantes
    proyectos_query = db.query(Proyecto).filter(
        (Proyecto.grupo_id == str(grupo.id)) |
        (Proyecto.semillero_id.in_(semillero_ids) if semillero_ids else False) |
        (Proyecto.owner_id.in_(integrantes_ids) if integrantes_ids else False)
    )
    proyectos = proyectos_query.all()
    proyecto_ids = [str(p.id) for p in proyectos]
    
    # 4. Productos vinculados a proyectos o creados por integrantes
    productos = db.query(Producto).filter(
        (Producto.proyecto_id.in_(proyecto_ids)) | (Producto.owner_id.in_(integrantes_ids))
    ).all() if (proyecto_ids or integrantes_ids) else []
    
    # Categorización de productos Minciencias
    tipo_counts = Counter()
    for prod in productos:
        tipo_str = prod.tipo or 'Otros'
        if any(w in tipo_str.lower() for w in ['artículo', 'articulo', 'paper', 'revista', 'a1', 'a2']):
            tipo_counts['Artículos'] += 1
        elif any(w in tipo_str.lower() for w in ['software', 'aplicación', 'app', 'sistema', 'código', 'b1', 'b2']):
            tipo_counts['Software'] += 1
        elif any(w in tipo_str.lower() for w in ['prototipo', 'diseño', 'circuito', 'maqueta', 'c1', 'c2']):
            tipo_counts['Prototipos'] += 1
        elif any(w in tipo_str.lower() for w in ['libro', 'capítulo', 'manual', 'd1']):
            tipo_counts['Libros'] += 1
        elif any(w in tipo_str.lower() for w in ['consultoría', 'servicio', 'informe', 'técnico', 'apropiación', 'social', 'evento']):
            tipo_counts['Apropiación Social'] += 1
        else:
            tipo_counts['Otros'] += 1
            
    produccion_data = [
        {'name': 'Artículos', 'value': tipo_counts['Artículos']},
        {'name': 'Software', 'value': tipo_counts['Software']},
        {'name': 'Prototipos', 'value': tipo_counts['Prototipos']},
        {'name': 'Libros', 'value': tipo_counts['Libros']},
        {'name': 'Apropiación Social', 'value': tipo_counts['Apropiación Social']},
        {'name': 'Otros', 'value': tipo_counts['Otros']}
    ]
    
    # 5. Aprendices en semilleros del grupo
    total_aprendices = db.query(sa.func.count(Aprendiz.id)).filter(
        Aprendiz.semillero_id.in_(semillero_ids)
    ).scalar() if semillero_ids else 0
    
    # 6. Proyectos por Estado
    estados_proyectos = Counter(p.estado or 'Aprobado' for p in proyectos)
    proyectos_por_estado = [
        {'name': 'Aprobados', 'value': estados_proyectos.get('Aprobado', 0) + estados_proyectos.get('Formulación', 0) + estados_proyectos.get('En formulación', 0)},
        {'name': 'En Ejecución', 'value': estados_proyectos.get('Ejecución', 0) + estados_proyectos.get('En ejecución', 0) + estados_proyectos.get('Activo', 0)},
        {'name': 'Finalizados', 'value': estados_proyectos.get('Finalizado', 0) + estados_proyectos.get('finalizado', 0)},
        {'name': 'Cancelados/Otros', 'value': estados_proyectos.get('Cancelado', 0) + estados_proyectos.get('Suspendido', 0)}
    ]
    
    # 7. Semilleros por Línea de Investigación
    lineas_semilleros = Counter(s.linea_investigacion or 'Sin Línea Asignada' for s in semilleros)
    semilleros_por_linea = [
        {'name': linea[:28] + ('...' if len(linea) > 28 else ''), 'fullName': linea, 'value': count}
        for linea, count in lineas_semilleros.most_common(6)
    ]
    
    # 8. Estado CvLAC de Investigadores
    cvlac_actualizados = sum(1 for u in integrantes if str(getattr(u, 'estado_cv_lac', '')).lower() in ['actualizado', 'al día', 'vigente'])
    cvlac_desactualizados = sum(1 for u in integrantes if str(getattr(u, 'estado_cv_lac', '')).lower() in ['desactualizado', 'no actualizado', 'por actualizar', 'pendiente'])
    cvlac_sin = max(0, len(integrantes) - (cvlac_actualizados + cvlac_desactualizados))
    cvlac_stats = {
        'actualizados': cvlac_actualizados,
        'desactualizados': cvlac_desactualizados,
        'sin_cvlac': cvlac_sin,
        'total': len(integrantes)
    }
    
    # 9. Cumplimiento y Avance de entregables
    entregables = db.query(Entregable).filter(
        Entregable.proyecto_id.in_(proyecto_ids)
    ).all() if proyecto_ids else []
    
    total_e = len(entregables)
    aprobados = len([e for e in entregables if e.estado == 'aprobado'])
    if total_e > 0:
        cumplimiento = int((aprobados / total_e * 100))
    elif len(proyectos) > 0:
        finalizados = sum(1 for p in proyectos if str(p.estado).lower() in ["finalizado", "completado"])
        cumplimiento = int((finalizados / len(proyectos)) * 100)
    else:
        cumplimiento = 0
    
    # 10. Horas formativas dedicadas
    horas_totales = sum(s.horas_dedicadas or 0 for s in semilleros)
    
    # 11. Presupuesto acumulado y ejecutado
    presupuesto_total = sum(float(p.presupuesto_total or 0) for p in proyectos)
    
    # Presupuesto ejecutado ponderado por el progreso de entregables de cada proyecto
    entregables_by_proj = {}
    for e in entregables:
        pid = str(e.proyecto_id)
        if pid not in entregables_by_proj:
            entregables_by_proj[pid] = {"total": 0, "aprobados": 0}
        entregables_by_proj[pid]["total"] += 1
        if e.estado == "aprobado":
            entregables_by_proj[pid]["aprobados"] += 1
            
    presupuesto_ejecutado = 0.0
    avances_individuales = []
    for p in proyectos:
        pid = str(p.id)
        p_budget = float(p.presupuesto_total or 0)
        p_ent = entregables_by_proj.get(pid, {"total": 0, "aprobados": 0})
        if p_ent["total"] > 0:
            p_prog = p_ent["aprobados"] / p_ent["total"]
        elif str(p.estado).lower() in ("finalizado", "completado"):
            p_prog = 1.0
        else:
            p_prog = 0.0
        presupuesto_ejecutado += p_budget * p_prog
        avances_individuales.append(int(p_prog * 100))
        
    avance_promedio = int(sum(avances_individuales) / len(avances_individuales)) if avances_individuales else cumplimiento
    
    # 12. Distribución temporal real
    from datetime import datetime, timezone
    meses_nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    mes_actual = datetime.now(timezone.utc).month
    
    impacto_regional = []
    for i in range(6):
        m_idx = (mes_actual - 6 + i) % 12
        m_num = m_idx + 1
        m_nombre = meses_nombres[m_idx]
        
        val = sum(1 for p in proyectos if p.created_at and p.created_at.month == m_num) + \
              sum(1 for pr in productos if pr.created_at and pr.created_at.month == m_num)
        
        impacto_regional.append({'month': m_nombre, 'actividad': val})
    
    return {
        "produccion": produccion_data,
        "proyectos_por_estado": proyectos_por_estado,
        "semilleros_por_linea": semilleros_por_linea,
        "cvlac_stats": cvlac_stats,
        "cumplimiento": cumplimiento,
        "avance_promedio": avance_promedio,
        "entregables_totales": total_e,
        "entregables_aprobados": aprobados,
        "impacto_regional": impacto_regional,
        "total_semilleros": len(semilleros),
        "total_proyectos": len(proyectos),
        "total_productos": len(productos),
        "total_aprendices": total_aprendices or 0,
        "total_integrantes": len(integrantes),
        "horas_formativas": horas_totales,
        "presupuesto_total": presupuesto_total,
        "presupuesto_ejecutado": round(presupuesto_ejecutado, 2)
    }


@router.get("/{grupo_id}/proyectos")
def list_grupo_proyectos(
    grupo_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar todos los proyectos vinculados al grupo con métricas de avance y equipo."""
    from app.routers.proyectos import _format_proyecto_dict
    from app.models import Semillero, Proyecto, Entregable, proyecto_equipo
    from sqlalchemy.orm import joinedload
    
    grupo = db.query(Grupo).filter(Grupo.id == str(grupo_id)).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
        
    semilleros = db.query(Semillero).filter(Semillero.grupo_id == str(grupo.id)).all()
    semillero_ids = [str(s.id) for s in semilleros]
    
    integrantes_ids = [str(u.id) for u in grupo.integrantes]
    if grupo.owner_id and str(grupo.owner_id) not in integrantes_ids:
        integrantes_ids.append(str(grupo.owner_id))

    proyectos = db.query(Proyecto).options(
        joinedload(Proyecto.equipo),
        joinedload(Proyecto.productos),
        joinedload(Proyecto.semillero),
        joinedload(Proyecto.grupo),
        joinedload(Proyecto.owner)
    ).filter(
        (Proyecto.grupo_id == str(grupo.id)) |
        (Proyecto.semillero_id.in_(semillero_ids) if semillero_ids else False) |
        (Proyecto.owner_id.in_(integrantes_ids) if integrantes_ids else False)
    ).all()

    proyecto_ids = [str(p.id) for p in proyectos]
    
    # Pre-cargar tabla de equipo
    equipo_master_map = {}
    if proyecto_ids:
        stmt = proyecto_equipo.select().where(proyecto_equipo.c.proyecto_id.in_(proyecto_ids))
        equipo_data_all = db.execute(stmt).fetchall()
        for row in equipo_data_all:
            p_id = str(row.proyecto_id)
            u_id = str(row.user_id)
            if p_id not in equipo_master_map:
                equipo_master_map[p_id] = {}
            equipo_master_map[p_id][u_id] = row

    # Pre-cargar entregables
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
        e_info = entregables_map.get(p_id_str, {"total": 0, "aprobados": 0})
        eq_map = equipo_master_map.get(p_id_str, {})
        result.append(_format_proyecto_dict(p, equipo_map=eq_map, entregables_info=e_info))

    return result


# ==========================================
# PLAN OPERATIVO & DOCUMENTOS DEL GRUPO
# ==========================================

@router.post("/{grupo_id}/plan-operativo")
async def upload_plan_operativo(
    grupo_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Subir archivo de plan operativo del grupo."""
    from pathlib import Path
    import shutil
    import uuid
    from app.config import get_settings
    
    grupo = db.query(Grupo).filter(Grupo.id == str(grupo_id)).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    if current_user.rol == "aprendiz":
        raise HTTPException(status_code=403, detail="Sin permiso para modificar plan operativo")
    
    settings = get_settings()
    storage_dir = Path(settings.STORAGE_DIR) / "documentos" if hasattr(settings, "STORAGE_DIR") else Path("storage/documentos")
    storage_dir.mkdir(parents=True, exist_ok=True)
    
    file_ext = Path(file.filename).suffix or ".pdf"
    safe_filename = f"plan_operativo_{grupo_id[:8]}_{uuid.uuid4().hex[:6]}{file_ext}"
    dest_path = storage_dir / safe_filename
    
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    grupo.plan_operativo_path = safe_filename
    db.commit()
    db.refresh(grupo)
    
    log_actividad(
        db,
        current_user.id,
        "subir_plan_operativo",
        f"Subió plan operativo para el grupo: {grupo.nombre}",
        entidad_tipo="grupo",
        entidad_id=str(grupo.id)
    )
    
    return {"message": "Plan operativo subido exitosamente", "path": safe_filename}


@router.get("/{grupo_id}/plan-operativo")
def download_plan_operativo(
    grupo_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Descargar archivo de plan operativo del grupo."""
    from pathlib import Path
    from fastapi.responses import FileResponse
    from app.config import get_settings
    
    grupo = db.query(Grupo).filter(Grupo.id == str(grupo_id)).first()
    if not grupo or not grupo.plan_operativo_path:
        raise HTTPException(status_code=404, detail="Plan operativo no cargado aún")
    
    settings = get_settings()
    storage_dir = Path(settings.STORAGE_DIR) / "documentos" if hasattr(settings, "STORAGE_DIR") else Path("storage/documentos")
    file_path = storage_dir / grupo.plan_operativo_path
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo físico no encontrado en el servidor")
        
    return FileResponse(
        path=str(file_path),
        filename=f"Plan_Operativo_{grupo.nombre}.pdf",
        content_disposition_type="attachment"
    )

