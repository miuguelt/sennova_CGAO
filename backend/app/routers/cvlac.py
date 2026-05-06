from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import random
from datetime import datetime

from app.auth import get_current_user
from app.database import get_db
from app.models import User, Producto, log_actividad

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
            fecha_publicacion=datetime.utcnow().strftime("%Y-%m-%d"),
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
