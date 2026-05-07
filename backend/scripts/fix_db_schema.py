import sys
import os

# Añadir el directorio raíz al path para poder importar la app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, inspect
from app.database import engine

def fix_schema():
    print("🚀 Iniciando reparación avanzada de esquema de base de datos...")
    
    # Lista de cambios por tabla
    modifications = {
        "users": [
            ("documento", "VARCHAR(20)"),
            ("celular", "VARCHAR(20)"),
            ("ficha", "VARCHAR(50)"),
            ("programa_formacion", "VARCHAR(255)")
        ],
        "proyectos": [
            ("semillero_id", "UUID" if "postgresql" in engine.url.drivername else "VARCHAR(36)"),
            ("reto_origen_id", "UUID" if "postgresql" in engine.url.drivername else "VARCHAR(36)"),
            ("convocatoria_id", "UUID" if "postgresql" in engine.url.drivername else "VARCHAR(36)")
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
        ],
        "retos": [
            ("titulo", "VARCHAR(255)"),
            ("descripcion", "TEXT"),
            ("sector_productivo", "VARCHAR(100)"),
            ("empresa_solicitante", "VARCHAR(255)"),
            ("contacto_email", "VARCHAR(255)"),
            ("estado", "VARCHAR(50) DEFAULT 'abierto'"),
            ("prioridad", "VARCHAR(20) DEFAULT 'media'"),
            ("semillero_asignado_id", "UUID" if "postgresql" in engine.url.drivername else "VARCHAR(36)"),
            ("owner_id", "UUID" if "postgresql" in engine.url.drivername else "VARCHAR(36)")
        ]
    }
    
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    with engine.connect() as conn:
        db_type = engine.url.drivername
        print(f"📦 Tipo de base de datos detectado: {db_type}")
        
        for table_name, columns in modifications.items():
            if table_name not in existing_tables:
                print(f"⚠️ La tabla '{table_name}' no existe. Saltando verificaciones de columnas.")
                continue
                
            print(f"\n📂 Verificando tabla '{table_name}'...")
            for col_name, col_type in columns:
                try:
                    # Verificar si la columna existe de forma robusta
                    columns_info = inspector.get_columns(table_name)
                    exists = any(c['name'] == col_name for c in columns_info)
                    
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
