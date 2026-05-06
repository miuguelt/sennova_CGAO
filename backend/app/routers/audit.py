from typing import List, Optional
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
            "method": log.method,
            "endpoint": log.endpoint,
            "status_code": log.status_code,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "created_at": log.created_at
        })
    return result

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

@router.get("/stats")
def get_audit_stats(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Resumen estadístico de auditoría."""
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
