
import sqlite3
import os

db_path = r"c:\Users\Miguel\Documents\Aplicaciones\1Sistema de información para la gestión de proyectos de investigación del CGAO\backend\sennova.db"

if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

user_id = "4a9681d2-f043-4013-a218-35d80deaae21"
cursor.execute("SELECT id, nombre, email FROM users WHERE id = ?", (user_id,))
row = cursor.fetchone()

if row:
    print(f"User found: {row}")
else:
    print(f"User {user_id} NOT found")
    cursor.execute("SELECT id, nombre FROM users LIMIT 5")
    print("Available users:")
    for r in cursor.fetchall():
        print(r)

conn.close()
