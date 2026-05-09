
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import User

db = SessionLocal()
try:
    users = db.query(User).filter(User.rol == "investigador").all()
    print(f"Total investigadores: {len(users)}")
    for u in users:
        print(f"- {u.nombre}: '{u.estado_cv_lac}'")
finally:
    db.close()
