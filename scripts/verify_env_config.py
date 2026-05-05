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
    required_vars = [
        'JWT_SECRET',
        'DB_PASSWORD',
        'ALLOWED_ORIGINS',
        'INITIAL_ADMIN_EMAIL',
        'INITIAL_ADMIN_PASSWORD'
    ]
    
    optional_vars = [
        'DATABASE_URL',
        'DB_HOST',
        'DB_PORT',
        'DB_NAME',
        'DB_USER',
        'HOST',
        'PORT',
        'ADDITIONAL_CORS_ORIGINS',
        'CVLAC_BASE_URL',
        'FRONTEND_URL',
        'BACKEND_URL',
        'DEBUG',
        'LOG_LEVEL',
        'MAX_UPLOAD_SIZE',
        'RATE_LIMIT_PER_MINUTE'
    ]
    
    print(check_color("\n✅ Variables requeridas:", "green"))
    all_required_ok = True
    for var in required_vars:
        value = os.getenv(var)
        if value:
            masked = value[:4] + "****" if len(value) > 8 else "****"
            print(f"   ✅ {var}: {masked} ({len(value)} chars)")
        else:
            print(f"   ❌ {var}: NO DEFINIDA")
            all_required_ok = False
    
    print(check_color("\n⚙️  Variables opcionales:", "yellow"))
    for var in optional_vars:
        value = os.getenv(var)
        if value:
            print(f"   ✅ {var}: {value[:30]}{'...' if len(value) > 30 else ''}")
        else:
            print(f"   ⚪ {var}: (usando default)")
    
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
    
    allowed_origins = os.getenv('ALLOWED_ORIGINS', '')
    if 'localhost' in allowed_origins and os.getenv('DEBUG', 'true').lower() != 'true':
        print(f"   ⚠️  ALLOWED_ORIGINS contiene 'localhost' pero DEBUG=false")
    elif 'localhost' in allowed_origins:
        print(f"   ✅ ALLOWED_ORIGINS: Configurado para desarrollo (localhost)")
    
    # Verificación de conectividad básica
    print(check_color("\n🌐 URLs configuradas:", "blue"))
    host = os.getenv('HOST', '127.0.0.1')
    port = os.getenv('PORT', '8000')
    frontend_url = os.getenv('FRONTEND_URL', f'http://localhost:{port}')
    backend_url = os.getenv('BACKEND_URL', f'http://{host}:{port}')
    
    print(f"   Backend URL: {backend_url}")
    print(f"   Frontend URL: {frontend_url}")
    
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
