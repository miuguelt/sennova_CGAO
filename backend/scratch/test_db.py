
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import User
from app.auth import get_password_hash

db = SessionLocal()
try:
    print("Testing DB connection...")
    user = db.query(User).filter(User.email == "test_seed@sena.edu.co").first()
    if not user:
        user = User(
            email="test_seed@sena.edu.co",
            password_hash=get_password_hash("123456"),
            nombre="Test Seed",
            rol="investigador"
        )
        db.add(user)
        db.commit()
        print("User created successfully")
    else:
        print("User already exists")
finally:
    db.close()
