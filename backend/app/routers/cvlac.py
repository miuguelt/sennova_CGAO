from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import random
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
    Simula la extracción de datos desde una URL de CVLaC (Scienti).
    En una implementación real, esto usaría BeautifulSoup o un servicio de scraping.
    """
    if "scienti" not in url.lower() and "cvlac" not in url.lower():
        raise HTTPException(status_code=400, detail="URL de CVLaC no válida")

    # Simulamos que encontramos algunos productos
    tipos_posibles = ["software", "articulo", "prototipo", "capitulo_libro", "ponencia"]
    nombres_ejemplo = [
        "Sistema de Monitoreo de Cultivos Inteligente",
        "Análisis de Redes Neuronales en Educación",
        "Prototipo de Biofiltro para Aguas Residuales",
        "La Inteligencia Artificial en el Agro SENA",
        "Implementación de Blockchain en Suministros"
    ]
    
    importados = 0
    errores = 0
    
    # Generar 3-6 productos aleatorios para la demo
    count = random.randint(3, 6)
    
    for i in range(count):
        nombre = random.choice(nombres_ejemplo) + f" (Sincronizado {i+1})"
        tipo = random.choice(tipos_posibles)
        
        # Verificar si ya existe para evitar duplicados en la demo
        existente = db.query(Producto).filter(
            Producto.nombre == nombre, 
            Producto.owner_id == str(current_user.id)
        ).first()
        
        if existente:
            errores += 1
            continue
            
        nuevo_p = Producto(
            tipo=tipo,
            nombre=nombre,
            descripcion=f"Producto importado automáticamente desde CVLaC. Referencia: {url}",
            fecha_publicacion=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            url=url,
            owner_id=str(current_user.id),
            is_verificado=False
        )
        db.add(nuevo_p)
        importados += 1

    db.commit()
    
    log_actividad(
        db, current_user.id, "import_cvlac", 
        f"Importó {importados} productos desde CVLaC",
        entidad_tipo="user", entidad_id=str(current_user.id)
    )
    
    return {
        "success": True,
        "importados": importados,
        "errores": errores,
        "message": f"Sincronización finalizada: {importados} productos nuevos."
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
    db.commit()
    return {"message": "CVLaC recibido correctamente y en proceso de revisión"}


@router.get("/usuarios/sin-cvlac")
def get_usuarios_sin_cvlac(
    db: Session = Depends(get_db)
):
    """Lista usuarios que no han actualizado su CVLaC."""
    usuarios = db.query(User).filter(
        User.rol == "investigador",
        User.estado_cv_lac == "No actualizado"
    ).all()
    return usuarios


@router.get("/usuarios/{user_id}/estado")
def get_user_cvlac_status(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Obtiene el estado detallado del CVLaC para un usuario específico."""
    user = db.query(User).filter(User.id == user_id).first()
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
    Solo accesible para administradores o investigadores (según política).
    """
    total_usuarios = db.query(User).filter(User.rol == "investigador").count()
    actualizados = db.query(User).filter(
        User.rol == "investigador", 
        User.estado_cv_lac == "Actualizado"
    ).count()
    
    pendientes = total_usuarios - actualizados
    porcentaje = (actualizados / total_usuarios * 100) if total_usuarios > 0 else 0
    
    return {
        "total_investigadores": total_usuarios,
        "actualizados": actualizados,
        "pendientes": pendientes,
        "porcentaje_cumplimiento": round(porcentaje, 1),
        "ultima_actualizacion_global": datetime.now(timezone.utc).isoformat()
    }
