"""
Router de Integración CVLAC
Gestión de currículos LAC (Colciencias) e importación de datos
"""

import os
import re
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_current_admin
from app.database import get_db
from app.models import User, Documento, Producto
from app.schemas import DocumentoResponse

# URL base de CVLAC desde variable de entorno (con valor por defecto)
CVLAC_BASE_URL = os.getenv('CVLAC_BASE_URL', 'http://scienti.colciencias.gov.co:8084')

router = APIRouter(
    prefix="/cvlac",
    tags=["Integración CVLAC"]
)


@router.get("/validar-url")
def validar_url_cvlac(url: str):
    """Valida si una URL de CVLAC tiene el formato correcto."""
    # Patrón CVLAC construido desde variable de entorno
    # Ejemplo: http://scienti.colciencias.gov.co:8084/cvlac/visualizador/generarCurriculoCv.do?cod_rh=XXXXX
    escaped_base = re.escape(CVLAC_BASE_URL)
    patron = rf'^https?://{escaped_base.replace("http://", "").replace("https://", "")}/cvlac/visualizador/generarCurriculoCv\.do\?cod_rh=\d+$'
    
    es_valida = bool(re.match(patron, url))
    
    # Extraer código RH
    cod_rh = None
    if es_valida:
        match = re.search(r'cod_rh=(\d+)', url)
        if match:
            cod_rh = match.group(1)
    
    return {
        "url": url,
        "es_valida": es_valida,
        "cod_rh": cod_rh,
        "mensaje": "URL válida" if es_valida else f"Formato de URL CVLAC no reconocido. Debe ser: {CVLAC_BASE_URL}/cvlac/visualizador/generarCurriculoCv.do?cod_rh=XXXXX"
    }


