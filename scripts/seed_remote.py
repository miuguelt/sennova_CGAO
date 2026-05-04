#!/usr/bin/env python3
import requests
import json
import time

BASE_URL = "http://38.242.137.70:8000"

def login():
    """Login como admin y obtener token"""
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "admin@sena.edu.co",
            "password": "123456"
        }, timeout=10)
        if resp.status_code == 200:
            return resp.json()["access_token"]
        else:
            print(f"Error login: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"Error conectando a {BASE_URL}: {e}")
    return None

def seed_data():
    print(f"🚀 Intentando conectar con el API remoto en {BASE_URL}...")
    token = login()
    if not token:
        print("❌ Error: No se pudo iniciar sesión en el servidor remoto.")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Simplemente crear un grupo para probar si se crean las tablas
    print("\n📦 Creando datos de prueba para forzar la creación de tablas...")
    test_grupo = {
        "nombre": "DEVBRAIN_REMOTE_TEST", 
        "nombre_completo": "Grupo de Prueba Remota DevBrain", 
        "codigo_gruplac": "DB-2024-001", 
        "clasificacion": "A", 
        "lineas_investigacion": ["Test"]
    }
    
    r = requests.post(f"{BASE_URL}/grupos", headers=headers, json=test_grupo)
    if r.status_code in [200, 201]:
        print("✅ ¡Éxito! Se pudo crear un registro en el servidor remoto.")
        print("Esto confirma que el backend remoto está funcionando y conectado a su DB.")
    else:
        print(f"⚠️ Error al crear grupo: {r.status_code} - {r.text}")

if __name__ == "__main__":
    seed_data()
