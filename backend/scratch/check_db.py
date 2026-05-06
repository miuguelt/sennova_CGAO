import sqlite3
import os

db_path = 'sennova.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(users)")
    columns = cursor.fetchall()
    print("Columns in 'users':")
    for col in columns:
        print(col)
    conn.close()
else:
    print(f"Database {db_path} not found.")
