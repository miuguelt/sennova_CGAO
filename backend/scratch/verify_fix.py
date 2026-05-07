import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_investigador_access():
    print("\n--- TEST: ACCESO DE INVESTIGADOR ---")
    
    # 1. Login como investigador
    login_data = {"username": "mtejedorm@sena.edu.co", "password": "123456"}
    response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    
    if response.status_code != 200:
        print(f"❌ Error al iniciar sesión: {response.status_code} {response.text}")
        return
    
    token = response.json()["access_token"]
    user_id = response.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"✅ Login exitoso. User ID: {user_id}")
    
    # 2. Probar GET propio perfil
    response = requests.get(f"{BASE_URL}/usuarios/{user_id}", headers=headers)
    if response.status_code == 200:
        print("✅ Acceso a perfil propio: PERMITIDO")
    else:
        print(f"❌ Acceso a perfil propio: DENEGADO ({response.status_code})")
        
    # 3. Probar PUT propio perfil
    update_data = {"nombre": "Miguel Tejedor (Actualizado)"}
    response = requests.put(f"{BASE_URL}/usuarios/{user_id}", headers=headers, json=update_data)
    if response.status_code == 200:
        print("✅ Actualización de perfil propio: EXITOSA")
        print(f"   Nuevo nombre: {response.json()['nombre']}")
    else:
        print(f"❌ Actualización de perfil propio: FALLIDA ({response.status_code} {response.text})")
        
    # 4. Probar GET perfil ajeno (debería fallar)
    # Buscamos otro usuario (el admin por ejemplo)
    response = requests.get(f"{BASE_URL}/usuarios", headers=headers)
    if response.status_code == 403:
        print("✅ Listado global de usuarios: BLOQUEADO (Correcto)")
    else:
        print(f"⚠️ Listado global de usuarios: {response.status_code} (Esperado 403)")

if __name__ == "__main__":
    try:
        test_investigador_access()
    except Exception as e:
        print(f"❌ Error durante la prueba: {e}")
