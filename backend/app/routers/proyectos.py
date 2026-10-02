from typing import Optional

import sqlalchemy as sa
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import ValidationError
from sqlalchemy.orm import Session, joinedload

from app.auth import STAFF_ROLES, get_current_user
from app.config import get_settings
from app.database import get_db
from app.models import Aprendiz, Documento, Proyecto, User, proyecto_equipo, Entregable, Grupo, Semillero, Convocatoria, Reto
from app.schemas import (
    ProyectoCreate, ProyectoUpdate, EquipoMiembro
)
from app.utils import log_actividad
from app.services.proyectos_service import (
    evaluar_requisitos_liquidacion,
    calcular_estatus_elaboracion
)
from app.services.proyecto_import_service import (
    DOCX_MIME_TYPE,
    MAX_FORMULATION_FILE_SIZE,
    FormulationFileError,
    extract_formulation_draft,
    safe_document_filename,
)
from app.services.project_access import can_access_project
from app.services.entity_document_cleanup import delete_entity_documents, cleanup_document_files

router = APIRouter(prefix="/proyectos", tags=["Proyectos"])
FORMULATION_STORAGE_DIR = Path(get_settings().STORAGE_DIR) / "documentos"


def check_proyecto_access(proyecto: Proyecto, user: User) -> bool:
    """Verifica si el usuario tiene acceso al proyecto."""
    return can_access_project(proyecto, user)


def can_edit_proyecto(proyecto: Proyecto, user: User) -> bool:
    """Admin, owner del proyecto, o líder del semillero asignado pueden editar el proyecto."""
    if user.rol == "admin":
        return True
    if str(proyecto.owner_id) == str(user.id):
        return True
    if proyecto.semillero and str(proyecto.semillero.owner_id) == str(user.id):
        return True
    return False


def _resolve_project_links(values: dict, db: Session) -> dict:
    """Valida referencias y hereda el grupo del semillero sin atribuciones arbitrarias."""
    resolved = {}
    for field, model in (("grupo_id", Grupo), ("semillero_id", Semillero), ("convocatoria_id", Convocatoria), ("reto_origen_id", Reto)):
        value = str(values[field]) if values.get(field) else None
        if value is not None and db.query(model).filter(model.id == value).first() is None:
            raise HTTPException(status_code=404, detail=f"No se encontró el registro vinculado: {field}.")
        resolved[field] = value
    if resolved["semillero_id"]:
        semillero = db.query(Semillero).filter(Semillero.id == resolved["semillero_id"]).one()
        inherited_group = str(semillero.grupo_id) if semillero.grupo_id else None
        if resolved["grupo_id"] and inherited_group and resolved["grupo_id"] != inherited_group:
            raise HTTPException(status_code=422, detail="El grupo del proyecto debe coincidir con el grupo del semillero seleccionado.")
        resolved["grupo_id"] = inherited_group or resolved["grupo_id"]
    return resolved


def _build_proyecto_record(proyecto_data: ProyectoCreate, current_user: User, db: Session) -> Proyecto:
    """Construye el registro y sus relaciones sin confirmar la transacción."""
    if proyecto_data.estado.casefold() in {"finalizado", "completado"}:
        raise HTTPException(status_code=400, detail="Cree el proyecto en ejecución y complete su expediente antes de finalizarlo.")
    links = _resolve_project_links(proyecto_data.model_dump(), db)
    grupo_id = links["grupo_id"]
    semillero_id = links["semillero_id"]

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
        semillero_id=semillero_id,
        grupo_id=grupo_id,
        convocatoria_id=str(proyecto_data.convocatoria_id) if proyecto_data.convocatoria_id else None,
        owner_id=str(current_user.id),
    )
    db.add(proyecto)
    db.flush()
    if proyecto_data.equipo:
        for member_data in proyecto_data.equipo:
            member = db.query(User).filter(User.id == str(member_data.user_id)).first()
            if member:
                db.execute(proyecto_equipo.insert().values(
                    proyecto_id=str(proyecto.id),
                    user_id=str(member.id),
                    rol_en_proyecto=member_data.rol_en_proyecto,
                    horas_dedicadas=member_data.horas_dedicadas,
                ))
    return proyecto


