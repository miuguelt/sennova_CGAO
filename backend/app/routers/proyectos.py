from uuid import UUID
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_current_admin
from app.database import get_db
from app.models import Proyecto, User, proyecto_equipo, Convocatoria, Documento
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
    from sqlalchemy.orm import joinedload
    
    # Usar joinedload para traer equipo y productos de una sola vez
    query = db.query(Proyecto).options(
        joinedload(Proyecto.equipo),
        joinedload(Proyecto.productos)
    )
    
    if current_user.rol != "admin":
        # Ver proyectos donde es owner
        query = query.filter(Proyecto.owner_id == str(current_user.id))
    
    if estado:
        query = query.filter(Proyecto.estado == estado)
    if convocatoria_id:
        query = query.filter(Proyecto.convocatoria_id == str(convocatoria_id))
    
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

    result = []
    for p in proyectos:
        p_id_str = str(p.id)
        equipo_map = equipo_master_map.get(p_id_str, {})
        
        equipo = []
        for m in p.equipo:
            info = equipo_map.get(str(m.id))
            equipo.append({
                "id": str(m.id),
                "nombre": m.nombre,
                "email": m.email,
                "rol_en_proyecto": info.rol_en_proyecto if info else "Miembro",
                "horas_dedicadas": info.horas_dedicadas if info else 0,
                "ficha": getattr(m, 'ficha', None),
                "programa_formacion": getattr(m, 'programa_formacion', None)
            })
        
        result.append({
            "id": p_id_str,
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
            "semillero_id": str(p.semillero_id) if p.semillero_id else None,
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
    # Obtener los datos de la tabla de asociación
    stmt = proyecto_equipo.select().where(proyecto_equipo.c.proyecto_id == str(proyecto.id))
    equipo_res = db.execute(stmt).fetchall()
    equipo_map = {str(row.user_id): row for row in equipo_res}

    for m in proyecto.equipo:
        info = equipo_map.get(str(m.id))
        equipo.append({
            "id": str(m.id),
            "nombre": m.nombre,
            "email": m.email,
            "rol_en_proyecto": info.rol_en_proyecto if info else "Miembro",
            "horas_dedicadas": info.horas_dedicadas if info else 0,
            "ficha": getattr(m, 'ficha', None),
            "programa_formacion": getattr(m, 'programa_formacion', None)
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
        "semillero_id": str(proyecto.semillero_id) if proyecto.semillero_id else None,
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
        semillero_id=str(proyecto_data.semillero_id) if proyecto_data.semillero_id else None,
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
        "semillero_id": str(proyecto.semillero_id) if proyecto.semillero_id else None,
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
    
    # Validación de Liquidación (Finalizado)
    if update_data.get("estado") == "Finalizado":
        check = check_liquidacion(proyecto_id, db, current_user)
        if not check["can_liquidate"]:
            raise HTTPException(
                status_code=400, 
                detail=f"No se puede finalizar el proyecto. {check['message']}"
            )

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


@router.get("/{proyecto_id}/liquidar/check")
def check_liquidacion(
    proyecto_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Verifica si un proyecto cumple con todos los requisitos para ser liquidado (Finalizado).
    """
    proyecto = db.query(Proyecto).filter(Proyecto.id == str(proyecto_id)).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # 1. Verificación de Productos
    productos_verificados = [p for p in proyecto.productos if p.is_verificado]
    min_productos = 1 if proyecto.tipologia == "Red" else 2
    ok_productos = len(productos_verificados) >= min_productos
    
    # 2. Verificación de Bitácoras (Firmas)
    bitacoras = proyecto.bitacora
    firmas_completas = all(b.is_firmado_investigador and b.is_firmado_aprendiz for b in bitacoras) if bitacoras else True
    ok_bitacoras = firmas_completas
    
    # 3. Informe Final
    informe_final = db.query(Documento).filter(
        Documento.entidad_tipo == "proyecto",
        Documento.entidad_id == str(proyecto.id),
        Documento.tipo == "informe_final"
    ).first()
    ok_informe = informe_final is not None
    
    # 4. Presupuesto (Debe tener un valor asignado)
    ok_presupuesto = (proyecto.presupuesto_total or 0) > 0
    
    checklist = [
        {"id": "productos", "label": f"Productos Verificados ({len(productos_verificados)}/{min_productos})", "status": ok_productos},
        {"id": "bitacoras", "label": "Bitácoras con Firmas Digitales Completas", "status": ok_bitacoras},
        {"id": "informe", "label": "Informe Final Técnico Cargado", "status": ok_informe},
        {"id": "presupuesto", "label": "Presupuesto Asignado y Reportado", "status": ok_presupuesto}
    ]
    
    can_liquidate = all(item["status"] for item in checklist)
    
    return {
        "can_liquidate": can_liquidate,
        "checklist": checklist,
        "message": "Proyecto apto para liquidación" if can_liquidate else "Faltan requisitos para el cierre técnico"
    }


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
@router.post("/{proyecto_id}/generate-budget-template")
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

    proyecto.presupuesto_detallado = {"items": rubros_base, "total_estimado": 0}
    db.commit()
    
    return {"status": "template_generated", "items_count": len(rubros_base)}
