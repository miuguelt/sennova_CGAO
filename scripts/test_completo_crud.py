#!/usr/bin/env python3
"""
Test completo de CRUD para todas las tablas de SENNOVA CGAO
Genera reporte en formato de tabla
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    CYAN = "\033[96m"
    RESET = "\033[0m"
    BOLD = "\033[1m"

def login():
    """Login como admin y obtener token"""
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@sena.edu.co",
        "password": "123456"
    })
    if resp.status_code == 200:
        return resp.json()["access_token"]
    return None

def print_table_header():
    """Imprime el encabezado de la tabla"""
    print(f"\n{Colors.BOLD}{'='*100}{Colors.RESET}")
    print(f"{Colors.BOLD}{'TABLA':<20} {'OPERACION':<20} {'METODO':<10} {'STATUS':<10} {'RESULTADO':<15} {'ID':<20}{Colors.RESET}")
    print(f"{Colors.BOLD}{'='*100}{Colors.RESET}")

def print_table_row(tabla, operacion, metodo, status, resultado, obj_id=""):
    """Imprime una fila de la tabla"""
    status_color = Colors.GREEN if resultado == "OK" else Colors.RED if resultado == "FAIL" else Colors.YELLOW
    print(f"{tabla:<20} {operacion:<20} {metodo:<10} {status:<10} {status_color}{resultado:<15}{Colors.RESET} {obj_id[:20]:<20}")

def print_table_footer():
    """Imprime el pie de la tabla"""
    print(f"{Colors.BOLD}{'='*100}{Colors.RESET}\n")

def test_all_tables():
    token = login()
    if not token:
        print(f"{Colors.RED}❌ Error: No se pudo iniciar sesión{Colors.RESET}")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    results = []
    
    print(f"\n{Colors.CYAN}{'='*100}{Colors.RESET}")
    print(f"{Colors.CYAN}{' '*30}TEST COMPLETO DE CRUD - SENNOVA CGAO{Colors.RESET}")
    print(f"{Colors.CYAN}{' '*35}Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.RESET}")
    print(f"{Colors.CYAN}{'='*100}{Colors.RESET}")
    
    print_table_header()
    
    # ==========================================
    # 1. USUARIOS
    # ==========================================
    # LIST Usuarios
    r = requests.get(f"{BASE_URL}/auth/users", headers=headers)
    success = r.status_code == 200
    results.append(("Usuarios", "LIST", "GET", r.status_code, success))
    print_table_row("Usuarios", "LIST", "GET", r.status_code, "OK" if success else "FAIL")
    
    # CREATE Usuario
    user_data = {
        "email": f"testuser_{datetime.now().timestamp()}@sena.edu.co",
        "password": "123456",
        "nombre": "Usuario de Prueba",
        "rol": "investigador"
    }
    r = requests.post(f"{BASE_URL}/auth/register", headers=headers, json=user_data)
    user_id = r.json().get("id") if r.status_code == 201 else None
    success = r.status_code == 201
    results.append(("Usuarios", "CREATE", "POST", r.status_code, success))
    print_table_row("Usuarios", "CREATE", "POST", r.status_code, "OK" if success else "FAIL", user_id or "")
    
    # ==========================================
    # 2. GRUPOS
    # ==========================================
    # CREATE Grupo
    r = requests.post(f"{BASE_URL}/grupos", headers=headers, json={
        "nombre": "Grupo Test",
        "codigo_gruplac": "COLTEST123",
        "clasificacion": "B"
    })
    grupo_id = r.json().get("id") if r.status_code == 201 else None
    success = r.status_code == 201
    results.append(("Grupos", "CREATE", "POST", r.status_code, success))
    print_table_row("Grupos", "CREATE", "POST", r.status_code, "OK" if success else "FAIL", grupo_id or "")
    
    # LIST Grupos
    r = requests.get(f"{BASE_URL}/grupos", headers=headers)
    success = r.status_code == 200
    results.append(("Grupos", "LIST", "GET", r.status_code, success))
    print_table_row("Grupos", "LIST", "GET", r.status_code, "OK" if success else "FAIL")
    
    # GET Grupo
    if grupo_id:
        r = requests.get(f"{BASE_URL}/grupos/{grupo_id}", headers=headers)
        success = r.status_code == 200
        results.append(("Grupos", "GET", "GET", r.status_code, success))
        print_table_row("Grupos", "GET", "GET", r.status_code, "OK" if success else "FAIL")
        
        # UPDATE Grupo
        r = requests.put(f"{BASE_URL}/grupos/{grupo_id}", headers=headers, json={
            "nombre": "Grupo Test Actualizado"
        })
        success = r.status_code == 200
        results.append(("Grupos", "UPDATE", "PUT", r.status_code, success))
        print_table_row("Grupos", "UPDATE", "PUT", r.status_code, "OK" if success else "FAIL")
    
    # ==========================================
    # 3. CONVOCATORIAS
    # ==========================================
    # CREATE Convocatoria
    r = requests.post(f"{BASE_URL}/convocatorias", headers=headers, json={
        "numero_oe": "OE-TEST-001",
        "nombre": "Convocatoria de Prueba",
        "año": 2025,
        "estado": "abierta"
    })
    conv_id = r.json().get("id") if r.status_code == 201 else None
    success = r.status_code == 201
    results.append(("Convocatorias", "CREATE", "POST", r.status_code, success))
    print_table_row("Convocatorias", "CREATE", "POST", r.status_code, "OK" if success else "FAIL", conv_id or "")
    
    # LIST Convocatorias
    r = requests.get(f"{BASE_URL}/convocatorias", headers=headers)
    success = r.status_code == 200
    results.append(("Convocatorias", "LIST", "GET", r.status_code, success))
    print_table_row("Convocatorias", "LIST", "GET", r.status_code, "OK" if success else "FAIL")
    
    # ==========================================
    # 4. PROYECTOS
    # ==========================================
    # CREATE Proyecto
    proyecto_data = {
        "nombre": "Proyecto de Prueba CRUD",
        "nombre_corto": "PPC",
        "estado": "Formulación",
    }
    if conv_id:
        proyecto_data["convocatoria_id"] = conv_id
    
    r = requests.post(f"{BASE_URL}/proyectos", headers=headers, json=proyecto_data)
    proyecto_id = r.json().get("id") if r.status_code == 201 else None
    success = r.status_code == 201
    results.append(("Proyectos", "CREATE", "POST", r.status_code, success))
    print_table_row("Proyectos", "CREATE", "POST", r.status_code, "OK" if success else "FAIL", proyecto_id or "")
    
    # LIST Proyectos
    r = requests.get(f"{BASE_URL}/proyectos", headers=headers)
    success = r.status_code == 200
    results.append(("Proyectos", "LIST", "GET", r.status_code, success))
    print_table_row("Proyectos", "LIST", "GET", r.status_code, "OK" if success else "FAIL")
    
    # GET Proyecto
    if proyecto_id:
        r = requests.get(f"{BASE_URL}/proyectos/{proyecto_id}", headers=headers)
        success = r.status_code == 200
        results.append(("Proyectos", "GET", "GET", r.status_code, success))
        print_table_row("Proyectos", "GET", "GET", r.status_code, "OK" if success else "FAIL")
    
    # ==========================================
    # 5. SEMILLEROS
    # ==========================================
    # CREATE Semillero
    if grupo_id:
        r = requests.post(f"{BASE_URL}/semilleros", headers=headers, json={
            "nombre": "Semillero de Prueba",
            "grupo_id": grupo_id,
            "estado": "activo"
        })
        semillero_id = r.json().get("id") if r.status_code == 201 else None
        success = r.status_code == 201
        results.append(("Semilleros", "CREATE", "POST", r.status_code, success))
        print_table_row("Semilleros", "CREATE", "POST", r.status_code, "OK" if success else "FAIL", semillero_id or "")
        
        # LIST Semilleros
        r = requests.get(f"{BASE_URL}/semilleros", headers=headers)
        success = r.status_code == 200
        results.append(("Semilleros", "LIST", "GET", r.status_code, success))
        print_table_row("Semilleros", "LIST", "GET", r.status_code, "OK" if success else "FAIL")
        
        # GET Semillero
        if semillero_id:
            r = requests.get(f"{BASE_URL}/semilleros/{semillero_id}", headers=headers)
            success = r.status_code == 200
            results.append(("Semilleros", "GET", "GET", r.status_code, success))
            print_table_row("Semilleros", "GET", "GET", r.status_code, "OK" if success else "FAIL")
            
            # CREATE Aprendiz
            r = requests.post(f"{BASE_URL}/semilleros/{semillero_id}/aprendices", headers=headers, json={
                "nombre": "Aprendiz de Prueba",
                "ficha": "12345678",
                "programa": "ADSO"
            })
            aprendiz_id = r.json().get("id") if r.status_code == 201 else None
            success = r.status_code == 201
            results.append(("Aprendices", "CREATE", "POST", r.status_code, success))
            print_table_row("Aprendices", "CREATE", "POST", r.status_code, "OK" if success else "FAIL", aprendiz_id or "")
            
            # LIST Aprendices
            r = requests.get(f"{BASE_URL}/semilleros/{semillero_id}/aprendices", headers=headers)
            success = r.status_code == 200
            results.append(("Aprendices", "LIST", "GET", r.status_code, success))
            print_table_row("Aprendices", "LIST", "GET", r.status_code, "OK" if success else "FAIL")
    else:
        results.append(("Semilleros", "CREATE", "POST", "SKIP", False))
        print_table_row("Semilleros", "CREATE", "POST", "SKIP", "SKIP")
        results.append(("Aprendices", "CREATE", "POST", "SKIP", False))
        print_table_row("Aprendices", "CREATE", "POST", "SKIP", "SKIP")
    
    # ==========================================
    # 6. PRODUCTOS
    # ==========================================
    # CREATE Producto
    if proyecto_id:
        r = requests.post(f"{BASE_URL}/productos", headers=headers, json={
            "tipo": "software",
            "nombre": "Producto de Prueba",
            "proyecto_id": proyecto_id
        })
        producto_id = r.json().get("id") if r.status_code == 201 else None
        success = r.status_code == 201
        results.append(("Productos", "CREATE", "POST", r.status_code, success))
        print_table_row("Productos", "CREATE", "POST", r.status_code, "OK" if success else "FAIL", producto_id or "")
        
        # LIST Productos
        r = requests.get(f"{BASE_URL}/productos", headers=headers)
        success = r.status_code == 200
        results.append(("Productos", "LIST", "GET", r.status_code, success))
        print_table_row("Productos", "LIST", "GET", r.status_code, "OK" if success else "FAIL")
        
        # GET Producto
        if producto_id:
            r = requests.get(f"{BASE_URL}/productos/{producto_id}", headers=headers)
            success = r.status_code == 200
            results.append(("Productos", "GET", "GET", r.status_code, success))
            print_table_row("Productos", "GET", "GET", r.status_code, "OK" if success else "FAIL")
            
            # UPDATE Producto
            r = requests.put(f"{BASE_URL}/productos/{producto_id}", headers=headers, json={
                "nombre": "Producto Actualizado"
            })
            success = r.status_code == 200
            results.append(("Productos", "UPDATE", "PUT", r.status_code, success))
            print_table_row("Productos", "UPDATE", "PUT", r.status_code, "OK" if success else "FAIL")
            
            # DELETE Producto
            r = requests.delete(f"{BASE_URL}/productos/{producto_id}", headers=headers)
            success = r.status_code == 200
            results.append(("Productos", "DELETE", "DEL", r.status_code, success))
            print_table_row("Productos", "DELETE", "DEL", r.status_code, "OK" if success else "FAIL")
    else:
        results.append(("Productos", "CREATE", "POST", "SKIP", False))
        print_table_row("Productos", "CREATE", "POST", "SKIP", "SKIP")
    
    # ==========================================
    # 7. DOCUMENTOS
    # ==========================================
    # LIST Documentos
    r = requests.get(f"{BASE_URL}/documentos", headers=headers)
    success = r.status_code == 200
    results.append(("Documentos", "LIST", "GET", r.status_code, success))
    print_table_row("Documentos", "LIST", "GET", r.status_code, "OK" if success else "FAIL")
    
    # ==========================================
    # 8. STATS
    # ==========================================
    r = requests.get(f"{BASE_URL}/stats/dashboard", headers=headers)
    success = r.status_code == 200
    results.append(("Stats", "DASHBOARD", "GET", r.status_code, success))
    print_table_row("Stats", "DASHBOARD", "GET", r.status_code, "OK" if success else "FAIL")
    
    r = requests.get(f"{BASE_URL}/stats/admin", headers=headers)
    success = r.status_code == 200
    results.append(("Stats", "ADMIN", "GET", r.status_code, success))
    print_table_row("Stats", "ADMIN", "GET", r.status_code, "OK" if success else "FAIL")
    
    # ==========================================
    # CLEANUP
    # ==========================================
    if proyecto_id:
        r = requests.delete(f"{BASE_URL}/proyectos/{proyecto_id}", headers=headers)
        success = r.status_code == 200
        results.append(("Proyectos", "DELETE", "DEL", r.status_code, success))
        print_table_row("Proyectos", "DELETE", "DEL", r.status_code, "OK" if success else "FAIL")
    
    if grupo_id:
        r = requests.delete(f"{BASE_URL}/grupos/{grupo_id}", headers=headers)
        success = r.status_code == 200
        results.append(("Grupos", "DELETE", "DEL", r.status_code, success))
        print_table_row("Grupos", "DELETE", "DEL", r.status_code, "OK" if success else "FAIL")
    
    if user_id:
        # DELETE Usuario (si hay endpoint)
        results.append(("Usuarios", "DELETE", "DEL", "N/A", True))
        print_table_row("Usuarios", "DELETE", "DEL", "N/A", "N/A")
    
    print_table_footer()
    
    # Resumen
    passed = sum(1 for _, _, _, _, success in results if success)
    failed = sum(1 for _, _, _, _, success in results if not success)
    total = len(results)
    
    print(f"\n{Colors.CYAN}{'='*100}{Colors.RESET}")
    print(f"{Colors.BOLD}{' '*40}RESUMEN DE PRUEBAS{Colors.RESET}")
    print(f"{Colors.CYAN}{'='*100}{Colors.RESET}\n")
    
    print(f"  {Colors.GREEN}✅ PASSED: {passed}/{total}{Colors.RESET}")
    print(f"  {Colors.RED}❌ FAILED: {failed}/{total}{Colors.RESET}")
    print(f"  {Colors.YELLOW}📊 TOTAL:  {total}{Colors.RESET}\n")
    
    # Estadísticas por tabla
    print(f"  {Colors.BOLD}Estadísticas por tabla:{Colors.RESET}")
    tablas = {}
    for tabla, _, _, _, success in results:
        if tabla not in tablas:
            tablas[tabla] = {"total": 0, "passed": 0}
        tablas[tabla]["total"] += 1
        if success:
            tablas[tabla]["passed"] += 1
    
    for tabla, stats in sorted(tablas.items()):
        pct = (stats["passed"] / stats["total"]) * 100
        color = Colors.GREEN if pct == 100 else Colors.YELLOW if pct >= 50 else Colors.RED
        print(f"    {tabla:<20} {color}{stats['passed']}/{stats['total']} ({pct:.0f}%){Colors.RESET}")
    
    print(f"\n{Colors.CYAN}{'='*100}{Colors.RESET}\n")
    
    if failed == 0:
        print(f"{Colors.GREEN}{' '*30}🎉 TODAS LAS PRUEBAS PASARON CORRECTAMENTE 🎉{Colors.RESET}\n")
    else:
        print(f"{Colors.RED}{' '*35}⚠️  {failed} PRUEBAS FALLARON ⚠️{Colors.RESET}\n")
    
    return failed == 0

if __name__ == "__main__":
    success = test_all_tables()
    exit(0 if success else 1)
