from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import User

settings = get_settings()

# Configuración de seguridad
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contraseña contra su hash."""
    try:
        if isinstance(hashed_password, str):
            hashed_password = hashed_password.encode('utf-8')
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password)
    except Exception as e:
        print(f"⚠️ Error verificando password: {e}")
        return False


def get_password_hash(password: str) -> str:
    """Genera hash de una contraseña."""
    # bcrypt trunca a 72 bytes automáticamente
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=10)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def create_access_token(user_id: UUID, email: str, rol: str) -> str:
    """Crea un token JWT."""
    to_encode = {
        "sub": str(user_id),
        "email": email,
        "rol": rol,
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decodifica y valida un token JWT."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Obtiene el usuario actual desde el token JWT."""
    token = credentials.credentials
    payload = decode_token(token)
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    
    return user


async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Verifica que el usuario actual sea admin."""
    if current_user.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere rol de administrador"
        )
    return current_user


class AuthService:
    """Servicio de autenticación."""
    
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        """Autentica un usuario por email y contraseña."""
        try:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                return None
            if not verify_password(password, user.password_hash):
                return None
            if not user.is_active:
                return None
            return user
        except Exception as e:
            # Capturar errores de BD o validación para debug
            print(f"❌ Error en authenticate_user para {email}: {e}")
            raise e
    
    @staticmethod
    def register_user(db: Session, email: str, password: str, nombre: str, **kwargs) -> User:
        """Registra un nuevo usuario."""
        # Verificar si ya existe
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email ya registrado"
            )
        
        # Crear usuario
        user = User(
            email=email,
            password_hash=get_password_hash(password),
            nombre=nombre,
            rol=kwargs.get("rol", "investigador"),
            sede=kwargs.get("sede"),
            is_active=True
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def change_password(db: Session, user: User, new_password: str) -> None:
        """Cambia la contraseña de un usuario."""
        user.password_hash = get_password_hash(new_password)
        db.commit()
