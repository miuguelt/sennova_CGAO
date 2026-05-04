#!/usr/bin/env python3
"""
Script de migración: IndexedDB (JSON export) → PostgreSQL

Uso:
1. Exportar datos desde el sistema antiguo (botón Exportar en Configuración)
2. Guardar como backup_sennova.json
3. Ejecutar: python migrate_from_indexeddb.py backup_sennova.json

El script transforma los IDs y migra todos los datos manteniendo relaciones.
"""

import json
import sys
import uuid
from datetime import datetime
from typing import Dict, List, Any
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

# Configurar hash de contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configurar conexión PostgreSQL
DATABASE_URL = "postgresql://sennova:sennova123@localhost:5432/sennova"
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

# Mapeo de IDs antiguos a nuevos UUIDs
id_mapping = {
    'users': {},
    'proyectos': {},
    'grupos': {},
    'semilleros': {},
    'convocatorias': {},
    'productos': {},
}


def generate_uuid() -> str:
    """Genera un nuevo UUID."""
    return str(uuid.uuid4())


def transform_old_id(old_id: str, entity_type: str) -> str:
    """Transforma un ID antiguo a nuevo UUID, manteniendo mapeo."""
    if not old_id:
        return None
    
    if old_id not in id_mapping[entity_type]:
        id_mapping[entity_type][old_id] = generate_uuid()
    
    return id_mapping[entity_type][old_id]


def parse_date(date_str: str) -> datetime:
    """Parsea fecha de string a datetime."""
    if not date_str:
        return None
    try:
        # Intentar formato ISO
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except:
        try:
            # Intentar formato YYYY-MM-DD
            return datetime.strptime(date_str, '%Y-%m-%d')
        except:
            return None


def migrate_users(session, data: Dict[str, List[Dict]]) -> None:
    """Migra usuarios."""
    print("🔄 Migrando usuarios...")
    
    users = data.get('users', [])
    for user in users:
        new_id = transform_old_id(user['id'], 'users')
        
        # Hash de contraseña (si es simple, requiere reset)
        password = user.get('password', '')
        if len(password) < 20:  # No es hash bcrypt
            password = pwd_context.hash(password if password else '123456')
        
        query = """
        INSERT INTO users (
            id, email, password_hash, nombre, rol, rol_sennova, nivel_academico,
            horas_mensuales, meses_vinculacion, cv_lac_url, estado_cv_lac,
            lineas_investigacion, sede, regional, is_active, created_at
        ) VALUES (
            :id, :email, :password_hash, :nombre, :rol, :rol_sennova, :nivel_academico,
            :horas_mensuales, :meses_vinculacion, :cv_lac_url, :estado_cv_lac,
            :lineas_investigacion, :sede, :regional, :is_active, :created_at
        ) ON CONFLICT (id) DO NOTHING
        """
        
        session.execute(query, {
            'id': new_id,
            'email': user.get('email'),
            'password_hash': password,
            'nombre': user.get('nombre'),
            'rol': user.get('rol', 'investigador'),
            'rol_sennova': user.get('rolSENNOVA'),
            'nivel_academico': user.get('nivelAcademico'),
            'horas_mensuales': user.get('horasMensuales'),
            'meses_vinculacion': user.get('mesesVinculacion'),
            'cv_lac_url': user.get('cvLacUrl'),
            'estado_cv_lac': user.get('estadoCvLac', 'No actualizado'),
            'lineas_investigacion': user.get('lineasInvestigacion', []),
            'sede': user.get('sede'),
            'regional': user.get('regional'),
            'is_active': user.get('isActive', True),
            'created_at': parse_date(user.get('createdAt')) or datetime.utcnow()
        })
    
    session.commit()
    print(f"✅ {len(users)} usuarios migrados")


def migrate_grupos(session, data: Dict[str, List[Dict]]) -> None:
    """Migra grupos de investigación."""
    print("🔄 Migrando grupos...")
    
    grupos = data.get('grupos', [])
    for grupo in grupos:
        new_id = transform_old_id(grupo['id'], 'grupos')
        owner_id = transform_old_id(grupo.get('ownerId'), 'users')
        
        query = """
        INSERT INTO grupos (
            id, nombre, nombre_completo, codigo_gruplac, clasificacion,
            gruplac_url, lineas_investigacion, owner_id, is_publico, created_at
        ) VALUES (
            :id, :nombre, :nombre_completo, :codigo_gruplac, :clasificacion,
            :gruplac_url, :lineas_investigacion, :owner_id, :is_publico, :created_at
        ) ON CONFLICT (id) DO NOTHING
        """
        
        session.execute(query, {
            'id': new_id,
            'nombre': grupo.get('nombre'),
            'nombre_completo': grupo.get('nombreCompleto'),
            'codigo_gruplac': grupo.get('codigoGruplac'),
            'clasificacion': grupo.get('clasificacion'),
            'gruplac_url': grupo.get('gruplacUrl'),
            'lineas_investigacion': grupo.get('lineasInvestigacion', []),
            'owner_id': owner_id,
            'is_publico': grupo.get('isPublico', True),
            'created_at': parse_date(grupo.get('createdAt')) or datetime.utcnow()
        })
    
    session.commit()
    print(f"✅ {len(grupos)} grupos migrados")


