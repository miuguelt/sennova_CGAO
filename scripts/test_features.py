"""
Test de features SENNOVA CGAO
REGLA ANTI-HARDCODING: Usar variable de entorno o default
"""
import os
import requests
import json

BASE_URL = os.getenv('API_URL', 'http://localhost:8000')

try:
    # 1. Login
    auth_res = requests.post(f'{BASE_URL}/auth/login', json={'email': 'admin@sena.edu.co', 'password': '123456'})
    user_id = auth_res.json()['user']['id']
    token = auth_res.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    # 2. Crear Proyecto
    proj_data = {
        'nombre': 'PROYECTO DE AUDITORÍA FINAL',
        'nombre_corto': 'AUDIT-FINAL',
        'codigo_sgps': 'AUDIT-001',
        'estado': 'Formulación',
        'vigencia': 12,
        'presupuesto_total': 5000000,
        'tipologia': 'Innovación'
    }
    create_res = requests.post(f'{BASE_URL}/proyectos', json=proj_data, headers=headers)
    print(f"Status creación: {create_res.status_code}")

    # 3. Verificar Historial
    hist_res = requests.get(f'{BASE_URL}/usuarios/{user_id}/historial', headers=headers)
    historial = hist_res.json()

    print("\n" + "="*40)
    print("🧪 PRUEBA FUNCIONAL: AUDITORÍA")
    print("="*40)
    
    found = False
    for item in historial:
        if 'PROYECTO DE AUDITORÍA FINAL' in item['descripcion']:
            print(f"✅ LOG ENCONTRADO: {item['descripcion']}")
            print(f"   Tipo Acción: {item['tipo_accion']}")
            print(f"   Fecha: {item['created_at']}")
            found = True
            break
    
    if not found:
        print("❌ ERROR: El log automático no se registró.")
    
    # 4. Prueba Búsqueda Global
    search_res = requests.get(f'{BASE_URL}/stats/search/global?q=AUDIT', headers=headers)
    results = search_res.json().get('results', [])
    if any('AUDIT' in r['title'] for r in results):
        print(f"✅ BÚSQUEDA GLOBAL: Encontró el proyecto recién creado.")
    else:
        print(f"❌ BÚSQUEDA GLOBAL: No encontró el proyecto.")

except Exception as e:
    print(f"❌ ERROR DURANTE LA PRUEBA: {str(e)}")
