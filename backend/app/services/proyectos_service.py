"""
Servicio de Gestión y Evaluación de Proyectos SENNOVA
Proporciona lógica centralizada para:
1. Evaluación de Requisitos Institucionales para Finalización (Liquidación).
2. Transición y Auto-finalización de Proyectos al cumplir el 100%.
3. Diagnóstico de Calidad y Completitud en la Elaboración del Proyecto.
"""

from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models import Proyecto, Entregable, Documento, User, Notificacion
from app.utils import log_actividad
from app.database import safe_commit


def evaluar_requisitos_liquidacion(proyecto: Proyecto, db: Session) -> Dict[str, Any]:
    """Verifica los 6 Requisitos Institucionales SENNOVA para liquidar un proyecto."""
    entregables = db.query(Entregable).filter(Entregable.proyecto_id == str(proyecto.id)).all()
    total_entregables = len(entregables)
    aprobados = sum(1 for e in entregables if e.estado == "aprobado")
    ok_entregables = total_entregables > 0 and aprobados == total_entregables
    
    productos_verificados = [p for p in (proyecto.productos or []) if getattr(p, 'is_verificado', False)]
    min_productos = 1 if proyecto.tipologia == "Red" else 2
    ok_productos = len(productos_verificados) >= min_productos
    
    informe_doc = db.query(Documento).filter(
        Documento.entidad_tipo == "proyecto",
        Documento.entidad_id == str(proyecto.id),
        Documento.tipo == "informe_final"
    ).first()
    ok_informe = bool(informe_doc or proyecto.informe_final_path)
    
    bitacoras = proyecto.bitacora or []
    firmas_completas = (
        all(getattr(b, 'is_firmado_investigador', False) and getattr(b, 'is_firmado_aprendiz', False) for b in bitacoras)
        if bitacoras else (bool(proyecto.formato_bitacora_path) or True)
    )
    ok_presupuesto = (proyecto.presupuesto_total or 0) > 0
    ok_sgps = bool(proyecto.codigo_sgps and str(proyecto.codigo_sgps).strip())
    
    checklist: List[Dict[str, Any]] = [
        {"id": "entregables", "label": f"Entregables Aprobados ({aprobados}/{total_entregables})", "status": ok_entregables, "detalles": f"{aprobados} de {total_entregables} aprobados"},
        {"id": "productos", "label": f"Productos Verificados ({len(productos_verificados)}/{min_productos})", "status": ok_productos, "detalles": f"Mínimo {min_productos} producto(s)"},
        {"id": "informe", "label": "Informe Final Técnico Cargado", "status": ok_informe, "detalles": "PDF adjunto"},
        {"id": "bitacoras", "label": "Bitácoras Firmadas", "status": firmas_completas, "detalles": "Firmas registradas"},
        {"id": "presupuesto", "label": "Presupuesto Asignado", "status": ok_presupuesto, "detalles": f"${proyecto.presupuesto_total or 0:,.0f}"},
        {"id": "sgps", "label": "Código SGPS Registrado", "status": ok_sgps, "detalles": f"{proyecto.codigo_sgps or 'Pendiente'}"}
    ]
    
    total_items = len(checklist)
    items_cumplidos = sum(1 for item in checklist if item["status"])
    porcentaje = round((items_cumplidos / total_items) * 100, 1)
    can_liquidate = items_cumplidos == total_items
    
    return {
        "can_liquidate": can_liquidate,
        "porcentaje_completitud": porcentaje,
        "items_cumplidos": items_cumplidos,
        "total_items": total_items,
        "checklist": checklist,
        "message": "Proyecto cumple 100% requisitos" if can_liquidate else f"Cumplimiento: {porcentaje}%. Faltan requisitos."
    }


def evaluar_y_auto_finalizar_proyecto(proyecto_id: str, db: Session) -> Dict[str, Any]:
    """Evalúa auto-finalización del proyecto al cumplir requisitos al 100%."""
    proyecto = db.query(Proyecto).filter(Proyecto.id == str(proyecto_id)).first()
    if not proyecto:
        return {"auto_finalizado": False, "reason": "Proyecto no encontrado"}
    
    if proyecto.estado == "Finalizado":
        res = evaluar_requisitos_liquidacion(proyecto, db)
        return {"auto_finalizado": False, "reason": "Proyecto ya finalizado", "porcentaje": 100.0, "checklist": res["checklist"]}
    
    eval_res = evaluar_requisitos_liquidacion(proyecto, db)
    if eval_res["can_liquidate"]:
        estado_anterior = proyecto.estado
        proyecto.estado = "Finalizado"
        
        log_actividad(
            db, str(proyecto.owner_id), "auto_finalizar_proyecto",
            f"Transición automática de '{estado_anterior}' a 'Finalizado'.",
            entidad_tipo="proyecto", entidad_id=str(proyecto.id)
        )
        
        try:
            db.add(Notificacion(
                user_id=str(proyecto.owner_id), tipo="proyecto",
                titulo="🎉 ¡Proyecto Finalizado Automáticamente!",
                mensaje=f"El proyecto '{proyecto.nombre}' cumplió 100% requisitos SENNOVA.",
                entidad_tipo="proyecto", entidad_id=str(proyecto.id), prioridad="alta"
            ))
            for adm in db.query(User).filter(User.rol == "admin", User.is_active == True).all():
                if str(adm.id) != str(proyecto.owner_id):
                    db.add(Notificacion(
                        user_id=str(adm.id), tipo="proyecto",
                        titulo="Proyecto Liquidado Automáticamente",
                        mensaje=f"Proyecto '{proyecto.nombre}' finalizado.",
                        entidad_tipo="proyecto", entidad_id=str(proyecto.id), prioridad="normal"
                    ))
            safe_commit(db)
            db.refresh(proyecto)
        except Exception:
            safe_commit(db)
            
        return {
            "auto_finalizado": True,
            "proyecto_id": str(proyecto.id),
            "nuevo_estado": "Finalizado",
            "porcentaje": 100.0,
            "checklist": eval_res["checklist"]
        }
    
    return {
        "auto_finalizado": False,
        "porcentaje": eval_res["porcentaje_completitud"],
        "checklist": eval_res["checklist"]
    }