def migrate_semilleros(session, data: Dict[str, List[Dict]]) -> None:
    """Migra semilleros."""
    print("🔄 Migrando semilleros...")
    
    semilleros = data.get('semilleros', [])
    for semillero in semilleros:
        new_id = transform_old_id(semillero['id'], 'semilleros')
        grupo_id = transform_old_id(semillero.get('grupoId'), 'grupos')
        owner_id = transform_old_id(semillero.get('ownerId'), 'users')
        
        query = """
        INSERT INTO semilleros (
            id, nombre, linea_investigacion, plan_accion, horas_dedicadas,
            estado, grupo_id, owner_id, created_at
        ) VALUES (
            :id, :nombre, :linea_investigacion, :plan_accion, :horas_dedicadas,
            :estado, :grupo_id, :owner_id, :created_at
        ) ON CONFLICT (id) DO NOTHING
        """
        
        session.execute(query, {
            'id': new_id,
            'nombre': semillero.get('nombre'),
            'linea_investigacion': semillero.get('lineaInvestigacion'),
            'plan_accion': semillero.get('planAccion'),
            'horas_dedicadas': semillero.get('horasDedicadas'),
            'estado': semillero.get('estado', 'activo'),
            'grupo_id': grupo_id,
            'owner_id': owner_id,
            'created_at': parse_date(semillero.get('createdAt')) or datetime.utcnow()
        })
        
        # Migrar aprendices
        for aprendiz in semillero.get('aprendices', []):
            aprendiz_query = """
            INSERT INTO aprendices (
                id, nombre, ficha, programa, estado, fecha_ingreso, semillero_id
            ) VALUES (
                :id, :nombre, :ficha, :programa, :estado, :fecha_ingreso, :semillero_id
            ) ON CONFLICT (id) DO NOTHING
            """
            session.execute(aprendiz_query, {
                'id': generate_uuid(),
                'nombre': aprendiz.get('nombre'),
                'ficha': aprendiz.get('ficha'),
                'programa': aprendiz.get('programa'),
                'estado': aprendiz.get('estado', 'activo'),
                'fecha_ingreso': parse_date(aprendiz.get('fechaIngreso')) or datetime.utcnow(),
                'semillero_id': new_id
            })
    
    session.commit()
    print(f"✅ {len(semilleros)} semilleros migrados")


def migrate_convocatorias(session, data: Dict[str, List[Dict]]) -> None:
    """Migra convocatorias."""
    print("🔄 Migrando convocatorias...")
    
    convocatorias = data.get('convocatorias', [])
    for conv in convocatorias:
        new_id = transform_old_id(conv['id'], 'convocatorias')
        owner_id = transform_old_id(conv.get('ownerId'), 'users')
        
        query = """
        INSERT INTO convocatorias (
            id, numero_oe, nombre, año, fecha_apertura, fecha_cierre,
            estado, descripcion, owner_id, created_at
        ) VALUES (
            :id, :numero_oe, :nombre, :año, :fecha_apertura, :fecha_cierre,
            :estado, :descripcion, :owner_id, :created_at
        ) ON CONFLICT (id) DO NOTHING
        """
        
        session.execute(query, {
            'id': new_id,
            'numero_oe': conv.get('numeroOE'),
            'nombre': conv.get('nombre'),
            'año': conv.get('año'),
            'fecha_apertura': parse_date(conv.get('fechaApertura')),
            'fecha_cierre': parse_date(conv.get('fechaCierre')),
            'estado': conv.get('estado', 'abierta'),
            'descripcion': conv.get('descripcion'),
            'owner_id': owner_id,
            'created_at': parse_date(conv.get('createdAt')) or datetime.utcnow()
        })
    
    session.commit()
    print(f"✅ {len(convocatorias)} convocatorias migradas")


