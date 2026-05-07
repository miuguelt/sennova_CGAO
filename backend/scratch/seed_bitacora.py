import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import BitacoraEntry, Proyecto, User
from datetime import datetime, timezone
import uuid

def seed_bitacora():
    db = SessionLocal()
    try:
        # Buscar el primer proyecto
        proyecto = db.query(Proyecto).first()
        if not proyecto:
            print("No hay proyectos para seedear bitácora.")
            return
        
        # Buscar el primer usuario (admin)
        user = db.query(User).first()
        if not user:
            print("No hay usuarios.")
            return
            
        print(f"Seedeando bitácora para proyecto: {proyecto.nombre}")
        
        entry = BitacoraEntry(
            proyecto_id=proyecto.id,
            user_id=user.id,
            titulo="Inicio de fase de pruebas técnicas",
            contenido="Se inicia la validación de los endpoints de bitácora y la estructura de datos en PostgreSQL. Se verifica la integridad de las firmas digitales.",
            categoria="técnica",
            fecha=datetime.now(timezone.utc)
        )
        
        db.add(entry)
        db.commit()
        print("✅ Entrada de bitácora creada con éxito.")
        
    except Exception as e:
        print(f"❌ Error seedeando: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_bitacora()
