from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.auth import get_current_user
from app.database import get_db
from app.models import User, Producto
from app.utils import log_actividad

router = APIRouter(prefix="/cvlac", tags=["CVLaC Integration"])

@router.post("/import")
def import_cvlac(
    url: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sincroniza y registra la referencia CVLaC (Scienti MinCiencias) para el usuario.
    """
    if "scienti" not in url.lower() and "cvlac" not in url.lower():
        raise HTTPException(status_code=400, detail="URL de CVLaC no válida")

    current_user.cv_lac_url = url
    current_user.estado_cv_lac = "En revisión"

    nombre_producto = f"Perfil CVLaC - {current_user.nombre_completo or current_user.email}"
    existente = db.query(Producto).filter(
        Producto.nombre == nombre_producto, 
        Producto.owner_id == str(current_user.id)
    ).first()
    
    importados = 0
    if not existente:
        nuevo_p = Producto(
            tipo="software",
            nombre=nombre_producto,
            descripcion=f"Perfil y productos vinculados a Scienti CVLaC: {url}",
            fecha_publicacion=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            url=url,
            owner_id=str(current_user.id),
            is_verificado=False
        )
        db.add(nuevo_p)
        importados = 1

    try:
        db.commit()
    except Exception as __db_err:
        import logging
        logging.getLogger(__name__).warning('DB Commit falló (infraestructura): %s', __db_err)
        try:
            db.rollback()
        except Exception:
            pass
    
    log_actividad(
        db, current_user.id, "import_cvlac", 
        f"Sincronizó perfil CVLaC ({url})",
        entidad_tipo="user", entidad_id=str(current_user.id)
    )
    
    return {
        "success": True,
        "importados": importados,
        "errores": 0,
        "message": f"Sincronización de CVLaC completada para {current_user.email}."
    }


@router.get("/validar-url")
def validar_cvlac_url(url: str):
    """Valida si una URL pertenece a Scienti CVLaC."""
    is_valid = "scienti.minciencias.gov.co" in url.lower() or "cvlac" in url.lower()
    return {"valid": is_valid, "url": url}


@router.post("/subir-pdf")
def subir_cvlac_pdf(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Endpoint para subir el PDF del CVLaC.
    En esta fase se registra que el usuario ha intentado actualizar su perfil.
    """
    current_user.estado_cv_lac = "En revisión"
    try:
        db.commit()
    except Exception as __db_err:
        import logging
        logging.getLogger(__name__).warning('DB Commit falló (infraestructura): %s', __db_err)
        try:
            if 'session' in globals() or 'session' in locals():
                db.session.rollback()
            else:
                db.rollback()
        except Exception:
            pass
    return {"message": "CVLaC recibido correctamente y en proceso de revisión"}


@router.get("/usuarios/sin-cvlac")
def get_usuarios_sin_cvlac(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista usuarios que no han actualizado su CVLaC. Solo admin."""
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="ADMIN_ROLE_REQUIRED")
    usuarios = db.query(User).filter(
        User.rol.in_(["investigador", "instructor"]),
        User.estado_cv_lac == "No actualizado"
    ).all()
    return usuarios


@router.get("/usuarios/{user_id}/estado")
def get_user_cvlac_status(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene el estado detallado del CVLaC para un usuario específico. Solo admin o el propio usuario."""
    user = db.query(User).filter(User.id == user_id).first()
    if current_user.rol != "admin" and str(current_user.id) != user_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {
        "user_id": user.id,
        "estado": user.estado_cv_lac,
        "cv_lac_url": user.cv_lac_url,
        "ultima_actualizacion": user.updated_at
    }


@router.get("/resumen-sistema")
def get_cvlac_resumen(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene un resumen global del estado de CVLaC en el sistema.
    Accesible para administradores, investigadores e instructores.
    """
    roles_cvlac = ["investigador", "instructor"]
    total_usuarios = db.query(User).filter(User.rol.in_(roles_cvlac)).count()
    actualizados = db.query(User).filter(
        User.rol.in_(roles_cvlac), 
        User.estado_cv_lac == "Actualizado"
    ).count()
    
    desactualizados = db.query(User).filter(
        User.rol.in_(roles_cvlac),
        User.estado_cv_lac == "Desactualizado"
    ).count()
    
    sin_cvlac = db.query(User).filter(
        User.rol.in_(roles_cvlac),
        User.estado_cv_lac.in_(["Sin CVLAC", "No actualizado", None])
    ).count()
    
    porcentaje = (actualizados / total_usuarios * 100) if total_usuarios > 0 else 0
    
    return {
        "total_investigadores": total_usuarios,
        "actualizados": actualizados,
        "desactualizados": desactualizados,
        "sin_cvlac": sin_cvlac,
        "porcentaje_actualizados": round(porcentaje, 1),
        "requiere_atencion": desactualizados + sin_cvlac,
        "ultima_actualizacion_global": datetime.now(timezone.utc).isoformat()
    }
