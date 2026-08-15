"""
Router de Estadísticas
Dashboard y estadísticas del sistema
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.auth import get_current_user, get_current_admin
from app.database import get_db
from datetime import datetime, timedelta, timezone

from app.models import (
    User, Proyecto, Grupo, Semillero, 
    Producto, Convocatoria, Documento,
    Entregable, Actividad, Aprendiz, Reto
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
    """Estadísticas potenciadas para el Centro de Acción (Dashboard) con filtrado por rol."""
    try:
        hoy = datetime.now(timezone.utc).date()
        treinta_dias = hoy + timedelta(days=30)
        is_admin = current_user.rol == "admin"

        # 1. Conteos generales y tendencias
        hoy_dt = datetime.now(timezone.utc)
        inicio_mes_actual = hoy_dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if inicio_mes_actual.month == 1:
            inicio_mes_anterior = inicio_mes_actual.replace(year=inicio_mes_actual.year - 1, month=12)
        else:
            inicio_mes_anterior = inicio_mes_actual.replace(month=inicio_mes_actual.month - 1)
        
        # SQLite fix
        is_sqlite = db.bind.dialect.name == "sqlite"
        inicio_mes_actual_q = inicio_mes_actual.replace(tzinfo=None) if is_sqlite else inicio_mes_actual
        inicio_mes_anterior_q = inicio_mes_anterior.replace(tzinfo=None) if is_sqlite else inicio_mes_anterior

        # Definir queries base según rol
        query_proyectos = db.query(Proyecto)
        query_productos = db.query(Producto)
        query_entregables = db.query(Entregable)

        if not is_admin:
            # Filtrar por owner o equipo
            query_proyectos = query_proyectos.filter(
                (Proyecto.owner_id == str(current_user.id)) | 
                (Proyecto.equipo.any(User.id == current_user.id))
            )
            query_productos = query_productos.filter(
                (Producto.owner_id == str(current_user.id)) |
                (Producto.proyecto.has(Proyecto.owner_id == str(current_user.id))) |
                (Producto.proyecto.has(Proyecto.equipo.any(User.id == current_user.id)))
            )
            query_entregables = query_entregables.filter(
                (Entregable.responsable_id == str(current_user.id)) |
                (Entregable.proyecto.has(Proyecto.owner_id == str(current_user.id))) |
                (Entregable.proyecto.has(Proyecto.equipo.any(User.id == current_user.id)))
            )

        proyectos_mes_actual = query_proyectos.filter(Proyecto.created_at >= inicio_mes_actual_q).count()
        proyectos_mes_anterior = query_proyectos.filter(
            Proyecto.created_at >= inicio_mes_anterior_q,
            Proyecto.created_at < inicio_mes_actual_q
        ).count()

        productos_mes_actual = query_productos.filter(Producto.created_at >= inicio_mes_actual_q).count()
        productos_mes_anterior = query_productos.filter(
            Producto.created_at >= inicio_mes_anterior_q,
            Producto.created_at < inicio_mes_actual_q
        ).count()

        def calc_trend(actual, anterior):
            if anterior == 0:
                return f"+{actual}" if actual > 0 else "0"
            diff = actual - anterior
            return f"{'+' if diff >= 0 else ''}{diff}"

        # Aprendices conteo contextual
        if is_admin:
            aprendices_total = db.query(Aprendiz).count()
            aprendices_activos = db.query(Aprendiz).filter(Aprendiz.estado == "activo").count()
        elif current_user.rol in ["investigador", "instructor"]:
            # Aprendices en semilleros del investigador
            mis_semilleros_ids = [str(s.id) for s in db.query(Semillero).filter(
                (Semillero.owner_id == str(current_user.id)) |
                (Semillero.investigadores.any(User.id == current_user.id))
            ).all()]
            aprendices_total = db.query(Aprendiz).filter(Aprendiz.semillero_id.in_(mis_semilleros_ids)).count() if mis_semilleros_ids else 0
            aprendices_activos = db.query(Aprendiz).filter(Aprendiz.semillero_id.in_(mis_semilleros_ids), Aprendiz.estado == "activo").count() if mis_semilleros_ids else 0
        else:
            # Aprendiz: cuenta su semillero
            mi_vinculacion = db.query(Aprendiz).filter(Aprendiz.user_id == str(current_user.id)).first()
            if mi_vinculacion:
                aprendices_total = db.query(Aprendiz).filter(Aprendiz.semillero_id == mi_vinculacion.semillero_id).count()
                aprendices_activos = db.query(Aprendiz).filter(Aprendiz.semillero_id == mi_vinculacion.semillero_id, Aprendiz.estado == "activo").count()
            else:
                aprendices_total = 0
                aprendices_activos = 0

        # Bitacoras contextual
        query_bitacoras = db.query(from_models_bitacora := app.models.BitacoraEntry if 'app' in globals() else BitacoraEntry)
        if not is_admin:
            query_bitacoras = query_bitacoras.filter(
                (BitacoraEntry.user_id == str(current_user.id)) |
                (BitacoraEntry.proyecto.has(Proyecto.owner_id == str(current_user.id))) |
                (BitacoraEntry.proyecto.has(Proyecto.equipo.any(User.id == current_user.id)))
            )

        total_bitacoras = query_bitacoras.count()
        firmadas_tutor = query_bitacoras.filter(BitacoraEntry.is_firmado_investigador == True).count()
        firmadas_aprendiz = query_bitacoras.filter(BitacoraEntry.is_firmado_aprendiz == True).count()

        stats = {
            "proyectos": {
                "total": query_proyectos.count(),
                "activos": query_proyectos.filter(Proyecto.estado.in_(["Formulación", "En ejecución", "Aprobado"])).count(),
                "trend": calc_trend(proyectos_mes_actual, proyectos_mes_anterior)
            },
            "productos": {
                "total": query_productos.count(),
                "verificados": query_productos.filter(Producto.is_verificado == True).count(),
                "trend": calc_trend(productos_mes_actual, productos_mes_anterior)
            },
            "investigadores": db.query(User).filter(User.rol.in_(["investigador", "instructor"]), User.is_active == True).count() if is_admin else 0,
            "instructores": db.query(User).filter(User.rol == "instructor", User.is_active == True).count() if is_admin else 0,
            "aprendices": {
                "total": aprendices_total,
                "activos": aprendices_activos
            },
            "bitacoras": {
                "total": total_bitacoras,
                "firmadas_tutor": firmadas_tutor,
                "firmadas_aprendiz": firmadas_aprendiz,
                "pendientes": total_bitacoras - min(firmadas_tutor, firmadas_aprendiz) if total_bitacoras > 0 else 0
            }
        }
        
        # 2. Entregables Críticos
        vencidos = query_entregables.filter(
            Entregable.fecha_entrega < hoy,
            Entregable.estado.in_(['pendiente', 'en_desarrollo'])
        ).limit(5).all()

        proximos = query_entregables.filter(
            Entregable.fecha_entrega <= treinta_dias,
            Entregable.fecha_entrega >= hoy,
            Entregable.estado.in_(['pendiente', 'en_desarrollo'])
        ).order_by(Entregable.fecha_entrega.asc()).limit(5).all()

        stats["tareas_criticas"] = {
            "vencidas": [{
                "id": str(e.id),
                "titulo": e.titulo,
                "proyecto": (e.proyecto.nombre_corto or e.proyecto.nombre) if e.proyecto else "Sin Proyecto",
                "fecha": e.fecha_entrega
            } for e in vencidos],
            "proximas": [{
                "id": str(e.id),
                "titulo": e.titulo,
                "proyecto": (e.proyecto.nombre_corto or e.proyecto.nombre) if e.proyecto else "Sin Proyecto",
                "fecha": e.fecha_entrega
            } for e in proximos]
        }
        
        # 3. Actividad Reciente (Auditoría para Admin, Personal para Investigador)
        query_actividades = db.query(Actividad)
        if not is_admin:
            query_actividades = query_actividades.filter(Actividad.user_id == str(current_user.id))
            
        actividades = query_actividades.order_by(Actividad.created_at.desc()).limit(8).all()
        stats["historial_reciente"] = [{
            "id": str(a.id),
            "usuario": a.user.nombre if a.user else "Sistema",
            "accion": a.tipo_accion,
            "descripcion": a.descripcion,
            "fecha": a.created_at
        } for a in actividades]

        # 4. Gráficos
        stats["proyectos_por_estado"] = {str(row[0]): int(row[1]) for row in query_proyectos.with_entities(Proyecto.estado, func.count(Proyecto.id)).group_by(Proyecto.estado).all()}
        
        return stats
    except (OperationalError, SQLAlchemyError) as db_err:
        raise db_err
    except Exception as e:
        import traceback
        with open("C:/Users/Miguel/Documents/Aplicaciones/_projects/sennova/backend/error_dashboard.txt", "w") as f:
            f.write(traceback.format_exc())
        print(f"Error en dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/resumen")
@router.get("/admin")
def get_stats_resumen(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Estadísticas avanzadas para dashboard (solo admin)."""
    try:
        # Calcular tendencias para admin
        hoy_dt = datetime.now(timezone.utc)
        inicio_mes_actual = hoy_dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if inicio_mes_actual.month == 1:
            inicio_mes_anterior = inicio_mes_actual.replace(year=inicio_mes_actual.year - 1, month=12)
        else:
            inicio_mes_anterior = inicio_mes_actual.replace(month=inicio_mes_actual.month - 1)
        
        is_sqlite = db.bind.dialect.name == "sqlite"
        inicio_mes_actual_q = inicio_mes_actual.replace(tzinfo=None) if is_sqlite else inicio_mes_actual
        inicio_mes_anterior_q = inicio_mes_anterior.replace(tzinfo=None) if is_sqlite else inicio_mes_anterior

        def calc_trend_pct(actual_count, total_count):
            if total_count <= actual_count:
                return 0
            anterior = total_count - actual_count
            if anterior == 0:
                return 100 if actual_count > 0 else 0
            return round((actual_count / anterior) * 100, 1)

        proyectos_total = db.query(Proyecto).count()
        proyectos_nuevos = db.query(Proyecto).filter(Proyecto.created_at >= inicio_mes_actual_q).count()
        
        productos_total = db.query(Producto).count()
        productos_nuevos = db.query(Producto).filter(Producto.created_at >= inicio_mes_actual_q).count()
        
        presupuesto_total = float(db.query(func.sum(Proyecto.presupuesto_total)).scalar() or 0)
        presupuesto_nuevo = float(db.query(func.sum(Proyecto.presupuesto_total)).filter(Proyecto.created_at >= inicio_mes_actual_q).scalar() or 0)

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
                "total": proyectos_total,
                "trend": calc_trend_pct(proyectos_nuevos, proyectos_total),
                "por_estado": [
                    {"estado": estado, "count": count}
                    for estado, count in db.query(Proyecto.estado, func.count(Proyecto.id))
                    .group_by(Proyecto.estado)
                    .all()
                ],
                "presupuesto_total": presupuesto_total,
                "presupuesto_trend": calc_trend_pct(presupuesto_nuevo, presupuesto_total)
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
                "total": productos_total,
                "trend": calc_trend_pct(productos_nuevos, productos_total),
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
    except (OperationalError, SQLAlchemyError) as db_err:
        raise db_err
    except Exception as e:
        print(f"Error en stats resumen: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/evolucion")
