import sys
import os

# Añadir el directorio raíz al path para poder importar la app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, engine
from app.models import *  # Importar todos los modelos para asegurar que están registrados

def init_tables():
    print("🚀 Creando tablas faltantes...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✨ Tablas creadas/verificadas con éxito.")
    except Exception as e:
        print(f"❌ Error al crear tablas: {e}")

if __name__ == "__main__":
    init_tables()