def _format_proyecto_dict(
    p: Proyecto,
    equipo_map: dict = None,
    entregables_info: dict = None,
    aprendiz_view: bool = False,
) -> dict:
    """Construye un diccionario serializable y enriquecido para un proyecto."""
    p_id_str = str(p.id)
    
    # 1. Integrantes del equipo
    equipo = []
    if p.equipo:
        for m in p.equipo:
            info = equipo_map.get(str(m.id)) if equipo_map else None
            member_data = {
                "id": str(m.id),
                "nombre": m.nombre,
                "rol": getattr(m, 'rol', None),
                "rol_en_proyecto": info.rol_en_proyecto if info else "Miembro",
                "horas_dedicadas": info.horas_dedicadas if info else 0,
            }
            if not aprendiz_view:
                member_data.update({
                    "email": m.email,
                    "rol_sennova": getattr(m, 'rol_sennova', None),
                    "sede": getattr(m, 'sede', None),
                    "ficha": getattr(m, 'ficha', None),
                    "programa_formacion": getattr(m, 'programa_formacion', None),
                })
            equipo.append(member_data)

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
        "presupuesto_total": None if aprendiz_view else p.presupuesto_total,
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
        "presupuesto_detallado": {} if aprendiz_view else (p.presupuesto_detallado or {}),
        "linea_programatica": p.linea_programatica,
        "reto_origen_id": str(p.reto_origen_id) if p.reto_origen_id else None,
        "semillero_id": str(p.semillero_id) if p.semillero_id else None,
        "semillero_nombre": semillero_nombre_resolved,
        "grupo_id": grupo_id_resolved,
        "grupo_nombre": grupo_nombre_resolved,
        "convocatoria_id": str(p.convocatoria_id) if p.convocatoria_id else None,
        "owner_id": str(p.owner_id),
        "owner": (
            {"id": str(p.owner.id), "nombre": p.owner.nombre}
            if p.owner and aprendiz_view
            else {
                "id": str(p.owner.id),
                "nombre": p.owner.nombre,
                "email": p.owner.email,
            }
            if p.owner
            else None
        ),
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
    
    if current_user.rol not in STAFF_ROLES:
        # Ver proyectos donde es owner o miembro del equipo
        access_filter = (
            (Proyecto.owner_id == str(current_user.id)) | 
            (Proyecto.equipo.any(User.id == current_user.id))
        )
        if current_user.rol == "aprendiz":
            access_filter = access_filter | Proyecto.semillero.has(
                Semillero.aprendices.any(Aprendiz.user_id == str(current_user.id))
            )
        query = query.filter(access_filter)
    
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
        result.append(_format_proyecto_dict(
            p,
            equipo_map=equipo_map,
            entregables_info=e_info,
            aprendiz_view=current_user.rol == "aprendiz",
        ))
    
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

    return _format_proyecto_dict(
        proyecto,
        equipo_map=equipo_map,
        entregables_info=e_info,
        aprendiz_view=current_user.rol == "aprendiz",
    )


