import sys
import os
import uuid
from datetime import datetime, date, timedelta, timezone

# Añadir el directorio raíz al path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import (
    User, Grupo, Semillero, Aprendiz, Convocatoria, 
    Proyecto, Producto, Reto, BitacoraEntry,
    grupo_integrantes, proyecto_equipo, semillero_investigadores
)
from app.auth import get_password_hash

def seed_data():
    db = SessionLocal()
    print("🧹 Limpiando datos previos...")
    try:
        # Limpiar tablas en orden inverso de dependencia
        db.execute(BitacoraEntry.__table__.delete())
        db.execute(Producto.__table__.delete())
        db.execute(Proyecto.__table__.delete())
        db.execute(Reto.__table__.delete())
        db.execute(Convocatoria.__table__.delete())
        db.execute(Aprendiz.__table__.delete())
        db.execute(Semillero.__table__.delete())
        db.execute(Grupo.__table__.delete())
        db.execute(grupo_integrantes.delete())
        db.execute(proyecto_equipo.delete())
        db.execute(semillero_investigadores.delete())
        # No borramos todos los usuarios para no perder el admin si existe, 
        # pero borramos los de prueba.
        db.query(User).filter(User.email != "admin@sena.edu.co").delete()
        db.commit()
    except Exception as e:
        print(f"⚠️ Error limpiando: {e}")
        db.rollback()

    print("👤 Creando Usuarios de Prueba (Investigadores y Expertos)...")
    # Admin (si no existe)
    admin = db.query(User).filter(User.email == "admin@sena.edu.co").first()
    if not admin:
        admin = User(
            email="admin@sena.edu.co",
            password_hash=get_password_hash("123456"),
            nombre="Administrador Sistema",
            rol="admin",
            sede="CGAO Vélez",
            regional="Santander"
        )
        db.add(admin)
        db.flush()

    # Investigadores Líderes
    inv1 = User(
        email="m.rodriguez@sena.edu.co",
        password_hash=get_password_hash("123456"),
        nombre="Dra. Marta Rodríguez",
        rol="investigador",
        rol_sennova="Investigador Senior",
        nivel_academico="Doctorado en Biotecnología",
        sede="CGAO Vélez",
        regional="Santander",
        lineas_investigacion=["Agroindustria", "Biotecnología", "Seguridad Alimentaria"]
    )
    inv2 = User(
        email="j.castro@sena.edu.co",
        password_hash=get_password_hash("123456"),
        nombre="Ing. Jorge Castro",
        rol="investigador",
        rol_sennova="Investigador Junior",
        nivel_academico="Maestría en TI",
        sede="CGAO Vélez",
        regional="Santander",
        lineas_investigacion=["Software", "IoT", "Inteligencia Artificial"]
    )
    inv3 = User(
        email="c.lopez@sena.edu.co",
        password_hash=get_password_hash("123456"),
        nombre="Mag. Clara López",
        rol="investigador",
        rol_sennova="Investigador Asociado",
        nivel_academico="Maestría en Desarrollo Rural",
        sede="CGAO Vélez",
        regional="Santander",
        lineas_investigacion=["Economía Naranja", "Turismo Sostenible"]
    )
    db.add_all([inv1, inv2, inv3])
    db.flush()

    print("🎓 Creando Banco de Aprendices (Fichas ADSO, Alimentos, Turismo)...")
    # Aprendices ADSO
    apr1 = User(
        email="jperez@soy.sena.edu.co",
        password_hash=get_password_hash("123456"),
        nombre="Juan David Pérez",
        rol="investigador",
        rol_sennova="Aprendiz Investigador",
        documento="1098123001",
        ficha="2670123",
        programa_formacion="Análisis y Desarrollo de Software (ADSO)",
        sede="CGAO Vélez"
    )
    apr2 = User(
        email="lmarcela@soy.sena.edu.co",
        password_hash=get_password_hash("123456"),
        nombre="Lina Marcela Duarte",
        rol="investigador",
        rol_sennova="Aprendiz Investigador",
        documento="1098123002",
        ficha="2670123",
        programa_formacion="Análisis y Desarrollo de Software (ADSO)",
        sede="CGAO Vélez"
    )
    # Aprendices Alimentos
    apr3 = User(
        email="csanchez@soy.sena.edu.co",
        password_hash=get_password_hash("123456"),
        nombre="Carlos Sánchez",
        rol="investigador",
        rol_sennova="Aprendiz Investigador",
        documento="1098123003",
        ficha="2560890",
        programa_formacion="Procesamiento de Alimentos",
        sede="CGAO Vélez"
    )
    # Aprendices Turismo
    apr4 = User(
        email="sruiz@soy.sena.edu.co",
        password_hash=get_password_hash("123456"),
        nombre="Sandra Ruiz",
        rol="investigador",
        rol_sennova="Aprendiz Investigador",
        documento="1098123004",
        ficha="2450781",
        programa_formacion="Guianza Turística",
        sede="CGAO Vélez"
    )
    db.add_all([apr1, apr2, apr3, apr4])
    db.flush()

    print("📂 Creando Estructuras (GIA-CGAO y Semilleros)...")
    grupo = Grupo(
        nombre="GIA-CGAO",
        nombre_completo="Grupo de Investigación en Agroindustria y Tecnología - CGAO",
        codigo_gruplac="COL0012345",
        clasificacion="B",
        owner_id=admin.id,
        lineas_investigacion=["Seguridad Alimentaria", "Desarrollo de Software Aplicado", "Turismo Rural"]
    )
    db.add(grupo)
    db.flush()

    sem1 = Semillero(
        nombre="SITEC",
        linea_investigacion="Innovación Tecnológica para el Agro y TI",
        grupo_id=grupo.id,
        owner_id=inv2.id,
        estado="activo"
    )
    sem2 = Semillero(
        nombre="ALIMENSA",
        linea_investigacion="Nuevos productos alimentarios y bioprocesos",
        grupo_id=grupo.id,
        owner_id=inv1.id,
        estado="activo"
    )
    sem3 = Semillero(
        nombre="TURIS-CGAO",
        linea_investigacion="Turismo sostenible y patrimonio",
        grupo_id=grupo.id,
        owner_id=inv3.id,
        estado="activo"
    )
    db.add_all([sem1, sem2, sem3])
    db.flush()

    # Vincular aprendices a semilleros
    db.add(Aprendiz(semillero_id=sem1.id, user_id=apr1.id, estado="Activo"))
    db.add(Aprendiz(semillero_id=sem1.id, user_id=apr2.id, estado="Activo"))
    db.add(Aprendiz(semillero_id=sem2.id, user_id=apr3.id, estado="Activo"))
    db.add(Aprendiz(semillero_id=sem3.id, user_id=apr4.id, estado="Activo"))

    print("📢 Creando Convocatorias Estratégicas...")
    conv1 = Convocatoria(
        numero_oe="CONV-2024-001",
        nombre="Convocatoria SENNOVA 2024 - Innovación Regional",
        año=2024,
        fecha_apertura=date.today() - timedelta(days=60),
        fecha_cierre=date.today() + timedelta(days=30),
        estado="abierta",
        owner_id=admin.id
    )
    conv2 = Convocatoria(
        numero_oe="CONV-2025-001",
        nombre="Fomento de la Investigación 2025 - Santander",
        año=2025,
        fecha_apertura=date.today() + timedelta(days=120),
        fecha_cierre=date.today() + timedelta(days=180),
        estado="abierta",
        owner_id=admin.id
    )
    db.add_all([conv1, conv2])
    db.flush()

    print("💡 Creando Banco de Retos (Realistas del Sector Productivo)...")
    reto1 = Reto(
        titulo="Optimización del proceso de secado en la hoja de bijao",
        descripcion="Los productores de bocadillo veleño requieren un método estandarizado para el secado de la hoja de bijao que garantice la inocuidad y mantenga la flexibilidad necesaria para el empaque manual, reduciendo pérdidas por ruptura.",
        sector_productivo="Agroindustria",
        empresa_solicitante="Asociación de Productores de Bocadillo de Vélez (Fedeveleño)",
        contacto_email="gerencia@bocadillovenez.org",
        prioridad="alta",
        estado="asignado",
        semillero_asignado_id=sem2.id,
        owner_id=admin.id
    )
    reto2 = Reto(
        titulo="Sistema de trazabilidad para Café de Origen Santander",
        descripcion="Implementar una solución tecnológica (Blockchain/QR) que permita al consumidor final conocer el origen exacto, la finca y el proceso de beneficio del café que está adquiriendo en ferias internacionales.",
        sector_productivo="Agrario / TI",
        empresa_solicitante="Cafeteros de la Hoya del Río Suárez",
        prioridad="media",
        estado="asignado",
        semillero_asignado_id=sem1.id,
        owner_id=admin.id
    )
    reto3 = Reto(
        titulo="Inventario digital del patrimonio arquitectónico de Vélez",
        descripcion="Se requiere una plataforma interactiva que catalogue las casas coloniales y monumentos de Vélez para fomentar rutas de turismo cultural.",
        sector_productivo="Cultura / Turismo",
        empresa_solicitante="Alcaldía Municipal de Vélez",
        prioridad="media",
        estado="abierto",
        owner_id=admin.id
    )
    db.add_all([reto1, reto2, reto3])
    db.flush()

    print("🚀 Creando Proyectos vinculados a Retos...")
    proy1 = Proyecto(
        codigo_sgps="SGPS-9823",
        nombre="Desarrollo de prototipo IoT para monitoreo de humedad en empaques de bocadillo",
        nombre_corto="IoT Bocadillo",
        estado="En ejecución",
        vigencia=12,
        presupuesto_total=45000000.0,
        tipologia="Innovación",
        linea_investigacion="Agroindustria / IoT",
        reto_origen_id=reto1.id,
        convocatoria_id=conv1.id,
        semillero_id=sem1.id,
        owner_id=inv2.id,
        objetivos_especificos=["Diseñar el nodo sensor IoT", "Desarrollar Gateway de comunicación", "Validar en planta piloto"]
    )
    proy2 = Proyecto(
        codigo_sgps="SGPS-10124",
        nombre="Estandarización de procesos para la extracción de pectina a partir de la cáscara de guayaba",
        nombre_corto="Pectina Guayaba",
        estado="Formulación",
        vigencia=10,
        presupuesto_total=38000000.0,
        tipologia="Investigación",
        linea_investigacion="Biotecnología Almentaria",
        reto_origen_id=reto1.id,
        convocatoria_id=conv1.id,
        semillero_id=sem2.id,
        owner_id=inv1.id,
        objetivos_especificos=["Caracterizar la materia prima", "Optimizar hidrólisis ácida", "Evaluar rendimiento"]
    )
    db.add_all([proy1, proy2])
    db.flush()

    # Agregar equipo a proyectos
    # Proyecto 1 (IoT)
    db.execute(proyecto_equipo.insert().values(proyecto_id=proy1.id, user_id=inv2.id, rol_en_proyecto="Investigador Principal", horas_dedicadas=40))
    db.execute(proyecto_equipo.insert().values(proyecto_id=proy1.id, user_id=apr1.id, rol_en_proyecto="Aprendiz Desarrollador Backend", horas_dedicadas=20))
    db.execute(proyecto_equipo.insert().values(proyecto_id=proy1.id, user_id=apr2.id, rol_en_proyecto="Aprendiz Desarrollador Frontend", horas_dedicadas=20))
    # Proyecto 2 (Pectina)
    db.execute(proyecto_equipo.insert().values(proyecto_id=proy2.id, user_id=inv1.id, rol_en_proyecto="Investigador Principal", horas_dedicadas=35))
    db.execute(proyecto_equipo.insert().values(proyecto_id=proy2.id, user_id=apr3.id, rol_en_proyecto="Aprendiz de Laboratorio", horas_dedicadas=20))

    print("📝 Creando Bitácoras y Productos con Firmas Digitales...")
    # Bitácora Proyecto 1
    db.add(BitacoraEntry(
        proyecto_id=proy1.id,
        user_id=inv2.id,
        titulo="Calibración de Sensores Humedad Suelo",
        contenido="Se realizaron pruebas con 10 sensores DHT22 en cámara climática. Se detectó una desviación del 3% en humedades superiores al 85%. Se ajustará el código de compensación térmica.",
        categoria="técnica",
        fecha=datetime.now(timezone.utc) - timedelta(days=5),
        is_firmado_investigador=True,
        fecha_firma_investigador=datetime.now(timezone.utc) - timedelta(days=4)
    ))
    db.add(BitacoraEntry(
        proyecto_id=proy1.id,
        user_id=apr1.id,
        titulo="Implementación de API Rest con FastAPI",
        contenido="Se definieron los esquemas de Pydantic para la recepción de telemetría. La base de datos PostgreSQL está lista para recibir ráfagas de datos cada 60 segundos.",
        categoria="técnica",
        fecha=datetime.now(timezone.utc) - timedelta(days=2),
        is_firmado_aprendiz=True,
        fecha_firma_aprendiz=datetime.now(timezone.utc) - timedelta(days=1)
    ))
    
    # Productos
    prod1 = Producto(
        tipo="software",
        nombre="SennovaMonitor - Core Backend",
        descripcion="Módulo central de procesamiento de señales IoT y persistencia de datos.",
        proyecto_id=proy1.id,
        owner_id=inv2.id,
        url="https://github.com/cgao/sennova-iot-core",
        is_verificado=True
    )
    prod2 = Producto(
        tipo="artículo técnico",
        nombre="Análisis de viabilidad del Bijao como empaque biodegradable",
        descripcion="Artículo científico sometido a la revista de investigación del SENA.",
        proyecto_id=proy2.id,
        owner_id=inv1.id,
        url="https://revistas.sena.edu.co/index.php/inf_tec/article/view/123",
        is_verificado=False
    )
    db.add_all([prod1, prod2])

    db.commit()
    print("✨ ¡Escenarios de prueba SENNOVA CGAO creados exitosamente!")

if __name__ == "__main__":
    seed_data()