def get_analytics_evolucion(
    meses: int = 12,
    current_user: User = Depends(get_current_user),
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
        
        # Datos de crecimiento CVLAC (Histórico basado en Actividad)
        cvlac_stats = []
        total_inv = db.query(User).filter(User.rol == 'investigador').count()
        
        for mes_data in meses_data:
            # Parsear el mes fin para la consulta
            target_mes_fin = datetime.strptime(mes_data["mes"] + "-01", "%Y-%m-%d")
            # Ajuste fin de mes
            if target_mes_fin.month == 12:
                target_mes_fin = target_mes_fin.replace(year=target_mes_fin.year + 1, month=1)
            else:
                target_mes_fin = target_mes_fin.replace(month=target_mes_fin.month + 1)
            
            target_query_fin = target_mes_fin.replace(tzinfo=None) if is_sqlite else target_mes_fin

            # Contar cuántos investigadores habían actualizado su CVLaC hasta esa fecha
            # Usamos los logs de 'import_cvlac' para saber cuándo ocurrió
            actualizados_hasta_fecha = db.query(func.count(func.distinct(Actividad.user_id))).filter(
                Actividad.tipo_accion == 'import_cvlac',
                Actividad.created_at <= target_query_fin
            ).scalar() or 0
            
            # Sumar investigadores que ya estaban actualizados al inicio (si los hay)
            # Para la demo, esto funcionará bien si se usó el importador
            
            cvlac_stats.append({
                "mes": str(mes_data["mes"]),
                "porcentaje_actualizado": float(round((actualizados_hasta_fecha / total_inv * 100), 1)) if total_inv > 0 else 0.0
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
    except HTTPException:
        raise
    except (OperationalError, SQLAlchemyError) as db_err:
        raise db_err
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
    """Calcula el impacto 360 de un usuario (aprendiz o investigador) basado en datos reales de la BD."""
    try:
        # Aprendices solo pueden ver su propio impacto
        if current_user.rol == "aprendiz" and str(current_user.id) != str(user_id):
            raise HTTPException(status_code=403, detail="No tienes permiso para ver este perfil")
        uid = str(user_id)
        user_db = db.query(User).filter(User.id == uid).first()
        if not user_db:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        # 1. Semilleros vinculados (Líder/Owner + Coinvestigador + Aprendiz)
        from app.models import semillero_investigadores, proyecto_equipo, Aprendiz
        semilleros_owner = db.query(Semillero).filter(Semillero.owner_id == uid).all()
        semilleros_inv = db.query(Semillero).join(semillero_investigadores, semillero_investigadores.c.semillero_id == Semillero.id).filter(semillero_investigadores.c.user_id == uid).all()
        semilleros_apr = db.query(Semillero).join(Aprendiz, Aprendiz.semillero_id == Semillero.id).filter(Aprendiz.user_id == uid).all()

        semilleros_map = {}
        for s in (semilleros_owner + semilleros_inv + semilleros_apr):
            semilleros_map[str(s.id)] = s
        todos_los_semilleros = list(semilleros_map.values())
        user_semillero_ids = [str(s.id) for s in todos_los_semilleros]

        # 2. Proyectos (Liderados + Equipo + Heredados de semillero si aplica)
        proyectos_liderados = db.query(Proyecto).filter(Proyecto.owner_id == uid).all()
        proyectos_miembro = db.query(Proyecto).join(proyecto_equipo, proyecto_equipo.c.proyecto_id == Proyecto.id).filter(proyecto_equipo.c.user_id == uid).all()
        proyectos_semillero = []
        if user_semillero_ids:
            proyectos_semillero = db.query(Proyecto).filter(Proyecto.semillero_id.in_(user_semillero_ids)).all()

        proyectos_map = {}
        for p in (proyectos_liderados + proyectos_miembro + proyectos_semillero):
            proyectos_map[str(p.id)] = p
        todos_los_proyectos = list(proyectos_map.values())
        user_proyectos_ids = [str(p.id) for p in todos_los_proyectos]

        # 3. Productos (Propios + De Proyectos en los que participa)
        productos_propios = db.query(Producto).filter(Producto.owner_id == uid).all()
        productos_proyectos = []
        if user_proyectos_ids:
            productos_proyectos = db.query(Producto).filter(Producto.proyecto_id.in_(user_proyectos_ids)).all()
        productos_map = {}
        for pr in (productos_propios + productos_proyectos):
            productos_map[str(pr.id)] = pr
        todos_los_productos = list(productos_map.values())

        # 4. Cálculo de Cumplimiento y Progreso Real
        entregables_asignados = db.query(Entregable).filter(Entregable.responsable_id == uid).all()
        if not entregables_asignados and user_proyectos_ids:
            entregables_asignados = db.query(Entregable).filter(Entregable.proyecto_id.in_(user_proyectos_ids)).all()
        
        total_e = len(entregables_asignados)
        aprobados = len([e for e in entregables_asignados if e.estado == 'aprobado'])
        cumplimiento = int((aprobados / total_e * 100)) if total_e > 0 else (100 if len(todos_los_proyectos) > 0 and all(p.estado == 'Finalizado' for p in todos_los_proyectos) else 0)

        # 5. Finanzas Reales
        presupuesto_total = sum(p.presupuesto_total or 0 for p in todos_los_proyectos)
        presupuesto_ejecutado = sum(
            (p.presupuesto_total or 0) * (calcular_progreso_entregables(p.entregables) / 100.0)
            for p in todos_los_proyectos
        )
        porcentaje_ejecucion = round((presupuesto_ejecutado / presupuesto_total * 100), 1) if presupuesto_total > 0 else 0.0

        # Distribución real del perfil basada en la cantidad de items
        distribucion_perfil = [
            {"name": "Investigación", "value": len(todos_los_proyectos)},
            {"name": "Producción", "value": len(todos_los_productos)},
            {"name": "Mentoría / Semilleros", "value": len(todos_los_semilleros)}
        ]

        tipo_rol_str = "Aprendiz Investigador" if user_db.rol == 'aprendiz' else ("Instructor Investigador" if user_db.rol == 'instructor' else "Investigador SENNOVA")
        lineas_str = ', '.join(user_db.lineas_investigacion or ['Investigación y Desarrollo'])
        resumen_perfil = f"{tipo_rol_str} adscrito al {user_db.regional or 'CGAO'}. " + \
            (f"Participa en {len(todos_los_semilleros)} semillero(s) y {len(todos_los_proyectos)} proyecto(s) de I+D+i." if todos_los_semilleros or todos_los_proyectos else "Cuenta con perfil activo en el ecosistema SENNOVA.")

        return {
            "resumen_perfil": resumen_perfil,
            "proyectos_count": len(todos_los_proyectos),
            "productos_count": len(todos_los_productos),
            "semilleros_count": len(todos_los_semilleros),
            "cumplimiento": cumplimiento,
            "presupuesto_total": round(presupuesto_total, 2),
            "presupuesto_ejecutado": round(presupuesto_ejecutado, 2),
            "porcentaje_ejecucion": porcentaje_ejecucion,
            "distribucion_perfil": distribucion_perfil,
            "proyectos_lista": [{
                "id": str(p.id),
                "nombre": p.nombre_corto or p.nombre,
                "rol": "Líder" if str(p.owner_id) == uid else ("Investigador" if user_db.rol != 'aprendiz' else "Aprendiz Investigador"),
                "estado": p.estado,
                "progreso": calcular_progreso_entregables(p.entregables),
                "presupuesto": p.presupuesto_total or 0,
                "ejecutado": round((p.presupuesto_total or 0) * (calcular_progreso_entregables(p.entregables) / 100.0), 2),
                "equipo": len(p.equipo) if p.equipo else 1,
                "objetivo": p.objetivo_general or p.descripcion or "Sin objetivo formulado",
                "inicio": p.created_at.date().isoformat() if p.created_at else None
            } for p in todos_los_proyectos],
            "productos_lista": [{
                "id": str(pr.id),
                "nombre": pr.nombre,
                "tipo": pr.tipo,
                "descripcion": pr.descripcion or "Sin descripción técnica",
                "autores": pr.owner.nombre if pr.owner else "Investigador SENNOVA",
                "fecha": pr.fecha_publicacion.isoformat() if pr.fecha_publicacion else (pr.created_at.date().isoformat() if pr.created_at else None),
                "estado_registro": "Verificado" if pr.is_verificado else "Pendiente"
            } for pr in todos_los_productos],
            "semilleros_lista": [{
                "id": str(s.id),
                "nombre": s.nombre,
                "sede": user_db.sede or "Centro CGAO",
                "lineas": [s.linea_investigacion] if s.linea_investigacion else (user_db.lineas_investigacion or []),
                "estudiantes": db.query(func.count(Aprendiz.id)).filter(Aprendiz.semillero_id == s.id).scalar() or 0
            } for s in todos_los_semilleros]
        }
    except (OperationalError, SQLAlchemyError) as db_err:
        raise db_err
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error en user impact stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/semillero/{semillero_id}/impact")
def get_semillero_stats(
    semillero_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Estadísticas detalladas de impacto para un semillero específico basadas en datos reales."""
    try:
        s = db.query(Semillero).filter(Semillero.id == str(semillero_id)).first()
        if not s:
            raise HTTPException(status_code=404, detail="Semillero no encontrado")
        
        # Aprendices vinculados
        aprendices_ids = [str(a.id) for a in s.aprendices]
        investigadores_ids = [str(i.id) for i in s.investigadores]
        todos_miembros_ids = list(set(aprendices_ids + investigadores_ids + [str(s.owner_id)]))
        
        # Impacto basado en productos reales de los miembros
        productos_semillero = db.query(Producto).filter(Producto.owner_id.in_(todos_miembros_ids)).all()
        
        # Clasificar productos por tipo
        impacto_dict = {}
        for p in productos_semillero:
            tipo = p.tipo.capitalize()
            impacto_dict[tipo] = impacto_dict.get(tipo, 0) + 1
            
        impacto_lista = [{"name": k, "value": v} for k, v in impacto_dict.items()]
        if not impacto_lista:
            impacto_lista = [{"name": "Sin productos", "value": 0}]

        # Evolución real de aprendices
        is_sqlite = db.bind.dialect.name == "sqlite"
        hoy = datetime.now(timezone.utc)
        evolucion = []
        
        for i in range(5, -1, -1):
            target_date = hoy - timedelta(days=i * 30)
            # Ajuste para SQLite (quitar zona horaria)
            target_query = target_date.replace(tzinfo=None) if is_sqlite else target_date
            
            count = db.query(Aprendiz).filter(
                Aprendiz.semillero_id == s.id,
                Aprendiz.fecha_ingreso <= target_query.date()
            ).count()
            
            evolucion.append({
                "mes": target_date.strftime("%b"),
                "aprendices": count
            })
            
        return {
            "id": str(s.id),
            "nombre": s.nombre,
            "total_aprendices": len(s.aprendices),
            "impacto": impacto_lista,
            "evolucion": evolucion
        }
    except (OperationalError, SQLAlchemyError) as db_err:
        raise db_err
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error en semillero impact stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search/global")
def global_search(
    q: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Búsqueda global unificada en todo el sistema."""
    try:
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

        # Buscar Productos
        productos = db.query(Producto).filter(
            (Producto.nombre.ilike(search_filter)) |
            (Producto.descripcion.ilike(search_filter))
        ).limit(5).all()
        
        for p in proyectos:
            results.append({
                "id": str(p.id),
                "title": p.nombre_corto or p.nombre,
                "subtitle": f"Proyecto - {p.estado}",
                "type": "proyecto",
                "icon": "folder",
                "url": "/proyectos"
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
                "url": "/investigadores"
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
                "url": "/grupos"
            })
            
        for pr in productos:
            results.append({
                "id": str(pr.id),
                "title": pr.nombre,
                "subtitle": f"Producto - {pr.tipo}",
                "type": "producto",
                "icon": "file-text",
                "url": "/productos"
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
                "url": "/semilleros"
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
                "url": "/retos"
            })
            
        return {"results": results}
    except HTTPException:
        raise
    except (OperationalError, SQLAlchemyError) as db_err:
        raise db_err
    except Exception as e:
        print(f"Error en global search: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
    try:
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
    except (OperationalError, SQLAlchemyError) as db_err:
        raise db_err
    except Exception as e:
        print(f"Error en audit logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit/summary")
def get_audit_summary(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Obtener resumen de auditoría del sistema (solo admin)."""
    try:
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
    except (OperationalError, SQLAlchemyError) as db_err:
        raise db_err
    except Exception as e:
        print(f"Error en audit summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))
