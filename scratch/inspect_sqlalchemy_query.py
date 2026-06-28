import sys
import os
import uuid

# Configurar PYTHONPATH para que reconozca 'app'
sys.path.insert(0, os.path.abspath("backend"))

from app.database import SessionLocal
from app.models import Proyecto

db = SessionLocal()

print("🔍 Listando todos los proyectos con SQLAlchemy:")
proyectos = db.query(Proyecto).all()
if not proyectos:
    print("❌ No hay proyectos en la base de datos!")
    db.close()
    exit(1)

for p in proyectos:
    print(f"Proyecto ID: '{p.id}' (Tipo: {type(p.id)}) | Nombre: {p.nombre_corto}")

# Tomar el primer proyecto
test_id_str = proyectos[0].id
test_id_uuid = uuid.UUID(test_id_str)

print(f"\n--- Probando Búsquedas para ID: '{test_id_str}' ---")

# 1. Búsqueda con string
p_str = db.query(Proyecto).filter(Proyecto.id == test_id_str).first()
print(f"Búsqueda con string: {p_str} (ID: {p_str.id if p_str else 'None'})")

# 2. Búsqueda con objeto UUID
p_uuid = db.query(Proyecto).filter(Proyecto.id == test_id_uuid).first()
print(f"Búsqueda con objeto UUID: {p_uuid} (ID: {p_uuid.id if p_uuid else 'None'})")

# 3. Búsqueda forzando str() de UUID
p_str_uuid = db.query(Proyecto).filter(Proyecto.id == str(test_id_uuid)).first()
print(f"Búsqueda con str(UUID): {p_str_uuid} (ID: {p_str_uuid.id if p_str_uuid else 'None'})")

# 4. Búsqueda con repr() o similares
p_str_cast = db.query(Proyecto).filter(Proyecto.id == f"{test_id_uuid}").first()
print(f"Búsqueda con f'{{UUID}}': {p_str_cast} (ID: {p_str_cast.id if p_str_cast else 'None'})")

db.close()
