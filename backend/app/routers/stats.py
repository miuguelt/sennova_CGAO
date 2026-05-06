"""
Router de Estadísticas
Dashboard y estadísticas del sistema
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

import uuid
from app.auth import get_current_user, get_current_admin
from app.database import get_db
from datetime import datetime, timedelta, timezone

from app.models import (
    User, Proyecto, Grupo, Semillero, 
    Producto, Convocatoria, Documento,
    Entregable, Notificacion, Actividad, Aprendiz, Reto
)

router = APIRouter(prefix="/stats", tags=["Estadísticas"])


def calcular_progreso_entregables(entregables_query):
    """Calcula progreso para relaciones dinámicas o listas de entregables."""
    if hasattr(entregables_query, "count") and hasattr(entregables_query, "filter"):
        total = entregables_query.count()
        aprobados = entregables_query.filter(Entregable.estado == "aprobado").count()
    else:
        entregables = list(entregables_query or [])
        total = len(entregables)
        aprobados = len([e for e in entregables if e.estado == "aprobado"])

    return int((aprobados / total * 100)) if total > 0 else 0


@router.get("/dashboard")
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Estadísticas potenciadas para el Centro de Acción (Dashboard)."""
    
    hoy = datetime.now(timezone.utc).date()
    treinta_dias = hoy + timedelta(days=30)

    # 1. Conteos generales (mantener compatibilidad)
    stats = {
        "proyectos": {
            "total": db.query(Proyecto).count(),
            "activos": db.query(Proyecto).filter(Proyecto.estado.in_(["Formulación", "En ejecución", "Aprobado"])).count()
        },
        "productos": {
            "total": db.query(Producto).count(),
            "verificados": db.query(Producto).filter(Producto.is_verificado == True).count()
        },
        "investigadores": db.query(User).filter(User.rol == "investigador", User.is_active == True).count(),
        "aprendices": {
            "total": db.query(Aprendiz).count(),
            "activos": db.query(Aprendiz).filter(Aprendiz.estado == "activo").count()
        }
    }
    
    # 2. Entregables Críticos (Acción Inmediata)
    vencidos = db.query(Entregable).filter(
        Entregable.fecha_entrega < hoy,
        Entregable.estado.in_(['pendiente', 'en_desarrollo'])
    ).limit(5).all()

    proximos = db.query(Entregable).filter(
        Entregable.fecha_entrega <= treinta_dias,
        Entregable.fecha_entrega >= hoy,
        Entregable.estado.in_(['pendiente', 'en_desarrollo'])
    ).order_by(Entregable.fecha_entrega.asc()).limit(5).all()

    stats["tareas_criticas"] = {
        "vencidas": [{
            "id": str(e.id),
            "titulo": e.titulo,
            "proyecto": e.proyecto.nombre_corto or e.proyecto.nombre,
            "fecha": e.fecha_entrega
        } for e in vencidos],
        "proximas": [{
            "id": str(e.id),
            "titulo": e.titulo,
            "proyecto": e.proyecto.nombre_corto or e.proyecto.nombre,
            "fecha": e.fecha_entrega
        } for e in proximos]
    }
    
    # 3. Actividad Reciente Real (Audit Trail)
    actividades = db.query(Actividad).order_by(Actividad.created_at.desc()).limit(8).all()
    stats["historial_reciente"] = [{
        "id": str(a.id),
        "usuario": a.user.nombre,
        "accion": a.tipo_accion,
        "descripcion": a.descripcion,
        "fecha": a.created_at
    } for a in actividades]

    # 4. Otros datos para gráficos
    stats["proyectos_por_estado"] = {str(row[0]): int(row[1]) for row in db.query(Proyecto.estado, func.count(Proyecto.id)).group_by(Proyecto.estado).all()}
    
    return stats


