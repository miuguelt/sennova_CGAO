from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import (
    AuthService, create_access_token, get_current_user,
    get_current_admin, get_password_hash
)
from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, Token, UserCreate, UserResponse, UserUpdate
from app.utils import log_actividad

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=Token)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Iniciar sesión y obtener token JWT."""
    user = AuthService.authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(user.id, user.email, user.rol)
    
    # Registrar actividad
    log_actividad(
        db, 
        user.id, 
        "login", 
        f"Inició sesión en el sistema",
        entidad_tipo="usuario",
        entidad_id=str(user.id)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Registrar un nuevo investigador."""
    # Solo permitir rol investigador en registro público
    if user_data.rol == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No se puede registrar como admin"
        )
    
    user = AuthService.register_user(
        db,
        email=user_data.email,
        password=user_data.password,
        nombre=user_data.nombre,
        rol=user_data.rol,
        sede=user_data.sede
    )
    
    # Registrar actividad
    log_actividad(
        db, 
        user.id, 
        "registro", 
        f"Se registró como nuevo investigador en la sede {user.sede}",
        entidad_tipo="usuario",
        entidad_id=str(user.id)
    )
    
    return user


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Obtener información del usuario actual."""
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar perfil del usuario actual."""
    update_data = user_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password")
def change_password(
    old_password: str,
    new_password: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cambiar contraseña del usuario actual."""
    from app.auth import verify_password
    
    if not verify_password(old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contraseña actual incorrecta"
        )
    
    current_user.password_hash = get_password_hash(new_password)
    db.commit()
    
    return {"message": "Contraseña actualizada correctamente"}


# ==========================================
# ADMIN ROUTES - Gestión de Usuarios
# ==========================================

@router.get("/users", response_model=list[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    rol: str = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Listar todos los usuarios (solo admin)."""
    query = db.query(User)
    if rol:
        query = query.filter(User.rol == rol)
    users = query.offset(skip).limit(limit).all()
    return users


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Obtener detalle de un usuario (solo admin)."""
    from uuid import UUID
    user = db.query(User).filter(User.id == UUID(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Crear usuario (solo admin, puede crear admins)."""
    user = AuthService.register_user(
        db,
        email=user_data.email,
        password=user_data.password,
        nombre=user_data.nombre,
        rol=user_data.rol,
        sede=user_data.sede
    )
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    user_update: UserUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Actualizar cualquier usuario (solo admin)."""
    from uuid import UUID
    user = db.query(User).filter(User.id == UUID(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Desactivar usuario (solo admin)."""
    from uuid import UUID
    user = db.query(User).filter(User.id == UUID(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    user.is_active = False
    db.commit()
    
    return {"message": "Usuario desactivado"}
