import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Añadir el directorio base al path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings
from app.models import BitacoraEntry, User, Proyecto

settings = get_settings()
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def debug_bitacora():
    db = SessionLocal()
    try:
        print("--- Debugging Bitacora Integrity ---")
        entries = db.query(BitacoraEntry).all()
        print(f"Total entries: {len(entries)}")
        
        for entry in entries:
            print(f"Checking Entry ID: {entry.id}")
            print(f"  - Proyecto ID: {entry.proyecto_id}")
            print(f"  - User ID: {entry.user_id}")
            
            user = db.query(User).filter(User.id == entry.user_id).first()
            if not user:
                print(f"  ❌ ERROR: User with ID {entry.user_id} NOT FOUND!")
            else:
                print(f"  ✅ User found: {user.nombre}")
                
            proyecto = db.query(Proyecto).filter(Proyecto.id == entry.proyecto_id).first()
            if not proyecto:
                print(f"  ❌ ERROR: Proyecto with ID {entry.proyecto_id} NOT FOUND!")
            else:
                print(f"  ✅ Proyecto found: {proyecto.nombre}")
            
            # Check manual assignment like in bitacora.py
            try:
                if entry.user:
                    name = entry.user.nombre
                    print(f"  ✅ Relation works: {name}")
                else:
                    print(f"  ❌ Relation 'user' is NULL!")
            except Exception as re:
                print(f"  ❌ Relation error: {re}")
                
        print("--- End of Debug ---")
    finally:
        db.close()

if __name__ == "__main__":
    debug_bitacora()
