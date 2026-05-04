import sys
import os
import random
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from faker import Faker

# Añadir el directorio base al path para importar app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app.models import (
    User, Grupo, Semillero, Aprendiz, Convocatoria, Proyecto, 
    Producto, Documento, Entregable, Notificacion, Actividad, 
    Reto, BitacoraEntry, AuditLog, grupo_integrantes, proyecto_equipo
)
from app.auth import get_password_hash

fake = Faker(['es_CO'])

def seed_data():
    db = SessionLocal()
    try:
        print("🌱 Iniciando poblamiento de base de datos...")
        
        # 1. Crear Tablas si no existen
        Base.metadata.create_all(bind=engine)
        print("✅ Tablas verificadas")

        # Limpiar tablas previas (opcional, pero mejor para empezar de cero si es nueva conexión)
        # Nota: En Postgres hay que tener cuidado con el orden por las FK
        
        # 2. Users (100)
        users = []
        # Asegurar un admin
        admin = User(
            email="admin@sena.edu.co",
            password_hash=get_password_hash("123456"),
            nombre="Administrador Sistema",
            rol="admin",
            rol_sennova="Líder SENNOVA",
            sede="CGAO Vélez",
            regional="Santander"
        )
        db.add(admin)
        users.append(admin)

        for i in range(99):
            user = User(
                email=fake.unique.email(),
                password_hash=get_password_hash("password123"),
                nombre=fake.name(),
                rol=random.choice(['admin', 'investigador']),
                rol_sennova=random.choice(['Instructor Investigador', 'Gestor SENNOVA', 'Dinamizador']),
                nivel_academico=random.choice(['Pregrado', 'Especialización', 'Maestría', 'Doctorado']),
                horas_mensuales=random.randint(20, 160),
                meses_vinculacion=random.randint(1, 12),
                cv_lac_url=fake.url(),
                sede="CGAO Vélez",
                regional="Santander"
            )
            db.add(user)
            users.append(user)
        
        db.commit()
        print(f"✅ 100 Usuarios creados")

        # 3. Grupos (100)
        grupos = []
        for i in range(100):
            grupo = Grupo(
                nombre=f"Grupo de Investigación {fake.word().capitalize()} {i}",
                nombre_completo=fake.sentence(),
                codigo_gruplac=f"COL{random.randint(100000, 999999)}",
                clasificacion=random.choice(['A1', 'A', 'B', 'C', 'D', 'Reconocido']),
                gruplac_url=fake.url(),
                owner_id=random.choice(users).id,
                is_publico=True
            )
            db.add(grupo)
            grupos.append(grupo)
        
        db.commit()
        print(f"✅ 100 Grupos creados")

        # 4. Convocatorias (100)
        convocatorias = []
        for i in range(100):
            conv = Convocatoria(
                numero_oe=f"2026-{random.randint(100, 999)}",
                nombre=f"Convocatoria Nacional {fake.word().capitalize()} {2024+i%3}",
                año=2024 + (i % 3),
                fecha_apertura=fake.date_between(start_date='-1y', end_date='today'),
                fecha_cierre=fake.date_between(start_date='today', end_date='+1y'),
                estado=random.choice(['abierta', 'cerrada', 'en_evaluacion']),
                owner_id=random.choice(users).id
            )
            db.add(conv)
            convocatorias.append(conv)
        
        db.commit()
        print(f"✅ 100 Convocatorias creadas")

        # 5. Semilleros (100)
        semilleros = []
        for i in range(100):
            semillero = Semillero(
                nombre=f"Semillero {fake.word().capitalize()} {i}",
                linea_investigacion=fake.sentence(),
                grupo_id=random.choice(grupos).id,
                owner_id=random.choice(users).id,
                estado='activo'
            )
            db.add(semillero)
            semilleros.append(semillero)
        
        db.commit()
        print(f"✅ 100 Semilleros creados")

        # 6. Retos (100)
        retos = []
        for i in range(100):
            reto = Reto(
                titulo=f"Reto Tecnológico: {fake.catch_phrase()}",
                descripcion=fake.text(),
                sector_productivo=random.choice(['Agroindustria', 'Software', 'Turismo', 'Construcción']),
                empresa_solicitante=fake.company(),
                owner_id=random.choice(users).id
            )
            db.add(reto)
            retos.append(reto)
        
        db.commit()
        print(f"✅ 100 Retos creados")

        # 7. Proyectos (100)
        proyectos = []
        for i in range(100):
            proyecto = Proyecto(
                codigo_sgps=f"SGPS-{random.randint(10000, 99999)}",
                nombre=f"Proyecto de {fake.bs().capitalize()}",
                estado=random.choice(['Formulación', 'En ejecución', 'Finalizado']),
                vigencia=random.randint(6, 24),
                presupuesto_total=float(random.randint(10000000, 100000000)),
                convocatoria_id=random.choice(convocatorias).id,
                owner_id=random.choice(users).id,
                reto_origen_id=random.choice(retos).id if random.random() > 0.7 else None
            )
            db.add(proyecto)
            proyectos.append(proyecto)
        
        db.commit()
        print(f"✅ 100 Proyectos creados")

        # 8. Aprendices (100)
        for i in range(100):
            aprendiz = Aprendiz(
                nombre=fake.name(),
                ficha=str(random.randint(2000000, 3000000)),
                programa=fake.job(),
                semillero_id=random.choice(semilleros).id
            )
            db.add(aprendiz)
        
        # 9. Productos (100)
        productos = []
        for i in range(100):
            producto = Producto(
                tipo=random.choice(['software', 'articulo', 'prototipo', 'video']),
                nombre=f"Producto {fake.word().capitalize()} - {i}",
                proyecto_id=random.choice(proyectos).id,
                owner_id=random.choice(users).id
            )
            db.add(producto)
            productos.append(producto)

        # 10. Documentos (100)
        for i in range(100):
            doc = Documento(
                entidad_tipo=random.choice(['proyecto', 'producto', 'user']),
                entidad_id=uuid.uuid4(), # Simplificado
                tipo=random.choice(['pdf', 'docx', 'xlsx']),
                nombre_archivo=f"documento_{i}.pdf",
                owner_id=random.choice(users).id
            )
            db.add(doc)

        # 11. Entregables (100)
        for i in range(100):
            entregable = Entregable(
                fase=random.choice(['Fase I', 'Fase II', 'Final']),
                titulo=f"Entregable {i}",
                fecha_entrega=fake.date_between(start_date='today', end_date='+6m'),
                proyecto_id=random.choice(proyectos).id,
                responsable_id=random.choice(users).id
            )
            db.add(entregable)

        # 12. Notificaciones (100)
        for i in range(100):
            notif = Notificacion(
                user_id=random.choice(users).id,
                tipo='sistema',
                titulo="Nueva Notificación",
                mensaje=fake.sentence()
            )
            db.add(notif)

        # 13. Actividades (100)
        for i in range(100):
            act = Actividad(
                user_id=random.choice(users).id,
                tipo_accion='create',
                descripcion=fake.sentence()
            )
            db.add(act)

        # 14. Bitacora (100)
        for i in range(100):
            bit = BitacoraEntry(
                proyecto_id=random.choice(proyectos).id,
                user_id=random.choice(users).id,
                titulo="Avance Semanal",
                contenido=fake.text()
            )
            db.add(bit)

        # 15. Audit Logs (100)
        for i in range(100):
            audit = AuditLog(
                user_id=random.choice(users).id,
                method=random.choice(['POST', 'PUT', 'DELETE']),
                endpoint=f"/api/v1/{fake.word()}",
                status_code=200,
                ip_address=fake.ipv4()
            )
            db.add(audit)

        db.commit()
        print("✅ Poblamiento masivo completado (100 registros por tabla)")

    except Exception as e:
        db.rollback()
        print(f"❌ Error durante el poblamiento: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
