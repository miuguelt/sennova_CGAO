from typing import Optional

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_current_admin, get_current_staff
from app.database import get_db
from app.models import Grupo, User, grupo_integrantes
from app.research_catalog import CANONICAL_GROUP_NAME
from app.schemas import GrupoCreate, GrupoUpdate
from app.utils import log_actividad
from app.services.group_statistics import group_statistics
from app.services.documentation_statistics import documentation_loading_options

router = APIRouter(
    prefix="/grupos",
    tags=["Grupos de Investigación"],
    dependencies=[Depends(get_current_staff)],
)


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
    """Crea el grupo institucional solo si todavía no existe."""
    if db.query(Grupo.id).first() is not None:
        raise HTTPException(
            status_code=409,
            detail="El grupo Investigadores CGAO ya existe. Registra los equipos de trabajo como semilleros.",
        )
    grupo = Grupo(
        nombre=CANONICAL_GROUP_NAME,
        nombre_completo=grupo_data.nombre_completo or "Grupo institucional de investigadores del CGAO",
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
    except sa.exc.IntegrityError as db_err:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="El grupo Investigadores CGAO ya existe. Registra los equipos de trabajo como semilleros.",
        ) from db_err
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
    if update_data.get("nombre", CANONICAL_GROUP_NAME) != CANONICAL_GROUP_NAME:
        raise HTTPException(status_code=422, detail="El nombre del grupo institucional es fijo: Investigadores CGAO.")
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

    raise HTTPException(
        status_code=409,
        detail="El grupo Investigadores CGAO es la estructura institucional y no se puede eliminar.",
    )


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
    if user.rol != "investigador":
        raise HTTPException(
            status_code=422,
            detail="El grupo Investigadores CGAO solo admite integrantes con rol de investigador.",
        )
    
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
    """Consulta las estadísticas del grupo y su construcción documental."""
    return group_statistics(grupo_id, db)


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
        joinedload(Proyecto.owner),
        *documentation_loading_options(),
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