@router.post("/subir-pdf", response_model=DocumentoResponse, status_code=status.HTTP_201_CREATED)
def subir_cvlac_pdf(
    file: UploadFile = File(...),
    user_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sube un PDF de CVLAC y lo asocia a un usuario."""
    # Validar tipo de archivo
    if not file.content_type or 'pdf' not in file.content_type.lower():
        raise HTTPException(
            status_code=400, 
            detail="El archivo debe ser un PDF"
        )
    
    # Validar tamaño (máx 10MB)
    contenido = file.file.read()
    if len(contenido) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="El archivo excede el tamaño máximo de 10MB"
        )
    
    # Determinar usuario objetivo
    target_user_id = user_id or current_user.id
    
    # Solo admin puede subir CVLAC de otros usuarios
    if target_user_id != current_user.id and current_user.rol != 'admin':
        raise HTTPException(
            status_code=403,
            detail="No tienes permiso para subir CVLAC de otros usuarios"
        )
    
    # Verificar que existe el usuario
    usuario = db.query(User).filter(User.id == target_user_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    import base64
    
    # Codificar a base64 para el campo data_base64
    data_b64 = base64.b64encode(contenido).decode('utf-8')
    
    # Crear documento
    documento = Documento(
        entidad_tipo="user",
        entidad_id=str(target_user_id),
        tipo="cvlac_pdf",
        nombre_archivo=f"CVLAC_{usuario.nombre.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf",
        content_type="application/pdf",
        data_base64=data_b64,
        owner_id=str(target_user_id)
    )
    
    db.add(documento)
    
    # Actualizar estado CVLAC del usuario
    usuario.estado_cv_lac = "Actualizado"
    usuario.cv_lac_url = f"/api/documentos/{documento.id}/download"
    
    db.commit()
    db.refresh(documento)
    
    return {
        "id": str(documento.id),
        "entidad_tipo": documento.entidad_tipo,
        "entidad_id": str(documento.entidad_id),
        "tipo": documento.tipo,
        "nombre_archivo": documento.nombre_archivo,
        "content_type": documento.content_type,
        "owner_id": str(documento.owner_id),
        "created_at": documento.created_at,
        "download_url": f"/api/documentos/{documento.id}/download"
    }


@router.get("/usuarios/{user_id}/estado")
def estado_cvlac_usuario(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retorna el estado del CVLAC de un usuario."""
    # Solo admin o el propio usuario puede consultar
    if user_id != current_user.id and current_user.rol != 'admin':
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    usuario = db.query(User).filter(User.id == user_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Buscar documento CVLAC más reciente
    doc = db.query(Documento).filter(
        Documento.owner_id == user_id,
        Documento.tipo == "cvlac_pdf"
    ).order_by(Documento.created_at.desc()).first()
    
    return {
        "user_id": user_id,
        "nombre": usuario.nombre,
        "estado_cv_lac": usuario.estado_cv_lac or "No actualizado",
        "cv_lac_url": usuario.cv_lac_url,
        "tiene_pdf": doc is not None,
        "ultima_actualizacion": doc.created_at if doc else None,
        "documento_id": doc.id if doc else None
    }


@router.get("/usuarios/sin-cvlac")
def usuarios_sin_cvlac(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Lista investigadores sin CVLAC actualizado (solo admin)."""
    usuarios = db.query(User).filter(
        User.rol == "investigador",
        User.is_active == True
    ).all()
    
    resultado = []
    for u in usuarios:
        # Verificar si tiene CVLAC
        tiene_cvlac = db.query(Documento).filter(
            Documento.owner_id == u.id,
            Documento.tipo == "cvlac_pdf"
        ).first() is not None
        
        if not tiene_cvlac or u.estado_cv_lac != "Actualizado":
            resultado.append({
                "id": u.id,
                "nombre": u.nombre,
                "email": u.email,
                "estado_cv_lac": u.estado_cv_lac or "No actualizado",
                "tiene_pdf": tiene_cvlac
            })
    
    return {
        "total": len(resultado),
        "usuarios": resultado
    }


@router.post("/importar-productos")
def importar_productos_cvlac(
    user_id: str,
    productos: List[dict],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Importa productos desde datos parseados de CVLAC.
    El parseo debe hacerse externamente (scraper).
    """
    if user_id != current_user.id and current_user.rol != 'admin':
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    usuario = db.query(User).filter(User.id == user_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    productos_creados = 0
    errores = []
    
    for prod in productos:
        try:
            # Mapear tipos CVLAC a tipos del sistema
            tipo_cvlac = prod.get("tipo", "").lower()
            tipo_sistema = "articulo"  # default
            
            if "software" in tipo_cvlac or "programa" in tipo_cvlac:
                tipo_sistema = "software"
            elif "capítulo" in tipo_cvlac or "capitulo" in tipo_cvlac:
                tipo_sistema = "capitulo_libro"
            elif "patente" in tipo_cvlac:
                tipo_sistema = "patente"
            elif "ponencia" in tipo_cvlac:
                tipo_sistema = "ponencia"
            elif "video" in tipo_cvlac:
                tipo_sistema = "video"
            elif "prototipo" in tipo_cvlac:
                tipo_sistema = "prototipo"
            
            # Verificar duplicado por DOI o nombre
            existente = db.query(Producto).filter(
                (Producto.doi == prod.get("doi")) if prod.get("doi") else False,
                Producto.owner_id == user_id
            ).first()
            
            if existente:
                continue  # Saltar duplicado
            
            nuevo_producto = Producto(
                tipo=tipo_sistema,
                nombre=prod.get("nombre", "Producto sin nombre"),
                descripcion=prod.get("descripcion"),
                fecha_publicacion=prod.get("fecha"),
                doi=prod.get("doi"),
                url=prod.get("url"),
                owner_id=user_id,
                is_verificado=False
            )
            
            db.add(nuevo_producto)
            productos_creados += 1
            
        except Exception as e:
            errores.append({
                "producto": prod.get("nombre", "desconocido"),
                "error": str(e)
            })
    
    db.commit()
    
    return {
        "importados": productos_creados,
        "errores": len(errores),
        "detalles_errores": errores[:5]  # Primeros 5 errores
    }


@router.get("/resumen-sistema")
def resumen_cvlac_sistema(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Resumen del estado de CVLAC en todo el sistema (solo admin)."""
    total_investigadores = db.query(User).filter(
        User.rol == "investigador",
        User.is_active == True
    ).count()
    
    con_cvlac = db.query(User).filter(
        User.rol == "investigador",
        User.is_active == True,
        User.estado_cv_lac == "Actualizado"
    ).count()
    
    sin_cvlac = total_investigadores - con_cvlac
    
    # Porcentaje
    porcentaje = (con_cvlac / total_investigadores * 100) if total_investigadores > 0 else 0
    
    return {
        "total_investigadores": total_investigadores,
        "con_cvlac_actualizado": con_cvlac,
        "sin_cvlac": sin_cvlac,
        "porcentaje_actualizados": round(porcentaje, 2),
        "estado": "Completo" if porcentaje >= 90 else "Parcial" if porcentaje >= 50 else "Crítico"
    }
