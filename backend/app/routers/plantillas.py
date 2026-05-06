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
