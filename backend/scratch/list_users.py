
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import User

db = SessionLocal()
try:
    users = db.query(User).all()
    print(f"Total usuarios: {len(users)}")
    for u in users:
        print(f"- {u.nombre} ({u.email}) - {u.rol}")
finally:
    db.close()
