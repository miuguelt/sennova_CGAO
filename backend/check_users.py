import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL', 'postgresql+psycopg://sennova:sennova123@localhost:5432/sennova')
engine = create_engine(db_url)

try:
    with engine.connect() as conn:
        res = conn.execute(text('SELECT email, rol, is_active FROM users LIMIT 10'))
        print("USUARIOS:")
        for row in res:
            print(f"Email: {row[0]}, Rol: {row[1]}, Activo: {row[2]}")
except Exception as e:
    print(f"Error: {e}")
