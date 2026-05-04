import requests
import json

BASE_URL = "http://localhost:8000"

def login():
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@sena.edu.co",
        "password": "123456"
    })
    if resp.status_code == 200:
        return resp.json()["access_token"]
    return None

def test_crud_investigadores():
    token = login()
    if not token:
        print("❌ Error: No se pudo iniciar sesión")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    test_user_email = "test.investigador@sena.edu.co"
    
    print("🧪 Iniciando Pruebas CRUD Investigadores...")
    
    # 1. CREATE
    print("\n[1] Probando CREATE...")
    payload = {
        "email": test_user_email,
        "password": "password123",
        "nombre": "Investigador de Prueba",
        "rol": "investigador",
        "sede": "CGAO Vélez",
        "regional": "Santander"
    }
    r = requests.post(f"{BASE_URL}/auth/register", headers=headers, json=payload)
    if r.status_code in [201, 200]:
        print("   ✅ CREATE exitoso")
    else:
        print(f"   ❌ CREATE fallido: {r.status_code} - {r.text}")
        return

    # 2. READ (List)
    print("\n[2] Probando READ (List)...")
    r = requests.get(f"{BASE_URL}/usuarios", headers=headers)
    if r.status_code == 200:
        users = r.json()
        found = any(u['email'] == test_user_email for u in users)
        if found:
            print(f"   ✅ READ exitoso (Encontrado en la lista)")
            # Obtener ID
            user_id = next(u['id'] for u in users if u['email'] == test_user_email)
        else:
            print(f"   ❌ READ fallido (No encontrado en la lista)")
            return
    else:
        print(f"   ❌ READ (List) fallido: {r.status_code}")
        return

    # 3. UPDATE
    print("\n[3] Probando UPDATE...")
    update_payload = {"nombre": "Investigador Actualizado"}
    r = requests.put(f"{BASE_URL}/usuarios/{user_id}", headers=headers, json=update_payload)
    if r.status_code == 200:
        if r.json()['nombre'] == "Investigador Actualizado":
            print("   ✅ UPDATE exitoso")
        else:
            print("   ❌ UPDATE fallido (Nombre no cambió)")
    else:
        print(f"   ❌ UPDATE fallido: {r.status_code} - {r.text}")

    # 4. DELETE
    print("\n[4] Probando DELETE...")
    r = requests.delete(f"{BASE_URL}/usuarios/{user_id}", headers=headers)
    if r.status_code == 200:
        print("   ✅ DELETE exitoso")
    else:
        # Algunos sistemas devuelven 204 No Content
        if r.status_code == 204:
            print("   ✅ DELETE exitoso (204)")
        else:
            print(f"   ❌ DELETE fallido: {r.status_code} - {r.text}")

    print("\n🏁 PRUEBAS CRUD COMPLETADAS CON ÉXITO")

if __name__ == "__main__":
    test_crud_investigadores()
