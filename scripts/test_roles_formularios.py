#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SENNOVA CGAO — Suite de Pruebas Cruzadas por Rol
================================================
Prueba todos los formularios (endpoints del backend) con cada usuario por separado,
verificando el control de acceso (RBAC) y generando reportes en consola e informe Markdown.
"""

import os
import sys
import requests
import json
import uuid
from datetime import datetime

BASE_URL = os.getenv('API_URL', 'http://localhost:8000')

class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    CYAN = "\033[96m"
    BLUE = "\033[94m"
    RESET = "\033[0m"
    BOLD = "\033[1m"

# Cuentas de desarrollo
DEV_ACCOUNTS = {
    "admin": {
        "email": "admin@sennova.dev.co",
        "password": "DevMiguel2024!",
        "label": "Administrador"
    },
    "investigador": {
        "email": "investigador@sennova.dev.co",
        "password": "DevMiguel2024!",
        "label": "Investigador"
    },
    "aprendiz": {
        "email": "aprendiz@sennova.dev.co",
        "password": "DevMiguel2024!",
        "label": "Aprendiz"
    }
}

def login_user(email, password):
    """Inicia sesión y obtiene token"""
    try:
        r = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password}, timeout=5)
        if r.status_code == 200:
            return r.json()["access_token"]
    except Exception as e:
        print(f"❌ Error conectando con el backend: {e}")
    return None

def test_roles_suite():
    print(f"\n{Colors.CYAN}{'='*80}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}🚀 SENNOVA CGAO - SUITE DE PRUEBAS DE FORMULARIOS POR ROL{Colors.RESET}")
    print(f"{Colors.CYAN}{'='*80}{Colors.RESET}\n")

    # 1. Autenticación de todos los roles
    tokens = {}
    headers = {}
    user_ids = {}
    print(f"{Colors.BOLD}🔐 Fase 1: Autenticación de usuarios de desarrollo...{Colors.RESET}")
    for role, creds in DEV_ACCOUNTS.items():
        token = login_user(creds["email"], creds["password"])
        if token:
            tokens[role] = token
            headers[role] = {"Authorization": f"Bearer {token}"}
            print(f"  ✅ Autenticado: {creds['label']} ({creds['email']})")
            
            # Obtener UUID del usuario
            try:
                r = requests.get(f"{BASE_URL}/auth/me", headers=headers[role], timeout=5)
                if r.status_code == 200:
                    user_ids[role] = r.json()["id"]
                    print(f"     UUID: {user_ids[role]}")
            except Exception as e:
                print(f"     ⚠️ Error al obtener UUID de {role}: {e}")
        else:
            print(f"  ❌ Error de autenticación: {creds['label']} ({creds['email']})")
            print(f"     Asegúrate de que el backend esté corriendo y se haya ejecutado seed_dev_users.py")
            return

    # 2. Configuración de Entidades Base (Usando Admin e Investigador para aislamiento de propiedad)
    # Necesitamos IDs reales para que las pruebas de otros roles verifiquen permisos y no fallas de 404.
    print(f"\n{Colors.BOLD}🛠️  Fase 2: Creación de entidades base para aislamiento de pruebas...{Colors.RESET}")
    admin_h = headers["admin"]
    investigador_h = headers["investigador"]
    entities = {}

    try:
        # A. Crear Convocatoria (vía Admin)
        conv_payload = {
            "numero_oe": f"OE-DEV-{str(uuid.uuid4())[:8]}",
            "nombre": "Convocatoria Base de Pruebas",
            "año": 2026,
            "estado": "abierta"
        }
        r = requests.post(f"{BASE_URL}/convocatorias", json=conv_payload, headers=admin_h)
        r.raise_for_status()
        entities["convocatoria_id"] = r.json()["id"]
        print(f"  🔹 Convocatoria Creada: {entities['convocatoria_id']}")

        # B. Crear Grupo (vía Admin)
        grupo_payload = {
            "nombre": f"Grupo Dev {str(uuid.uuid4())[:6]}",
            "codigo_gruplac": f"COLDEV{str(uuid.uuid4())[:6]}",
            "clasificacion": "A"
        }
        r = requests.post(f"{BASE_URL}/grupos", json=grupo_payload, headers=admin_h)
        r.raise_for_status()
        entities["grupo_id"] = r.json()["id"]
        print(f"  🔹 Grupo de Investigación Creado: {entities['grupo_id']}")

        # C. Crear Proyecto (vía Investigador para que sea el dueño)
        proyecto_payload = {
            "nombre": "Proyecto Base de Pruebas Cruzadas",
            "nombre_corto": f"PBASE-{str(uuid.uuid4())[:4]}",
            "estado": "Formulación",
            "convocatoria_id": entities["convocatoria_id"]
        }
        r = requests.post(f"{BASE_URL}/proyectos", json=proyecto_payload, headers=investigador_h)
        r.raise_for_status()
        entities["proyecto_id"] = r.json()["id"]
        print(f"  🔹 Proyecto Base Creado (Dueño: Investigador): {entities['proyecto_id']}")

        # D. Crear Semillero (vía Investigador para que sea el dueño)
        semillero_payload = {
            "nombre": "Semillero Base de Pruebas",
            "grupo_id": entities["grupo_id"],
            "estado": "activo"
        }
        r = requests.post(f"{BASE_URL}/semilleros", json=semillero_payload, headers=investigador_h)
        r.raise_for_status()
        entities["semillero_id"] = r.json()["id"]
        print(f"  🔹 Semillero Base Creado (Dueño: Investigador): {entities['semillero_id']}")

        # E. Crear Entrada de Bitácora (vía Investigador)
        bitacora_payload = {
            "titulo": "Entrada Base de Pruebas",
            "contenido": "Esta entrada será utilizada para probar la firma digital por parte de investigadores y aprendices.",
            "categoria": "técnica",
            "proyecto_id": entities["proyecto_id"]
        }
        r = requests.post(f"{BASE_URL}/bitacora", json=bitacora_payload, headers=investigador_h)
        r.raise_for_status()
        entities["bitacora_entry_id"] = r.json()["id"]
        print(f"  🔹 Entrada de Bitácora Creada: {entities['bitacora_entry_id']}")

    except Exception as e:
        print(f"❌ Error crítico preparando entidades base: {e}")
        return

    # 3. Matriz de Pruebas de Formularios
    # Lista de formularios a probar por cada rol por separado
    test_results = []

    tests_definition = [
        {
            "name": "Formulario Convocatoria (Crear)",
            "run": lambda h: requests.post(f"{BASE_URL}/convocatorias", json={
                "numero_oe": f"OE-TEST-{str(uuid.uuid4())[:8]}",
                "nombre": "Convocatoria Form Test",
                "año": 2026
            }, headers=h),
            "expected": {"admin": 201, "investigador": 403, "aprendiz": 403}
        },
        {
            "name": "Formulario Grupo (Crear)",
            "run": lambda h: requests.post(f"{BASE_URL}/grupos", json={
                "nombre": f"Grupo Form Test {str(uuid.uuid4())[:6]}",
                "codigo_gruplac": f"COLFORM{str(uuid.uuid4())[:6]}",
                "clasificacion": "C"
            }, headers=h),
            "expected": {"admin": 201, "investigador": 403, "aprendiz": 403}
        },
        {
            "name": "Formulario Proyecto (Crear)",
            "run": lambda h: requests.post(f"{BASE_URL}/proyectos", json={
                "nombre": "Proyecto Form Test",
                "nombre_corto": f"PFORM-{str(uuid.uuid4())[:4]}",
                "estado": "Formulación",
                "convocatoria_id": entities["convocatoria_id"]
            }, headers=h),
            "expected": {"admin": 201, "investigador": 201, "aprendiz": 403}
        },
        {
            "name": "Formulario Semillero (Crear)",
            "run": lambda h: requests.post(f"{BASE_URL}/semilleros", json={
                "nombre": f"Semillero Form Test {str(uuid.uuid4())[:6]}",
                "grupo_id": entities["grupo_id"],
                "estado": "activo"
            }, headers=h),
            "expected": {"admin": 201, "investigador": 201, "aprendiz": 403}
        },
        {
            "name": "Formulario Vincular Aprendiz",
            "run": lambda h: requests.post(f"{BASE_URL}/semilleros/{entities['semillero_id']}/aprendices", json={
                "user_id": user_ids.get("aprendiz"),
                "estado": "activo"
            }, headers=h),
            "expected": {"admin": 201, "investigador": 201, "aprendiz": 403}
        },
        {
            "name": "Formulario Producto (Crear)",
            "run": lambda h: requests.post(f"{BASE_URL}/productos", json={
                "tipo": "software",
                "nombre": "Producto Form Test",
                "proyecto_id": entities["proyecto_id"]
            }, headers=h),
            "expected": {"admin": 201, "investigador": 201, "aprendiz": 403}
        },
        {
            "name": "Formulario Cronograma (Generar)",
            "run": lambda h: requests.post(f"{BASE_URL}/entregables/proyecto/{entities['proyecto_id']}/generate-template", headers=h),
            "expected": {"admin": 200, "investigador": 200, "aprendiz": 403}
        },
        {
            "name": "Formulario Presupuesto (Generar)",
            "run": lambda h: requests.post(f"{BASE_URL}/proyectos/{entities['proyecto_id']}/generate-budget-template", headers=h),
            "expected": {"admin": 200, "investigador": 200, "aprendiz": 403}
        },
        {
            "name": "Formulario Bitácora (Crear)",
            "run": lambda h: requests.post(f"{BASE_URL}/bitacora", json={
                "titulo": "Bitácora Form Test",
                "contenido": "Esta es una entrada de bitácora técnica creada por un usuario de pruebas.",
                "categoria": "técnica",
                "proyecto_id": entities["proyecto_id"]
            }, headers=h),
            "expected": {"admin": 201, "investigador": 201, "aprendiz": 201}
        },
        {
            "name": "Formulario Firma Bitácora",
            "run": lambda h: requests.post(f"{BASE_URL}/bitacora/{entities['bitacora_entry_id']}/sign", json={}, headers=h),
            "expected": {"admin": 200, "investigador": 200, "aprendiz": 200}
        }
    ]

    print(f"\n{Colors.BOLD}🧪 Fase 3: Ejecutando matriz de pruebas cruzadas por rol...{Colors.RESET}")

    for test in tests_definition:
        results_for_test = {"name": test["name"]}
        for role in DEV_ACCOUNTS.keys():
            h = headers[role]
            expected_status = test["expected"][role]
            
            # Limpieza previa de estado si es necesario para evitar colisión de base de datos
            if test["name"] == "Formulario Vincular Aprendiz":
                try:
                    r = requests.get(f"{BASE_URL}/semilleros/{entities['semillero_id']}/aprendices", headers=admin_h)
                    if r.status_code == 200:
                        for a in r.json():
                            if str(a.get("user_id")) == str(user_ids.get("aprendiz")):
                                requests.delete(f"{BASE_URL}/semilleros/{entities['semillero_id']}/aprendices/{a['id']}", headers=admin_h)
                except Exception as e:
                    print(f"     ⚠️ Error en limpieza de vínculo de aprendiz: {e}")
            elif test["name"] == "Formulario Cronograma (Generar)":
                try:
                    r = requests.get(f"{BASE_URL}/entregables/proyecto/{entities['proyecto_id']}", headers=admin_h)
                    if r.status_code == 200:
                        for ent in r.json():
                            requests.delete(f"{BASE_URL}/entregables/{ent['id']}", headers=admin_h)
                except Exception as e:
                    print(f"     ⚠️ Error en limpieza de entregables: {e}")

            try:
                response = test["run"](h)
                status = response.status_code
                
                # Para simplificar la salida y la aserción
                is_ok = (status == expected_status)
                
                # Limpiar si se creó un recurso secundario y la prueba fue exitosa con admin
                if role == "admin" and status in [200, 201]:
                    try:
                        res_json = response.json()
                        created_id = res_json.get("id")
                        # Registrar para limpieza posterior
                        if "Convocatoria" in test["name"]:
                            entities[f"cleanup_conv_{created_id}"] = f"/convocatorias/{created_id}"
                        elif "Grupo" in test["name"]:
                            entities[f"cleanup_grupo_{created_id}"] = f"/grupos/{created_id}"
                        elif "Proyecto" in test["name"]:
                            entities[f"cleanup_proj_{created_id}"] = f"/proyectos/{created_id}"
                        elif "Semillero" in test["name"] and "Vincular" not in test["name"]:
                            entities[f"cleanup_sem_{created_id}"] = f"/semilleros/{created_id}"
                    except:
                        pass
                
                results_for_test[role] = {
                    "status": status,
                    "expected": expected_status,
                    "passed": is_ok
                }
            except Exception as e:
                results_for_test[role] = {
                    "status": "ERROR",
                    "expected": expected_status,
                    "passed": False,
                    "detail": str(e)
                }
        test_results.append(results_for_test)

    # 4. Presentar Resultados en Consola
    print(f"\n{Colors.BOLD}📊 Fase 4: Reporte de Resultados Obtenidos{Colors.RESET}")
    print(f"{Colors.BOLD}{'='*105}{Colors.RESET}")
    print(f"{Colors.BOLD}{'FORMULARIO / ENDPOINT':<35} | {'ADMINISTRADOR':<18} | {'INVESTIGADOR':<18} | {'APRENDIZ':<18}{Colors.RESET}")
    print(f"{Colors.BOLD}{'='*105}{Colors.RESET}")

    for r in test_results:
        cells = []
        for role in ["admin", "investigador", "aprendiz"]:
            info = r[role]
            color = Colors.GREEN if info["passed"] else Colors.RED
            status_txt = f"{info['status']} (Exp: {info['expected']})"
            res_txt = "OK" if info["passed"] else "FAIL"
            cells.append(f"{color}{status_txt:<12} {res_txt:<4}{Colors.RESET}")
        
        print(f"{r['name']:<35} | {cells[0]} | {cells[1]} | {cells[2]}")

    print(f"{Colors.BOLD}{'='*105}{Colors.RESET}\n")

    # 5. Fase de Limpieza
    print(f"{Colors.BOLD}🧹 Fase 5: Limpieza de entidades base creadas...{Colors.RESET}")
    # Limpiar en orden inverso de dependencias
    # A. Bitácoras
    try:
        r = requests.delete(f"{BASE_URL}/bitacora/{entities['bitacora_entry_id']}", headers=admin_h)
        if r.status_code == 200:
            print("  ✅ Entrada de Bitácora base eliminada.")
    except:
        pass

    # B. Semilleros creados temporalmente
    for k, v in list(entities.items()):
        if "cleanup_sem_" in k:
            try:
                requests.delete(f"{BASE_URL}{v}", headers=admin_h)
            except:
                pass

    try:
        r = requests.delete(f"{BASE_URL}/semilleros/{entities['semillero_id']}", headers=admin_h)
        if r.status_code == 200:
            print("  ✅ Semillero base eliminado.")
    except:
        pass

    # C. Proyectos creados temporalmente
    for k, v in list(entities.items()):
        if "cleanup_proj_" in k:
            try:
                requests.delete(f"{BASE_URL}{v}", headers=admin_h)
            except:
                pass

    try:
        r = requests.delete(f"{BASE_URL}/proyectos/{entities['proyecto_id']}", headers=admin_h)
        if r.status_code == 200:
            print("  ✅ Proyecto base eliminado.")
    except:
        pass

    # D. Grupos creados temporalmente
    for k, v in list(entities.items()):
        if "cleanup_grupo_" in k:
            try:
                requests.delete(f"{BASE_URL}{v}", headers=admin_h)
            except:
                pass

    try:
        r = requests.delete(f"{BASE_URL}/grupos/{entities['grupo_id']}", headers=admin_h)
        if r.status_code == 200:
            print("  ✅ Grupo de Investigación base eliminado.")
    except:
        pass

    # E. Convocatorias creadas temporalmente
    for k, v in list(entities.items()):
        if "cleanup_conv_" in k:
            try:
                requests.delete(f"{BASE_URL}{v}", headers=admin_h)
            except:
                pass

    try:
        r = requests.delete(f"{BASE_URL}/convocatorias/{entities['convocatoria_id']}", headers=admin_h)
        if r.status_code == 200:
            print("  ✅ Convocatoria base eliminada.")
    except:
        pass

    # 6. Generar Informe en Markdown (maintenance/test_roles_results.md)
    generate_markdown_report(test_results)

def generate_markdown_report(results):
    report_path = "maintenance/test_roles_results.md"
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(f"# Informe de Auditoría y Pruebas Cruzadas por Rol - SENNOVA CGAO\n\n")
        f.write(f"**Fecha y Hora:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"**Área Auditoría:** Control de Acceso basado en Roles (RBAC) para Formularios de Entrada\n\n")
        
        f.write(f"## 📊 Matriz de Resultados de Formularios\n\n")
        f.write(f"| Formulario / Módulo | Administrador (status / exp) | Investigador (status / exp) | Aprendiz (status / exp) | Estado final |\n")
        f.write(f"| :--- | :---: | :---: | :---: | :---: |\n")
        
        total_tests = 0
        passed_tests = 0
        
        for r in results:
            cells = []
            row_passed = True
            for role in ["admin", "investigador", "aprendiz"]:
                info = r[role]
                total_tests += 1
                if info["passed"]:
                    passed_tests += 1
                else:
                    row_passed = False
                
                passed_sym = "✅" if info["passed"] else "❌"
                cells.append(f"{passed_sym} {info['status']} (Exp: {info['expected']})")
            
            row_status = "🟢 APROBADO" if row_passed else "🔴 RECHAZADO"
            f.write(f"| **{r['name']}** | {cells[0]} | {cells[1]} | {cells[2]} | {row_status} |\n")
            
        f.write(f"\n## 📈 Resumen de Métricas de Seguridad (RBAC)\n\n")
        pct = (passed_tests / total_tests) * 100
        f.write(f"- **Total de Evaluaciones Individuales:** {total_tests}\n")
        f.write(f"- **Evaluaciones Exitosas:** {passed_tests}\n")
        f.write(f"- **Grado de Cumplimiento Normativo (RBAC):** **{pct:.1f}%**\n\n")
        
        if pct == 100.0:
            f.write(f"> [!NOTE]\n")
            f.write(f"> **CONFORMIDAD TOTAL:** El sistema cumple al 100% con las políticas de control de acceso. Los perfiles restrictivos (Investigador y Aprendiz) tienen bloqueados de forma segura los formularios administrativos, mientras que las operaciones colaborativas (como bitácoras y firmas digitales) funcionan perfectamente para los roles correspondientes.\n")
        else:
            f.write(f"> [!WARNING]\n")
            f.write(f"> **ALERTAS DE SEGURIDAD:** Existen fallos en las aserciones de control de acceso. Revise los endpoints marcados con ❌ en la matriz superior.\n")
            
    print(f"\n📂 {Colors.GREEN}Informe detallado guardado correctamente en: {report_path}{Colors.RESET}\n")

if __name__ == "__main__":
    test_roles_suite()
