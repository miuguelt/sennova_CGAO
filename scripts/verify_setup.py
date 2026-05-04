#!/usr/bin/env python3
"""
Script de verificación del sistema SENNOVA CGAO.
Verifica que el backend y frontend estén configurados correctamente.
"""

import sys
import subprocess
import json
from pathlib import Path

def check_color(text, color):
    """Add color to terminal output"""
    colors = {
        'green': '\033[92m',
        'red': '\033[91m',
        'yellow': '\033[93m',
        'blue': '\033[94m',
        'reset': '\033[0m'
    }
    return f"{colors.get(color, '')}{text}{colors['reset']}"

def run_command(cmd, cwd=None):
    """Run a shell command and return success status"""
    try:
        result = subprocess.run(
            cmd, 
            shell=True, 
            capture_output=True, 
            text=True, 
            cwd=cwd,
            timeout=10
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Command timed out"
    except Exception as e:
        return False, "", str(e)

def check_file_exists(path, description):
    """Check if a file exists"""
    if Path(path).exists():
        print(check_color(f"✅ {description}", "green"))
        return True
    else:
        print(check_color(f"❌ {description} NO ENCONTRADO", "red"))
        return False

def main():
    print(check_color("\n🔍 Verificando Sistema SENNOVA CGAO\n", "blue"))
    print("=" * 50)
    
    checks_passed = 0
    checks_total = 0
    
    # Directorio base
    base_dir = Path(__file__).parent.parent
    
    # ============================================
    # 1. Verificar estructura de archivos
    # ============================================
    print(check_color("\n📁 Estructura de Archivos:", "blue"))
    
    files_to_check = [
        ("backend/app/main.py", "Backend FastAPI"),
        ("backend/requirements.txt", "Dependencias Python"),
        ("backend/Dockerfile", "Dockerfile Backend"),
        ("src/api/config.js", "Configuración API Frontend"),
        ("src/App.jsx", "Aplicación React"),
        ("docker-compose.yml", "Docker Compose"),
        (".env.example", "Template de Variables"),
    ]
    
    for file_path, description in files_to_check:
        checks_total += 1
        if check_file_exists(base_dir / file_path, description):
            checks_passed += 1
    
    # ============================================
    # 2. Verificar Python y dependencias
    # ============================================
    print(check_color("\n🐍 Entorno Python:", "blue"))
    
    checks_total += 1
    success, _, _ = run_command("python --version")
    if success:
        print(check_color("✅ Python instalado", "green"))
        checks_passed += 1
    else:
        print(check_color("❌ Python no encontrado", "red"))
    
    backend_dir = base_dir / "backend"
    if backend_dir.exists():
        checks_total += 1
        success, _, _ = run_command("pip list | grep fastapi", cwd=str(backend_dir))
        if success:
            print(check_color("✅ FastAPI instalado", "green"))
            checks_passed += 1
        else:
            print(check_color("⚠️ FastAPI no instalado (ejecutar: pip install -r requirements.txt)", "yellow"))
    
    # ============================================
    # 3. Verificar Node.js y npm
    # ============================================
    print(check_color("\n📦 Entorno Node.js:", "blue"))
    
    checks_total += 1
    success, _, _ = run_command("node --version")
    if success:
        print(check_color("✅ Node.js instalado", "green"))
        checks_passed += 1
    else:
        print(check_color("❌ Node.js no encontrado", "red"))
    
    checks_total += 1
    success, _, _ = run_command("npm --version")
    if success:
        print(check_color("✅ npm instalado", "green"))
        checks_passed += 1
    else:
        print(check_color("❌ npm no encontrado", "red"))
    
    # ============================================
    # 4. Verificar Docker
    # ============================================
    print(check_color("\n🐳 Docker:", "blue"))
    
    checks_total += 1
    success, _, _ = run_command("docker --version")
    if success:
        print(check_color("✅ Docker instalado", "green"))
        checks_passed += 1
    else:
        print(check_color("⚠️ Docker no encontrado (opcional para deploy manual)", "yellow"))
    
    checks_total += 1
    success, _, _ = run_command("docker-compose --version")
    if success:
        print(check_color("✅ Docker Compose instalado", "green"))
        checks_passed += 1
    else:
        print(check_color("⚠️ Docker Compose no encontrado (opcional)", "yellow"))
    
    # ============================================
    # 5. Verificar configuración
    # ============================================
    print(check_color("\n⚙️  Configuración:", "blue"))
    
    checks_total += 1
    env_file = base_dir / ".env"
    if env_file.exists():
        print(check_color("✅ Archivo .env existe", "green"))
        checks_passed += 1
        
        # Verificar variables en .env
        env_content = env_file.read_text()
        required_vars = ["DB_PASSWORD", "JWT_SECRET"]
        for var in required_vars:
            if var in env_content:
                print(check_color(f"   ✅ Variable {var} configurada", "green"))
            else:
                print(check_color(f"   ⚠️ Variable {var} no encontrada en .env", "yellow"))
    else:
        print(check_color("⚠️ Archivo .env no existe (copiar desde .env.example)", "yellow"))
    
    # ============================================
    # 6. Verificar conectividad backend (si está corriendo)
    # ============================================
    print(check_color("\n🌐 Backend API:", "blue"))
    
    checks_total += 1
    success, stdout, _ = run_command("curl -s http://localhost:8000/health")
    if success and '"status"' in stdout:
        print(check_color("✅ Backend corriendo en localhost:8000", "green"))
        checks_passed += 1
        
        # Intentar obtener más info
        success, docs, _ = run_command("curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/docs")
        if success and docs.strip() == "200":
            print(check_color("   ✅ API Docs disponible en /docs", "green"))
    else:
        print(check_color("⚠️ Backend no responde en localhost:8000", "yellow"))
        print(check_color("   Para iniciar: cd backend && uvicorn app.main:app --reload", "yellow"))
    
    # ============================================
    # Resumen
    # ============================================
    print(check_color("\n" + "=" * 50, "blue"))
    print(check_color(f"\n📊 Resultado: {checks_passed}/{checks_total} verificaciones exitosas", "blue"))
    
    percentage = (checks_passed / checks_total) * 100 if checks_total > 0 else 0
    
    if percentage >= 80:
        print(check_color("\n✅ Sistema listo para usar/deploy!", "green"))
    elif percentage >= 50:
        print(check_color("\n⚠️ Sistema parcialmente configurado. Revisa los warnings arriba.", "yellow"))
    else:
        print(check_color("\n❌ Sistema no configurado correctamente. Revisa los errores arriba.", "red"))
    
    print(check_color("\n📚 Siguientes pasos:", "blue"))
    print("   1. Configurar variables en .env")
    print("   2. Iniciar backend: cd backend && uvicorn app.main:app --reload")
    print("   3. Iniciar frontend: npm run dev")
    print("   4. O usar Docker: docker-compose up -d")
    print("   5. Ver DEPLOY.md para instrucciones de deploy en Coolify")
    print()
    
    return 0 if percentage >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())
