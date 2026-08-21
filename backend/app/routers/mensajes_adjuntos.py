"""
Router de Adjuntos de Mensajería
Subida, descarga y descarte de archivos que viajan dentro de un mensaje.

Se registra antes que el router de mensajes para que `/mensajes/adjuntos/...` no
sea capturado por las rutas con parámetro de `/mensajes/{mensaje_id}`.
"""

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas import MensajeAdjuntoResponse
from app.services import adjuntos_service
from app.services import attachment_policy as policy

logger = logging.getLogger("sennova.mensajes.adjuntos")

router = APIRouter(prefix="/mensajes/adjuntos", tags=["Mensajería"])


@router.post("", response_model=MensajeAdjuntoResponse, status_code=status.HTTP_201_CREATED)
async def subir_adjunto(
    archivo: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sube un archivo y lo deja listo para enviarse en un mensaje.

    Devuelve el identificador que luego se pasa en `adjunto_ids` al crear el
    mensaje. El archivo se clasifica por su contenido real, no por su extensión.
    """
    try:
        return await run_in_threadpool(
            adjuntos_service.registrar_adjunto,
            db,
            current_user,
            archivo.file,
            archivo.filename or "archivo",
        )
    except policy.TipoNoPermitido as err:
        raise HTTPException(status_code=400, detail=str(err))
    except policy.ArchivoDemasiadoGrande as err:
        raise HTTPException(status_code=413, detail=str(err))
    except Exception as err:
        logger.error(f"Error guardando adjunto de {current_user.id}: {err}")
        raise HTTPException(status_code=500, detail="No fue posible guardar el archivo")


@router.get("/{adjunto_id}")
async def descargar_adjunto(
    adjunto_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Entrega el archivo al remitente o al destinatario del mensaje.

    Las imágenes, videos y audios se muestran en línea; el resto se descarga.
    `nosniff` impide que el navegador reinterprete el tipo declarado.
    """
    try:
        adjunto, ruta = await run_in_threadpool(
            adjuntos_service.obtener_para_descarga, db, adjunto_id, current_user
        )
    except LookupError as err:
        raise HTTPException(status_code=404, detail=str(err))
    except PermissionError as err:
        raise HTTPException(status_code=403, detail=str(err))
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))

    disposicion = "inline" if policy.es_previsualizable(adjunto.categoria) else "attachment"
    return FileResponse(
        path=ruta,
        media_type=adjunto.content_type,
        filename=adjunto.nombre_archivo,
        content_disposition_type=disposicion,
        headers={
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, max-age=86400",
        },
    )


@router.delete("/{adjunto_id}")
async def descartar_adjunto(
    adjunto_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Descarta un adjunto que se subió pero todavía no se envió."""
    try:
        await run_in_threadpool(
            adjuntos_service.eliminar_adjunto_suelto, db, adjunto_id, str(current_user.id)
        )
    except LookupError as err:
        raise HTTPException(status_code=404, detail=str(err))
    except PermissionError as err:
        raise HTTPException(status_code=403, detail=str(err))

    return {"success": True, "message": "Adjunto descartado"}
