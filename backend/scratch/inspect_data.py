import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine

def show_data():
    with engine.connect() as conn:
        db_type = engine.url.drivername
        print(f"📦 DB: {db_type}")
        
        query = text("SELECT * FROM bitacora_entries LIMIT 5")
        result = conn.execute(query)
        
        print("\nData in bitacora_entries:")
        columns = result.keys()
        for row in result:
            print(dict(zip(columns, row)))

if __name__ == "__main__":
    show_data()
