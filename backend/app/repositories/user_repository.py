from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import User
from app.schemas import UserCreate, UserUpdate
from app.auth import get_password_hash
from app.repositories.base_repository import BaseRepository

class UserRepository(BaseRepository[User]):
    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def list_users(self, skip: int = 0, limit: int = 100, rol: Optional[str] = None, is_active: Optional[bool] = None, search: Optional[str] = None) -> List[User]:
        query = self.db.query(User)
        if rol:
            query = query.filter(User.rol == rol)
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        if search:
            search_filter = f"%{search}%"
            query = query.filter((User.nombre.ilike(search_filter)) | (User.email.ilike(search_filter)))
        
        return query.offset(skip).limit(limit).all()

    # Sobrescribimos create porque los usuarios necesitan hashing de password
    def create(self, user_data: UserCreate) -> User:
        user_dict = user_data.dict()
        password = user_dict.pop("password")
        user = User(
            **user_dict,
            password_hash=get_password_hash(password)
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
