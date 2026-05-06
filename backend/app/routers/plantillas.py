from datetime import datetime, date, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_current_admin
from app.database import get_db
from app.models import (
    Proyecto, User, Semillero, Aprendiz, Entregable, 
    Producto, Documento, Actividad
)
from app.utils import log_actividad

router = APIRouter(prefix="/plantillas", tags=["Plantillas Inteligentes"])


@router.post("/proyectos/{proyecto_id}/cronograma-sennova")
def generar_cronograma_sennova(
    proyecto_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Genera automáticamente el cronograma de entregables estándar SENNOVA 
    para un proyecto según su tipología.
    """
    proyecto = db.query(Proyecto).filter(Proyecto.id == str(proyecto_id)).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Solo admin o owner
    if current_user.rol != "admin" and str(proyecto.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso")

    # Si ya tiene entregables, no sobreescribir sin aviso (aquí simplemente añadimos)
    # Entregables base SENNOVA
    entregables_base = [
        {"fase": "Fase I: Planeación", "titulo": "Plan de Trabajo y Cronograma", "dias": 15, "tipo": "documento"},
        {"fase": "Fase II: Ejecución", "titulo": "Informe de Avance Técnico 1", "dias": 60, "tipo": "informe"},
        {"fase": "Fase II: Ejecución", "titulo": "Informe de Avance Técnico 2", "dias": 120, "tipo": "informe"},
        {"fase": "Fase III: Cierre", "titulo": "Producto Final (Software/Prototipo)", "dias": 240, "tipo": "producto"},
        {"fase": "Fase III: Cierre", "titulo": "Artículo de Investigación / Ponencia", "dias": 270, "tipo": "producto"},
        {"fase": "Final", "titulo": "Informe Final SENNOVA", "dias": 300, "tipo": "informe"},
    ]
    
    from datetime import timedelta
    fecha_inicio = proyecto.created_at.date()
    
    creados = 0
    for e_data in entregables_base:
        # Verificar si ya existe uno con el mismo título
        exists = db.query(Entregable).filter(
            Entregable.proyecto_id == str(proyecto.id),
            Entregable.titulo == e_data["titulo"]
        ).first()
        
        if not exists:
            nuevo = Entregable(
                proyecto_id=str(proyecto.id),
                fase=e_data["fase"],
                titulo=e_data["titulo"],
                tipo=e_data["tipo"],
                fecha_entrega=fecha_inicio + timedelta(days=e_data["dias"]),
                responsable_id=str(current_user.id),
                estado="pendiente"
            )
            db.add(nuevo)
            creados += 1
            
    db.commit()
    
    log_actividad(
        db, current_user.id, "generar_plantilla", 
        f"Generó cronograma inteligente para proyecto: {proyecto.nombre}",
        entidad_tipo="proyecto", entidad_id=str(proyecto.id)
    )
    
    return {"status": "success", "entregables_creados": creados}


@router.get("/semilleros/{semillero_id}/certificado-aprendiz/{aprendiz_id}")
def generar_datos_certificado(
    semillero_id: str,
    aprendiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna los datos pre-formateados para generar un certificado de participación.
    """
    semillero = db.query(Semillero).filter(Semillero.id == str(semillero_id)).first()
    aprendiz = db.query(Aprendiz).filter(
        Aprendiz.id == str(aprendiz_id),
        Aprendiz.semillero_id == str(semillero_id)
    ).first()
    
    if not semillero or not aprendiz:
        raise HTTPException(status_code=404, detail="Semillero o Aprendiz no encontrado")
    
    info = aprendiz.info_consolidada
    
    return {
        "entidad": "SERVICIO NACIONAL DE APRENDIZAJE - SENA",
        "centro": "CENTRO DE GESTIÓN AGROEMPRESARIAL Y ORIENTE",
        "programa_sennova": "SENNOVA",
        "tipo_documento": "CERTIFICADO DE PARTICIPACIÓN EN SEMILLERO",
        "datos_aprendiz": {
            "nombre": info["nombre"].upper(),
            "documento": info["documento"],
            "ficha": info["ficha"],
            "programa": info["programa"]
        },
        "datos_semillero": {
            "nombre": semillero.nombre,
            "grupo": semillero.grupo.nombre if semillero.grupo else "N/A",
            "horas": semillero.horas_dedicadas,
            "fecha_ingreso": aprendiz.fecha_ingreso.strftime('%Y-%m-%d')
        },
        "fecha_emision": date.today().strftime('%d de %B de %Y'),
        "firmas": [
            {"nombre": semillero.owner.nombre, "rol": "Líder de Semillero"},
            {"nombre": "SUBDIRECTOR DE CENTRO", "rol": "Subdirector CGAO"}
        ]
    }


@router.get("/usuarios/{user_id}/reporte-mensual")
def generar_datos_reporte_mensual(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna los datos consolidados para un reporte de actividad mensual del investigador.
    """
    user = db.query(User).filter(User.id == str(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Solo el propio usuario o admin
    if current_user.rol != "admin" and str(current_user.id) != str(user.id):
        raise HTTPException(status_code=403, detail="Sin permiso")

    # Obtener impacto (reutilizando la lógica existente o similar)
    from app.routers.stats import get_user_impact
    impacto = get_user_impact(str(user.id), current_user, db)
    
    # Actividades del mes actual
    hoy = datetime.now(timezone.utc)
    inicio_mes = hoy.replace(day=1, hour=0, minute=0, second=0)
    
    actividades = db.query(Actividad).filter(
        Actividad.user_id == str(user.id),
        Actividad.created_at >= inicio_mes
    ).all()

    return {
        "periodo": hoy.strftime('%B %Y'),
        "investigador": {
            "nombre": user.nombre,
            "documento": user.documento,
            "rol_sennova": user.rol_sennova
        },
        "resumen": {
            "proyectos_activos": impacto["proyectos_count"],
            "productos_generados": impacto["productos_count"],
            "cumplimiento": impacto["cumplimiento"]
        },
        "detalle_actividades": [
            {"fecha": a.created_at.strftime('%Y-%m-%d'), "accion": a.tipo_accion, "desc": a.descripcion}
            for a in actividades
        ],
        "metas_proximo_mes": [
            "Continuar ejecución de proyectos asignados",
            "Actualizar CVLaC",
            "Registrar nuevos productos en la plataforma"
        ]
    }

@router.get("/proyectos/{proyecto_id}/certificados-masivos")
def generar_certificados_masivos(
    proyecto_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)  # Solo admin puede masivamente
):
    """
    Genera los datos para certificados de todos los integrantes de un proyecto.
    """
    proyecto = db.query(Proyecto).filter(Proyecto.id == str(proyecto_id)).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Importar la tabla de asociación
    from app.models import proyecto_equipo
    
    # Obtener todos los registros de la asociación para este proyecto
    equipo_data = db.execute(
        proyecto_equipo.select().where(proyecto_equipo.c.proyecto_id == str(proyecto.id))
    ).fetchall()
    
    certificados = []
    
    # Crear un mapa de datos de asociación por user_id
    asoc_map = {str(row.user_id): row for row in equipo_data}
    
    for user in proyecto.equipo:
        asoc = asoc_map.get(str(user.id))
        if not asoc: continue
        
        certificados.append({
            "entidad": "SERVICIO NACIONAL DE APRENDIZAJE - SENA",
            "centro": "CENTRO DE GESTIÓN AGROEMPRESARIAL Y ORIENTE",
            "programa_sennova": "SENNOVA",
            "tipo_documento": "CERTIFICADO DE PARTICIPACIÓN EN PROYECTO",
            "datos_usuario": {
                "nombre": user.nombre.upper(),
                "documento": getattr(user, 'documento', 'N/A'),
                "ficha": getattr(user, 'ficha', None),
                "programa": getattr(user, 'programa_formacion', None),
                "rol": asoc.rol_en_proyecto or "Integrante",
                "horas": asoc.horas_dedicadas or 0
            },
            "datos_proyecto": {
                "nombre": proyecto.nombre,
                "codigo": proyecto.codigo_sgps or proyecto.nombre_corto,
                "vigencia": proyecto.vigencia,
                "linea": proyecto.linea_programatica
            },
            "fecha_emision": date.today().strftime('%d de %B de %Y'),
            "firmas": [
                {"nombre": proyecto.owner.nombre, "rol": "Investigador Principal"},
                {"nombre": "SUBDIRECTOR DE CENTRO", "rol": "Subdirector CGAO"}
            ]
        })
    
    return certificados


@router.get("/proyectos/{proyecto_id}/presupuesto-detalle")
def generar_detalle_presupuesto(
    proyecto_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Genera un desglose detallado del presupuesto del proyecto para informes ejecutivos.
    """
    proyecto = db.query(Proyecto).filter(Proyecto.id == str(proyecto_id)).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Datos base
    base_json = proyecto.presupuesto_detallado or {}
    total = proyecto.presupuesto_total or 0
    
    # Estructura de rubros estándar SENNOVA
    rubros = [
        {"id": "servicios_tecnologicos", "label": "Servicios Tecnológicos", "valor": base_json.get("servicios", 0)},
        {"id": "materiales_consumibles", "label": "Materiales y Suministros", "valor": base_json.get("materiales", 0)},
        {"id": "viaticos_transporte", "label": "Viáticos y Transporte", "valor": base_json.get("viaticos", 0)},
        {"id": "equipamiento", "label": "Equipos de Laboratorio", "valor": base_json.get("equipos", 0)},
        {"id": "software_licencias", "label": "Software y Licencias", "valor": base_json.get("software", 0)},
        {"id": "otros", "label": "Otros Gastos Operativos", "valor": base_json.get("otros", 0)}
    ]
    
    # Calcular porcentajes
    for r in rubros:
        r["porcentaje"] = round((r["valor"] / total * 100), 2) if total > 0 else 0
        
    return {
        "proyecto": {
            "nombre": proyecto.nombre,
            "codigo": proyecto.codigo_sgps,
            "investigador": proyecto.owner.nombre,
            "vigencia": f"{proyecto.vigencia} meses"
        },
        "resumen_financiero": {
            "total_asignado": total,
            "fuente": "SGPS - SENNOVA",
            "moneda": "COP"
        },
        "distribucion_rubros": rubros,
        "indicadores": {
            "gasto_talento_humano": "Cargado a nómina SENA (No monetizable en este reporte)",
            "eficiencia_operativa": 85.5, # Placeholder simulado
            "nivel_ejecucion": 12.0 # Placeholder simulado
        },
        "fecha_corte": date.today().strftime('%Y-%m-%d')
    }


@router.get("/proyectos/{proyecto_id}/bitacora-oficial")
def generar_bitacora_oficial(
    proyecto_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Consolida toda la bitácora técnica de un proyecto para exportación oficial.
    """
    proyecto = db.query(Proyecto).filter(Proyecto.id == str(proyecto_id)).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    entradas = db.query(BitacoraEntry).filter(
        BitacoraEntry.proyecto_id == str(proyecto.id)
    ).order_by(BitacoraEntry.fecha.asc()).all()
    
    return {
        "entidad": "SERVICIO NACIONAL DE APRENDIZAJE - SENA",
        "centro": "CENTRO DE GESTIÓN AGROEMPRESARIAL Y ORIENTE",
        "proyecto": {
            "nombre": proyecto.nombre,
            "codigo": proyecto.codigo_sgps,
            "linea": proyecto.linea_programatica
        },
        "periodo": f"Generado el {date.today().strftime('%Y-%m-%d')}",
        "resumen_ejecucion": {
            "total_entradas": len(entradas),
            "firmas_completas": len([e for e in entradas if e.is_firmado_investigador and e.is_firmado_aprendiz]),
            "pendientes": len([e for e in entradas if not e.is_firmado_investigador or not e.is_firmado_aprendiz])
        },
        "entradas": [
            {
                "fecha": e.fecha.strftime('%Y-%m-%d %H:%M'),
                "titulo": e.titulo,
                "categoria": e.categoria,
                "contenido": e.contenido,
                "autor": e.user.nombre,
                "estado_firma": "COMPLETA" if (e.is_firmado_investigador and e.is_firmado_aprendiz) else "PENDIENTE",
                "hash_verificacion": e.signature_metadata.get("investigador", {}).get("integrity_hash", "N/A") if e.signature_metadata else "N/A",
                "adjuntos_count": len(e.adjuntos) if e.adjuntos else 0
            } for e in entradas
        ],
        "glosario_seguridad": "Los hashes de verificación garantizan que el contenido no ha sido modificado tras la firma digital."
    }
