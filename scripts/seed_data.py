#!/usr/bin/env python3
"""
Script para poblar la base de datos SENNOVA CGAO con datos de ejemplo
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def login():
    """Login como admin y obtener token"""
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@sena.edu.co",
        "password": "123456"
    })
    if resp.status_code == 200:
        return resp.json()["access_token"]
    return None

def seed_data():
    token = login()
    if not token:
        print("❌ Error: No se pudo iniciar sesión")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    print("=" * 60)
    print("🌱 POBLANDO BASE DE DATOS SENNOVA CGAO")
    print("=" * 60)
    
    # 1. Crear usuarios investigadores
    print("\n👥 Creando usuarios investigadores...")
    usuarios_data = [
        {"email": "investigador1@sena.edu.co", "password": "123456", "nombre": "Carlos Rodríguez", "rol": "investigador", "sede": "CGAO Vélez", "regional": "Santander"},
        {"email": "investigador2@sena.edu.co", "password": "123456", "nombre": "María González", "rol": "investigador", "sede": "CGAO Vélez", "regional": "Santander"},
        {"email": "investigador3@sena.edu.co", "password": "123456", "nombre": "Ana Martínez", "rol": "investigador", "sede": "CGAO Vélez", "regional": "Santander"},
    ]
    
    for user in usuarios_data:
        r = requests.post(f"{BASE_URL}/auth/register", headers=headers, json=user)
        if r.status_code == 201:
            print(f"   ✅ {user['nombre']}")
        else:
            print(f"   ⚠️  {user['nombre']}: {r.status_code}")
    
    # 2. Crear grupos de investigación
    print("\n🔬 Creando grupos de investigación...")
    grupos_data = [
        {"nombre": "GRIAL", "nombre_completo": "Grupo de Investigación en Inteligencia Artificial y Aprendizaje Automático", "codigo_gruplac": "COL0008423", "clasificacion": "A1", "lineas_investigacion": ["Machine Learning", "Deep Learning", "NLP"]},
        {"nombre": "GITE", "nombre_completo": "Grupo de Investigación en Tecnologías Emergentes", "codigo_gruplac": "COL0012345", "clasificacion": "A", "lineas_investigacion": ["IoT", "Blockchain", "Cloud Computing"]},
        {"nombre": "GIIC", "nombre_completo": "Grupo de Investigación en Innovación y Competitividad", "codigo_gruplac": "COL0056789", "clasificacion": "B", "lineas_investigacion": ["Innovación", "Emprendimiento", "Gestión del Conocimiento"]},
    ]
    
    grupos_ids = []
    for grupo in grupos_data:
        r = requests.post(f"{BASE_URL}/grupos", headers=headers, json=grupo)
        if r.status_code == 201:
            grupos_ids.append(r.json()["id"])
            print(f"   ✅ {grupo['nombre']} - {grupo['clasificacion']}")
        else:
            print(f"   ⚠️  {grupo['nombre']}: {r.status_code}")
    
    # 3. Crear convocatorias
    print("\n📢 Creando convocatorias...")
    convocatorias_data = [
        {"numero_oe": "OE-2024-001", "nombre": "Convocatoria de Innovación 2024", "año": 2024, "fecha_apertura": "2024-01-15", "fecha_cierre": "2024-03-15", "estado": "cerrada"},
        {"numero_oe": "OE-2025-001", "nombre": "Convocatoria de Desarrollo Tecnológico 2025", "año": 2025, "fecha_apertura": "2025-01-15", "fecha_cierre": "2025-03-31", "estado": "abierta"},
        {"numero_oe": "OE-2025-002", "nombre": "Convocatoria de Formación Especializada 2025", "año": 2025, "fecha_apertura": "2025-04-01", "fecha_cierre": "2025-06-30", "estado": "abierta"},
    ]
    
    conv_ids = []
    for conv in convocatorias_data:
        r = requests.post(f"{BASE_URL}/convocatorias", headers=headers, json=conv)
        if r.status_code == 201:
            conv_ids.append(r.json()["id"])
            print(f"   ✅ {conv['numero_oe']} - {conv['nombre'][:30]}...")
        else:
            print(f"   ⚠️  {conv['numero_oe']}: {r.status_code}")
    
    # 4. Crear proyectos
    print("\n📁 Creando proyectos...")
    proyectos_data = [
        {"nombre": "Sistema Inteligente de Gestión de Proyectos de Investigación", "nombre_corto": "SIGPI", "codigo_sgps": "SGPS-2024-001", "estado": "En ejecución", "vigencia": 18, "presupuesto_total": 250000000, "convocatoria_id": conv_ids[0] if conv_ids else None},
        {"nombre": "Plataforma de Análisis de Datos para la Gestión del Conocimiento", "nombre_corto": "PADGEC", "codigo_sgps": "SGPS-2025-002", "estado": "Formulación", "vigencia": 24, "presupuesto_total": 180000000, "convocatoria_id": conv_ids[1] if len(conv_ids) > 1 else None},
        {"nombre": "Desarrollo de Herramientas de IA para la Educación Técnica", "nombre_corto": "HIA-ET", "codigo_sgps": "SGPS-2025-003", "estado": "Formulación", "vigencia": 12, "presupuesto_total": 120000000, "convocatoria_id": conv_ids[1] if len(conv_ids) > 1 else None},
    ]
    
    proyectos_ids = []
    for proyecto in proyectos_data:
        if proyecto["convocatoria_id"]:
            r = requests.post(f"{BASE_URL}/proyectos", headers=headers, json=proyecto)
            if r.status_code == 201:
                proyectos_ids.append(r.json()["id"])
                print(f"   ✅ {proyecto['nombre_corto']}")
            else:
                print(f"   ⚠️  {proyecto['nombre_corto']}: {r.status_code}")
    
    # 5. Crear semilleros
    print("\n🌱 Creando semilleros...")
    if grupos_ids:
        semilleros_data = [
            {"nombre": "Semillero de Programación Avanzada", "grupo_id": grupos_ids[0], "linea_investigacion": "Desarrollo de Software", "horas_dedicadas": 8, "estado": "activo"},
            {"nombre": "Semillero de Ciencia de Datos", "grupo_id": grupos_ids[0], "linea_investigacion": "Machine Learning", "horas_dedicadas": 6, "estado": "activo"},
            {"nombre": "Semillero de IoT y Automatización", "grupo_id": grupos_ids[1], "linea_investigacion": "Internet de las Cosas", "horas_dedicadas": 8, "estado": "activo"},
        ]
        
        semilleros_ids = []
        for semillero in semilleros_data:
            r = requests.post(f"{BASE_URL}/semilleros", headers=headers, json=semillero)
            if r.status_code == 201:
                semilleros_ids.append(r.json()["id"])
                print(f"   ✅ {semillero['nombre']}")
            else:
                print(f"   ⚠️  {semillero['nombre']}: {r.status_code}")
        
        # 6. Agregar aprendices a semilleros
        print("\n👨‍🎓 Agregando aprendices...")
        if semilleros_ids:
            aprendices_data = [
                (semilleros_ids[0], {"nombre": "Juan Pérez", "ficha": "1234567", "programa": "ADSO", "estado": "activo"}),
                (semilleros_ids[0], {"nombre": "María López", "ficha": "1234568", "programa": "ADSO", "estado": "activo"}),
                (semilleros_ids[1], {"nombre": "Carlos Ruiz", "ficha": "1234569", "programa": "Análisis de Datos", "estado": "activo"}),
                (semilleros_ids[2], {"nombre": "Ana Torres", "ficha": "1234570", "programa": "Electrónica", "estado": "activo"}),
            ]
            
            for sem_id, aprendiz in aprendices_data:
                r = requests.post(f"{BASE_URL}/semilleros/{sem_id}/aprendices", headers=headers, json=aprendiz)
                if r.status_code == 201:
                    print(f"   ✅ {aprendiz['nombre']} -> {sem_id[:8]}...")
                else:
                    print(f"   ⚠️  {aprendiz['nombre']}: {r.status_code}")
    
    # 7. Crear productos
    print("\n📦 Creando productos...")
    if proyectos_ids:
        productos_data = [
            {"tipo": "software", "nombre": "SIGPI v1.0 - Sistema de Gestión de Proyectos", "descripcion": "Software para la gestión integral de proyectos de investigación", "proyecto_id": proyectos_ids[0]},
            {"tipo": "articulo", "nombre": "Sistema de Gestión de Proyectos basado en Metodologías Ágiles", "descripcion": "Artículo publicado en revista indexada", "doi": "10.1234/sigpi.2024.001", "proyecto_id": proyectos_ids[0]},
            {"tipo": "software", "nombre": "Dashboard de Analytics v1.0", "descripcion": "Herramienta de visualización de datos", "proyecto_id": proyectos_ids[1] if len(proyectos_ids) > 1 else None},
        ]
        
        for producto in productos_data:
            if producto.get("proyecto_id"):
                r = requests.post(f"{BASE_URL}/productos", headers=headers, json=producto)
                if r.status_code == 201:
                    print(f"   ✅ {producto['nombre'][:40]}...")
                else:
                    print(f"   ⚠️  Producto: {r.status_code}")
    
    print("\n" + "=" * 60)
    print("✅ BASE DE DATOS POBLADA EXITOSAMENTE")
    print("=" * 60)
    print("\n📊 Datos creados:")
    print("   • 3 Usuarios investigadores")
    print("   • 3 Grupos de investigación (A1, A, B)")
    print("   • 3 Convocatorias (1 cerrada, 2 abiertas)")
    print("   • 3 Proyectos de investigación")
    print("   • 3 Semilleros con aprendices")
    print("   • 3 Productos (software, artículos)")
    
    # Verificar estadísticas
    print("\n📈 Verificando estadísticas...")
    r = requests.get(f"{BASE_URL}/stats/dashboard", headers=headers)
    if r.status_code == 200:
        stats = r.json()
        print(f"   • Proyectos: {stats.get('proyectos', {}).get('total', 0)}")
        print(f"   • Grupos: {stats.get('grupos', {}).get('total', 0)}")
        print(f"   • Semilleros: {stats.get('semilleros', {}).get('total', 0)}")
        print(f"   • Productos: {stats.get('productos', {}).get('total', 0)}")
        print(f"   • Investigadores: {stats.get('investigadores', 0)}")

if __name__ == "__main__":
    seed_data()
