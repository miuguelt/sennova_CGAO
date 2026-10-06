import sys
import os

# Añadir el directorio raíz al path para poder importar la app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, inspect
from app.database import engine

def fix_schema(target_engine=None):
    """Agrega columnas heredadas faltantes dentro de una sola transacción."""
    db_engine = target_engine or engine
    print("🗄️ Verificando columnas heredadas de la base de datos...")
    
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
            ("convocatoria_id", "UUID" if "postgresql" in engine.url.drivername else "VARCHAR(36)"),
            ("grupo_id", "UUID" if "postgresql" in engine.url.drivername else "VARCHAR(36)")
        ],
        "aprendices": [
            ("user_id", "UUID" if "postgresql" in engine.url.drivername else "VARCHAR(36)"),
            ("nombre", "VARCHAR(255)"),
            ("ficha", "VARCHAR(50)"),
            ("programa", "VARCHAR(255)"),
            ("fecha_egreso", "DATE")
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
        ],
        "mensajes": [
            ("entregado", "BOOLEAN DEFAULT FALSE"),
            ("fecha_entrega", "TIMESTAMP")
        ],
        "documentos": [
            ("descripcion", "TEXT"),
            ("periodo_bimestre", "INTEGER")
        ]
    }
    
    with db_engine.begin() as conn:
        inspector = inspect(conn)
        existing_tables = set(inspector.get_table_names())
        db_type = db_engine.url.drivername
        print(f"📦 Motor detectado: {db_type}")
        for table_name, columns in modifications.items():
            if table_name not in existing_tables:
                continue
            existing_columns = {
                column["name"] for column in inspector.get_columns(table_name)
            }
            for col_name, col_type in columns:
                if col_name in existing_columns:
                    continue
                conn.execute(text(
                    f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"
                ))
                existing_columns.add(col_name)
    print("✅ Las columnas heredadas están disponibles.")

if __name__ == "__main__":
    fix_schema()
