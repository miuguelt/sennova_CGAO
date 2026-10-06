import sys
import os

# Añadir el directorio raíz al path para poder importar la app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine
from app.services.database_startup import initialize_schema
from app import models as _models  # noqa: F401  # Registra todos los modelos en Base.metadata.

def init_tables():
    print("🚀 Creando tablas faltantes...")
    try:
        initialize_schema(engine)
        print("✨ Tablas creadas/verificadas con éxito.")
    except Exception as e:
        print(f"❌ Error al crear tablas: {e}")

if __name__ == "__main__":
    init_tables()
