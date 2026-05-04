import os
import sys
import time
import random
from datetime import date, datetime, timedelta, timezone
import uuid

# Añadir el path del backend para poder importar la app
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, backend_path)

from app.database import SessionLocal, engine, Base
from app.models import User, Grupo, Semillero, Proyecto, Convocatoria
from app.auth import get_password_hash

def run_crud_test():
    db = SessionLocal()
    results = []
    
    print("\n🚀 Iniciando Prueba de Estrés CRUD SENNOVA...")
    print("-" * 50)

    try:
        # Asegurar que las tablas existen
        Base.metadata.create_all(bind=engine)
        
        tables_to_test = [
            {"model": User, "name": "User"},
            {"model": Grupo, "name": "Grupo"},
            {"model": Semillero, "name": "Semillero"},
            {"model": Convocatoria, "name": "Convocatoria"},
            {"model": Proyecto, "name": "Proyecto"}
        ]

        # Datos base para relaciones
        test_user = None
        test_grupo = None
        test_semillero = None
        test_convocatoria = None

        for table in tables_to_test:
            model = table["model"]
            name = table["name"]
            print(f"📦 Procesando tabla: {name}")
            
            try:
                start_time = time.time()
                
                # 1. CREATE (10 registros)
                created_ids = []
                for i in range(1, 11):
                    data = {}
                    if name == "User":
                        data = {
                            "email": f"test_{i}_{int(time.time())}@sennova.edu.co",
                            "password_hash": get_password_hash("password123"),
                            "nombre": f"Investigador Test {i}",
                            "rol": "investigador"
                        }
                    elif name == "Grupo":
                        if not test_user: test_user = db.query(User).first()
                        data = {
                            "nombre": f"Grupo de Investigación {i}",
                            "nombre_completo": f"Grupo de Prueba SENNOVA {i} - {time.time()}",
                            "owner_id": test_user.id,
                            "clasificacion": "C"
                        }
                    elif name == "Semillero":
                        if not test_grupo: test_grupo = db.query(Grupo).first()
                        if not test_user: test_user = db.query(User).first()
                        data = {
                            "nombre": f"Semillero {i}",
                            "grupo_id": test_grupo.id,
                            "owner_id": test_user.id
                        }
                    elif name == "Convocatoria":
                        if not test_user: test_user = db.query(User).first()
                        data = {
                            "numero_oe": f"OE-{i}-{datetime.now().year}",
                            "nombre": f"Convocatoria de Investigación {i}",
                            "año": datetime.now().year,
                            "owner_id": test_user.id
                        }
                    elif name == "Proyecto":
                        if not test_user: test_user = db.query(User).first()
                        if not test_convocatoria: test_convocatoria = db.query(Convocatoria).first()
                        data = {
                            "codigo_sgps": f"SGPS-{random.randint(1000, 9999)}",
                            "nombre": f"Proyecto de Innovación {i}",
                            "convocatoria_id": test_convocatoria.id,
                            "owner_id": test_user.id
                        }
                    
                    obj = model(**data)
                    db.add(obj)
                    db.flush() # Para obtener el ID si es autoincremental o generado
                    created_ids.append(obj.id)
                
                db.commit()
                create_duration = time.time() - start_time
                
                # Asignar datos base para siguientes tablas
                if name == "User" and not test_user: test_user = db.query(User).get(created_ids[0])
                if name == "Grupo" and not test_grupo: test_grupo = db.query(Grupo).get(created_ids[0])
                if name == "Semillero" and not test_semillero: test_semillero = db.query(Semillero).get(created_ids[0])
                if name == "Convocatoria" and not test_convocatoria: test_convocatoria = db.query(Convocatoria).get(created_ids[0])

                # 2. READ
                read_start = time.time()
                all_objs = db.query(model).filter(model.id.in_(created_ids)).all()
                read_duration = time.time() - read_start
                
                # 3. UPDATE (1 registro)
                update_start = time.time()
                target = db.query(model).get(created_ids[0])
                if name == "User": target.nombre = f"Nombre Actualizado {int(time.time())}"
                elif name == "Proyecto": target.nombre = f"Proyecto Modificado {int(time.time())}"
                db.commit()
                update_duration = time.time() - update_start
                
                # 4. DELETE (1 registro)
                delete_start = time.time()
                target_del = db.query(model).get(created_ids[-1])
                db.delete(target_del)
                db.commit()
                delete_duration = time.time() - delete_start
                
                results.append({
                    "Tabla": name,
                    "Creados": 10,
                    "T_Create": f"{create_duration:.4f}s",
                    "T_Read": f"{read_duration:.4f}s",
                    "T_Update": f"{update_duration:.4f}s",
                    "T_Delete": f"{delete_duration:.4f}s",
                    "Estado": "✅ OK"
                })
                
            except Exception as e:
                db.rollback()
                print(f"❌ Error en tabla {name}: {str(e)}")
                results.append({
                    "Tabla": name,
                    "Creados": 0,
                    "T_Create": "-",
                    "T_Read": "-",
                    "T_Update": "-",
                    "T_Delete": "-",
                    "Estado": f"❌ Error: {str(e)[:20]}..."
                })

        # Mostrar tabla de resultados
        print("\n📊 TABLA DE RESULTADOS - CRUD SENNOVA")
        print("=" * 85)
        print(f"{'Tabla':<15} | {'Creados':<7} | {'Create':<10} | {'Read':<10} | {'Update':<10} | {'Delete':<10} | {'Estado'}")
        print("-" * 85)
        for r in results:
            print(f"{r['Tabla']:<15} | {r['Creados']:<7} | {r['T_Create']:<10} | {r['T_Read']:<10} | {r['T_Update']:<10} | {r['T_Delete']:<10} | {r['Estado']}")
        print("=" * 85)

    finally:
        db.close()

if __name__ == "__main__":
    run_crud_test()
