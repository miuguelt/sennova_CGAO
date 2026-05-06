import os
import sys

# Agregar el directorio actual al path para poder importar 'app'
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import engine, Base
from app.models import BitacoraEntry

def reset_bitacora_table():
    print("🧹 Iniciando reseteo de tabla 'bitacora_entries'...")
    try:
        # Intentar borrar la tabla
        BitacoraEntry.__table__.drop(engine)
        print("✅ Tabla 'bitacora_entries' eliminada.")
        
        # Recrear todas las tablas (esto creará la que falta)
        Base.metadata.create_all(engine)
        print("✅ Tabla 'bitacora_entries' recreada con el nuevo sistema de firmas.")
    except Exception as e:
        print(f"❌ Error al resetear tabla: {e}")
        # Si la tabla no existe, simplemente crearla
        Base.metadata.create_all(engine)
        print("✅ Tablas verificadas/creadas.")

if __name__ == "__main__":
    reset_bitacora_table()