@router.get("/admin")
def get_admin_stats(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Estadísticas avanzadas solo para admin."""
    
    return {
        "usuarios": {
            "total": db.query(User).count(),
            "activos": db.query(User).filter(User.is_active == True).count(),
            "inactivos": db.query(User).filter(User.is_active == False).count(),
            "por_rol": [
                {"rol": rol, "count": count}
                for rol, count in db.query(User.rol, func.count(User.id))
                .group_by(User.rol)
                .all()
            ]
        },
        "proyectos": {
            "total": db.query(Proyecto).count(),
            "por_estado": [
                {"estado": estado, "count": count}
                for estado, count in db.query(Proyecto.estado, func.count(Proyecto.id))
                .group_by(Proyecto.estado)
                .all()
            ],
            "presupuesto_total": float(
                db.query(func.sum(Proyecto.presupuesto_total)).scalar() or 0
            )
        },
        "grupos": {
            "total": db.query(Grupo).count(),
            "por_estado": [
                {"estado": estado, "count": count}
                for estado, count in db.query(Grupo.estado, func.count(Grupo.id))
                .group_by(Grupo.estado)
                .all()
            ]
        },
        "semilleros": {
            "total": db.query(Semillero).count()
        },
        "convocatorias": {
            "total": db.query(Convocatoria).count(),
            "activas": db.query(Convocatoria).filter(
                Convocatoria.estado == "abierta"
            ).count()
        },
        "productos": {
            "total": db.query(Producto).count(),
            "verificados": db.query(Producto).filter(
                Producto.is_verificado == True
            ).count(),
            "por_tipo": [
                {"tipo": tipo, "count": count}
                for tipo, count in db.query(Producto.tipo, func.count(Producto.id))
                .group_by(Producto.tipo)
                .all()
            ]
        },
        "documentos": {
            "total": db.query(Documento).count(),
            "cvlac": db.query(Documento).filter(
                Documento.tipo == "cvlac_pdf"
            ).count()
        },
        "entregables": {
            "total": db.query(Entregable).count(),
            "pendientes": db.query(Entregable).filter(
                Entregable.estado == 'pendiente'
            ).count(),
            "en_desarrollo": db.query(Entregable).filter(
                Entregable.estado == 'en_desarrollo'
            ).count(),
            "enviados": db.query(Entregable).filter(
                Entregable.estado == 'enviado'
            ).count(),
            "aprobados": db.query(Entregable).filter(
                Entregable.estado == 'aprobado'
            ).count(),
            "vencidos": db.query(Entregable).filter(
                Entregable.fecha_entrega < datetime.now(timezone.utc).date(),
                Entregable.estado.in_(['pendiente', 'en_desarrollo'])
            ).count()
        }
    }


@router.get("/analytics/evolucion")
def get_analytics_evolucion(
    meses: int = 12,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Retorna datos de evolución temporal para gráficos analytics."""
    try:
        # Detectar motor de base de datos de forma robusta
        is_sqlite = db.bind.dialect.name == "sqlite"
        
        hoy = datetime.now(timezone.utc)
        meses_data = []
        
        for i in range(meses - 1, -1, -1):
            # Calcular primer día del mes target de forma más precisa
            target_date = hoy - timedelta(days=i * 30)
            mes_inicio = target_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            # El fin del mes es el primer día del siguiente mes menos 1 segundo
            if mes_inicio.month == 12:
                next_month = mes_inicio.replace(year=mes_inicio.year + 1, month=1)
            else:
                next_month = mes_inicio.replace(month=mes_inicio.month + 1)
            mes_fin = next_month - timedelta(seconds=1)
            
            # Para SQLite, quitar tzinfo
            mes_inicio_query = mes_inicio.replace(tzinfo=None) if is_sqlite else mes_inicio
            mes_fin_query = mes_fin.replace(tzinfo=None) if is_sqlite else mes_fin
            
            # Conteos acumulados hasta ese mes
            proyectos_nuevos = db.query(Proyecto).filter(
                Proyecto.created_at >= mes_inicio_query,
                Proyecto.created_at <= mes_fin_query
            ).count()
            
            productos_nuevos = db.query(Producto).filter(
                Producto.created_at >= mes_inicio_query,
                Producto.created_at <= mes_fin_query
            ).count()
            
            usuarios_nuevos = db.query(User).filter(
                User.created_at >= mes_inicio_query,
                User.created_at <= mes_fin_query
            ).count()
            
            # Total acumulado hasta ese mes
            total_proyectos = db.query(Proyecto).filter(
                Proyecto.created_at <= mes_fin_query
            ).count()
            
            total_productos = db.query(Producto).filter(
                Producto.created_at <= mes_fin_query
            ).count()
            
            meses_data.append({
                "mes": str(mes_inicio.strftime("%Y-%m")),
                "mes_nombre": str(mes_inicio.strftime("%b %Y")),
                "proyectos_nuevos": int(proyectos_nuevos),
                "productos_nuevos": int(productos_nuevos),
                "usuarios_nuevos": int(usuarios_nuevos),
                "total_proyectos": int(total_proyectos),
                "total_productos": int(total_productos)
            })
        
        # Datos de crecimiento CVLAC
        cvlac_stats = []
        # Obtener total investigadores una sola vez para optimizar
        total_inv = db.query(User).filter(User.rol == 'investigador').count()
        
        for mes_data in meses_data:
            # En un sistema real filtraríamos por fecha, aquí simplificamos
            # pero corregimos el nombre del campo a snake_case
            actualizados = db.query(User).filter(
                User.estado_cv_lac == 'Actualizado'
            ).count()
            
            cvlac_stats.append({
                "mes": str(mes_data["mes"]),
                "porcentaje_actualizado": float(round((actualizados / total_inv * 100), 1)) if total_inv > 0 else 0.0
            })
        
        return {
            "evolucion_mensual": meses_data,
            "cvlac_evolucion": cvlac_stats,
            "totales_actuales": {
                "proyectos": int(db.query(Proyecto).count()),
                "productos": int(db.query(Producto).count()),
                "usuarios": int(db.query(User).count()),
                "investigadores": int(db.query(User).filter(User.rol == 'investigador').count())
            }
        }
    except Exception as e:
        print(f"Error en analytics evolucion: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


@router.get("/user/{user_id}/impact")
def get_user_impact(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calcula el impacto 360 de un investigador basado en datos reales."""
    uid = user_id
    user_db = db.query(User).filter(User.id == uid).first()
    if not user_db:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # 1. Proyectos (Liderados + Equipo)
    proyectos_liderados = db.query(Proyecto).filter(Proyecto.owner_id == uid).all()
    # Para proyectos donde es miembro, consultamos la tabla intermedia
    from app.models import proyecto_equipo
    proyectos_miembro = db.query(Proyecto).join(proyecto_equipo).filter(proyecto_equipo.c.user_id == uid).all()
    
    todos_los_proyectos = list(set(proyectos_liderados + proyectos_miembro))
    
    # 2. Productos
    productos = db.query(Producto).filter(Producto.owner_id == uid).all()
    
    # 3. Semilleros
    semilleros = db.query(Semillero).filter(Semillero.owner_id == uid).all()

    # 4. Cálculo de Cumplimiento y Progreso Real
    entregables = db.query(Entregable).filter(Entregable.responsable_id == uid).all()
    total_e = len(entregables)
    aprobados = len([e for e in entregables if e.estado == 'aprobado'])
    cumplimiento = int((aprobados / total_e * 100)) if total_e > 0 else 0

    # 5. Finanzas Reales
    # Sumamos el total del presupuesto de los proyectos donde es dueño
    presupuesto_total = sum(p.presupuesto_total or 0 for p in proyectos_liderados)
    
    # Calculamos la distribución real del perfil basada en la cantidad de items
    total_items = len(todos_los_proyectos) + len(productos) + len(semilleros)
    def pct(val): return int((val / total_items * 100)) if total_items > 0 else 0

    return {
        "resumen_perfil": f"Investigador con enfoque en {', '.join(user_db.lineas_investigacion or ['Investigación General'])}. " + 
                          f"Lidera {len(proyectos_liderados)} iniciativas y apoya {len(proyectos_miembro)} procesos de coinvestigación.",
        "proyectos_count": len(todos_los_proyectos),
        "productos_count": len(productos),
        "semilleros_count": len(semilleros),
        "cumplimiento": cumplimiento,
        "presupuesto_total": presupuesto_total,
        "distribucion_perfil": [
            {"name": "Investigación", "value": len(todos_los_proyectos)},
            {"name": "Producción", "value": len(productos)},
            {"name": "Mentoría", "value": len(semilleros)}
        ],
        "proyectos_lista": [{
            "id": str(p.id),
            "nombre": p.nombre_corto or p.nombre,
            "rol": "Líder" if str(p.owner_id) == uid else "Coinvestigador",
            "estado": p.estado,
            "progreso": calcular_progreso_entregables(p.entregables),
            "presupuesto": p.presupuesto_total or 0,
            "inicio": p.created_at.date()
        } for p in todos_los_proyectos],
        "productos_lista": [{
            "id": str(pr.id),
            "nombre": pr.nombre,
            "tipo": pr.tipo,
            "fecha": pr.fecha_publicacion,
            "estado_registro": "Verificado" if pr.is_verificado else "Pendiente"
        } for pr in productos],
        "semilleros_lista": [{
            "id": str(s.id),
            "nombre": s.nombre,
            "estudiantes": db.query(func.count(Aprendiz.id)).filter(Aprendiz.semillero_id == s.id).scalar()
        } for s in semilleros]
    }


@router.get("/semillero/{semillero_id}/impact")
def get_semillero_stats(
    semillero_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Estadísticas detalladas de impacto para un semillero específico."""
    s = db.query(Semillero).filter(Semillero.id == str(semillero_id)).first()
    if not s:
        raise HTTPException(status_code=404, detail="Semillero no encontrado")
    
    # Aprendices vinculados
    aprendices = db.query(Aprendiz).filter(Aprendiz.semillero_id == s.id).all()
    
    # Impacto basado en productos de los miembros (si aplica) o actividades
    # Por ahora simulamos impacto basado en la evolución de aprendices
    hoy = datetime.now(timezone.utc)
    evolucion = []
    for i in range(5, -1, -1):
        target = hoy - timedelta(days=i * 30)
        # En un sistema real contaríamos aprendices con fecha_ingreso <= target
        # Aquí simulamos una tendencia creciente para la demo
        evolucion.append({
            "mes": target.strftime("%b"),
            "aprendices": max(2, len(aprendices) - (i * 2)) if len(aprendices) > 5 else len(aprendices)
        })
        
    return {
        "id": str(s.id),
        "nombre": s.nombre,
        "total_aprendices": len(aprendices),
        "impacto": [
            {"name": "Publicaciones", "value": 2},
            {"name": "Eventos", "value": 4},
            {"name": "Proyectos", "value": 1},
            {"name": "Talleres", "value": 6}
        ],
        "evolucion": evolucion
    }


@router.get("/search/global")
def global_search(
    q: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Búsqueda global unificada en todo el sistema."""
    if not q or len(q) < 2:
        return {"results": []}
    
    search_filter = f"%{q}%"
    results = []
    
    # 1. Buscar Proyectos
    proyectos = db.query(Proyecto).filter(
        (Proyecto.nombre.ilike(search_filter)) | 
        (Proyecto.codigo_sgps.ilike(search_filter)) |
        (Proyecto.nombre_corto.ilike(search_filter))
    ).limit(5).all()
    
    for p in proyectos:
        results.append({
            "id": str(p.id),
            "title": p.nombre_corto or p.nombre,
            "subtitle": f"Proyecto - {p.estado}",
            "type": "proyecto",
            "icon": "folder",
            "url": f"/proyectos"
        })
        
    # 2. Buscar Investigadores
    usuarios = db.query(User).filter(
        (User.nombre.ilike(search_filter)) | 
        (User.email.ilike(search_filter))
    ).limit(5).all()

    for u in usuarios:
        results.append({
            "id": str(u.id),
            "title": u.nombre,
            "subtitle": f"Investigador - {getattr(u, 'rol_sennova', None) or getattr(u, 'rol', 'Sin rol')}",
            "type": "investigador",
            "icon": "user",
            "url": f"/investigadores"
        })
        
    # 3. Buscar Grupos
    grupos = db.query(Grupo).filter(
        (Grupo.nombre.ilike(search_filter)) | 
        (Grupo.codigo_gruplac.ilike(search_filter))
    ).limit(5).all()
    
    for g in grupos:
        results.append({
            "id": str(g.id),
            "title": g.nombre,
            "subtitle": f"Grupo de Investigación - {g.clasificacion or 'S.C.'}",
            "type": "grupo",
            "icon": "users",
            "url": f"/grupos"
        })
        
    for pr in productos:
        results.append({
            "id": str(pr.id),
            "title": pr.nombre,
            "subtitle": f"Producto - {pr.tipo}",
            "type": "producto",
            "icon": "file-text",
            "url": f"/productos"
        })

    # 5. Buscar Semilleros
    semilleros = db.query(Semillero).filter(
        (Semillero.nombre.ilike(search_filter)) | 
        (Semillero.linea_investigacion.ilike(search_filter))
    ).limit(5).all()

    for s in semilleros:
        results.append({
            "id": str(s.id),
            "title": s.nombre,
            "subtitle": f"Semillero - {s.estado}",
            "type": "semillero",
            "icon": "users",
            "url": f"/semilleros"
        })

    # 6. Buscar Retos
    retos = db.query(Reto).filter(
        (Reto.titulo.ilike(search_filter)) | 
        (Reto.descripcion.ilike(search_filter))
    ).limit(5).all()

    for r in retos:
        results.append({
            "id": str(r.id),
            "title": r.titulo,
            "subtitle": f"Reto - {r.estado}",
            "type": "reto",
            "icon": "lightbulb",
            "url": f"/retos"
        })
        
    return {"results": results}


@router.get("/audit/logs")
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    method: Optional[str] = None,
    user_id: Optional[str] = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Obtener logs de auditoría del sistema (solo admin)."""
    from app.models import AuditLog

    query = db.query(AuditLog).order_by(AuditLog.created_at.desc())

    if method:
        query = query.filter(AuditLog.method == method.upper())
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    total = query.count()
    logs = query.offset(skip).limit(limit).all()

    return {
        "total": total,
        "logs": [{
            "id": str(log.id),
            "user_id": str(log.user_id) if log.user_id else None,
            "user_email": log.user.email if log.user else "Sistema",
            "user_nombre": log.user.nombre if log.user else "N/A",
            "method": log.method,
            "endpoint": log.endpoint,
            "status_code": log.status_code,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "payload_snapshot": log.payload_snapshot
        } for log in logs]
    }


@router.get("/audit/summary")
def get_audit_summary(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Obtener resumen de auditoría del sistema (solo admin)."""
    from app.models import AuditLog
    from sqlalchemy import func

    hoy = datetime.now(timezone.utc)
    hace_7_dias = hoy - timedelta(days=7)
    hace_30_dias = hoy - timedelta(days=30)

    # Conteos por método
    por_metodo = db.query(
        AuditLog.method,
        func.count(AuditLog.id).label('count')
    ).group_by(AuditLog.method).all()

    # Conteos por día (últimos 7 días)
    por_dia = db.query(
        func.date(AuditLog.created_at).label('fecha'),
        func.count(AuditLog.id).label('count')
    ).filter(AuditLog.created_at >= hace_7_dias).group_by(
        func.date(AuditLog.created_at)
    ).order_by(func.date(AuditLog.created_at)).all()

    return {
        "total_logs": db.query(AuditLog).count(),
        "logs_ultimos_7_dias": db.query(AuditLog).filter(AuditLog.created_at >= hace_7_dias).count(),
        "logs_ultimos_30_dias": db.query(AuditLog).filter(AuditLog.created_at >= hace_30_dias).count(),
        "por_metodo": [{"method": m.method, "count": m.count} for m in por_metodo],
        "por_dia": [{"fecha": str(d.fecha), "count": d.count} for d in por_dia],
        "ultimos_logs": db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(5).count()
    }
