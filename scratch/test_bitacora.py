import requests

BASE_URL = "http://localhost:8000"

print("🔍 Iniciando diagnóstico de endpoints de bitácora...")

# 1. Login
login_payload = {
    "email": "admin@sennova.dev.co",
    "password": "DevMiguel2024!"
}
r_login = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
print(f"Login Status: {r_login.status_code}")
if r_login.status_code != 200:
    print("❌ Error de login:", r_login.text)
    exit(1)

token = r_login.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# 2. Obtener un proyecto para poder usar su ID
r_proy = requests.get(f"{BASE_URL}/proyectos", headers=headers)
print(f"List Proyectos Status: {r_proy.status_code}")
if r_proy.status_code != 200:
    print("❌ Error al listar proyectos:", r_proy.text)
    exit(1)

proyectos = r_proy.json()
if not proyectos:
    print("⚠️ No hay proyectos en la base de datos para usar como FK.")
    # Crearemos un proyecto temporal
    conv_payload = {
        "numero_oe": "OE-DIAG-01",
        "nombre": "Convocatoria Diagnostico",
        "año": 2026
    }
    r_conv = requests.post(f"{BASE_URL}/convocatorias", json=conv_payload, headers=headers)
    conv_id = r_conv.json()["id"]
    
    proy_payload = {
        "nombre": "Proyecto Diagnostico",
        "nombre_corto": "PDIAG",
        "estado": "Formulación",
        "convocatoria_id": conv_id
    }
    r_proy_new = requests.post(f"{BASE_URL}/proyectos", json=proy_payload, headers=headers)
    proyecto_id = r_proy_new.json()["id"]
else:
    proyecto_id = proyectos[0]["id"]

print(f"Usando proyecto ID: {proyecto_id}")

# 3. Intentar POST /bitacora
bitacora_payload = {
    "titulo": "Prueba Diagnóstico",
    "contenido": "Contenido diagnóstico",
    "categoria": "técnica",
    "proyecto_id": proyecto_id
}

print("\n--- Petición POST a /bitacora ---")
r_post1 = requests.post(f"{BASE_URL}/bitacora", json=bitacora_payload, headers=headers, allow_redirects=False)
print(f"Status (sin redirecciones): {r_post1.status_code}")
print(f"Headers: {dict(r_post1.headers)}")
if r_post1.status_code in [301, 302, 307, 308]:
    print(f"Redirección detectada hacia: {r_post1.headers.get('Location')}")

print("\n--- Petición POST a /bitacora/ ---")
r_post2 = requests.post(f"{BASE_URL}/bitacora/", json=bitacora_payload, headers=headers, allow_redirects=False)
print(f"Status (sin redirecciones): {r_post2.status_code}")
print(f"Headers: {dict(r_post2.headers)}")
print(f"Response Body: {r_post2.text}")

print("\n--- Petición POST a /bitacora con redirecciones habilitadas ---")
r_post3 = requests.post(f"{BASE_URL}/bitacora", json=bitacora_payload, headers=headers, allow_redirects=True)
print(f"Status (con redirecciones): {r_post3.status_code}")
print(f"Final URL: {r_post3.url}")
print(f"Response Body: {r_post3.text}")
