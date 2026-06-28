from typing import List, Optional
import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models import AuditLog, Actividad, User
from app.schemas import AuditLogResponse, ActividadResponse
from app.auth import get_current_admin

router = APIRouter(
    prefix="/audit",
    tags=["Auditoría y Trazabilidad"]
)

@router.get("/logs", response_model=List[dict])
def list_audit_logs(
    skip: int = 0,
    limit: int = 100,
    method: Optional[str] = None,
    status_code: Optional[int] = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Listar logs de auditoría técnica (solo admin)."""
    try:
        query = db.query(AuditLog)
        
        if method:
            query = query.filter(AuditLog.method == method.upper())
        if status_code:
            query = query.filter(AuditLog.status_code == status_code)
            
        logs = query.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit).all()
        
        # Mapear respuesta para incluir nombre de usuario
        result = []
        for log in logs:
            result.append({
                "id": str(log.id),
                "user_id": str(log.user_id) if log.user_id else None,
                "user_nombre": log.user.nombre if log.user else "Anónimo/Sistema",
                "method": log.log_method if hasattr(log, 'log_method') else log.method, # Handle some inconsistencies if any
                "endpoint": log.endpoint,
                "status_code": log.status_code,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "created_at": log.created_at
            })
        return result
    except sa.exc.OperationalError as db_err:
        raise db_err
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/actividades", response_model=List[dict])
def list_actividades(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[str] = None,
    tipo_accion: Optional[str] = None,
    entidad_tipo: Optional[str] = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Listar historial de actividades de usuarios (solo admin)."""
    try:
        query = db.query(Actividad)
        
        if user_id:
            query = query.filter(Actividad.user_id == user_id)
        if tipo_accion:
            query = query.filter(Actividad.tipo_accion == tipo_accion)
        if entidad_tipo:
            query = query.filter(Actividad.entidad_tipo == entidad_tipo)
            
        actividades = query.order_by(desc(Actividad.created_at)).offset(skip).limit(limit).all()
        
        result = []
        for act in actividades:
            result.append({
                "id": str(act.id),
                "user_id": str(act.user_id),
                "user_nombre": act.user.nombre if act.user else "Desconocido",
                "tipo_accion": act.tipo_accion,
                "descripcion": act.descripcion,
                "entidad_tipo": act.entidad_tipo,
                "entidad_id": str(act.entidad_id) if act.entidad_id else None,
                "created_at": act.created_at,
                "ip_address": act.ip_address
            })
        return result
    except sa.exc.OperationalError as db_err:
        raise db_err
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
def get_audit_stats(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Resumen estadístico de auditoría."""
    try:
        from sqlalchemy import func
        
        total_logs = db.query(AuditLog).count()
        total_actividades = db.query(Actividad).count()
        
        errores = db.query(AuditLog).filter(AuditLog.status_code >= 400).count()
        
        actividades_por_tipo = db.query(
            Actividad.tipo_accion, 
            func.count(Actividad.id)
        ).group_by(Actividad.tipo_accion).all()
        
        return {
            "total_logs": total_logs,
            "total_actividades": total_actividades,
            "tasa_error": (errores / total_logs * 100) if total_logs > 0 else 0,
            "actividades_resumen": {tipo: count for tipo, count in actividades_por_tipo}
        }
    except sa.exc.OperationalError as db_err:
        raise db_err
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export")
def export_audit_csv(
    tipo: str = "actividades", # actividades o logs
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Genera y descarga un archivo CSV con el historial completo (solo admin)."""
    import csv
    import io
    from fastapi.responses import StreamingResponse
    from datetime import datetime

    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')

    if tipo == "actividades":
        writer.writerow(["Fecha", "Usuario", "Acción", "Descripción", "IP Address"])
        actividades = db.query(Actividad).order_by(desc(Actividad.created_at)).all()
        for act in actividades:
            fecha_str = act.created_at.strftime("%Y-%m-%d %H:%M:%S") if act.created_at else ""
            user_nombre = act.user.nombre if act.user else "Desconocido"
            writer.writerow([fecha_str, user_nombre, act.tipo_accion, act.descripcion, act.ip_address or ""])
    else:
        writer.writerow(["Fecha", "Usuario", "Método", "Endpoint", "Status Code", "IP Address", "User Agent"])
        logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).all()
        for log in logs:
            fecha_str = log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else ""
            user_nombre = log.user.nombre if log.user else "Anónimo/Sistema"
            writer.writerow([fecha_str, user_nombre, log.method, log.endpoint, log.status_code, log.ip_address or "", log.user_agent or ""])

    output.seek(0)
    filename = f"export_{tipo}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/cleanup")
def cleanup_audit_logs(
    dias: int = Query(30, ge=1),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Depura logs técnicos y de actividades con antigüedad mayor a X días."""
    from datetime import datetime, timedelta, timezone
    limite = datetime.now(timezone.utc) - timedelta(days=dias)
    try:
        deleted_logs = db.query(AuditLog).filter(AuditLog.created_at < limite).delete(synchronize_session=False)
        deleted_activities = db.query(Actividad).filter(Actividad.created_at < limite).delete(synchronize_session=False)
        db.commit()
        return {
            "status": "success",
            "dias_retencion": dias,
            "deleted_logs": deleted_logs,
            "deleted_activities": deleted_activities
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

