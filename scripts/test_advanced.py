#!/usr/bin/env python3
"""Test avanzado de funcionalidades SENNOVA CGAO"""
import requests

BASE_URL = "http://localhost:8000"

def test_advanced():
    # Login
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@sena.edu.co",
        "password": "123456"
    })
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print("=" * 60)
    print("🔬 TEST AVANZADO - FUNCIONALIDADES ADICIONALES")
    print("=" * 60)
    
    results = []
    
    # 1. Obtener lista de proyectos
    r = requests.get(f"{BASE_URL}/proyectos", headers=headers)
    if r.status_code == 200:
        proyectos = r.json()
        proyecto_id = proyectos[0]["id"] if proyectos else None
        print(f"\n1. GET Proyectos: ✅ ({len(proyectos)} encontrados)")
    else:
        proyecto_id = None
        results.append(("GET Proyectos", r.status_code))
        print(f"\n1. GET Proyectos: ❌ {r.status_code}")
    
    # 2. UPDATE Proyecto
    if proyecto_id:
        r = requests.put(f"{BASE_URL}/proyectos/{proyecto_id}", headers=headers, json={
            "nombre": "Proyecto Actualizado",
            "estado": "En ejecución",
            "presupuesto_total": 300000000
        })
        results.append(("UPDATE Proyecto", r.status_code))
        status = "✅" if r.status_code == 200 else "❌"
        print(f"2. UPDATE Proyecto: {status} {r.status_code}")
    
    # 3. Obtener lista de grupos
    r = requests.get(f"{BASE_URL}/grupos", headers=headers)
    if r.status_code == 200:
        grupos = r.json()
        grupo_id = grupos[0]["id"] if grupos else None
        print(f"3. GET Grupos: ✅ ({len(grupos)} encontrados)")
    else:
        grupo_id = None
        results.append(("GET Grupos", r.status_code))
        print(f"3. GET Grupos: ❌ {r.status_code}")
    
    # 4. GET detalle de grupo con integrantes
    if grupo_id:
        r = requests.get(f"{BASE_URL}/grupos/{grupo_id}", headers=headers)
        results.append(("GET Grupo detalle", r.status_code))
        status = "✅" if r.status_code == 200 else "❌"
        print(f"4. GET Grupo detalle: {status} {r.status_code}")
    
    # 5. Obtener lista de usuarios
    r = requests.get(f"{BASE_URL}/auth/users", headers=headers)
    if r.status_code == 200:
        usuarios = r.json()
        usuario_id = None
        for u in usuarios:
            if u["rol"] == "investigador":
                usuario_id = u["id"]
                break
        print(f"5. GET Usuarios: ✅ ({len(usuarios)} encontrados)")
    else:
        usuario_id = None
        results.append(("GET Usuarios", r.status_code))
        print(f"5. GET Usuarios: ❌ {r.status_code}")
    
    # 6. Agregar integrante a grupo
    if grupo_id and usuario_id:
        r = requests.post(
            f"{BASE_URL}/grupos/{grupo_id}/integrantes?user_id={usuario_id}&rol_en_grupo=Investigador",
            headers=headers
        )
        results.append(("ADD Integrante a Grupo", r.status_code))
        status = "✅" if r.status_code in [200, 201] else "❌"
        print(f"6. ADD Integrante a Grupo: {status} {r.status_code}")
    
    # 7. Obtener lista de productos
    r = requests.get(f"{BASE_URL}/productos", headers=headers)
    if r.status_code == 200:
        productos = r.json()
        producto_id = productos[0]["id"] if productos else None
        print(f"7. GET Productos: ✅ ({len(productos)} encontrados)")
    else:
        producto_id = None
        results.append(("GET Productos", r.status_code))
        print(f"7. GET Productos: ❌ {r.status_code}")
    
    # 8. Verificar producto (solo admin)
    if producto_id:
        r = requests.post(
            f"{BASE_URL}/productos/{producto_id}/verificar",
            headers=headers,
            json={"is_verificado": True}
        )
        results.append(("VERIFICAR Producto", r.status_code))
        status = "✅" if r.status_code == 200 else "❌"
        print(f"8. VERIFICAR Producto: {status} {r.status_code}")
    
    # 9. UPDATE Producto
    if producto_id:
        r = requests.put(
            f"{BASE_URL}/productos/{producto_id}",
            headers=headers,
            json={"nombre": "Producto Actualizado", "descripcion": "Nueva descripción"}
        )
        results.append(("UPDATE Producto", r.status_code))
        status = "✅" if r.status_code == 200 else "❌"
        print(f"9. UPDATE Producto: {status} {r.status_code}")
    
    # 10. UPDATE Convocatoria
    r = requests.get(f"{BASE_URL}/convocatorias", headers=headers)
    if r.status_code == 200:
        convocatorias = r.json()
        conv_id = convocatorias[0]["id"] if convocatorias else None
        print(f"10. GET Convocatorias: ✅ ({len(convocatorias)} encontradas)")
        
        if conv_id:
            r = requests.put(
                f"{BASE_URL}/convocatorias/{conv_id}",
                headers=headers,
                json={"nombre": "Convocatoria Actualizada", "estado": "cerrada"}
            )
            results.append(("UPDATE Convocatoria", r.status_code))
            status = "✅" if r.status_code == 200 else "❌"
            print(f"11. UPDATE Convocatoria: {status} {r.status_code}")
    
    # 12. UPDATE Semillero
    r = requests.get(f"{BASE_URL}/semilleros", headers=headers)
    if r.status_code == 200:
        semilleros = r.json()
        sem_id = semilleros[0]["id"] if semilleros else None
        print(f"12. GET Semilleros: ✅ ({len(semilleros)} encontrados)")
        
        if sem_id:
            r = requests.put(
                f"{BASE_URL}/semilleros/{sem_id}",
                headers=headers,
                json={"nombre": "Semillero Actualizado", "horas_dedicadas": 10}
            )
            results.append(("UPDATE Semillero", r.status_code))
            status = "✅" if r.status_code == 200 else "❌"
            print(f"13. UPDATE Semillero: {status} {r.status_code}")
    
    # 14. UPDATE Aprendiz
    if sem_id:
        r = requests.get(f"{BASE_URL}/semilleros/{sem_id}/aprendices", headers=headers)
        if r.status_code == 200:
            aprendices = r.json()
            appr_id = aprendices[0]["id"] if aprendices else None
            print(f"14. GET Aprendices: ✅ ({len(aprendices)} encontrados)")
            
            if appr_id:
                r = requests.put(
                    f"{BASE_URL}/semilleros/{sem_id}/aprendices/{appr_id}",
                    headers=headers,
                    json={"nombre": "Aprendiz Actualizado", "estado": "graduado"}
                )
                results.append(("UPDATE Aprendiz", r.status_code))
                status = "✅" if r.status_code == 200 else "❌"
                print(f"15. UPDATE Aprendiz: {status} {r.status_code}")
    
    # 16. GET Stats
    r = requests.get(f"{BASE_URL}/stats/dashboard", headers=headers)
    results.append(("GET Dashboard Stats", r.status_code))
    status = "✅" if r.status_code == 200 else "❌"
    print(f"\n16. GET Dashboard Stats: {status} {r.status_code}")
    
    r = requests.get(f"{BASE_URL}/stats/admin", headers=headers)
    results.append(("GET Admin Stats", r.status_code))
    status = "✅" if r.status_code == 200 else "❌"
    print(f"17. GET Admin Stats: {status} {r.status_code}")
    
    # Resumen
    print("\n" + "=" * 60)
    print("📊 RESULTADOS:")
    print("=" * 60)
    
    passed = sum(1 for _, s in results if s in [200, 201, 204])
    failed = sum(1 for _, s in results if s not in [200, 201, 204])
    
    for name, status in results:
        icon = "✅" if status in [200, 201, 204] else "❌"
        print(f"{icon} {name:30s} {status}")
    
    print("=" * 60)
    print(f"✅ PASSED: {passed}")
    print(f"❌ FAILED: {failed}")
    print("=" * 60)
    
    if failed == 0:
        print("\n🎉 TODAS LAS FUNCIONALIDADES AVANZADAS FUNCIONAN!")
    else:
        print(f"\n⚠️ {failed} funcionalidades con problemas")
    
    return failed == 0

if __name__ == "__main__":
    test_advanced()
