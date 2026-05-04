import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Agregar el directorio backend al path para importar la app
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..'))
backend_dir = os.path.join(project_root, 'backend')
sys.path.append(backend_dir)

from app.database import Base
from app.models import User, Grupo, Semillero, Aprendiz, Convocatoria, Proyecto, Producto, Documento, Entregable, Notificacion, Actividad

# Configuración
SQLITE_URL = "sqlite:///./backend/sennova.db"
POSTGRES_URL = "postgresql+psycopg://postgres:sennova123@127.0.0.1:5432/sennova"

def migrate():
    print(f"🚀 Iniciando migración de {SQLITE_URL} a {POSTGRES_URL}...")
    
    # Motores
    sqlite_engine = create_engine(SQLITE_URL)
    postgres_engine = create_engine(POSTGRES_URL)
    
    # Crear tablas en Postgres
    print("📦 Creando esquema en PostgreSQL...")
    Base.metadata.create_all(bind=postgres_engine)
    
    # Sesiones
    SqliteSession = sessionmaker(bind=sqlite_engine)
    PostgresSession = sessionmaker(bind=postgres_engine)
    
    sqlite_db = SqliteSession()
    postgres_db = PostgresSession()
    
    try:
        # Orden de migración para respetar llaves foráneas
        models = [
            User, Grupo, Semillero, Aprendiz, Convocatoria, 
            Proyecto, Producto, Documento, Entregable, Notificacion, Actividad
        ]
        
        for model in models:
            name = model.__tablename__
            print(f"  -> Migrando tabla: {name}...")
            
            # Obtener datos de SQLite
            items = sqlite_db.query(model).all()
            print(f"     Encontrados {len(items)} registros.")
            
            # Limpiar tabla en Postgres (por si acaso)
            # postgres_db.query(model).delete()
            
            # Transferir
            for item in items:
                # Expunge para desconectar del objeto de sesión de SQLite
                sqlite_db.expunge(item)
                # Hacer el objeto "nuevo" para la sesión de Postgres
                from sqlalchemy import make_transient
                make_transient(item)
                postgres_db.add(item)
            
            postgres_db.commit()
            print(f"     ✅ {name} completado.")
            
        print("\n✨ ¡Migración completada con éxito!")
        
    except Exception as e:
        postgres_db.rollback()
        print(f"\n❌ Error durante la migración: {e}")
        import traceback
        traceback.print_exc()
    finally:
        sqlite_db.close()
        postgres_db.close()

if __name__ == "__main__":
    migrate()
