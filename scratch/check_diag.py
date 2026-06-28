import sqlite3
import os

def check_db(path):
    if not os.path.exists(path):
        print(path, 'does not exist')
        return
    conn = sqlite3.connect(path)
    c = conn.cursor()
    c.execute("SELECT id, nombre, convocatoria_id FROM proyectos")
    rows = c.fetchall()
    print(path, 'has:', len(rows), 'proyectos')
    for r in rows:
        print('  ', r)

print("Checking databases...")
check_db('sennova.db')
check_db('backend/sennova.db')
