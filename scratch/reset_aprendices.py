import os
import sys

# Agregar el directorio actual al path para poder importar 'app'
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import engine, Base
from app.models import Aprendiz

def reset_aprendices_table():
    print("🧹 Iniciando reseteo de tabla 'aprendices'...")
    try:
        # Intentar borrar la tabla
        Aprendiz.__table__.drop(engine)
        print("✅ Tabla 'aprendices' eliminada.")
        
        # Recrear todas las tablas (esto creará la que falta)
        Base.metadata.create_all(engine)
        print("✅ Tabla 'aprendices' recreada con la nueva estructura.")
    except Exception as e:
        print(f"❌ Error al resetear tabla: {e}")
        # Si la tabla no existe, simplemente crearla
        Base.metadata.create_all(engine)
        print("✅ Tablas verificadas/creadas.")

if __name__ == "__main__":
    reset_aprendices_table()
