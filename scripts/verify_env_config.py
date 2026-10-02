#!/usr/bin/env python3
"""
Script de verificación de configuración de variables de entorno.
Comprueba que todas las variables requeridas estén definidas y sean válidas.
"""

import os
import sys
from pathlib import Path

# Cargar variables de entorno desde .env
try:
    from dotenv import load_dotenv
    root_dir = Path(__file__).parent.parent
    env_file = root_dir / ".env"
    if env_file.exists():
        load_dotenv(env_file)
        ENV_LOADED = True
    else:
        ENV_LOADED = False
except ImportError:
    ENV_LOADED = False
    print("⚠️  python-dotenv no instalado. Instalando...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "python-dotenv", "-q"])
    from dotenv import load_dotenv
    root_dir = Path(__file__).parent.parent
    env_file = root_dir / ".env"
    if env_file.exists():
        load_dotenv(env_file)
        ENV_LOADED = True

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

def test_env_loading():
    """Prueba que las variables de entorno se carguen correctamente"""
    print(check_color("\n" + "=" * 60, "blue"))
    print(check_color("🔍 VERIFICACIÓN DE VARIABLES DE ENTORNO", "blue"))
    print(check_color("=" * 60, "blue"))
    
    # Verificar archivo .env existe
    root_dir = Path(__file__).parent.parent
    env_file = root_dir / ".env"
    
    print(f"\n📁 Ubicación del proyecto: {root_dir}")
    print(f"📄 Archivo .env: {'✅ EXISTE' if env_file.exists() else '❌ NO ENCONTRADO'}")
    print(f"📥 Variables cargadas desde .env: {'✅ SÍ' if ENV_LOADED else '❌ NO (¿falta python-dotenv?)'}")
    
    if not env_file.exists():
        print(check_color("\n⚠️  El archivo .env no existe.", "yellow"))
        print("   Copia desde .env.example:")
        print(f"   cp {root_dir / '.env.example'} {env_file}")
        return False
    
    # Leer variables del archivo .env manualmente para verificar
    print(check_color("\n📋 Contenido del .env (sin valores sensibles):", "blue"))
    try:
        with open(env_file, 'r') as f:
            lines = f.readlines()
        
        vars_found = []
        for line in lines:
            line = line.strip()
            if line and not line.startswith('#'):
                if '=' in line:
                    key = line.split('=')[0]
                    vars_found.append(key)
                    masked = line.split('=')[0] + '=' + '*' * min(len(line.split('=')[1]), 8)
                    print(f"   {masked}")
    except Exception as e:
        print(check_color(f"   Error leyendo .env: {e}", "red"))
    
    # Variables requeridas
    required_vars = ['DB_PASSWORD', 'JWT_SECRET', 'INITIAL_ADMIN_PASSWORD']
    
    print(check_color("\n✅ Variables requeridas:", "green"))
    all_required_ok = True
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"   ✅ {var}: CONFIGURADA ({len(value)} caracteres)")
        else:
            print(f"   ❌ {var}: NO DEFINIDA")
            all_required_ok = False
    
    # Validaciones específicas
    print(check_color("\n🔐 Validaciones de seguridad:", "blue"))
    
    jwt_secret = os.getenv('JWT_SECRET', '')
    if jwt_secret:
        if 'change' in jwt_secret.lower() or 'default' in jwt_secret.lower() or len(jwt_secret) < 32:
            print(f"   ⚠️  JWT_SECRET: Parece ser un valor por defecto o muy corto ({len(jwt_secret)} chars)")
            print(f"      Genera uno nuevo con: openssl rand -base64 32")
        else:
            print(f"   ✅ JWT_SECRET: Parece seguro ({len(jwt_secret)} chars)")
    
    db_password = os.getenv('DB_PASSWORD', '')
    if db_password:
        if len(db_password) < 12:
            print(f"   ⚠️  DB_PASSWORD: Muy corta ({len(db_password)} chars, recomendado 12+)")
        else:
            print(f"   ✅ DB_PASSWORD: Longitud adecuada ({len(db_password)} chars)")
    
    # Resumen
    print(check_color("\n" + "=" * 60, "blue"))
    if all_required_ok:
        print(check_color("✅ TODAS LAS VARIABLES REQUERIDAS ESTÁN CONFIGURADAS", "green"))
    else:
        print(check_color("❌ FALTAN VARIABLES REQUERIDAS", "red"))
    print(check_color("=" * 60, "blue"))
    
    return all_required_ok

if __name__ == "__main__":
    success = test_env_loading()
    sys.exit(0 if success else 1)
