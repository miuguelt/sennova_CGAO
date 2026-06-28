# -*- coding: utf-8 -*-
"""
🧪 Test de Automatización — SENNOVA
====================================
Valida el flujo de SENNOVA (Auth, Proyectos, Cronograma, Productos, Presupuesto, Bitácora y Aprendices).
"""
import uuid
import pytest
import requests

BASE_URL = "http://127.0.0.1:8080"
ADMIN_EMAIL = "admin@sena.edu.co"
ADMIN_PASS = "123456"


def test_sennova_automation_flow():
    """Valida la suite de automatización completa para SENNOVA."""
    
    # 1. Login
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login", 
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, 
            timeout=5
        )
    except requests.exceptions.RequestException as e:
        pytest.skip(f"Omitiendo test de SENNOVA: El backend no está activo en {BASE_URL} ({e})")
        return

    assert response.status_code == 200, f"Error en login: {response.text}"
    token = response.json().get("access_token")
    assert token, "No se recibió access_token"
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Crear Proyecto
    proyecto_data = {
        "nombre": f"Proyecto Test Automatización {uuid.uuid4().hex[:8]}",
        "nombre_corto": "PROY-TEST",
        "tipologia": "Investigación",
        "estado": "Formulación",
        "vigencia": 2026
    }
    res_proj = requests.post(f"{BASE_URL}/proyectos", json=proyecto_data, headers=headers, timeout=5)
    assert res_proj.status_code == 201, f"Error creando proyecto: {res_proj.text}"
    proyecto_id = res_proj.json().get("id")
    assert proyecto_id is not None, "El proyecto no tiene ID"

    # 3. Generación de Entregables (Cronograma)
    res_cron = requests.post(f"{BASE_URL}/entregables/proyecto/{proyecto_id}/generate-template", headers=headers, timeout=5)
    assert res_cron.status_code == 200, f"Error generando cronograma: {res_cron.text}"
    assert "count" in res_cron.json(), "Respuesta del cronograma sin contador de hitos"

    # 4. Generación de Productos
    res_prod = requests.post(f"{BASE_URL}/productos/proyecto/{proyecto_id}/generate-template", headers=headers, timeout=5)
    assert res_prod.status_code == 200, f"Error generando productos: {res_prod.text}"
    assert "count" in res_prod.json(), "Respuesta de productos sin contador"

    # 5. Generación de Presupuesto
    res_pres = requests.post(f"{BASE_URL}/proyectos/{proyecto_id}/generate-budget-template", headers=headers, timeout=5)
    assert res_pres.status_code == 200, f"Error generando presupuesto: {res_pres.text}"
    assert "items_count" in res_pres.json(), "Respuesta de presupuesto sin contador de rubros"

    # 6. Bitácora Multimedia
    bitacora_data = {
        "titulo": "Entrada de Test Multimedia",
        "contenido": "Contenido de prueba con adjuntos",
        "categoria": "técnica",
        "proyecto_id": proyecto_id,
        "adjuntos": [
            {"nombre": "imagen1.jpg", "url": "https://picsum.photos/800/600", "type": "image/jpeg", "size": 1024},
            {"nombre": "imagen2.jpg", "url": "https://picsum.photos/800/601", "type": "image/jpeg", "size": 2048}
        ]
    }
    res_bit = requests.post(f"{BASE_URL}/bitacora", json=bitacora_data, headers=headers, timeout=5)
    assert res_bit.status_code == 201, f"Error en bitácora multimedia: {res_bit.text}"
    bit_id = res_bit.json().get("id")
    assert bit_id is not None

    # Verificar que los adjuntos persistieron
    res_bit_get = requests.get(f"{BASE_URL}/bitacora/{bit_id}", headers=headers, timeout=5)
    assert res_bit_get.status_code == 200
    assert len(res_bit_get.json().get("adjuntos", [])) == 2

    # 7. Vinculación Aprendiz-User
    res_users = requests.get(f"{BASE_URL}/usuarios", headers=headers, timeout=5)
    assert res_users.status_code == 200, f"Error al listar usuarios: {res_users.text}"
    users = res_users.json()
    if users:
        user_id = users[0]["id"]
        
        # Crear Semillero
        res_groups = requests.get(f"{BASE_URL}/grupos", headers=headers, timeout=5)
        assert res_groups.status_code == 200, f"Error al obtener grupos: {res_groups.text}"
        groups = res_groups.json()
        
        if groups:
            grupo_id = groups[0]["id"]
            sem_data = {"nombre": "Semillero Test Automático", "grupo_id": grupo_id}
            res_sem = requests.post(f"{BASE_URL}/semilleros", json=sem_data, headers=headers, timeout=5)
            assert res_sem.status_code == 201, f"Error creando semillero: {res_sem.text}"
            sem_id = res_sem.json().get("id")
            assert sem_id is not None
            
            # Vincular Aprendiz
            apr_data = {
                "user_id": user_id,
                "ficha": "1234567",
                "programa": "ADSO"
            }
            res_apr = requests.post(f"{BASE_URL}/semilleros/{sem_id}/aprendices", json=apr_data, headers=headers, timeout=5)
            assert res_apr.status_code in (200, 201), f"Error vinculando aprendiz: {res_apr.text}"
            assert "nombre" in res_apr.json(), "El nombre del aprendiz no se auto-pobló"
