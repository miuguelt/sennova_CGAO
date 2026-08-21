from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.auth import get_current_user
from app.database import get_db
from app.models import Semillero, Grupo, User, Aprendiz
from app.schemas import SemilleroCreate, SemilleroUpdate, AprendizCreate, AprendizUpdate
from app.utils import log_actividad, is_valid_uuid

router = APIRouter(prefix="/semilleros", tags=["Semilleros de Investigación"])



def _make_aprendiz_dict(aprendiz: Aprendiz) -> dict:
    """Convierte un objeto Aprendiz a diccionario usando info_consolidada."""
    info = aprendiz.info_consolidada
    return {
        "id": str(aprendiz.id),
        "user_id": str(aprendiz.user_id) if aprendiz.user_id else None,
        "nombre": info["nombre"],
        "documento": info["documento"],
        "email": info["email"],
        "ficha": info["ficha"],
        "programa": info["programa"],
        "celular": info["celular"],
        "estado": aprendiz.estado,
        "semillero_id": str(aprendiz.semillero_id),
        "fecha_ingreso": aprendiz.fecha_ingreso,
        "fecha_egreso": aprendiz.fecha_egreso
    }


def _make_semillero_dict(semillero: Semillero, db: Session, investigators_map: dict = None) -> dict:
    """Convierte un objeto Semillero a diccionario para serialización correcta."""
    investigadores = []
    
    # Si tenemos un mapa pre-cargado, lo usamos para evitar consultas N+1
    if investigators_map and str(semillero.id) in investigators_map:
        investigadores = investigators_map[str(semillero.id)]
    else:
        # Fallback para consultas individuales
        from app.models import semillero_investigadores
        for user in semillero.investigadores:
            result = db.query(semillero_investigadores).filter(
                semillero_investigadores.c.semillero_id == semillero.id,
                semillero_investigadores.c.user_id == user.id
            ).first()
            
            inv_info = {
                "id": str(user.id),
                "nombre": user.nombre,
                "email": user.email,
                "rol_en_semillero": result.rol_en_semillero if result else "Coinvestigador",
                "fecha_vinculacion": result.fecha_vinculacion.isoformat() if result and result.fecha_vinculacion else None
            }
            investigadores.append(inv_info)

    grupo_data = None
    if semillero.grupo:
        grupo_data = {
            "id": str(semillero.grupo.id),
            "nombre": semillero.grupo.nombre
        }

    aprendices_list = []
    if semillero.aprendices:
        aprendices_list = [_make_aprendiz_dict(a) for a in semillero.aprendices]

    sigla = semillero.sigla
    if not sigla and semillero.nombre:
        # Si no tiene sigla explícita, usar el nombre o primera palabra sin truncar arbitrariamente
        sigla = semillero.nombre if len(semillero.nombre) <= 12 else semillero.nombre.split()[0]

    lider_nombre = semillero.lider_nombre
    if not lider_nombre and semillero.owner:
        lider_nombre = semillero.owner.nombre

    return {
        "id": str(semillero.id),
        "nombre": semillero.nombre,
        "sigla": sigla,
        "codigo": sigla,
        "descripcion": semillero.descripcion,
        "lider_nombre": lider_nombre,
        "linea_investigacion": semillero.linea_investigacion,
        "plan_accion": semillero.plan_accion,
        "horas_dedicadas": semillero.horas_dedicadas or 0,
        "estado": semillero.estado or "activo",
        "formatos_paths": semillero.formatos_paths or [],
        "grupo_id": str(semillero.grupo_id),
        "grupo_nombre": semillero.grupo.nombre if semillero.grupo else None,
        "grupo": grupo_data,
        "owner_id": str(semillero.owner_id),
        "investigadores": investigadores,
        "aprendices": aprendices_list,
        "total_aprendices": len(semillero.aprendices) if semillero.aprendices else 0,
        "total_investigadores": len(investigadores),
        "created_at": semillero.created_at.isoformat() if hasattr(semillero.created_at, 'isoformat') and semillero.created_at else str(semillero.created_at)
    }


