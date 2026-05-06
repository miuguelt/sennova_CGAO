import requests
import json
import uuid
import sys

BASE_URL = "http://127.0.0.1:8000"
ADMIN_EMAIL = "admin@sena.edu.co"
ADMIN_PASS = "admin_local_dev_2024"

def test_automation_suite():
    print("🚀 Iniciando Test Suite de Automatización SENNOVA...")
    
    # 1. Login
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
        response.raise_for_status()
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Login exitoso.")
    except Exception as e:
        print(f"❌ Error en login: {e}")
        return

    # 2. Crear Proyecto para pruebas
    proyecto_data = {
        "nombre": "Proyecto Test Automatización " + str(uuid.uuid4())[:8],
        "nombre_corto": "PROY-TEST",
        "tipologia": "Investigación",
        "estado": "Formulación",
        "vigencia": 2026
    }
    try:
        res_proj = requests.post(f"{BASE_URL}/proyectos", json=proyecto_data, headers=headers)
        res_proj.raise_for_status()
        proyecto_id = res_proj.json()["id"]
        print(f"✅ Proyecto creado (ID: {proyecto_id}).")
    except Exception as e:
        print(f"❌ Error creando proyecto: {e}")
        return

    # 3. Test Generación de Entregables (Cronograma)
    try:
        res_cron = requests.post(f"{BASE_URL}/entregables/proyecto/{proyecto_id}/generate-template", headers=headers)
        res_cron.raise_for_status()
        print(f"✅ Cronograma generado ({res_cron.json()['count']} hitos).")
    except Exception as e:
        print(f"❌ Error generando cronograma: {e}")

    # 4. Test Generación de Productos
    try:
        res_prod = requests.post(f"{BASE_URL}/productos/proyecto/{proyecto_id}/generate-template", headers=headers)
        res_prod.raise_for_status()
        print(f"✅ Productos generados ({res_prod.json()['count']} resultados).")
    except Exception as e:
        print(f"❌ Error generando productos: {e}")

    # 5. Test Generación de Presupuesto (Nuevo)
    try:
        res_pres = requests.post(f"{BASE_URL}/proyectos/{proyecto_id}/generate-budget-template", headers=headers)
        res_pres.raise_for_status()
        print(f"✅ Presupuesto generado ({res_pres.json()['items_count']} rubros).")
    except Exception as e:
        print(f"❌ Error generando presupuesto: {e}")

    # 6. Test Bitácora Multimedia
    bitacora_data = {
        "titulo": "Entrada de Test Multimedia",
        "contenido": "Contenido de prueba con adjuntos",
        "categoria": "técnica",
        "proyecto_id": proyecto_id,
        "adjuntos": ["https://picsum.photos/800/600", "https://picsum.photos/800/601"]
    }
    try:
        res_bit = requests.post(f"{BASE_URL}/bitacora", json=bitacora_data, headers=headers)
        res_bit.raise_for_status()
        bit_id = res_bit.json()["id"]
        print(f"✅ Bitácora multimedia creada (ID: {bit_id}).")
        
        # Verificar que los adjuntos persistieron
        res_bit_get = requests.get(f"{BASE_URL}/bitacora/{bit_id}", headers=headers)
        if len(res_bit_get.json().get("adjuntos", [])) == 2:
            print("✅ Verificación de adjuntos exitosa.")
        else:
            print("❌ Los adjuntos no se recuperaron correctamente.")
    except Exception as e:
        print(f"❌ Error en bitácora multimedia: {e}")

    # 7. Test Refactorización Aprendiz-User
    # Primero buscamos un usuario investigador para simular que es aprendiz
    try:
        res_users = requests.get(f"{BASE_URL}/usuarios", headers=headers)
        user_id = res_users.json()[0]["id"]
        
        # Crear Semillero
        grupo_id = requests.get(f"{BASE_URL}/grupos", headers=headers).json()[0]["id"]
        sem_data = {"nombre": "Semillero Test", "grupo_id": grupo_id}
        res_sem = requests.post(f"{BASE_URL}/semilleros", json=sem_data, headers=headers)
        sem_id = res_sem.json()["id"]
        
        # Vincular Aprendiz usando user_id (debe auto-poblar nombre)
        apr_data = {
            "user_id": user_id,
            "ficha": "1234567",
            "programa": "ADSO"
        }
        res_apr = requests.post(f"{BASE_URL}/semilleros/{sem_id}/aprendices", json=apr_data, headers=headers)
        res_apr.raise_for_status()
        apr_json = res_apr.json()
        print(f"✅ Aprendiz vinculado a User (Nombre auto-poblado: {apr_json['nombre']}).")
    except Exception as e:
        print(f"❌ Error en test de vinculación Aprendiz-User: {e}")

    print("\n🏁 Test Suite Finalizada.")

if __name__ == "__main__":
    test_automation_suite()
