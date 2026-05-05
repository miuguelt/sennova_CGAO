#!/usr/bin/env python3
"""
Prueba que el backend carga correctamente las variables de entorno.
Simula el comportamiento de config.py
"""

import os
import sys
from pathlib import Path

# Cargar .env
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(env_path)
except ImportError:
    print("⚠️  Instalando python-dotenv...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "python-dotenv", "-q"])
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(env_path)

def test_backend_env():
    print("=" * 60)
    print("🧪 PRUEBA DE CARGA DE CONFIGURACIÓN DEL BACKEND")
    print("=" * 60)
    
    print("\n📦 Variables desde .env:")
    print(f"   HOST: {os.getenv('HOST', '127.0.0.1')}")
    print(f"   PORT: {os.getenv('PORT', '8000')}")
    print(f"   DB_HOST: {os.getenv('DB_HOST', 'localhost')}")
    print(f"   DB_PORT: {os.getenv('DB_PORT', '5432')}")
    print(f"   DB_NAME: {os.getenv('DB_NAME', 'sennova')}")
    print(f"   DB_USER: {os.getenv('DB_USER', 'sennova')}")
    
    allowed = os.getenv('ALLOWED_ORIGINS', '')
    print(f"   ALLOWED_ORIGINS: {allowed[:60]}{'...' if len(allowed) > 60 else ''}")
    
    additional = os.getenv('ADDITIONAL_CORS_ORIGINS', '')
    print(f"   ADDITIONAL_CORS_ORIGINS: {additional[:50]}{'...' if len(additional) > 50 else ''}")
    
    print(f"   CVLAC_BASE_URL: {os.getenv('CVLAC_BASE_URL', '')}")
    
    print("\n🔐 Seguridad:")
    jwt = os.getenv('JWT_SECRET', '')
    print(f"   JWT_SECRET: {'*' * min(len(jwt), 8)} ({len(jwt)} chars)")
    print(f"   DEBUG mode: {os.getenv('DEBUG', 'false')}")
    
    print("\n🔗 URLs:")
    print(f"   FRONTEND_URL: {os.getenv('FRONTEND_URL', '')}")
    print(f"   BACKEND_URL: {os.getenv('BACKEND_URL', '')}")
    
    print("\n👤 Admin:")
    print(f"   INITIAL_ADMIN_EMAIL: {os.getenv('INITIAL_ADMIN_EMAIL', '')}")
    
    # Simular construcción de DATABASE_URL como en config.py
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        db_user = os.getenv('DB_USER', 'sennova')
        db_pass = os.getenv('DB_PASSWORD', '')
        db_host = os.getenv('DB_HOST', 'localhost')
        db_port = os.getenv('DB_PORT', '5432')
        db_name = os.getenv('DB_NAME', 'sennova')
        if db_pass:
            db_url = f"postgresql+psycopg://{db_user}:****@{db_host}:{db_port}/{db_name}"
        else:
            db_url = "sqlite:///./sennova.db"
    
    print(f"\n🗄️  DATABASE_URL: {db_url}")
    
    # Validaciones
    print("\n" + "=" * 60)
    print("✅ VALIDACIONES:")
    print("=" * 60)
    
    all_ok = True
    
    # JWT
    if len(jwt) < 32:
        print("   ❌ JWT_SECRET: Muy corto (min 32 chars)")
        all_ok = False
    else:
        print("   ✅ JWT_SECRET: Longitud correcta")
    
    # DB Password
    db_pass = os.getenv('DB_PASSWORD', '')
    if len(db_pass) < 12:
        print("   ❌ DB_PASSWORD: Muy corta (min 12 chars)")
        all_ok = False
    else:
        print("   ✅ DB_PASSWORD: Longitud adecuada")
    
    # CORS
    if 'localhost' in allowed:
        print("   ✅ ALLOWED_ORIGINS: Configurado para desarrollo")
    else:
        print("   ⚠️  ALLOWED_ORIGINS: No contiene localhost (¿producción?)")
    
    # Servidor
    host = os.getenv('HOST', '127.0.0.1')
    port = os.getenv('PORT', '8000')
    print(f"   ✅ Servidor: {host}:{port}")
    
    print("\n" + "=" * 60)
    if all_ok:
        print("✅ TODAS LAS VALIDACIONES PASARON")
        print("   El backend puede iniciar correctamente.")
    else:
        print("⚠️  ALGUNAS VALIDACIONES FALLARON")
        print("   Revisa la configuración antes de iniciar.")
    print("=" * 60)
    
    return all_ok

if __name__ == "__main__":
    success = test_backend_env()
    sys.exit(0 if success else 1)