def migrate_proyectos(session, data: Dict[str, List[Dict]]) -> None:
    """Migra proyectos."""
    print("🔄 Migrando proyectos...")
    
    proyectos = data.get('proyectos', [])
    for proyecto in proyectos:
        new_id = transform_old_id(proyecto['id'], 'proyectos')
        owner_id = transform_old_id(proyecto.get('ownerId'), 'users')
        conv_id = transform_old_id(proyecto.get('convocatoriaId'), 'convocatorias')
        
        query = """
        INSERT INTO proyectos (
            id, codigo_sgps, nombre, nombre_corto, estado, vigencia,
            presupuesto_total, tipologia, linea_investigacion, red_conocimiento,
            descripcion, objetivo_general, objetivos_especificos,
            convocatoria_id, owner_id, is_publico, created_at, updated_at
        ) VALUES (
            :id, :codigo_sgps, :nombre, :nombre_corto, :estado, :vigencia,
            :presupuesto_total, :tipologia, :linea_investigacion, :red_conocimiento,
            :descripcion, :objetivo_general, :objetivos_especificos,
            :convocatoria_id, :owner_id, :is_publico, :created_at, :updated_at
        ) ON CONFLICT (id) DO NOTHING
        """
        
        session.execute(query, {
            'id': new_id,
            'codigo_sgps': proyecto.get('codigoSGPS'),
            'nombre': proyecto.get('nombre'),
            'nombre_corto': proyecto.get('nombreCorto'),
            'estado': proyecto.get('estado', 'Formulación'),
            'vigencia': proyecto.get('vigencia'),
            'presupuesto_total': proyecto.get('presupuestoTotal'),
            'tipologia': proyecto.get('tipologia'),
            'linea_investigacion': proyecto.get('lineaInvestigacion'),
            'red_conocimiento': proyecto.get('redConocimiento'),
            'descripcion': proyecto.get('descripcion'),
            'objetivo_general': proyecto.get('objetivoGeneral'),
            'objetivos_especificos': proyecto.get('objetivosEspecificos', []),
            'convocatoria_id': conv_id,
            'owner_id': owner_id,
            'is_publico': proyecto.get('isPublico', False),
            'created_at': parse_date(proyecto.get('createdAt')) or datetime.utcnow(),
            'updated_at': parse_date(proyecto.get('updatedAt')) or datetime.utcnow()
        })
        
        # Migrar equipo
        for miembro in proyecto.get('equipo', []):
            user_id = transform_old_id(miembro.get('userId'), 'users')
            if user_id:
                equipo_query = """
                INSERT INTO proyecto_equipo (proyecto_id, user_id, rol_en_proyecto, horas_dedicadas)
                VALUES (:proyecto_id, :user_id, :rol, :horas)
                ON CONFLICT DO NOTHING
                """
                session.execute(equipo_query, {
                    'proyecto_id': new_id,
                    'user_id': user_id,
                    'rol': miembro.get('rol', 'Miembro'),
                    'horas': miembro.get('horas')
                })
    
    session.commit()
    print(f"✅ {len(proyectos)} proyectos migrados")


def migrate_productos(session, data: Dict[str, List[Dict]]) -> None:
    """Migra productos."""
    print("🔄 Migrando productos...")
    
    productos = data.get('productos', [])
    for producto in productos:
        new_id = transform_old_id(producto['id'], 'productos')
        owner_id = transform_old_id(producto.get('ownerId'), 'users')
        proyecto_id = transform_old_id(producto.get('proyectoId'), 'proyectos')
        
        query = """
        INSERT INTO productos (
            id, tipo, nombre, descripcion, fecha_publicacion, doi, url,
            is_verificado, verificado_por, fecha_verificacion,
            proyecto_id, owner_id, created_at
        ) VALUES (
            :id, :tipo, :nombre, :descripcion, :fecha_publicacion, :doi, :url,
            :is_verificado, :verificado_por, :fecha_verificacion,
            :proyecto_id, :owner_id, :created_at
        ) ON CONFLICT (id) DO NOTHING
        """
        
        session.execute(query, {
            'id': new_id,
            'tipo': producto.get('tipo'),
            'nombre': producto.get('nombre'),
            'descripcion': producto.get('descripcion'),
            'fecha_publicacion': parse_date(producto.get('fechaPublicacion')),
            'doi': producto.get('doi'),
            'url': producto.get('url'),
            'is_verificado': producto.get('isVerificado', False),
            'verificado_por': transform_old_id(producto.get('verificadoPor'), 'users'),
            'fecha_verificacion': parse_date(producto.get('fechaVerificacion')),
            'proyecto_id': proyecto_id,
            'owner_id': owner_id,
            'created_at': parse_date(producto.get('createdAt')) or datetime.utcnow()
        })
    
    session.commit()
    print(f"✅ {len(productos)} productos migrados")


def main():
    if len(sys.argv) < 2:
        print("Uso: python migrate_from_indexeddb.py <archivo_json>")
        print("Ejemplo: python migrate_from_indexeddb.py backup_sennova.json")
        sys.exit(1)
    
    json_file = sys.argv[1]
    
    print(f"📂 Cargando datos desde {json_file}...")
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"🔗 Conectando a PostgreSQL...")
    session = Session()
    
    try:
        # Migrar en orden (respetando dependencias)
        migrate_users(session, data)
        migrate_grupos(session, data)
        migrate_semilleros(session, data)
        migrate_convocatorias(session, data)
        migrate_proyectos(session, data)
        migrate_productos(session, data)
        
        print("\n✨ Migración completada exitosamente!")
        print(f"📊 Resumen de mapeo de IDs guardado en id_mapping.json")
        
        # Guardar mapeo de IDs para referencia
        with open('id_mapping.json', 'w') as f:
            json.dump(id_mapping, f, indent=2)
        
    except Exception as e:
        session.rollback()
        print(f"\n❌ Error durante la migración: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        session.close()


if __name__ == '__main__':
    main()
