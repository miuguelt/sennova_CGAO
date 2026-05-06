import sys
import os

# Añadir el directorio raíz al path para poder importar la app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine

def fix_schema():
    print("🚀 Iniciando reparación de esquema de base de datos...")
    
    # Lista de cambios por tabla
    modifications = {
        "users": [
            ("documento", "VARCHAR(20)"),
            ("celular", "VARCHAR(20)"),
            ("ficha", "VARCHAR(50)"),
            ("programa_formacion", "VARCHAR(255)")
        ],
        "proyectos": [
            ("semillero_id", "UUID" if "postgresql" in engine.url.drivername else "VARCHAR(36)")
        ],
        "aprendices": [
            ("user_id", "UUID" if "postgresql" in engine.url.drivername else "VARCHAR(36)"),
            ("fecha_egreso", "DATE")
        ],
        "bitacora_entries": [
            ("adjuntos", "JSON"),
            ("is_firmado_investigador", "BOOLEAN DEFAULT FALSE"),
            ("fecha_firma_investigador", "TIMESTAMP"),
            ("is_firmado_aprendiz", "BOOLEAN DEFAULT FALSE"),
            ("fecha_firma_aprendiz", "TIMESTAMP"),
            ("signature_metadata", "JSON")
        ]
    }
    
    with engine.connect() as conn:
        # Verificar si estamos en PostgreSQL o SQLite
        db_type = engine.url.drivername
        print(f"📦 Tipo de base de datos detectado: {db_type}")
        
        for table_name, columns in modifications.items():
            print(f"\n📂 Verificando tabla '{table_name}'...")
            for col_name, col_type in columns:
                try:
                    # Verificar si la columna existe
                    if "postgresql" in db_type:
                        query = text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table_name}' AND column_name='{col_name}'")
                    else:
                        query = text(f"PRAGMA table_info({table_name})")
                    
                    result = conn.execute(query)
                    exists = False
                    
                    if "postgresql" in db_type:
                        exists = result.fetchone() is not None
                    else:
                        for row in result:
                            if row[1] == col_name:
                                exists = True
                                break
                    
                    if not exists:
                        print(f"  ➕ Añadiendo columna '{col_name}' ({col_type}) a '{table_name}'...")
                        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                        print(f"  ✅ Columna '{col_name}' añadida con éxito.")
                    else:
                        print(f"  ✔ La columna '{col_name}' ya existe.")
                        
                except Exception as e:
                    print(f"  ❌ Error procesando columna '{col_name}' en '{table_name}': {e}")
        
        print("\n✨ Proceso de reparación finalizado.")

if __name__ == "__main__":
    fix_schema()
