import psycopg
import os
from dotenv import load_dotenv

# Cargar .env desde la raíz del proyecto
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

db_url = os.getenv("DATABASE_URL")
print(f"Connecting to: {db_url}")

try:
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, email, created_at FROM users")
            rows = cur.fetchall()
            print("Users in DB:")
            for row in rows:
                print(row)
except Exception as e:
    print(f"Error: {e}")
