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

def seed_investigadores():
    token = login()
    if not token:
        print("❌ Error: No se pudo iniciar sesión")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    investigadores = [
        {"email": "miguel.t@sena.edu.co", "nombre": "Miguel Tejedor", "sede": "CGAO Vélez"},
        {"email": "lucia.g@sena.edu.co", "nombre": "Lucía Galvis", "sede": "CGAO Vélez"},
        {"email": "jorge.m@sena.edu.co", "nombre": "Jorge Mantilla", "sede": "CGAO Vélez"},
        {"email": "elena.p@sena.edu.co", "nombre": "Elena Portilla", "sede": "CGAO Vélez"},
        {"email": "ricardo.s@sena.edu.co", "nombre": "Ricardo Suárez", "sede": "CGAO Vélez"},
        {"email": "marta.v@sena.edu.co", "nombre": "Marta Villalobos", "sede": "CGAO Vélez"},
        {"email": "andres.f@sena.edu.co", "nombre": "Andrés Fonseca", "sede": "CGAO Vélez"},
        {"email": "paula.d@sena.edu.co", "nombre": "Paula Duarte", "sede": "CGAO Vélez"},
        {"email": "oscar.c@sena.edu.co", "nombre": "Oscar Castro", "sede": "CGAO Vélez"},
        {"email": "sandra.m@sena.edu.co", "nombre": "Sandra Meléndez", "sede": "CGAO Vélez"}
    ]
    
    print("🌱 Insertando 10 investigadores...")
    count = 0
    for inv in investigadores:
        payload = {
            **inv,
            "password": "123456",
            "rol": "investigador",
            "regional": "Santander",
            "is_active": True
        }
        r = requests.post(f"{BASE_URL}/auth/register", headers=headers, json=payload)
        if r.status_code in [201, 200]:
            print(f"   ✅ {inv['nombre']} ({inv['email']})")
            count += 1
        else:
            try:
                detail = r.json().get('detail', '')
                if "already registered" in detail or "ya existe" in str(detail).lower():
                    print(f"   ℹ️ {inv['nombre']} ya existía")
                    count += 1
                else:
                    print(f"   ❌ Error {r.status_code}: {inv['email']} - {detail}")
            except:
                print(f"   ❌ Error {r.status_code}: {inv['email']}")
                
    print(f"\n✨ Proceso completado: {count} investigadores listos.")

if __name__ == "__main__":
    seed_investigadores()
