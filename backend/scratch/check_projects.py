import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine

def check_projects():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT id, nombre FROM proyectos"))
        for row in result:
            print(row)

if __name__ == "__main__":
    check_projects()