@router.post("", status_code=201)
def create_proyecto(
    proyecto_data: ProyectoCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear un nuevo proyecto vinculándolo a su grupo y semillero."""
    if current_user.rol == 'aprendiz':
        raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para crear proyectos")
        
    proyecto = None
    try:
        proyecto = _build_proyecto_record(proyecto_data, current_user, db)
        db.commit()
        db.refresh(proyecto)
    except HTTPException:
        db.rollback()
        raise
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


@router.post("/analizar-formulacion")
async def analyze_project_formulation(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Extrae una propuesta editable de una formulación CAP DOCX."""
    if current_user.rol not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Solo el personal SENNOVA puede importar formulaciones")
    content = await file.read(MAX_FORMULATION_FILE_SIZE + 1)
    if len(content) > MAX_FORMULATION_FILE_SIZE:
        raise HTTPException(status_code=413, detail="El archivo supera el límite de 10 MB.")
    try:
        return extract_formulation_draft(file.filename, content)
    except FormulationFileError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/importar-formulacion", status_code=201)
async def import_project_formulation(
    proyecto: str = Form(..., description="Datos revisados en el formulario de proyecto, en formato JSON"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Crea el proyecto confirmado y conserva la formulación DOCX como soporte."""
    if current_user.rol not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Solo el personal SENNOVA puede importar formulaciones")
    content = await file.read(MAX_FORMULATION_FILE_SIZE + 1)
    if len(content) > MAX_FORMULATION_FILE_SIZE:
        raise HTTPException(status_code=413, detail="El archivo supera el límite de 10 MB.")
    try:
        extract_formulation_draft(file.filename, content)
    except FormulationFileError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    try:
        project_data = ProyectoCreate.model_validate_json(proyecto)
    except ValidationError as error:
        raise HTTPException(status_code=422, detail=error.errors()) from error
    if not project_data.nombre.strip():
        raise HTTPException(status_code=422, detail="El nombre del proyecto es obligatorio.")

    safe_filename = safe_document_filename(file.filename)
    file_path = None
    try:
        project = _build_proyecto_record(project_data, current_user, db)
        FORMULATION_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        document_id = str(uuid.uuid4())
        file_path = FORMULATION_STORAGE_DIR / f"{document_id}.docx"
        file_path.write_bytes(content)
        db.add(Documento(
            id=document_id,
            entidad_tipo="proyecto",
            entidad_id=str(project.id),
            tipo="formulacion_proyecto",
            nombre_archivo=safe_filename,
            descripcion="Formulación fuente adjunta al crear el proyecto.",
            content_type=DOCX_MIME_TYPE,
            file_path=str(file_path).replace("\\", "/"),
            owner_id=str(current_user.id),
        ))
        db.commit()
    except Exception as error:
        db.rollback()
        if file_path and file_path.exists():
            file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="No fue posible guardar el proyecto y su formulación.") from error

    log_actividad(
        db,
        current_user.id,
        "importar_formulacion_proyecto",
        f"Creó el proyecto desde una formulación: {project.nombre}",
        entidad_tipo="proyecto",
        entidad_id=str(project.id),
    )
    return get_proyecto(str(project.id), current_user, db)


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
    link_fields = ("grupo_id", "semillero_id", "convocatoria_id", "reto_origen_id")
    if any(field in update_data for field in link_fields):
        values = {field: update_data.get(field, getattr(proyecto, field)) for field in link_fields}
        if "semillero_id" in update_data and "grupo_id" not in update_data:
            values["grupo_id"] = None
        resolved = _resolve_project_links(values, db)
        update_data.update({field: resolved[field] for field in link_fields if field in update_data or field == "grupo_id"})
    
    for field, value in update_data.items():
        if field != "equipo":  # Equipo se maneja separado
            if field in ("convocatoria_id", "reto_origen_id", "semillero_id", "grupo_id"):
                if value is not None and str(value).strip() not in ("", "null", "None"):
                    value = str(value)
                else:
                    value = None
            setattr(proyecto, field, value)
            
    try:
        # Evalúa los valores nuevos dentro de la misma transacción, antes del commit.
        if str(proyecto.estado).casefold() in {"finalizado", "completado"}:
            db.flush()
            check = evaluar_requisitos_liquidacion(proyecto, db)
            if not check["can_liquidate"]:
                raise HTTPException(status_code=400, detail=f"No se puede finalizar el proyecto. {check['message']}")
            proyecto.estado = "Finalizado"
        db.commit()
        db.refresh(proyecto)
    except HTTPException:
        db.rollback()
        raise
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
    Consulta los requisitos de liquidación sin modificar el estado del proyecto.
    La actualización explícita y las cargas confirmadas realizan el cierre.
    """
    try:
        proyecto = db.query(Proyecto).filter(Proyecto.id == str(proyecto_id)).first()
        if not proyecto:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        
        # Solo admin o owner pueden verificar liquidación
        if not can_edit_proyecto(proyecto, current_user):
            raise HTTPException(status_code=403, detail="No tienes permiso para verificar liquidación de este proyecto")
        
        eval_res = evaluar_requisitos_liquidacion(proyecto, db)
        
        return {
            "can_liquidate": eval_res["can_liquidate"],
            "porcentaje_completitud": eval_res["porcentaje_completitud"],
            "items_cumplidos": eval_res["items_cumplidos"],
            "total_items": eval_res["total_items"],
            "checklist": eval_res["checklist"],
            "auto_finalizado": False,
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
        documents = delete_entity_documents(db, "proyecto", proyecto_id)
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

    pending = cleanup_document_files(documents)
    if pending:
        return {"message": "Proyecto eliminado. Algunos archivos quedan pendientes de limpieza.", "limpieza_pendiente": True, "documentos_pendientes_limpieza": pending}
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
    """Carga rubros de referencia observados en un ejemplar aportado de GIC-F-037."""
    proyecto = db.query(Proyecto).filter(Proyecto.id == str(proyecto_id)).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    if not check_proyecto_access(proyecto, current_user):
        raise HTTPException(status_code=403, detail="Sin acceso")

    # Rubros observados en el ejemplar GIC-F-037 cargado en la carpeta del proyecto.
    # La vigencia debe confirmarse con la Coordinación SENNOVA antes de radicar.
    rubros_base = [
        {"categoria": "Servicios personales", "item": "Servicios personales instructores del área administrativa", "valor": 0, "descripcion": "Rubro observado en el ejemplar GIC-F-037 cargado."},
        {"categoria": "Servicios personales", "item": "Servicios personales indirectos (sin ser roles SENNOVA), operador logístico evento EDT", "valor": 0, "descripcion": "Rubro observado en el ejemplar GIC-F-037 cargado."},
        {"categoria": "Materiales de formación", "item": "Materiales de formación", "valor": 0, "descripcion": "Rubro observado en el ejemplar GIC-F-037 cargado."},
        {"categoria": "Mantenimiento", "item": "Mantenimiento", "valor": 0, "descripcion": "Rubro observado en el ejemplar GIC-F-037 cargado."},
        {"categoria": "Equipos de sistemas", "item": "Equipos sistemas", "valor": 0, "descripcion": "Rubro observado en el ejemplar GIC-F-037 cargado."},
        {"categoria": "Viáticos a la formación profesional", "item": "Viáticos a la formación profesional", "valor": 0, "descripcion": "Rubro observado en el ejemplar GIC-F-037 cargado."},
        {"categoria": "Otros", "item": "Bienestar alumnos", "valor": 0, "descripcion": "Rubro observado en el ejemplar GIC-F-037 cargado."},
        {"categoria": "Ediciones e impresos", "item": "Ediciones e impresos", "valor": 0, "descripcion": "Rubro observado en el ejemplar GIC-F-037 cargado."},
    ]

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
