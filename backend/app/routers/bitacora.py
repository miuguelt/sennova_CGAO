import hashlib
from datetime import datetime, timezone
from typing import List
from uuid import UUID
import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from app.database import get_db
from app.models import BitacoraEntry, Proyecto, User
from app.schemas import BitacoraCreate, BitacoraUpdate, BitacoraResponse, BitacoraSignRequest
from app.auth import get_current_user

router = APIRouter(
    prefix="/bitacora",
    tags=["Bitácora de Proyectos"]
)

@router.get("/proyecto/{proyecto_id}", response_model=List[BitacoraResponse])
def listar_bitacora(
    proyecto_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtiene todas las entradas de bitácora de un proyecto específico."""
    try:
        proyecto = db.query(Proyecto).filter(Proyecto.id == str(proyecto_id)).first()
        if not proyecto:
            raise HTTPException(status_code=404, detail=f"Proyecto con ID {proyecto_id} no encontrado")
        
        entries = db.query(BitacoraEntry).filter(BitacoraEntry.proyecto_id == str(proyecto_id)).order_by(BitacoraEntry.fecha.desc()).all()
        
        # Enriquecer las entradas con el nombre del usuario de forma segura
        for entry in entries:
            try:
                if entry.user:
                    entry.user_nombre = entry.user.nombre
                else:
                    entry.user_nombre = "Usuario no encontrado"
            except Exception as e:
                print(f"⚠️ Error cargando usuario para entrada {entry.id}: {e}")
                entry.user_nombre = "Error de carga"
            
        return entries
    except sa.exc.OperationalError as db_err:
        raise db_err
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error interno al listar bitácora: {str(e)}"
        )

@router.get("/{entry_id}", response_model=BitacoraResponse)
def obtener_entrada(
    entry_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtiene una entrada específica de bitácora."""
    try:
        entry = db.query(BitacoraEntry).filter(BitacoraEntry.id == str(entry_id)).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Entrada no encontrada")
        
        entry.user_nombre = entry.user.nombre if entry.user else "Usuario Desconocido"
        return entry
    except sa.exc.OperationalError as db_err:
        raise db_err
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=BitacoraResponse, status_code=201)
@router.post("/", response_model=BitacoraResponse, status_code=201)
def crear_entrada(
    entry_in: BitacoraCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crea una nueva entrada en la bitácora técnica."""
    try:
        proyecto = db.query(Proyecto).filter(Proyecto.id == str(entry_in.proyecto_id)).first()
        if not proyecto:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
            
        payload = entry_in.model_dump() if hasattr(entry_in, 'model_dump') else entry_in.dict()
        payload["proyecto_id"] = str(entry_in.proyecto_id)
        
        new_entry = BitacoraEntry(
            **payload,
            user_id=current_user.id
        )
        
        db.add(new_entry)
        db.commit()
        db.refresh(new_entry)
        
        new_entry.user_nombre = current_user.nombre
        return new_entry
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{entry_id}/sign", response_model=BitacoraResponse)
def firmar_entrada(
    entry_id: UUID,
    sign_in: BitacoraSignRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Firma digitalmente una entrada de bitácora."""
    try:
        entry = db.query(BitacoraEntry).filter(BitacoraEntry.id == str(entry_id)).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Entrada no encontrada")

        # Determinar qué rol está firmando
        es_investigador = current_user.rol in ['admin', 'investigador', 'instructor']
        es_aprendiz = current_user.rol == 'aprendiz'

        if not es_investigador and not es_aprendiz:
            raise HTTPException(status_code=403, detail="Su rol no está autorizado para firmar bitácoras")

        # Generar Hash de integridad del contenido
        content_str = f"{entry.titulo}|{entry.contenido}|{entry.categoria}|{entry.proyecto_id}"
        integrity_hash = hashlib.sha256(content_str.encode()).hexdigest()

        # Preparar evidencia
        evidence = {
            "user_id": str(current_user.id),
            "user_email": current_user.email,
            "ip": request.client.host,
            "user_agent": request.headers.get("user-agent"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "integrity_hash": integrity_hash
        }

        if es_investigador:
            entry.is_firmado_investigador = True
            entry.fecha_firma_investigador = datetime.now(timezone.utc)
            meta = dict(entry.signature_metadata or {})
            meta["investigador"] = evidence
            entry.signature_metadata = meta
            flag_modified(entry, "signature_metadata")
        else:
            entry.is_firmado_aprendiz = True
            entry.fecha_firma_aprendiz = datetime.now(timezone.utc)
            meta = dict(entry.signature_metadata or {})
            meta["aprendiz"] = evidence
            entry.signature_metadata = meta
            flag_modified(entry, "signature_metadata")

        db.commit()
        db.refresh(entry)
        entry.user_nombre = entry.user.nombre if entry.user else "Usuario Desconocido"
        return entry
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{entry_id}", response_model=BitacoraResponse)
def actualizar_entrada(
    entry_id: UUID,
    entry_in: BitacoraUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Actualiza una entrada existente (solo si no está firmada por ambos)."""
    try:
        entry = db.query(BitacoraEntry).filter(BitacoraEntry.id == str(entry_id)).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Entrada no encontrada")
        
        if entry.is_firmado_investigador and entry.is_firmado_aprendiz:
            raise HTTPException(status_code=400, detail="No se puede editar una bitácora con firmas completas")

        if entry.user_id != current_user.id and current_user.rol != 'admin':
            raise HTTPException(status_code=403, detail="No tiene permisos para editar esta entrada")
            
        update_data = entry_in.model_dump(exclude_unset=True) if hasattr(entry_in, 'model_dump') else entry_in.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(entry, key, value)
            
        db.commit()
        db.refresh(entry)
        entry.user_nombre = entry.user.nombre if entry.user else "Usuario Desconocido"
        return entry
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{entry_id}")
def eliminar_entrada(
    entry_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Elimina una entrada de bitácora."""
    try:
        entry = db.query(BitacoraEntry).filter(BitacoraEntry.id == str(entry_id)).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Entrada no encontrada")
            
        if entry.is_firmado_investigador or entry.is_firmado_aprendiz:
             raise HTTPException(status_code=400, detail="No se puede eliminar una bitácora firmada")

        if entry.user_id != current_user.id and current_user.rol != 'admin':
            raise HTTPException(status_code=403, detail="No tiene permisos para eliminar esta entrada")
            
        db.delete(entry)
        db.commit()
        return {"status": "deleted"}
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))



# Helper para no romper la estructura de arriba si quiero usar UploadFile
@router.post("/{entry_id}/adjuntos", response_model=BitacoraResponse)
async def upload_adjunto_bitacora(
    entry_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        entry = db.query(BitacoraEntry).filter(BitacoraEntry.id == str(entry_id)).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Entrada no encontrada")
        
        if entry.is_firmado_investigador and entry.is_firmado_aprendiz:
            raise HTTPException(status_code=400, detail="No se pueden añadir adjuntos a una bitácora firmada")

        # Usar el servicio de documentos
        from app.routers.documentos import upload_documento
        
        # Simulamos el Form de upload_documento
        doc = await upload_documento(
            entidad_tipo="proyecto", # O podríamos crear un tipo 'bitacora'
            entidad_id=str(entry.proyecto_id),
            tipo="evidencia_bitacora",
            file=file,
            current_user=current_user,
            db=db
        )
        
        # Actualizar adjuntos en la bitácora
        current_adjuntos = list(entry.adjuntos or [])
        current_adjuntos.append({
            "id": str(doc.id),
            "nombre": doc.nombre_archivo,
            "url": f"/api/documentos/{doc.id}/view",
            "tipo": doc.content_type,
            "fecha": datetime.now(timezone.utc).isoformat()
        })
        
        entry.adjuntos = current_adjuntos
        flag_modified(entry, "adjuntos")
        db.commit()
        db.refresh(entry)
        
        entry.user_nombre = entry.user.nombre if entry.user else "Usuario Desconocido"
        return entry
    except (sa.exc.OperationalError, sa.exc.SQLAlchemyError) as db_err:
        db.rollback()
        raise db_err
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