@router.get("")
def list_semilleros(
    skip: int = 0,
    limit: int = 100,
    grupo_id: Optional[str] = None,
    estado: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar semilleros de investigación."""
    from sqlalchemy.orm import joinedload
    from app.models import semillero_investigadores
    
    query = db.query(Semillero).options(
        joinedload(Semillero.investigadores),
        joinedload(Semillero.aprendices)
    )
    
    if grupo_id:
        query = query.filter(Semillero.grupo_id == str(grupo_id))
    if estado:
        query = query.filter(Semillero.estado == estado)
    
    semilleros = query.offset(skip).limit(limit).all()
    
    # Pre-cargar datos de la tabla de asociación para investigadores
    sem_ids = [str(s.id) for s in semilleros]
    inv_data = []
    if sem_ids:
        inv_data = db.query(semillero_investigadores, User.nombre, User.email).join(
            User, User.id == semillero_investigadores.c.user_id
        ).filter(semillero_investigadores.c.semillero_id.in_(sem_ids)).all()
    
    # Construir mapa {semillero_id: [inv_info, ...]}
    investigators_map = {}
    for row in inv_data:
        s_id = str(row.semillero_id)
        if s_id not in investigators_map:
            investigators_map[s_id] = []
        investigators_map[s_id].append({
            "id": str(row.user_id),
            "nombre": row.nombre,
            "email": row.email,
            "rol_en_semillero": row.rol_en_semillero,
            "fecha_vinculacion": row.fecha_vinculacion.isoformat() if row.fecha_vinculacion else None
        })
    
    return [_make_semillero_dict(s, db, investigators_map) for s in semilleros]


@router.get("/{semillero_id}")
def get_semillero(
    semillero_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener detalle de un semillero."""
    sid = str(semillero_id)
    if not is_valid_uuid(sid):
        raise HTTPException(status_code=404, detail="Semillero no encontrado")
    semillero = db.query(Semillero).filter(Semillero.id == sid).first()
    if not semillero:
        raise HTTPException(status_code=404, detail="Semillero no encontrado")
    
    return _make_semillero_dict(semillero, db)


@router.post("", status_code=201)
def create_semillero(
    semillero_data: SemilleroCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear un nuevo semillero."""
    if current_user.rol == 'aprendiz':
        raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para crear semilleros")
        
    # Verificar que el grupo existe
    grupo = db.query(Grupo).filter(Grupo.id == str(semillero_data.grupo_id)).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    semillero = Semillero(
        nombre=semillero_data.nombre,
        sigla=semillero_data.sigla,
        descripcion=semillero_data.descripcion,
        lider_nombre=semillero_data.lider_nombre,
        linea_investigacion=semillero_data.linea_investigacion,
        plan_accion=semillero_data.plan_accion,
        horas_dedicadas=semillero_data.horas_dedicadas,
        estado=semillero_data.estado,
        grupo_id=str(semillero_data.grupo_id),
        owner_id=str(current_user.id)
    )
    
    try:
        db.add(semillero)
        db.commit()
        db.refresh(semillero)
    except (OperationalError, SQLAlchemyError):
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Error al crear semillero: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor al crear el semillero")
    
    # Registrar actividad
    log_actividad(
        db, 
        current_user.id, 
        "crear_semillero", 
        f"Creó el semillero: {semillero.nombre}",
        entidad_tipo="semillero",
        entidad_id=str(semillero.id)
    )
    
    return _make_semillero_dict(semillero, db)


@router.put("/{semillero_id}")
def update_semillero(
    semillero_id: str,
    semillero_update: SemilleroUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar un semillero."""
    semillero = db.query(Semillero).filter(Semillero.id == str(semillero_id)).first()
    if not semillero:
        raise HTTPException(status_code=404, detail="Semillero no encontrado")
    
    # Solo admin o owner pueden editar (aprendices no)
    if current_user.rol == "aprendiz":
        raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para modificar semilleros")
    if current_user.rol != "admin" and str(semillero.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso para editar")
    
    update_data = semillero_update.model_dump(exclude_unset=True) if hasattr(semillero_update, 'model_dump') else semillero_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "grupo_id" and value is not None:
            grupo = db.query(Grupo).filter(Grupo.id == str(value)).first()
            if not grupo:
                raise HTTPException(status_code=404, detail="Grupo no encontrado")
            semillero.grupo_id = str(value)
        else:
            setattr(semillero, field, value)
    
    try:
        db.commit()
        db.refresh(semillero)
    except (OperationalError, SQLAlchemyError):
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Error al actualizar semillero: {e}")
        raise HTTPException(status_code=500, detail="Error interno al actualizar el semillero")
    
    # Registrar actividad
    log_actividad(
        db, 
        current_user.id, 
        "actualizar_semillero", 
        f"Actualizó el semillero: {semillero.nombre}",
        entidad_tipo="semillero",
        entidad_id=str(semillero.id)
    )
    
    return _make_semillero_dict(semillero, db)


@router.delete("/{semillero_id}")
def delete_semillero(
    semillero_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar un semillero."""
    semillero = db.query(Semillero).filter(Semillero.id == str(semillero_id)).first()
    if not semillero:
        raise HTTPException(status_code=404, detail="Semillero no encontrado")
    
    if current_user.rol == "aprendiz":
        raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para modificar semilleros")
    if current_user.rol != "admin" and str(semillero.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso para eliminar")
    
    try:
        db.delete(semillero)
        db.commit()
    except (OperationalError, SQLAlchemyError):
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Error al eliminar semillero: {e}")
        raise HTTPException(status_code=500, detail="Error interno al eliminar el semillero")
    
    return {"message": "Semillero eliminado"}


# ==========================================
# GESTIÓN DE APRENDICES
# ==========================================

from app.schemas import AprendizFullCreate, UserCreate
from app.repositories.user_repository import UserRepository

@router.get("/{semillero_id}/aprendices")
def list_aprendices(
    semillero_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar aprendices de un semillero."""
    semillero = db.query(Semillero).filter(Semillero.id == str(semillero_id)).first()
    if not semillero:
        raise HTTPException(status_code=404, detail="Semillero no encontrado")
    
    return [_make_aprendiz_dict(a) for a in semillero.aprendices]


@router.post("/{semillero_id}/aprendices", status_code=201)
def add_aprendiz(
    semillero_id: str,
    aprendiz_data: AprendizCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Agregar un usuario existente como aprendiz a un semillero."""
    semillero = db.query(Semillero).filter(Semillero.id == str(semillero_id)).first()
    if not semillero:
        raise HTTPException(status_code=404, detail="Semillero no encontrado")
    
    # Solo admin o owner pueden agregar aprendices
    if current_user.rol == "aprendiz":
        raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para modificar semilleros")
    if current_user.rol != "admin" and str(semillero.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso")
    
    # Verificar que el usuario existe
    user = db.query(User).filter(User.id == str(aprendiz_data.user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.rol != "aprendiz":
        raise HTTPException(status_code=400, detail="Solo usuarios con rol 'aprendiz' pueden ser vinculados como aprendices en un semillero")

    # Verificar si ya es aprendiz en este semillero
    existente = db.query(Aprendiz).filter(
        Aprendiz.user_id == str(user.id),
        Aprendiz.semillero_id == str(semillero.id)
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="El usuario ya está vinculado a este semillero")

    aprendiz = Aprendiz(
        semillero_id=str(semillero.id),
        user_id=str(user.id),
        estado=aprendiz_data.estado,
        fecha_ingreso=aprendiz_data.fecha_ingreso or datetime.now(timezone.utc).date()
    )
    
    try:
        db.add(aprendiz)
        db.commit()
        db.refresh(aprendiz)
    except (OperationalError, SQLAlchemyError):
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Error al vincular aprendiz: {e}")
        raise HTTPException(status_code=500, detail="Error interno al vincular aprendiz")
    
    log_actividad(db, current_user.id, "vincular_aprendiz", f"Vinculó a {user.nombre} al semillero {semillero.nombre}")
    
    return _make_aprendiz_dict(aprendiz)


@router.post("/{semillero_id}/aprendices/full", status_code=201)
def create_full_aprendiz(
    semillero_id: str,
    data: AprendizFullCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crea un usuario nuevo y lo vincula como aprendiz en un solo paso."""
    semillero = db.query(Semillero).filter(Semillero.id == str(semillero_id)).first()
    if not semillero:
        raise HTTPException(status_code=404, detail="Semillero no encontrado")
    
    # Solo admin o owner pueden agregar aprendices
    if current_user.rol == "aprendiz":
        raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para modificar semilleros")
    if current_user.rol != "admin" and str(semillero.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso")
    
    # 1. Crear el usuario
    repo = UserRepository(db)
    if repo.get_by_email(data.email):
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    user_create = UserCreate(
        email=data.email,
        nombre=data.nombre,
        password=data.password,
        rol="aprendiz",
        documento=data.documento,
        celular=data.celular,
        ficha=data.ficha,
        programa_formacion=data.programa_formacion
    )
    
    try:
        user = repo.create(user_create)

        # 2. Crear el registro de aprendiz
        aprendiz = Aprendiz(
            semillero_id=str(semillero.id),
            user_id=str(user.id),
            estado=data.estado,
            fecha_ingreso=datetime.now(timezone.utc).date()
        )
        
        db.add(aprendiz)
        db.commit()
        db.refresh(aprendiz)
    except (OperationalError, SQLAlchemyError):
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Error al crear y vincular aprendiz: {e}")
        raise HTTPException(status_code=500, detail="Error interno al crear y vincular aprendiz")
    
    log_actividad(db, current_user.id, "crear_vincular_aprendiz", f"Creó y vinculó a {user.nombre} al semillero {semillero.nombre}")
    
    return _make_aprendiz_dict(aprendiz)


@router.put("/{semillero_id}/aprendices/{aprendiz_id}")
def update_aprendiz(
    semillero_id: str,
    aprendiz_id: str,
    aprendiz_data: AprendizUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar estado de vinculación de un aprendiz."""
    aprendiz = db.query(Aprendiz).filter(
        Aprendiz.id == str(aprendiz_id),
        Aprendiz.semillero_id == str(semillero_id)
    ).first()
    
    if not aprendiz:
        raise HTTPException(status_code=404, detail="Aprendiz no encontrado")
    
    if current_user.rol == "aprendiz":
        raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para modificar semilleros")
    if current_user.rol != "admin" and str(aprendiz.semillero.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso")
    
    update_data = aprendiz_data.model_dump(exclude_unset=True) if hasattr(aprendiz_data, 'model_dump') else aprendiz_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(aprendiz, field, value)
    
    try:
        db.commit()
        db.refresh(aprendiz)
    except (OperationalError, SQLAlchemyError):
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Error al actualizar aprendiz: {e}")
        raise HTTPException(status_code=500, detail="Error interno al actualizar aprendiz")
        
    return _make_aprendiz_dict(aprendiz)


@router.delete("/{semillero_id}/aprendices/{aprendiz_id}")
def delete_aprendiz(
    semillero_id: str,
    aprendiz_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar vinculación de aprendiz (no elimina el usuario)."""
    aprendiz = db.query(Aprendiz).filter(
        Aprendiz.id == str(aprendiz_id),
        Aprendiz.semillero_id == str(semillero_id)
    ).first()
    
    if not aprendiz:
        raise HTTPException(status_code=404, detail="Aprendiz no encontrado")
    
    if current_user.rol == "aprendiz":
        raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para modificar semilleros")
    if current_user.rol != "admin" and str(aprendiz.semillero.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso")
    
    try:
        db.delete(aprendiz)
        db.commit()
    except (OperationalError, SQLAlchemyError):
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Error al eliminar aprendiz: {e}")
        raise HTTPException(status_code=500, detail="Error interno al eliminar aprendiz")
    
    return {"message": "Vinculación de aprendiz eliminada"}


# ==========================================
# GESTIÓN DE INVESTIGADORES (MIEMBROS EQUIPO)
# ==========================================

@router.post("/{semillero_id}/investigadores")
def add_investigador_semillero(
    semillero_id: str,
    payload: Optional[dict] = None,
    user_id: Optional[str] = None,
    rol_en_semillero: Optional[str] = "Coinvestigador",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Agregar investigador al semillero (soporta JSON body o query params)."""
    if payload and isinstance(payload, dict):
        user_id = payload.get("user_id") or user_id
        rol_en_semillero = payload.get("rol_en_semillero") or payload.get("rol") or rol_en_semillero or "Coinvestigador"

    if not user_id:
        raise HTTPException(status_code=422, detail="El campo user_id es requerido")

    semillero = db.query(Semillero).filter(Semillero.id == str(semillero_id)).first()
    if not semillero:
        raise HTTPException(status_code=404, detail="Semillero no encontrado")
    
    # Solo admin o owner pueden agregar integrantes
    if current_user.rol == "aprendiz":
        raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para modificar semilleros")
    if current_user.rol != "admin" and str(semillero.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso")
    
    user = db.query(User).filter(User.id == str(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.rol == "aprendiz":
        raise HTTPException(status_code=400, detail="Los aprendices no pueden ser vinculados como investigadores del semillero")
    
    from app.models import semillero_investigadores
    from datetime import date
    
    # Verificar si ya es integrante
    existing = db.query(semillero_investigadores).filter(
        semillero_investigadores.c.semillero_id == str(semillero_id),
        semillero_investigadores.c.user_id == str(user_id)
    ).first()
    
    if existing:
        # Actualizar rol si ya existe
        try:
            db.execute(
                semillero_investigadores.update().where(
                    semillero_investigadores.c.semillero_id == str(semillero_id),
                    semillero_investigadores.c.user_id == str(user_id)
                ).values(rol_en_semillero=rol_en_semillero)
            )
            db.commit()
            return {"message": "Rol de investigador actualizado"}
        except (OperationalError, SQLAlchemyError):
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            print(f"Error al actualizar rol de investigador: {e}")
            raise HTTPException(status_code=500, detail="Error interno al actualizar rol de investigador")
    
    try:
        db.execute(
            semillero_investigadores.insert().values(
                semillero_id=str(semillero.id),
                user_id=str(user.id),
                rol_en_semillero=rol_en_semillero,
                fecha_vinculacion=date.today()
            )
        )
        db.commit()
    except (OperationalError, SQLAlchemyError):
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Error al vincular investigador: {e}")
        raise HTTPException(status_code=500, detail="Error interno al vincular investigador")
    
    return {"message": "Investigador vinculado al semillero"}


@router.delete("/{semillero_id}/investigadores/{user_id}")
def remove_investigador_semillero(
    semillero_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remover investigador del semillero."""
    semillero = db.query(Semillero).filter(Semillero.id == str(semillero_id)).first()
    if not semillero:
        raise HTTPException(status_code=404, detail="Semillero no encontrado")
    
    if current_user.rol == "aprendiz":
        raise HTTPException(status_code=403, detail="Los aprendices no tienen permiso para modificar semilleros")
    if current_user.rol != "admin" and str(semillero.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso")
    
    # No permitir remover al owner
    if str(semillero.owner_id) == user_id:
        raise HTTPException(status_code=400, detail="No se puede remover al líder/propietario del semillero")
    
    from app.models import semillero_investigadores
    try:
        db.execute(
            semillero_investigadores.delete().where(
                semillero_investigadores.c.semillero_id == semillero_id,
                semillero_investigadores.c.user_id == user_id
            )
        )
        db.commit()
    except (OperationalError, SQLAlchemyError):
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Error al remover investigador: {e}")
        raise HTTPException(status_code=500, detail="Error interno al remover investigador")
    
    return {"message": "Investigador desvinculado"}
