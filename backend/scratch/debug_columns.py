import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine

def list_columns():
    with engine.connect() as conn:
        db_type = engine.url.drivername
        print(f"📦 DB: {db_type}")
        
        table_name = "users"
        if "postgresql" in db_type:
            query = text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='{table_name}'")
        else:
            query = text(f"PRAGMA table_info({table_name})")
            
        result = conn.execute(query)
        print(f"\nColumns for {table_name}:")
        for row in result:
            print(f" - {row}")

if __name__ == "__main__":
    list_columns()
