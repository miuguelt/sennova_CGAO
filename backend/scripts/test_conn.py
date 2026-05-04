import sys
import os
from sqlalchemy import create_engine, text

# Añadir el directorio base al path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings

settings = get_settings()
print(f"Testing connection to: {settings.DATABASE_URL}")

try:
    engine = create_engine(settings.DATABASE_URL, connect_args={'connect_timeout': 5})
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version();"))
        print(f"Connected! PostgreSQL version: {result.fetchone()[0]}")
except Exception as e:
    print(f"Connection failed: {e}")
    import traceback
    traceback.print_exc()