def calcular_estatus_elaboracion(proyecto: Proyecto, db: Session) -> Dict[str, Any]:
    """Calcula el puntaje de calidad y completitud en la formulación del proyecto."""
    criterios: List[Dict[str, Any]] = []
    recomendaciones: List[str] = []
    
    # 1. Identificación y SGPS (25 pts)
    tiene_nombre = bool(proyecto.nombre and len(proyecto.nombre.strip()) >= 10)
    tiene_sgps = bool(proyecto.codigo_sgps and len(proyecto.codigo_sgps.strip()) >= 4)
    tiene_tipologia = bool(proyecto.tipologia)
    cuestion_id = tiene_nombre and tiene_sgps and tiene_tipologia
    criterios.append({
        "categoria": "Identificación Institucional",
        "puntos": 25 if cuestion_id else (10 if tiene_nombre else 0),
        "max": 25, "status": cuestion_id,
        "detalle": "Nombre, Código SGPS y Tipología definidos"
    })
    if not tiene_sgps:
        recomendaciones.append("Asignar el Código SGPS oficial del proyecto.")
    if not tiene_tipologia:
        recomendaciones.append("Seleccionar la tipología del proyecto.")
        
    # 2. Objetivos (25 pts)
    tiene_obj_gen = bool(proyecto.objetivo_general and len(proyecto.objetivo_general.strip()) >= 20)
    obj_esp = proyecto.objetivos_especificos or []
    tiene_obj_esp = len(obj_esp) >= 2
    criterios.append({
        "categoria": "Objetivos General y Específicos",
        "puntos": 25 if (tiene_obj_gen and tiene_obj_esp) else (12 if tiene_obj_gen else 0),
        "max": 25, "status": tiene_obj_gen and tiene_obj_esp,
        "detalle": f"Objetivo general + {len(obj_esp)} específicos"
    })
    if not tiene_obj_gen:
        recomendaciones.append("Formular un objetivo general claro (mínimo 20 caracteres).")
    if not tiene_obj_esp:
        recomendaciones.append("Registrar al menos 2 objetivos específicos.")
        
    # 3. Presupuesto (20 pts)
    presupuesto_val = proyecto.presupuesto_total or 0
    tiene_desglose = bool(proyecto.presupuesto_detallado and proyecto.presupuesto_detallado.get("items"))
    criterios.append({
        "categoria": "Presupuesto y Rubros",
        "puntos": 20 if (presupuesto_val > 0 and tiene_desglose) else (10 if presupuesto_val > 0 else 0),
        "max": 20, "status": presupuesto_val > 0 and tiene_desglose,
        "detalle": f"Presupuesto: ${presupuesto_val:,.0f} con rubros"
    })
    if presupuesto_val == 0:
        recomendaciones.append("Asignar el presupuesto total proyectado.")
    elif not tiene_desglose:
        recomendaciones.append("Generar plantilla de rubros presupuestales.")
        
    # 4. Cronograma (15 pts)
    entregables_count = db.query(Entregable).filter(Entregable.proyecto_id == str(proyecto.id)).count()
    criterios.append({
        "categoria": "Cronograma de Entregables",
        "puntos": 15 if entregables_count >= 2 else (7 if entregables_count == 1 else 0),
        "max": 15, "status": entregables_count >= 2,
        "detalle": f"{entregables_count} entregable(s)"
    })
    if entregables_count < 2:
        recomendaciones.append("Planificar al menos 2 entregables en cronograma.")
        
    # 5. Equipo y Productos (15 pts)
    equipo_count = len(proyecto.equipo or [])
    productos_count = len(proyecto.productos or [])
    tiene_eq_prod = equipo_count >= 1 and productos_count >= 1
    criterios.append({
        "categoria": "Equipo y Productos Planificados",
        "puntos": 15 if tiene_eq_prod else (8 if (equipo_count >= 1 or productos_count >= 1) else 0),
        "max": 15, "status": tiene_eq_prod,
        "detalle": f"{equipo_count} miembros, {productos_count} productos"
    })
    if equipo_count == 0:
        recomendaciones.append("Vincular miembros al equipo del proyecto.")
    if productos_count == 0:
        recomendaciones.append("Vincular al menos 1 producto Minciencias.")

    score_total = sum(c["puntos"] for c in criterios)
    nivel = "Excelente" if score_total >= 90 else ("Bueno" if score_total >= 70 else ("Aceptable" if score_total >= 50 else "En Elaboración / Incompleto"))
        
    return {
        "score_total": score_total,
        "max_score": 100,
        "nivel_calidad": nivel,
        "criterios": criterios,
        "recomendaciones": recomendaciones
    }
