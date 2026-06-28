import sqlite3

db_path = "backend/sennova.db"
print(f"🔍 Conectando directamente a {db_path}...")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Obtener el esquema de la tabla proyectos
print("\n--- Esquema de la tabla 'proyectos' ---")
cursor.execute("PRAGMA table_info(proyectos)")
columns = cursor.fetchall()
for col in columns:
    print(f"Columna: {col[1]} | Tipo: {col[2]} | Nullable: {col[3]} | Default: {col[4]}")

# 2. Consultar los registros raw de proyectos
print("\n--- Registros de la tabla 'proyectos' (primeros 5) ---")
cursor.execute("SELECT id, nombre_corto, nombre FROM proyectos LIMIT 5")
rows = cursor.fetchall()
for r in rows:
    raw_id = r[0]
    print(f"ID: {raw_id} (Tipo: {type(raw_id)}) | Nombre Corto: {r[1]} | Nombre: {r[2]}")

# 3. Comprobar si existe el proyecto con ID exacto
if rows:
    test_id = rows[0][0]
    print(f"\n--- Probando búsqueda directa de ID: {test_id} ---")
    cursor.execute("SELECT id FROM proyectos WHERE id = ?", (test_id,))
    res_str = cursor.fetchone()
    print(f"Búsqueda con string: {res_str}")
    
    # Probando con bytes si es que fuera el caso
    if isinstance(test_id, str):
        try:
            import uuid
            uuid_bytes = uuid.UUID(test_id).bytes
            cursor.execute("SELECT id FROM proyectos WHERE id = ?", (uuid_bytes,))
            res_bytes = cursor.fetchone()
            print(f"Búsqueda con bytes (UUID.bytes): {res_bytes}")
        except Exception as e:
            print("Error probando bytes:", e)

conn.close()
