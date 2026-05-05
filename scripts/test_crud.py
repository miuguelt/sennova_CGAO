#!/usr/bin/env python3
"""Test completo de CRUD SENNOVA CGAO"""
import os
import requests
import json

BASE_URL = os.getenv('API_URL', 'http://localhost:8000')

def test_all():
    # Login
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@sena.edu.co",
        "password": "123456"
    })
    
    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code}")
        return
    
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print("=" * 50)
    print("CRUD COMPLETE TEST - SENNOVA CGAO")
    print("=" * 50)
    
    results = []
    
    # 1. CREATE Grupo
    r = requests.post(f"{BASE_URL}/grupos", headers=headers, json={
        "nombre": "Grupo de Innovacion Tecnologica",
        "codigo_gruplac": "COL0123456",
        "clasificacion": "B"
    })
    grupo_id = r.json().get("id") if r.status_code == 201 else None
    results.append(("CREATE Grupo", r.status_code, grupo_id))
    
    # 2. UPDATE Grupo
    if grupo_id:
        r = requests.put(f"{BASE_URL}/grupos/{grupo_id}", headers=headers, json={
            "nombre": "Grupo de Innovacion Actualizado"
        })
        results.append(("UPDATE Grupo", r.status_code, None))
    
    # 3. GET Grupo
    if grupo_id:
        r = requests.get(f"{BASE_URL}/grupos/{grupo_id}", headers=headers)
        results.append(("GET Grupo", r.status_code, None))
    
    # 4. CREATE Convocatoria
    r = requests.post(f"{BASE_URL}/convocatorias", headers=headers, json={
        "numero_oe": "OE-2025-001",
        "nombre": "Convocatoria de Innovacion 2025",
        "año": 2025,
        "estado": "abierta"
    })
    conv_id = r.json().get("id") if r.status_code == 201 else None
    results.append(("CREATE Convocatoria", r.status_code, conv_id))
    
    # 5. CREATE Proyecto
    if grupo_id and conv_id:
        r = requests.post(f"{BASE_URL}/proyectos", headers=headers, json={
            "nombre": "Sistema de Gestion Inteligente",
            "nombre_corto": "SGI",
            "estado": "Formulacion",
            "convocatoria_id": conv_id
        })
        proyecto_id = r.json().get("id") if r.status_code == 201 else None
        results.append(("CREATE Proyecto", r.status_code, proyecto_id))
    else:
        proyecto_id = None
        results.append(("CREATE Proyecto", "SKIPPED", None))
    
    # 6. CREATE Semillero
    if grupo_id:
        r = requests.post(f"{BASE_URL}/semilleros", headers=headers, json={
            "nombre": "Semillero de Programacion",
            "grupo_id": grupo_id,
            "estado": "activo"
        })
        sem_id = r.json().get("id") if r.status_code == 201 else None
        results.append(("CREATE Semillero", r.status_code, sem_id))
    else:
        sem_id = None
        results.append(("CREATE Semillero", "SKIPPED", None))
    
    # 7. CREATE Producto
    if proyecto_id:
        r = requests.post(f"{BASE_URL}/productos", headers=headers, json={
            "tipo": "software",
            "nombre": "Modulo de Gestion v1.0",
            "proyecto_id": proyecto_id
        })
        prod_id = r.json().get("id") if r.status_code == 201 else None
        results.append(("CREATE Producto", r.status_code, prod_id))
    else:
        prod_id = None
        results.append(("CREATE Producto", "SKIPPED", None))
    
    # 8. CREATE Aprendiz
    if sem_id:
        r = requests.post(f"{BASE_URL}/semilleros/{sem_id}/aprendices", headers=headers, json={
            "nombre": "Juan Perez",
            "ficha": "123456",
            "programa": "ADSO"
        })
        appr_id = r.json().get("id") if r.status_code == 201 else None
        results.append(("CREATE Aprendiz", r.status_code, appr_id))
    else:
        results.append(("CREATE Aprendiz", "SKIPPED", None))
    
    # 9. Dashboard Stats
    r = requests.get(f"{BASE_URL}/stats/dashboard", headers=headers)
    results.append(("GET Dashboard Stats", r.status_code, None))
    
    # 10. Admin Stats
    r = requests.get(f"{BASE_URL}/stats/admin", headers=headers)
    results.append(("GET Admin Stats", r.status_code, None))
    
    # LIST operations
    endpoints = [
        ("LIST Usuarios", f"{BASE_URL}/auth/users"),
        ("LIST Grupos", f"{BASE_URL}/grupos"),
        ("LIST Proyectos", f"{BASE_URL}/proyectos"),
        ("LIST Convocatorias", f"{BASE_URL}/convocatorias"),
        ("LIST Semilleros", f"{BASE_URL}/semilleros"),
        ("LIST Productos", f"{BASE_URL}/productos"),
        ("LIST Documentos", f"{BASE_URL}/documentos"),
    ]
    
    for name, url in endpoints:
        r = requests.get(url, headers=headers)
        results.append((name, r.status_code, None))
    
    # DELETE operations (cleanup)
    if prod_id:
        r = requests.delete(f"{BASE_URL}/productos/{prod_id}", headers=headers)
        results.append(("DELETE Producto", r.status_code, None))
    
    if proyecto_id:
        r = requests.delete(f"{BASE_URL}/proyectos/{proyecto_id}", headers=headers)
        results.append(("DELETE Proyecto", r.status_code, None))
    
    # Print results
    print("\n" + "=" * 50)
    print("RESULTS:")
    print("=" * 50)
    
    passed = 0
    failed = 0
    
    for name, status, id_val in results:
        if status in [200, 201, 204]:
            status_str = f"✅ {status}"
            passed += 1
        elif status == "SKIPPED":
            status_str = f"⏭️  {status}"
        else:
            status_str = f"❌ {status}"
            failed += 1
        
        id_str = f" (ID: {id_val[:8]}...)" if id_val else ""
        print(f"{name:30s} {status_str}{id_str}")
    
    print("=" * 50)
    print(f"✅ PASSED: {passed}")
    print(f"❌ FAILED: {failed}")
    print(f"⏭️  SKIPPED: {len([r for r in results if r[1] == 'SKIPPED'])}")
    print("=" * 50)
    
    if failed == 0:
        print("\n🎉 ALL TESTS PASSED! System is working correctly.")
    else:
        print(f"\n⚠️  {failed} tests failed. Check errors above.")

if __name__ == "__main__":
    test_all()
