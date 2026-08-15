from typing import Optional

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException
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
        "is_publico": grupo.is_publico,
        "estado": grupo.estado,
        "owner_id": str(grupo.owner_id),
        "owner": None,
        "integrantes": integrantes,
        "total_integrantes": len(integrantes),
        "created_at": grupo.created_at
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
    
    update_data = grupo_update.dict(exclude_unset=True)
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
    if current_user.rol == "aprendiz":
        raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para modificar grupos")
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
    integrantes_ids = [str(u.id) for u in grupo.integrantes] + [str(grupo.owner_id)]
    
    # 3. Proyectos vinculados a semilleros del grupo o liderados por integrantes
    proyectos = db.query(Proyecto).filter(
        (Proyecto.semillero_id.in_(semillero_ids)) | (Proyecto.owner_id.in_(integrantes_ids))
    ).all() if (semillero_ids or integrantes_ids) else []
    
    proyecto_ids = [str(p.id) for p in proyectos]
    
    # 4. Productos vinculados a proyectos o creados por integrantes
    productos = db.query(Producto).filter(
        (Producto.proyecto_id.in_(proyecto_ids)) | (Producto.owner_id.in_(integrantes_ids))
    ).all() if (proyecto_ids or integrantes_ids) else []
    
    # Categorización de productos
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
        elif any(w in tipo_str.lower() for w in ['consultoría', 'servicio', 'informe', 'técnico']):
            tipo_counts['Consultoría'] += 1
        else:
            tipo_counts['Otros'] += 1
            
    produccion_data = [
        {'name': 'Artículos', 'value': tipo_counts['Artículos']},
        {'name': 'Software', 'value': tipo_counts['Software']},
        {'name': 'Prototipos', 'value': tipo_counts['Prototipos']},
        {'name': 'Libros', 'value': tipo_counts['Libros']},
        {'name': 'Consultoría', 'value': tipo_counts['Consultoría']}
    ]
    
    # 5. Aprendices en semilleros del grupo
    total_aprendices = db.query(sa.func.count(Aprendiz.id)).filter(
        Aprendiz.semillero_id.in_(semillero_ids)
    ).scalar() if semillero_ids else 0
    
    # 6. Cumplimiento de entregables
    entregables = db.query(Entregable).filter(
        Entregable.proyecto_id.in_(proyecto_ids)
    ).all() if proyecto_ids else []
    
    total_e = len(entregables)
    aprobados = len([e for e in entregables if e.estado == 'aprobado'])
    if total_e > 0:
        cumplimiento = int((aprobados / total_e * 100))
    elif len(proyectos) > 0:
        # Calcular según el avance reportado en los proyectos del grupo
        progresos = [p.progreso for p in proyectos if p.progreso is not None]
        cumplimiento = int(sum(progresos) / len(progresos)) if progresos else 0
    else:
        cumplimiento = 0
    
    # 7. Distribución temporal real (últimos meses con actividad)
    from datetime import datetime, timezone
    meses_nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    mes_actual = datetime.now(timezone.utc).month
    
    impacto_regional = []
    for i in range(5):
        m_idx = (mes_actual - 5 + i) % 12
        m_num = m_idx + 1
        m_nombre = meses_nombres[m_idx]
        
        # Conteo de proyectos y productos creados en ese mes
        val = sum(1 for p in proyectos if p.created_at and p.created_at.month == m_num) + \
              sum(1 for pr in productos if pr.created_at and pr.created_at.month == m_num)
        
        impacto_regional.append({'month': m_nombre, 'valor': val})
    
    return {
        "produccion": produccion_data,
        "cumplimiento": cumplimiento,
        "impacto_regional": impacto_regional,
        "total_semilleros": len(semilleros),
        "total_proyectos": len(proyectos),
        "total_productos": len(productos),
        "total_aprendices": total_aprendices or 0,
        "total_integrantes": len(grupo.integrantes)
    }

