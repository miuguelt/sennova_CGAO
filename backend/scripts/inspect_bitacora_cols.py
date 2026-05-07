import sys
import os
from sqlalchemy import create_engine, inspect

# Añadir el directorio base al path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings

settings = get_settings()
engine = create_engine(settings.DATABASE_URL)
insp = inspect(engine)

try:
    columns = insp.get_columns('bitacora_entries')
    column_names = [c['name'] for c in columns]
    print(f"Columns in bitacora_entries: {column_names}")
except Exception as e:
    print(f"Error: {e}")
