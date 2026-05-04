import sqlite3
import os

db_path = 'backend/sennova.db'
if not os.path.exists(db_path):
    print(f"[CRÍTICO] No se encuentra la base de datos en {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("\n" + "="*40)
print("🔍 AUDITORÍA TÉCNICA - SISTEMA SENNOVA")
print("="*40)

# 1. Verificar Tablas
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [t[0] for t in cursor.fetchall()]
print(f"\n📊 ESTRUCTURA:")
for table in ['users', 'proyectos', 'productos', 'actividades', 'documentos']:
    status = "✅ OK" if table in tables else "❌ FALTA"
    print(f"  - Tabla {table:12}: {status}")

# 2. Verificar Auditoría
if 'actividades' in tables:
    cursor.execute("SELECT COUNT(*) FROM actividades")
    count = cursor.fetchone()[0]
    print(f"\n📈 AUDITORÍA (Logs): {count} registros")
    
    if count > 0:
        cursor.execute("SELECT tipo_accion, descripcion, created_at FROM actividades ORDER BY created_at DESC LIMIT 3")
        recent = cursor.fetchall()
        print("  Acciones recientes:")
        for r in recent:
            print(f"    - [{r[0]}] {r[1]} ({r[2]})")
else:
    print("\n⚠️ ALERTA: El sistema de auditoría no ha registrado datos aún.")

# 3. Verificar Conectividad de Datos (Campos nuevos)
print("\n🔗 CONECTIVIDAD DE DATOS:")
cursor.execute("PRAGMA table_info(users)")
user_cols = [c[1] for c in cursor.fetchall()]
for col in ['cv_lac_url', 'nivel_academico', 'rol_sennova']:
    status = "✅ OK" if col in user_cols else "❌ ERROR (Migración pendiente)"
    print(f"  - Campo {col:15}: {status}")

conn.close()
print("\n" + "="*40)
