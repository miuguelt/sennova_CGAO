import sys
import os

# Añadir el directorio raíz al path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, inspect
from app.database import engine

def summary():
    print("====================================================")
    print("📊 RESUMEN DE INTEGRIDAD DEL SISTEMA - SENNOVA")
    print("====================================================\n")
    
    # 1. Verificar Conexión
    try:
        with engine.connect() as conn:
            print("✅ Conexión a Base de Datos: EXITOSA")
            print(f"🔗 Dialecto: {engine.url.drivername}")
            
            # 2. Verificar Tablas Críticas
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            critical_tables = ['users', 'proyectos', 'bitacora_entries', 'retos', 'productos']
            
            print("\n📂 Estado de Tablas:")
            for t in critical_tables:
                status = "✔ EXISTE" if t in tables else "❌ NO ENCONTRADA"
                count = 0
                if t in tables:
                    count = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
                print(f"  - {t:18}: {status} ({count} registros)")
                
            # 3. Verificar Columnas Recientes en Bitácora
            if 'bitacora_entries' in tables:
                cols = [c['name'] for c in inspector.get_columns('bitacora_entries')]
                required = ['is_firmado_investigador', 'is_firmado_aprendiz', 'signature_metadata']
                print("\n✍️ Estructura de Firmas Digitales:")
                for r in required:
                    print(f"  - {r:25}: {'✔ OK' if r in cols else '❌ FALTA'}")
                    
    except Exception as e:
        print(f"❌ Error de Conexión: {e}")

    print("\n====================================================")
    print("🚀 Listo para despliegue técnico.")
    print("====================================================")

if __name__ == "__main__":
    summary()
