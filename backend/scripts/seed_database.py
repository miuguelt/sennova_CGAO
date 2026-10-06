#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SENNOVA CGAO — Script de Poblado Masivo de Base de Datos
=========================================================
Puebla la base de datos con usuarios de prueba y un mínimo de 20 datos
por cada tabla del sistema para pruebas de volumen, carga y visualización.

Diseñado para ejecutarse nativamente o dentro del contenedor de Docker Compose:
    docker compose exec sennova-backend python scripts/seed_database.py
    docker compose run --rm sennova-seed
"""

import os
import sys
import uuid
import random
import hashlib
from datetime import datetime, date, timedelta, timezone

# Asegurar que el directorio base del backend esté en sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.database import (
    SessionLocal,
    engine,
)
from app.services.database_startup import initialize_schema
from app.models import (
    User, Grupo, Semillero, Aprendiz, Convocatoria, Proyecto,
    Producto, Documento, Entregable, Notificacion, Actividad,
    Reto, AuditLog, Mensaje, MensajeAdjunto,
    grupo_integrantes, proyecto_equipo, semillero_investigadores
)
from app.auth import get_password_hash
from app.research_catalog import CANONICAL_GROUP_NAME

# ─────────────────────────────────────────────────────────────────────────────
# BANCOS DE DATOS REALISTAS (SENA SENNOVA CGAO — Santander)
# ─────────────────────────────────────────────────────────────────────────────

NOMBRES_COLOMBIANOS = [
    ("Carlos Eduardo", "Rodríguez Silva"),
    ("María Fernanda", "González Mora"),
    ("Jorge Andrés", "Castro Peña"),
    ("Marta Cecilia", "Rodríguez Parra"),
    ("Clara Inés", "López Mendoza"),
    ("Juan David", "Pérez Pinzón"),
    ("Lina Marcela", "Duarte Flórez"),
    ("Carlos Alberto", "Sánchez Rueda"),
    ("Sandra Milena", "Ruiz Ariza"),
    ("Diana Carolina", "Gómez Rincón"),
    ("Andrés Felipe", "Vargas Morales"),
    ("Paola Andrea", "Jiménez Rojas"),
    ("Diego Fernando", "Hernández Ortiz"),
    ("Valentina", "Torres Camacho"),
    ("Julián Camilo", "Navarro Suárez"),
    ("Daniela Alexandra", "Castillo Díaz"),
    ("Germán Darío", "Muñoz Guerrero"),
    ("Angie Natalia", "Álvarez Reyes"),
    ("Santiago", "Romero Serrano"),
    ("Laura Camila", "Patiño Velásquez"),
    ("Oscar Javier", "Maldonado Castro"),
    ("Yuly Tatiana", "Cely Barbosa"),
    ("Fabián Leonardo", "Rincón Chona"),
    ("Adriana Lucía", "Vega Forero"),
    ("Héctor Mauricio", "Peña Villamizar"),
    ("Gloria Amparo", "Niño Barajas"),
    ("Gustavo Adolfo", "Cárdenas Prieto"),
    ("Claudia Patricia", "Bautista Pinto"),
    ("Álvaro Enrique", "Solano Moreno"),
    ("Monica Viviana", "Reyes Carvajal"),
]

AREAS_CONOCIMIENTO = [
    "Agroindustria y Poscosecha",
    "Biotecnología Agroalimentaria",
    "Desarrollo de Software e Inteligencia Artificial",
    "Internet de las Cosas (IoT) y Automatización",
    "Turismo Sostenible y Patrimonio Cultural",
    "Economía Circular y Valorización de Residuos",
    "Energías Renovables y Sostenibilidad Ambiental",
    "Gestión de la Innovación y Vigilancia Tecnológica",
    "Transformación Digital del Sector Productivo",
    "Seguridad Alimentaria y Nutrición",
]

LINEAS_INVESTIGACION = [
    "Aprovechamiento integral de biomasa de guayaba",
    "Optimización térmica de pailas en trapiches paneleros",
    "Desarrollo de aplicaciones web progresivas para el campo",
    "Monitoreo microclimático de cultivos mediante LoRaWAN",
    "Rutas agroturísticas interactivas con geolocalización",
    "Extracción de pectina y antioxidantes de frutas nativas",
    "Trazabilidad de café especial mediante códigos QR dinámicos",
    "Automatización de despulpado y fermentación de cacao",
    "Modelado predictivo de cosechas mediante Machine Learning",
    "Inocuidad y vida útil en empaques biodegradables de bijao",
]

PROGRAMAS_SENA = [
    "Análisis y Desarrollo de Software (ADSO)",
    "Procesamiento de Alimentos",
    "Guianza Turística",
    "Gestión de Empresas Agropecuarias",
    "Mantenimiento Electromecánico Industrial",
    "Control y Calidad de Alimentos",
    "Producción Ganadera",
    "Sistemas Teleinformáticos",
    "Agroforestería Sostenible",
    "Gestión de Recursos Naturales",
]

EMPRESAS_SANTANDER = [
    "Federación de Productores de Bocadillo de Vélez (Fedeveleño)",
    "Comité Departamental de Cafeteros de Santander",
    "Asociación de Cacaocultores de la Hoya del Río Suárez",
    "Trapiche Panelero San Cayetano SAS",
    "Agroindustrias La Veleña Ltda.",
    "Cooperativa Multiactiva de Guayaberos de Barbosa",
    "Alcaldía Municipal de Vélez",
    "Lácteos El Recreo de Puente Nacional",
    "Asociación de Turismo Comunitario de Bolívar",
    "Frutas y Pulpario del Carare SAS",
    "Empresa de Servicios Públicos de Güepsa",
    "Industrias Alimentarias La Paz Santander",
    "Asociación de Pequeños Ganaderos de Suaita",
    "Cámara de Comercio de Bucaramanga - Seccional Vélez",
    "Red de Jóvenes Emprendedores Rurales de Chipatá",
    "Agropecuaria Los Arrayanes SAS",
    "Bioempaques de la Provincia de Vélez",
    "Comercializadora de Miel y Polen del Chicamocha",
    "Consorcio Vial Santander - Boyacá",
    "EcoHotel y Reserva Natural Serranía de los Yariguíes",
]


def seed_database(verbose: bool = True):
    """Puebla todas las tablas del sistema con datos consistentes y correlacionados."""
    default_pwd = os.getenv("INITIAL_ADMIN_PASSWORD") or os.getenv("DEV_SEED_PASSWORD")
    if not default_pwd:
        if verbose:
            print("❌ Define INITIAL_ADMIN_PASSWORD o DEV_SEED_PASSWORD en el entorno seguro antes de poblar la base de datos.")
        return False

    if verbose:
        print("\n" + "═" * 70)
        print("  🌱 SENNOVA CGAO — POBLADO MASIVO DE BASE DE DATOS")
        print("     Objetivo: Mínimo 20 registros por tabla + Usuarios de prueba")
        print("═" * 70)

    # 1. Asegurar tablas y esquema actualizado
    try:
        initialize_schema(engine)
    except Exception as e:
        if verbose:
            print(f"  ℹ️ initialize_schema info: {e}")

    db = SessionLocal()

    try:
        # Contraseña única para todos los usuarios de prueba
        pwd_hash = get_password_hash(default_pwd)

        if verbose:
            print("\n🧹 1. Limpiando datos previos en orden de dependencias...")

        # Limpiar registros dependientes para asegurar un dataset homogéneo y sin huérfanos
        try:
            db.query(MensajeAdjunto).delete()
            db.query(Mensaje).delete()
            db.query(AuditLog).delete()
            db.query(Actividad).delete()
            db.query(Notificacion).delete()
            db.query(Entregable).delete()
            db.query(Documento).delete()
            db.query(Producto).delete()
            db.execute(proyecto_equipo.delete())
            db.query(Proyecto).delete()
            db.query(Reto).delete()
            db.query(Convocatoria).delete()
            db.query(Aprendiz).delete()
            db.execute(semillero_investigadores.delete())
            db.query(Semillero).delete()
            db.execute(grupo_integrantes.delete())
            db.query(Grupo).delete()
            # Limpiar usuarios excepto si ya existen cuentas críticas que se deseen preservar
            db.query(User).delete()
            db.commit()
            if verbose:
                print("   ✅ Base de datos limpia y lista para semillado.")
        except Exception as err:
            db.rollback()
            if verbose:
                print(f"   ⚠️ Advertencia durante la limpieza: {err}. Continuando...")

        # ─────────────────────────────────────────────────────────────────────
        # TABLA 1: USERS (>= 30 registros con perfiles de prueba y roles claros)
        # ─────────────────────────────────────────────────────────────────────
        if verbose:
            print("\n👥 2. Generando Usuarios (Mínimo 20: Admin, Investigadores, Aprendices)...")

        usuarios_creados = []

        # Usuarios de prueba oficiales (DevLoginPanel.jsx y compatibilidad)
        test_users_specs = [
            {
                "email": "admin@sena.edu.co",
                "nombre": "Admin Sistema",
                "rol": "admin",
                "rol_sennova": "Líder SENNOVA",
                "nivel_academico": "Maestría en Gestión Tecnológica",
                "documento": "1098000001",
                "ficha": None,
                "programa_formacion": None,
                "sede": "CGAO Vélez",
                "regional": "Santander",
                "estado_cv_lac": "Actualizado",
                "lineas_investigacion": ["Gestión de la Innovación", "Vigilancia Tecnológica"]
            },
            {
                "email": "m.rodriguez@sena.edu.co",
                "nombre": "Dra. Marta Rodríguez",
                "rol": "investigador",
                "rol_sennova": "Investigador Senior",
                "nivel_academico": "Doctorado en Biotecnología",
                "documento": "1098000002",
                "ficha": None,
                "programa_formacion": None,
                "sede": "CGAO Vélez",
                "regional": "Santander",
                "estado_cv_lac": "Actualizado",
                "cv_lac_url": "https://scienti.minciencias.gov.co/cvlac/visualizador/generarCurriculoCv.do?cod_rh=0001",
                "lineas_investigacion": ["Agroindustria y Poscosecha", "Biotecnología Agroalimentaria"]
            },
            {
                "email": "c.lopez@sena.edu.co",
                "nombre": "Mag. Clara López",
                "rol": "investigador",
                "rol_sennova": "Instructor Investigador",
                "nivel_academico": "Maestría en Desarrollo Rural",
                "documento": "1098000003",
                "ficha": None,
                "programa_formacion": None,
                "sede": "CGAO Vélez",
                "regional": "Santander",
                "estado_cv_lac": "Sin CVLAC",
                "lineas_investigacion": ["Turismo Sostenible y Patrimonio Cultural", "Economía Circular"]
            },
            {
                "email": "jperez@soy.sena.edu.co",
                "nombre": "Juan David Pérez",
                "rol": "aprendiz",
                "rol_sennova": "Aprendiz Investigador",
                "documento": "1098123001",
                "ficha": "2670123",
                "programa_formacion": "Análisis y Desarrollo de Software (ADSO)",
                "sede": "CGAO Vélez",
                "regional": "Santander",
                "estado_cv_lac": "Sin CVLAC",
                "lineas_investigacion": ["Desarrollo de Software e Inteligencia Artificial"]
            },
            {
                "email": "admin@sennova.dev.co",
                "nombre": "Admin Sennova",
                "rol": "admin",
                "rol_sennova": "Coordinador SENNOVA Regional",
                "nivel_academico": "Especialización en Proyectos",
                "documento": "admin01",
                "ficha": None,
                "programa_formacion": None,
                "sede": "CGAO Vélez",
                "regional": "Santander",
                "estado_cv_lac": "Actualizado",
                "lineas_investigacion": ["Gestión de Proyectos", "Políticas de CTI"]
            },
            {
                "email": "investigador@sennova.dev.co",
                "nombre": "Investigador Dev",
                "rol": "investigador",
                "rol_sennova": "Investigador Asociado",
                "nivel_academico": "Maestría en TI",
                "documento": "inv01",
                "ficha": None,
                "programa_formacion": None,
                "sede": "CGAO Vélez",
                "regional": "Santander",
                "estado_cv_lac": "Actualizado",
                "lineas_investigacion": ["Internet de las Cosas (IoT)", "Robótica"]
            },
            {
                "email": "aprendiz@sennova.dev.co",
                "nombre": "Aprendiz Dev",
                "rol": "aprendiz",
                "rol_sennova": "Aprendiz Investigador",
                "documento": "apr01",
                "ficha": "2670124",
                "programa_formacion": "Análisis y Desarrollo de Software (ADSO)",
                "sede": "CGAO Vélez",
                "regional": "Santander",
                "estado_cv_lac": "Sin CVLAC",
                "lineas_investigacion": ["Desarrollo Web", "Frontend"]
            }
        ]

        # Insertar los usuarios de prueba base
        for spec in test_users_specs:
            u = User(
                email=spec["email"],
                password_hash=pwd_hash,
                nombre=spec["nombre"],
                rol=spec["rol"],
                rol_sennova=spec.get("rol_sennova", "Investigador"),
                nivel_academico=spec.get("nivel_academico", "Técnico/Tecnólogo" if spec["rol"] == "aprendiz" else "Profesional"),
                horas_mensuales=random.choice([40, 80, 120, 160]),
                meses_vinculacion=random.randint(6, 12),
                documento=spec.get("documento"),
                celular=f"31{random.randint(0, 9)}{random.randint(1000000, 9999999)}",
                ficha=spec.get("ficha"),
                programa_formacion=spec.get("programa_formacion"),
                sede=spec.get("sede", "CGAO Vélez"),
                regional=spec.get("regional", "Santander"),
                cv_lac_url=spec.get("cv_lac_url"),
                estado_cv_lac=spec.get("estado_cv_lac", "Sin CVLAC"),
                lineas_investigacion=spec.get("lineas_investigacion", ["Innovación"]),
                is_active=True
            )
            db.add(u)
            usuarios_creados.append(u)


        # Generar usuarios adicionales hasta superar los 30 usuarios
        roles_distribucion = ["investigador", "investigador", "aprendiz", "investigador", "aprendiz"]
        for i in range(len(test_users_specs), 32):
            primer_nombre, apellidos = NOMBRES_COLOMBIANOS[i % len(NOMBRES_COLOMBIANOS)]
            rol = roles_distribucion[i % len(roles_distribucion)]
            doc = f"1098{i:06d}"
            username = f"{primer_nombre.lower().replace(' ', '.')}.{apellidos.split()[0].lower()}{i}"
            email_domain = "soy.sena.edu.co" if rol == "aprendiz" else "sena.edu.co"
            email = f"{username}@{email_domain}"

            prog = random.choice(PROGRAMAS_SENA) if rol == "aprendiz" else None
            ficha = str(random.randint(2500000, 2900000)) if rol == "aprendiz" else None

            u = User(
                email=email,
                password_hash=pwd_hash,
                nombre=f"{primer_nombre} {apellidos}",
                rol=rol,
                rol_sennova="Aprendiz Semillero" if rol == "aprendiz" else random.choice([
                    "Instructor Investigador", "Investigador Junior", "Gestor SENNOVA", "Dinamizador Tecnoparque"
                ]),
                nivel_academico="Técnico/Tecnólogo" if rol == "aprendiz" else random.choice([
                    "Profesional Universitario", "Especialización", "Maestría", "Doctorado"
                ]),
                horas_mensuales=random.choice([20, 40, 80, 160]),
                meses_vinculacion=random.randint(4, 11),
                documento=doc,
                celular=f"31{random.randint(0, 9)}{random.randint(1000000, 9999999)}",
                ficha=ficha,
                programa_formacion=prog,
                sede="CGAO Vélez",
                regional="Santander",
                cv_lac_url=f"https://scienti.minciencias.gov.co/cvlac/visualizador/?id={doc}" if rol != "aprendiz" else None,
                estado_cv_lac=random.choice(["Actualizado", "Desactualizado", "En proceso", "Sin CVLAC"]),
                lineas_investigacion=[random.choice(AREAS_CONOCIMIENTO), random.choice(LINEAS_INVESTIGACION)],
                is_active=True
            )
            db.add(u)
            usuarios_creados.append(u)

        db.flush()
        admin_user = next(u for u in usuarios_creados if u.rol == "admin")
        investigadores = [u for u in usuarios_creados if u.rol == "investigador"]
        aprendices_usuarios = [u for u in usuarios_creados if u.rol == "aprendiz"]

        if verbose:
            print(f"   ✅ {len(usuarios_creados)} usuarios creados exitosamente.")

        # ─────────────────────────────────────────────────────────────────────
        # TABLA 2: GRUPO INSTITUCIONAL ÚNICO
        # ─────────────────────────────────────────────────────────────────────
        if verbose:
            print("\n🔬 3. Generando el grupo institucional de investigadores...")

        grupo = Grupo(
            nombre=CANONICAL_GROUP_NAME,
            nombre_completo="Grupo institucional de investigadores del CGAO",
            lineas_investigacion=AREAS_CONOCIMIENTO,
            owner_id=admin_user.id,
            is_publico=True,
            estado="activo",
        )
        db.add(grupo)
        grupos_creados = [grupo]

        db.flush()
        if verbose:
            print(f"   ✅ Grupo creado: {CANONICAL_GROUP_NAME}.")

        # ─────────────────────────────────────────────────────────────────────
        # TABLA 3: GRUPO_INTEGRANTES (>= 25 registros en tabla pivote)
        # ─────────────────────────────────────────────────────────────────────
        if verbose:
            print("\n🔗 4. Vinculando investigadores al grupo institucional...")

        integraciones_count = 0
        for researcher in investigadores:
            db.execute(grupo_integrantes.insert().values(
                grupo_id=grupo.id,
                user_id=researcher.id,
                rol_en_grupo="Investigador",
                fecha_vinculacion=date(2023, random.randint(1, 12), random.randint(1, 28)),
            ))
            integraciones_count += 1

        db.flush()
        if verbose:
            print(f"   ✅ {integraciones_count} vínculos grupo-integrante registrados.")

        # ─────────────────────────────────────────────────────────────────────
        # TABLA 4: SEMILLEROS (20 Semilleros con identidades específicas)
        # ─────────────────────────────────────────────────────────────────────
        if verbose:
            print("\n🌿 5. Generando Semilleros de Investigación (Mínimo 20)...")

        semilleros_creados = []
        nombres_semilleros = [
            ("SITEC", "Semillero de Innovación Tecnológica para el Agro y TI"),
            ("ALIMENSA", "Semillero de Nuevos Productos Alimentarios y Bioprocesos"),
            ("TURIS-CGAO", "Semillero de Turismo Sostenible, Cultura y Patrimonio"),
            ("SIAMB", "Semillero de Investigaciones Ambientales y Cambio Climático"),
            ("SEMIPROVEL", "Semillero de Producción Limpia de Bocadillo y Guayaba"),
            ("SIACF", "Semillero de Automatización, Control y Fuentes Renovables"),
            ("AGRO-DATA", "Semillero de Analítica de Datos y Sensorica Rural"),
            ("BIO-VÉLEZ", "Semillero de Biocompuestos y Aprovechamiento Vegetal"),
            ("DEV-INNOVA", "Semillero de Desarrollo Web, Móvil y Nube"),
            ("PANEL-TECH", "Semillero de Eficiencia y Calidad en Trapiches Paneleros"),
            ("CAFÉ-ORIGEN", "Semillero de Calidad y Procesamiento Sensorial de Café"),
            ("CACAO-INNOVA", "Semillero de Trazabilidad y Postcosecha del Cacao"),
            ("LOGIS-RURAL", "Semillero de Cadena de Suministro y Logística Agropecuaria"),
            ("DRON-AGRO", "Semillero de Teledetección y Drones en Agricultura"),
            ("HIDRO-GEST", "Semillero de Gobernanza y Tratamiento de Aguas"),
            ("PACKAGING", "Semillero de Empaques Flexibles y Biodegradables"),
            ("ROBOT-SENA", "Semillero de Prototipado Rápido y Robótica Educativa"),
            ("SALUD-AGRO", "Semillero de Salud Ocupacional en Labores Agrícolas"),
            ("MKT-TERRITORIAL", "Semillero de Mercadeo y Comercialización de Productos Locales"),
            ("INNOVASOC", "Semillero de Gestión Comunitaria y Proyectos Sociales"),
            ("ENERGÍAS-LIMPIAS", "Semillero de Generación Fotovoltaica Distribuida"),
        ]

        for i, (sigla, desc) in enumerate(nombres_semilleros):
            tutor = random.choice(investigadores)
            sem = Semillero(
                nombre=f"{sigla} - {desc[:35]}",
                sigla=sigla,
                descripcion=desc,
                lider_nombre=tutor.nombre,
                linea_investigacion=random.choice(LINEAS_INVESTIGACION),
                plan_accion=f"Plan de acción para la formación de semilleristas en {desc.lower()}.",
                horas_dedicadas=random.choice([4, 6, 8, 10]),
                estado="activo" if i < 18 else "en_convocatoria",
                grupo_id=grupo.id,
                owner_id=tutor.id,
                created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(30, 365))
            )
            db.add(sem)
            semilleros_creados.append(sem)

        db.flush()
        if verbose:
            print(f"   ✅ {len(semilleros_creados)} semilleros de investigación creados.")

        # ─────────────────────────────────────────────────────────────────────
        # TABLA 5: SEMILLERO_INVESTIGADORES (>= 25 vinculaciones tutor/tutorado)
        # ─────────────────────────────────────────────────────────────────────
        if verbose:
            print("\n🧑‍🏫 6. Vinculando Investigadores a Semilleros (Mínimo 20)...")

        sem_inv_count = 0
        used_sem_inv = set()
        for sem in semilleros_creados:
            asignados = random.sample(investigadores, k=random.randint(1, 2))
            for inv in asignados:
                par = (str(sem.id), str(inv.id))
                if par not in used_sem_inv:
                    used_sem_inv.add(par)
                    db.execute(semillero_investigadores.insert().values(
                        semillero_id=sem.id,
                        user_id=inv.id,
                        rol_en_semillero="Tutor Principal" if sem.owner_id == inv.id else "Coinvestigador",
                        fecha_vinculacion=date(2023, random.randint(1, 12), random.randint(1, 28))
                    ))
                    sem_inv_count += 1

        db.flush()
        if verbose:
            print(f"   ✅ {sem_inv_count} vinculaciones investigador-semillero registradas.")

        # ─────────────────────────────────────────────────────────────────────
        # TABLA 6: APRENDICES (>= 25 registros en tabla aprendices)
        # ─────────────────────────────────────────────────────────────────────
        if verbose:
            print("\n🎓 7. Registrando Aprendices en Semilleros (Mínimo 20)...")

        aprendices_registrados = []
        for i, apr_user in enumerate(aprendices_usuarios):
            sem_destino = semilleros_creados[i % len(semilleros_creados)]
            apr = Aprendiz(
                semillero_id=sem_destino.id,
                user_id=apr_user.id,
                nombre=apr_user.nombre,
                ficha=apr_user.ficha or str(random.randint(2500000, 2800000)),
                programa=apr_user.programa_formacion or random.choice(PROGRAMAS_SENA),
                estado="activo" if i % 6 != 0 else "egresado",
                fecha_ingreso=date(2023 + (i % 2), random.randint(1, 6), random.randint(1, 28)),
                fecha_egreso=date(2025, 12, 15) if i % 6 == 0 else None
            )
            db.add(apr)
            aprendices_registrados.append(apr)

        # Si aún no llegamos a 22 aprendices, generamos aprendices adicionales
        extra_count = max(0, 22 - len(aprendices_registrados))
        for j in range(extra_count):
            idx = (len(aprendices_registrados) + j)
            nom, ape = NOMBRES_COLOMBIANOS[idx % len(NOMBRES_COLOMBIANOS)]
            sem_destino = semilleros_creados[idx % len(semilleros_creados)]
            apr = Aprendiz(
                semillero_id=sem_destino.id,
                user_id=None,
                nombre=f"{nom} {ape}",
                ficha=str(random.randint(2600000, 2850000)),
                programa=random.choice(PROGRAMAS_SENA),
                estado="activo",
                fecha_ingreso=date(2024, 2, 10),
                fecha_egreso=None
            )
            db.add(apr)
            aprendices_registrados.append(apr)

        db.flush()
        if verbose:
            print(f"   ✅ {len(aprendices_registrados)} aprendices vinculados a semilleros.")

        # ─────────────────────────────────────────────────────────────────────
        # TABLA 7: CONVOCATORIAS (20 Convocatorias históricas y actuales)
        # ─────────────────────────────────────────────────────────────────────
        if verbose:
            print("\n📢 8. Generando Convocatorias (Mínimo 20)...")

        convocatorias_creadas = []
        for i in range(20):
            year = 2022 + (i // 4)
            num_oe = f"OE-{year}-{100 + i}"
            estados = ["abierta", "cerrada", "en_evaluacion", "resultados_publicados"]
            estado = estados[i % len(estados)]
            fuentes = ["SENNOVA", "Minciencias", "Capacidad_Instalada", "Otra"]

            fecha_ini = date(year, random.randint(1, 5), random.randint(1, 20))
            fecha_fin = fecha_ini + timedelta(days=random.randint(60, 120))

            conv = Convocatoria(
                numero_oe=num_oe,
                nombre=f"Convocatoria Nacional {random.choice(fuentes)} {year} — Modalidad {chr(65 + (i % 4))}",
                año=year,
                fecha_apertura=fecha_ini,
                fecha_cierre=fecha_fin,
                estado=estado,
                fuente=random.choice(fuentes),
                descripcion=f"Convocatoria oficial para financiar proyectos de I+D+i en centros de formación del SENA vigencia {year}.",
                owner_id=admin_user.id,
                created_at=datetime.combine(fecha_ini - timedelta(days=15), datetime.min.time(), tzinfo=timezone.utc)
            )
            db.add(conv)
            convocatorias_creadas.append(conv)

        db.flush()
        if verbose:
            print(f"   ✅ {len(convocatorias_creadas)} convocatorias registradas.")

        # ─────────────────────────────────────────────────────────────────────
        # TABLA 8: RETOS PRODUCTIVOS (20 Retos reales de la región)
        # ─────────────────────────────────────────────────────────────────────
        if verbose:
            print("\n💡 9. Generando Retos del Sector Productivo (Mínimo 20)...")

        retos_creados = []
        retos_titulos = [
            ("Optimización del proceso de secado en la hoja de bijao para empaque de bocadillo", "Agroindustria"),
            ("Sistema de trazabilidad digital para Café de Origen Santander con QR dinámico", "Agrario / TIC"),
            ("Catalogación interactiva y georreferenciación del patrimonio colonial de Vélez", "Turismo / Cultura"),
            ("Diseño de paila panelera eco-eficiente con menor consumo de bagazo y leña", "Agroindustria"),
            ("Aprovechamiento de la cáscara y semillas de guayaba para obtención de pectina cítrica", "Biotecnología"),
            ("Dispositivo de pesaje y control lechero automatizado para pequeños ganaderos", "Ganadería / IoT"),
            ("Monitoreo microclimático de humedad relativa en bodegas de maduración de queso", "Alimentos / IoT"),
            ("Desarrollo de bioplástico compostable a partir de almidón de yuca amarga regional", "Materiales"),
            ("Plataforma e-commerce comunitaria para artesanos de palma jipijapa de Bolívar", "Comercio / TIC"),
            ("Control biológico de la mosca de la fruta (Anastrepha spp.) en cultivos de guayaba", "Agroecología"),
            ("Sistema de alerta temprana para desbordamiento del Río Suárez con sensores LoRa", "Gestión del Riesgo"),
            ("Automatización de la dosificación de pulpa en la elaboración de arequipe veleño", "Agroindustria"),
            ("Rediseño ergonómico de herramientas de corte y recolección de caña panelera", "Salud Ocupacional"),
            ("Detección prematura de la roya del café mediante visión artificial en smartphones", "Agrario / IA"),
            ("Biofertilizante líquido a base de lixiviados de pulpa de café y estiércol bovino", "Biotecnología"),
            ("Ruta turística de realidad aumentada para templos históricos de la provincia", "Turismo"),
            ("Medición en tiempo real del grado Brix en jugos de caña antes del batido", "Agroindustria"),
            ("Tratamiento de aguas mieles residuales del beneficio de café mediante biofiltros", "Ambiental"),
            ("Software para gestión de inventarios y trazabilidad sanitaria en expendios de carne", "TIC"),
            ("Harina de bagazo de guayaba con alto contenido de fibra para panificación", "Alimentos"),
            ("Sistema solar autónomo para electrificación de cercas y bombeo ganadero", "Energías"),
        ]

        for i, (titulo, sector) in enumerate(retos_titulos):
            empresa = EMPRESAS_SANTANDER[i % len(EMPRESAS_SANTANDER)]
            sem_asignado = semilleros_creados[i % len(semilleros_creados)] if i % 2 == 0 else None
            estados = ["abierto", "en_estudio", "asignado", "resuelto"]
            estado = "asignado" if sem_asignado else estados[i % len(estados)]

            reto = Reto(
                titulo=titulo,
                descripcion=f"La empresa {empresa} solicita apoyo técnico para resolver el problema: {titulo}. Se busca articular con aprendices SENA.",
                sector_productivo=sector,
                empresa_solicitante=empresa,
                contacto_email=f"contacto@{empresa.split()[0].lower().replace(',', '').replace('.', '')}.org.co",
                prioridad=random.choice(["alta", "media", "baja", "urgente"]),
                estado=estado,
                semillero_asignado_id=sem_asignado.id if sem_asignado else None,
                owner_id=admin_user.id,
                created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(15, 200))
            )
            db.add(reto)
            retos_creados.append(reto)

        db.flush()
        if verbose:
            print(f"   ✅ {len(retos_creados)} retos productivos registrados.")

        # ─────────────────────────────────────────────────────────────────────
        # TABLA 9: PROYECTOS (25 Proyectos de Investigación y Desarrollo)
        # ─────────────────────────────────────────────────────────────────────
        if verbose:
            print("\n📁 10. Generando Proyectos SENNOVA (Mínimo 20)...")

        proyectos_creados = []
        estados_proy = ["Aprobado", "En ejecución", "Finalizado"]
        tipologias = ["Investigación Aplicada", "Desarrollo Tecnológico", "Innovación", "Modernización"]

        proyectos_data = [
            ("Prototipo IoT para monitoreo y control de humedad en empaque de bocadillo", "IoT Bocadillo", 48000000),
            ("Estandarización del proceso de extracción de pectina de la corteza de guayaba", "Pectina Guayaba", 39000000),
            ("Trazabilidad con blockchain en café especial de la Hoya del Río Suárez", "Blockchain Café", 62000000),
            ("Plataforma web de turismo experiencial y geolocalización en la Provincia de Vélez", "GeoTurismo Vélez", 31000000),
            ("Diseño de cámara de secado solar híbrida para hierbas aromáticas y bijao", "Secador Solar", 45000000),
            ("Implementación de un modelo de visión artificial para clasificación de frutos", "Visión Frutas", 54000000),
            ("Biofiltro a base de cascarilla de arroz y carbón activado para aguas residuales", "Biofiltro Aguas", 28000000),
            ("Paila panelera con flujo contracorriente y recuperación de calor de chimenea", "Paila Eficiente", 75000000),
            ("Formulación de bioempaque flexible biodegradable a partir de almidones locales", "Bioempaque Almidón", 52000000),
            ("App móvil offline-first para gestión técnica de fincas ganaderas de ladera", "App Ganadera", 36000000),
            ("Sistema de fermentación controlada de cacao con adquisición de pH y temperatura", "Cacao Control", 44000000),
            ("Desarrollo de snack deshidratado funcional a partir de mora y guayaba regional", "Snack Funcional", 33000000),
            ("Red de sensores inalámbricos LoRaWAN para alerta temprana de heladas y sequía", "LoRaWAN Agro", 58000000),
            ("Evaluación de cepas de levaduras nativas para optimización de panela granulada", "Levaduras Panela", 41000000),
            ("E-commerce colaborativo y pasarela de pagos para artesanos de Vélez y Barbosa", "Artesanos Online", 27000000),
            ("Optimización del balance calórico en trapiches paneleros de tracción mecánica", "Eficiencia Trapiche", 68000000),
            ("Dispositivo portátil para análisis espectral de madurez en guayaba regional", "Espectrómetro Guayaba", 65000000),
            ("Automatización de proceso de hilado y empacado al vacío para lácteos veleños", "Lácteos Hilado", 49000000),
            ("Generación de biogás a partir del estiércol bovino y residuos de cocina SENA", "Biogás CGAO", 38000000),
            ("Inventario digital y modelado 3D del patrimonio arquitectónico de Vélez", "Patrimonio 3D", 35000000),
            ("Estudio de vida útil y textura en conservas de arequipe con adición de fibra", "Vida Útil Arequipe", 29000000),
            ("Sistema experto para diagnóstico de plagas en cítricos mediante deep learning", "IA Plagas Cítricos", 53000000),
            ("Monitoreo de la huella de carbono en la producción panelera del municipio de Güepsa", "Huella Carbono Güepsa", 42000000),
            ("Robot móvil teleoperado para inspección de ductos y tuberías de acueducto rural", "Robot Acueducto", 47000000),
            ("Laboratorio virtual de microbiología de alimentos en realidad virtual", "Lab Virtual Alimentos", 59000000),
        ]

        for i, (nombre_largo, nombre_corto, presupuesto) in enumerate(proyectos_data):
            investigador_lider = investigadores[i % len(investigadores)]
            convocatoria_asociada = convocatorias_creadas[i % len(convocatorias_creadas)]
            semillero_asociado = semilleros_creados[i % len(semilleros_creados)]
            grupo_asociado = grupo
            reto_asociado = retos_creados[i % len(retos_creados)] if i < len(retos_creados) else None

            year_start = 2023 + (i % 3)
            proy = Proyecto(
                codigo_sgps=f"SGPS-{8000 + i * 87}",
                nombre=nombre_largo,
                nombre_corto=nombre_corto,
                estado=estados_proy[i % len(estados_proy)],
                vigencia=random.choice([10, 12, 18, 24]),
                presupuesto_total=float(presupuesto),
                año=year_start,
                año_fin=year_start + 1,
                continua_siguiente_año=True if i % 3 == 0 else False,
                tipologia=tipologias[i % len(tipologias)],
                linea_investigacion=semillero_asociado.linea_investigacion,
                red_conocimiento=random.choice(AREAS_CONOCIMIENTO),
                descripcion=f"Proyecto SENNOVA que aborda: {nombre_largo}. Ejecutado en el CGAO Vélez.",
                objetivo_general=f"Desarrollar, validar y transferir la solución para: {nombre_largo}.",
                objetivos_especificos=[
                    "Diagnosticar los parámetros de operación y condiciones base.",
                    "Diseñar la arquitectura técnica o formulación experimental.",
                    "Validar el prototipo en entorno relevante con beneficiarios.",
                    "Transferir los resultados a los programas de formación del SENA."
                ],
                presupuesto_detallado={
                    "personal": presupuesto * 0.45,
                    "materiales": presupuesto * 0.25,
                    "equipos": presupuesto * 0.20,
                    "servicios_tecnicos": presupuesto * 0.10
                },
                linea_programatica=str(random.choice([65, 66, 68, 82])),
                reto_origen_id=reto_asociado.id if reto_asociado else None,
                semillero_id=semillero_asociado.id,
                grupo_id=grupo_asociado.id,
                convocatoria_id=convocatoria_asociada.id,
                owner_id=investigador_lider.id,
                is_publico=True if i % 4 != 0 else False,
                created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(60, 400))
            )
            db.add(proy)
            proyectos_creados.append(proy)

        db.flush()
        if verbose:
            print(f"   ✅ {len(proyectos_creados)} proyectos creados.")

        # ─────────────────────────────────────────────────────────────────────
        # TABLA 10: PROYECTO_EQUIPO (>= 25 asignaciones de equipo)
        # ─────────────────────────────────────────────────────────────────────
        if verbose:
            print("\n🤝 11. Asignando Miembros a Proyectos (Mínimo 20)...")

        equipo_count = 0
        used_proy_user = set()
        roles_equipo = ["Investigador Principal", "Coinvestigador", "Desarrollador Backend", "Desarrollador Frontend", "Aprendiz Auxiliar", "Asesor Metodológico"]

        for proy in proyectos_creados:
            # Asignar al dueño como Investigador Principal
            p_owner = (str(proy.id), str(proy.owner_id))
            if p_owner not in used_proy_user:
                used_proy_user.add(p_owner)
                db.execute(proyecto_equipo.insert().values(
                    proyecto_id=proy.id,
                    user_id=proy.owner_id,
                    rol_en_proyecto="Investigador Principal",
                    horas_dedicadas=random.choice([20, 30, 40])
                ))
                equipo_count += 1

            # Asignar 1 o 2 aprendices o co-investigadores
            team_candidates = [
                user for user in usuarios_creados
                if user.rol in {"investigador", "aprendiz"}
            ]
            co_miembros = random.sample(team_candidates, k=min(2, len(team_candidates)))
            for cm in co_miembros:
                par = (str(proy.id), str(cm.id))
                if par not in used_proy_user:
                    used_proy_user.add(par)
                    db.execute(proyecto_equipo.insert().values(
                        proyecto_id=proy.id,
                        user_id=cm.id,
                        rol_en_proyecto="Aprendiz Investigador" if cm.rol == "aprendiz" else random.choice(roles_equipo[1:]),
                        horas_dedicadas=random.choice([10, 15, 20])
                    ))
                    equipo_count += 1

        db.flush()
        if verbose:
            print(f"   ✅ {equipo_count} asignaciones de equipo registradas.")

        # ─────────────────────────────────────────────────────────────────────
        # TABLA 11: PRODUCTOS MINCIENCIAS (>= 25 productos de I+D+i)
        # ─────────────────────────────────────────────────────────────────────
        if verbose:
            print("\n📦 12. Generando Productos Minciencias (Mínimo 20)...")

        productos_creados = []
        tipos_productos = [
            ("A1", "A", "Artículo de investigación A1 en revista indexada"),
            ("B1", "B", "Software con registro de derechos de autor (DNDA)"),
            ("C1", "C", "Prototipo industrial o tecnológico funcional"),
            ("D1", "D", "Evento científico de difusión o ponencia internacional"),
            ("B2", "B", "Diseño industrial registrado"),
            ("C2", "C", "Nota de aplicación técnica y manual de buenas prácticas"),
            ("B3", "B", "Capítulo de libro resultado de investigación"),
            ("A2", "A", "Patente de invención o modelo de utilidad"),
        ]

        for i in range(25):
            codigo_tipo, cat, desc_base = tipos_productos[i % len(tipos_productos)]
            proy_asociado = proyectos_creados[i % len(proyectos_creados)]
            investigador_autor = proy_asociado.owner

            prod = Producto(
                tipo=codigo_tipo,
                categoria=cat,
                nombre=f"Producto: {desc_base} — {proy_asociado.nombre_corto}",
                descripcion=f"{desc_base} derivado del proyecto {proy_asociado.codigo_sgps}. Cumple criterios Minciencias modelo 2024.",
                fecha_publicacion=date(2024, random.randint(1, 12), random.randint(1, 28)),
                doi=f"10.15332/sennova.{2024}.{1000 + i}" if cat in ("A", "B") else None,
                url=f"https://repositorio.sena.edu.co/handle/123456789/{5000 + i}",
                año_reporte=2024,
                requisitos_cumplidos={"certificacion_sena": True, "verificacion_par": True, "impacto_social": True},
                is_verificado=True if i % 3 != 0 else False,
                verificado_por=admin_user.id if i % 3 != 0 else None,
                fecha_verificacion=datetime.now(timezone.utc) if i % 3 != 0 else None,
                proyecto_id=proy_asociado.id,
                owner_id=investigador_autor.id,
                created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(10, 180))
            )
            db.add(prod)
            productos_creados.append(prod)

        db.flush()
        if verbose:
            print(f"   ✅ {len(productos_creados)} productos de investigación generados.")

        # ─────────────────────────────────────────────────────────────────────
        # TABLA 12: ENTREGABLES (>= 25 entregables cronológicos)
        # ─────────────────────────────────────────────────────────────────────
        if verbose:
            print("\n📅 13. Generando Entregables de Proyectos (Mínimo 20)...")

        entregables_creados = []
        fases = ["Fase I", "Fase II", "Fase III", "Final"]
        estados_entregable = ["aprobado", "enviado", "en_desarrollo", "pendiente", "ajustes_requeridos"]

        for i in range(25):
            proy = proyectos_creados[i % len(proyectos_creados)]
            prod = productos_creados[i % len(productos_creados)] if i % 2 == 0 else None
            fase = fases[i % len(fases)]
            estado = estados_entregable[i % len(estados_entregable)]

            fecha_ent = date(2025, (i % 12) + 1, random.randint(5, 25))
            ent = Entregable(
                fase=fase,
                titulo=f"Informe de Avance y Entregable {fase} — {proy.nombre_corto}",
                descripcion=f"Evidencia técnica y documental correspondiente al cumplimiento de los hitos de {fase}.",
                tipo="informe" if prod is None else "producto",
                fecha_entrega=fecha_ent,
                fecha_recordatorio_15d=fecha_ent - timedelta(days=15),
                fecha_recordatorio_3d=fecha_ent - timedelta(days=3),
                estado=estado,
                fecha_envio=fecha_ent - timedelta(days=2) if estado in ("enviado", "aprobado") else None,
                fecha_aprobacion=fecha_ent if estado == "aprobado" else None,
                observaciones="Cumple satisfactoriamente con la rúbrica metodológica SENNOVA." if estado == "aprobado" else None,
                proyecto_id=proy.id,
                responsable_id=proy.owner_id,
                producto_id=prod.id if prod else None,
                created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(20, 150))
            )
            db.add(ent)
            entregables_creados.append(ent)

        db.flush()
        if verbose:
            print(f"   ✅ {len(entregables_creados)} entregables registrados.")

        # ─────────────────────────────────────────────────────────────────────
        # TABLA 13: DOCUMENTOS (20 Documentos y archivos técnicos)
        # ─────────────────────────────────────────────────────────────────────
        if verbose:
            print("\n📄 14. Generando Metadatos de Documentos (Mínimo 20)...")

        documentos_creados = []
        tipos_docs = ["informe", "acta", "contrato", "cvlac_pdf", "formato"]

        for i in range(20):
            entidad_tipo = "proyecto" if i < 12 else ("producto" if i < 17 else "user")
            if entidad_tipo == "proyecto":
                entidad_id = proyectos_creados[i % len(proyectos_creados)].id
            elif entidad_tipo == "producto":
                entidad_id = productos_creados[i % len(productos_creados)].id
            else:
                entidad_id = usuarios_creados[i % len(usuarios_creados)].id

            doc_tipo = tipos_docs[i % len(tipos_docs)]
            doc = Documento(
                entidad_tipo=entidad_tipo,
                entidad_id=entidad_id,
                tipo=doc_tipo,
                nombre_archivo=f"{doc_tipo}_{2024}_{i + 1}.pdf",
                content_type="application/pdf",
                file_path=f"storage/uploads/docs/{doc_tipo}_{i + 1}.pdf",
                owner_id=admin_user.id,
                created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(5, 90))
            )
            db.add(doc)
            documentos_creados.append(doc)

        db.flush()
        if verbose:
            print(f"   ✅ {len(documentos_creados)} documentos técnicos generados.")

        # ─────────────────────────────────────────────────────────────────────
        # TABLA 14: NOTIFICACIONES (25 Notificaciones in-app y alertas)
        # ─────────────────────────────────────────────────────────────────────
        if verbose:
            print("\n🔔 15. Generando Notificaciones de Sistema (Mínimo 20)...")

        notificaciones_creadas = []
        tipos_notif = ["entregable", "convocatoria", "producto", "sistema"]
        prioridades = ["normal", "alta", "urgente", "baja"]

        for i in range(25):
            destinatario = usuarios_creados[i % len(usuarios_creados)]
            tipo = tipos_notif[i % len(tipos_notif)]
            leida = (i % 2 == 0)

            notif = Notificacion(
                user_id=destinatario.id,
                tipo=tipo,
                titulo=f"Aviso de {tipo.capitalize()}: Acción requerida #{100 + i}",
                mensaje=f"Estimado(a) {destinatario.nombre}, se le informa sobre novedades en el sistema SENNOVA para la gestión correspondiente.",
                entidad_tipo="proyecto",
                entidad_id=proyectos_creados[i % len(proyectos_creados)].id,
                leida=leida,
                fecha_lectura=datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 48)) if leida else None,
                email_enviado=True if i % 3 == 0 else False,
                fecha_envio_email=datetime.now(timezone.utc) - timedelta(hours=random.randint(12, 72)) if i % 3 == 0 else None,
                prioridad=prioridades[i % len(prioridades)],
                created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30))
            )
            db.add(notif)
            notificaciones_creadas.append(notif)

        db.flush()
        if verbose:
            print(f"   ✅ {len(notificaciones_creadas)} notificaciones registradas.")

        # ─────────────────────────────────────────────────────────────────────
        # TABLA 15: ACTIVIDADES (25 Registros de interacción de usuario)
        # ─────────────────────────────────────────────────────────────────────
        if verbose:
            print("\n⚡ 16. Registrando Actividades de Usuario (Mínimo 20)...")

        actividades_creadas = []
        acciones = [
            ("login", "Inicio de sesión exitoso en la plataforma"),
            ("create_project", "Creación de propuesta de proyecto SGPS"),
            ("upload_file", "Carga de documento probatorio en PDF"),
            ("approve_entregable", "Aprobación formal de entregable técnico"),
            ("update_profile", "Actualización de información de CVLAC y horas"),
            ("create_semillero", "Registro de nuevo semillero de investigación"),
        ]

        for i in range(25):
            user = usuarios_creados[i % len(usuarios_creados)]
            tipo_act, desc = acciones[i % len(acciones)]

            act = Actividad(
                user_id=user.id,
                tipo_accion=tipo_act,
                descripcion=f"{user.nombre}: {desc}",
                entidad_tipo="proyecto" if i % 2 == 0 else "user",
                entidad_id=proyectos_creados[i % len(proyectos_creados)].id,
                ip_address=f"190.25.{random.randint(10, 250)}.{random.randint(2, 254)}",
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                created_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 720))
            )
            db.add(act)
            actividades_creadas.append(act)

        db.flush()
        if verbose:
            print(f"   ✅ {len(actividades_creadas)} registros de actividad creados.")

        # ─────────────────────────────────────────────────────────────────────
        # TABLA 16: AUDIT_LOGS (25 Logs estrictos de auditoría HTTP)
        # ─────────────────────────────────────────────────────────────────────
        if verbose:
            print("\n🛡️ 18. Generando Registros de Auditoría (Audit Logs) (Mínimo 20)...")

        audit_logs_creados = []
        endpoints_audit = [
            ("POST", "/auth/login", 200),
            ("POST", "/proyectos", 201),
            ("PUT", "/proyectos/{id}", 200),
            ("POST", "/productos", 201),
            ("POST", "/semilleros", 201),
            ("DELETE", "/documentos/{id}", 200),
            ("POST", "/retos", 201),
            ("POST", "/entregables/{id}/upload", 201),
        ]

        for i in range(25):
            metodo, endp, status_c = endpoints_audit[i % len(endpoints_audit)]
            user = usuarios_creados[i % len(usuarios_creados)]

            audit = AuditLog(
                user_id=user.id,
                method=metodo,
                endpoint=endp.replace("{id}", str(uuid.uuid4())[:8]),
                status_code=status_c,
                ip_address=f"181.135.{random.randint(1, 254)}.{random.randint(1, 254)}",
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) SENNOVA-Client",
                payload_snapshot={"action": metodo, "resource": endp, "status": "success"},
                created_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 360))
            )
            db.add(audit)
            audit_logs_creados.append(audit)

        db.flush()
        if verbose:
            print(f"   ✅ {len(audit_logs_creados)} logs de auditoría creados.")

        # ─────────────────────────────────────────────────────────────────────
        # TABLA 18: MENSAJES (20 Mensajes internos y anuncios generales)
        # ─────────────────────────────────────────────────────────────────────
        if verbose:
            print("\n💬 19. Generando Mensajería Interna y Anuncios (Mínimo 20)...")

        mensajes_creados = []
        mensajes_asuntos = [
            ("Convocatoria SENNOVA: Fechas de cierre", "Recordatorio a todos los investigadores sobre la fecha límite de carga."),
            ("Revisión de informe bimensual", "Favor revisar los avances y los soportes asociados al período."),
            ("Capacitación Minciencias CvLAC y GrupLAC", "Sesión virtual este viernes a las 10:00 AM sobre actualización de perfiles."),
            ("Revisión de avance del prototipo IoT", "Hemos subido los diagramas esquemáticos para validación técnica."),
            ("Bienvenida a semilleristas periodo 2025", "Estimados aprendices, bienvenidos al equipo de investigación aplicada CGAO."),
            ("Aprobación de informe de Fase I", "Su informe ha sido revisado satisfactoriamente por el comité evaluador."),
            ("Disponibilidad de reactivos en laboratorio", "Ya se encuentran disponibles los solventes para extracción de pectina."),
            ("Invitación a foro regional de innovación", "Participación de los proyectos SENNOVA en la feria provincial de Vélez."),
        ]

        for i in range(20):
            remitente = usuarios_creados[i % len(usuarios_creados)]
            destinatario = usuarios_creados[(i + 1) % len(usuarios_creados)]
            asunto, contenido = mensajes_asuntos[i % len(mensajes_asuntos)]
            es_anuncio = (i % 5 == 0)

            msg = Mensaje(
                remitente_id=remitente.id,
                destinatario_id=None if es_anuncio else destinatario.id,
                asunto=f"[{'ANUNCIO' if es_anuncio else 'MENSAJE'}] {asunto}",
                contenido=f"{contenido} Enviado por {remitente.nombre}.",
                leido=True if i % 2 == 0 else False,
                fecha_lectura=datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 24)) if i % 2 == 0 else None,
                entregado=True,
                fecha_entrega=datetime.now(timezone.utc) - timedelta(hours=random.randint(2, 48)),
                es_anuncio=es_anuncio,
                created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 45)),
                updated_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 45))
            )
            db.add(msg)
            mensajes_creados.append(msg)

        db.flush()
        if verbose:
            print(f"   ✅ {len(mensajes_creados)} mensajes y anuncios generados.")

        # ─────────────────────────────────────────────────────────────────────
        # TABLA 19: MENSAJE_ADJUNTOS (20 Adjuntos de mensajes)
        # ─────────────────────────────────────────────────────────────────────
        if verbose:
            print("\n📎 20. Generando Adjuntos de Mensajes (Mínimo 20)...")

        adjuntos_creados = []
        categorias_adj = ["documento", "imagen", "audio", "video"]
        mimes_adj = {
            "documento": "application/pdf",
            "imagen": "image/jpeg",
            "audio": "audio/mpeg",
            "video": "video/mp4"
        }

        for i in range(20):
            msg_asoc = mensajes_creados[i % len(mensajes_creados)]
            cat = categorias_adj[i % len(categorias_adj)]
            ext = "pdf" if cat == "documento" else ("jpg" if cat == "imagen" else ("mp3" if cat == "audio" else "mp4"))
            sha_ficticio = hashlib.sha256(f"adjunto_{i}_{cat}".encode()).hexdigest()

            adj = MensajeAdjunto(
                mensaje_id=msg_asoc.id,
                owner_id=msg_asoc.remitente_id,
                nombre_archivo=f"anexo_{cat}_{i+1}.{ext}",
                content_type=mimes_adj[cat],
                categoria=cat,
                tamano_bytes=random.randint(50000, 5000000),
                sha256=sha_ficticio,
                storage_path=f"storage/mensajes/{sha_ficticio[:2]}/{sha_ficticio}.{ext}",
                created_at=msg_asoc.created_at
            )
            db.add(adj)
            adjuntos_creados.append(adj)

        db.flush()
        if verbose:
            print(f"   ✅ {len(adjuntos_creados)} adjuntos de mensajes registrados.")

        # Confirmar todos los cambios
        db.commit()

        # ─────────────────────────────────────────────────────────────────────
        # VERIFICACIÓN FINAL Y AUDITORÍA DE CONTEO (COUNT >= 20 POR TABLA)
        # ─────────────────────────────────────────────────────────────────────
        if verbose:
            print("\n" + "═" * 70)
            print("  📊 AUDITORÍA FINAL DE CONTEO POR TABLA (OBJETIVO: >= 20)")
            print("═" * 70)

        tablas_a_verificar = [
            ("users", User),
            ("grupos", Grupo),
            ("grupo_integrantes (pivote)", None, grupo_integrantes),
            ("semilleros", Semillero),
            ("semillero_investigadores (pivote)", None, semillero_investigadores),
            ("aprendices", Aprendiz),
            ("convocatorias", Convocatoria),
            ("retos", Reto),
            ("proyectos", Proyecto),
            ("proyecto_equipo (pivote)", None, proyecto_equipo),
            ("productos", Producto),
            ("entregables", Entregable),
            ("documentos", Documento),
            ("notificaciones", Notificacion),
            ("actividades", Actividad),
            ("audit_logs", AuditLog),
            ("mensajes", Mensaje),
            ("mensaje_adjuntos", MensajeAdjunto),
        ]

        total_registros = 0
        todos_cumplen = True

        for item in tablas_a_verificar:
            nombre_tabla = item[0]
            if item[1] is not None:
                conteo = db.query(item[1]).count()
            else:
                conteo = len(db.execute(item[2].select()).fetchall())

            total_registros += conteo
            cumple = conteo >= 20
            if not cumple:
                todos_cumplen = False
            simbolo = "✅" if cumple else "❌"
            if verbose:
                print(f"   {simbolo} {nombre_tabla.ljust(35)} : {conteo} registros")

        if verbose:
            print("─" * 70)
            print(f"  TOTAL GENERAL DE REGISTROS INSERTADOS: {total_registros}")
            if todos_cumplen:
                print("  🎉 ¡ÉXITO TOTAL! Todas las tablas superaron la meta de >= 20 datos.")
            else:
                print("  ⚠️ Atención: Algunas tablas no alcanzaron los 20 registros mínimos.")
            print("═" * 70)
            print("  Cuentas de prueba listas; la contraseña proviene de la variable segura y no se imprime.")
            print("═" * 70 + "\n")

        return True

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error crítico durante el semillado de datos: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    exito = seed_database(verbose=True)
    sys.exit(0 if exito else 1)
