from uuid import UUID
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_current_admin
from app.database import get_db
from app.models import Semillero, Grupo, User, Aprendiz
from app.schemas import SemilleroCreate, SemilleroUpdate, SemilleroResponse, AprendizCreate, AprendizResponse, AprendizUpdate
from app.utils import log_actividad

router = APIRouter(prefix="/semilleros", tags=["Semilleros de Investigación"])



def _make_semillero_dict(semillero: Semillero, db: Session) -> dict:
    """Convierte un objeto Semillero a diccionario para serialización correcta."""
    # Obtener investigadores con info de la tabla de asociación
    investigadores = []
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

    return {
        "id": str(semillero.id),
        "nombre": semillero.nombre,
        "linea_investigacion": semillero.linea_investigacion,
        "plan_accion": semillero.plan_accion,
        "horas_dedicadas": semillero.horas_dedicadas,
        "estado": semillero.estado,
        "grupo_id": str(semillero.grupo_id),
        "grupo": None,  # Simplificado para evitar recursión
        "owner_id": str(semillero.owner_id),
        "investigadores": investigadores,
        "aprendices": [],  # Simplificado
        "total_aprendices": len(semillero.aprendices) if semillero.aprendices else 0,
        "total_investigadores": len(investigadores),
        "created_at": semillero.created_at
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
    query = db.query(Semillero)
    
    if grupo_id:
        query = query.filter(Semillero.grupo_id == str(grupo_id))
    if estado:
        query = query.filter(Semillero.estado == estado)
    
    semilleros = query.offset(skip).limit(limit).all()
    
    return [_make_semillero_dict(s, db) for s in semilleros]


@router.get("/{semillero_id}")
def get_semillero(
    semillero_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener detalle de un semillero."""
    semillero = db.query(Semillero).filter(Semillero.id == str(semillero_id)).first()
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
    # Verificar que el grupo existe
    grupo = db.query(Grupo).filter(Grupo.id == str(semillero_data.grupo_id)).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    semillero = Semillero(
        nombre=semillero_data.nombre,
        linea_investigacion=semillero_data.linea_investigacion,
        plan_accion=semillero_data.plan_accion,
        horas_dedicadas=semillero_data.horas_dedicadas,
        estado=semillero_data.estado,
        grupo_id=str(semillero_data.grupo_id),
        owner_id=str(current_user.id)
    )
    
    db.add(semillero)
    db.commit()
    db.refresh(semillero)
    
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
    
    # Solo admin o owner pueden editar
    if current_user.rol != "admin" and str(semillero.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso para editar")
    
    update_data = semillero_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(semillero, field, value)
    
    db.commit()
    db.refresh(semillero)
    
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
    
    if current_user.rol != "admin" and str(semillero.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso para eliminar")
    
    db.delete(semillero)
    db.commit()
    
    return {"message": "Semillero eliminado"}


# ==========================================
# GESTIÓN DE APRENDICES
# ==========================================

from app.schemas import AprendizFullCreate, UserCreate
from app.repositories.user_repository import UserRepository

def _make_aprendiz_dict(aprendiz: Aprendiz) -> dict:
    """Convierte un objeto Aprendiz a diccionario usando info_consolidada."""
    info = aprendiz.info_consolidada
    return {
        "id": str(aprendiz.id),
        "user_id": str(aprendiz.user_id),
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
    if current_user.rol != "admin" and str(semillero.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso")
    
    # Verificar que el usuario existe
    user = db.query(User).filter(User.id == str(aprendiz_data.user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

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
    
    db.add(aprendiz)
    db.commit()
    db.refresh(aprendiz)
    
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
    
    if current_user.rol != "admin" and str(aprendiz.semillero.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso")
    
    update_data = aprendiz_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(aprendiz, field, value)
    
    db.commit()
    db.refresh(aprendiz)
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
    
    if current_user.rol != "admin" and str(aprendiz.semillero.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso")
    
    db.delete(aprendiz)
    db.commit()
    
    return {"message": "Vinculación de aprendiz eliminada"}


# ==========================================
# GESTIÓN DE INVESTIGADORES (MIEMBROS EQUIPO)
# ==========================================

@router.post("/{semillero_id}/investigadores")
def add_investigador_semillero(
    semillero_id: str,
    user_id: str,
    rol_en_semillero: str = "Coinvestigador",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Agregar investigador al semillero."""
    semillero = db.query(Semillero).filter(Semillero.id == str(semillero_id)).first()
    if not semillero:
        raise HTTPException(status_code=404, detail="Semillero no encontrado")
    
    # Solo admin o owner pueden agregar integrantes
    if current_user.rol != "admin" and str(semillero.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    from app.models import semillero_investigadores
    from datetime import date
    
    # Verificar si ya es integrante
    existing = db.query(semillero_investigadores).filter(
        semillero_investigadores.c.semillero_id == str(semillero_id),
        semillero_investigadores.c.user_id == str(user_id)
    ).first()
    
    if existing:
        # Actualizar rol si ya existe
        db.execute(
            semillero_investigadores.update().where(
                semillero_investigadores.c.semillero_id == str(semillero_id),
                semillero_investigadores.c.user_id == str(user_id)
            ).values(rol_en_semillero=rol_en_semillero)
        )
        db.commit()
        return {"message": "Rol de investigador actualizado"}
    
    db.execute(
        semillero_investigadores.insert().values(
            semillero_id=str(semillero.id),
            user_id=str(user.id),
            rol_en_semillero=rol_en_semillero,
            fecha_vinculacion=date.today()
        )
    )
    db.commit()
    
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
    
    if current_user.rol != "admin" and str(semillero.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin permiso")
    
    # No permitir remover al owner
    if str(semillero.owner_id) == user_id:
        raise HTTPException(status_code=400, detail="No se puede remover al líder/propietario del semillero")
    
    from app.models import semillero_investigadores
    db.execute(
        semillero_investigadores.delete().where(
            semillero_investigadores.c.semillero_id == semillero_id,
            semillero_investigadores.c.user_id == user_id
        )
    )
    db.commit()
    
    return {"message": "Investigador desvinculado"}

