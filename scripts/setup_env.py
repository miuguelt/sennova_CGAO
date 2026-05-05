#!/usr/bin/env python3
"""
Script para configurar/actualizar el archivo .env con todas las variables requeridas.
"""

import os
import sys
from pathlib import Path

def check_color(text, color):
    colors = {
        'green': '\033[92m', 'red': '\033[91m', 'yellow': '\033[93m',
        'blue': '\033[94m', 'cyan': '\033[96m', 'reset': '\033[0m'
    }
    return f"{colors.get(color, '')}{text}{colors['reset']}"

def setup_env():
    print(check_color("\n" + "=" * 70, "blue"))
    print(check_color("⚙️  CONFIGURACIÓN DE .ENV PARA DESARROLLO LOCAL", "blue"))
    print(check_color("=" * 70, "blue"))
    
    root_dir = Path(__file__).parent.parent
    env_file = root_dir / ".env"
    env_example = root_dir / ".env.example"
    
    # Variables por defecto para desarrollo local
    default_vars = {
        # Base de datos
        'DB_HOST': 'localhost',
        'DB_PORT': '5432',
        'DB_NAME': 'sennova',
        'DB_USER': 'sennova',
        'DB_PASSWORD': 'sennova_local_dev_2024',
        
        # JWT
        'JWT_SECRET': 'dev-secret-key-32-chars-long-min',
        'JWT_ALGORITHM': 'HS256',
        'JWT_EXPIRATION_HOURS': '24',
        
        # Admin inicial
        'INITIAL_ADMIN_EMAIL': 'admin@sena.edu.co',
        'INITIAL_ADMIN_PASSWORD': 'admin_local_dev_2024',
        
        # CORS
        'ALLOWED_ORIGINS': 'http://localhost:5173,http://localhost:3000,http://localhost:8000,http://127.0.0.1:5173',
        'ADDITIONAL_CORS_ORIGINS': 'http://localhost:3110,http://localhost:3100,http://localhost:3005',
        
        # Servidor
        'HOST': '127.0.0.1',
        'PORT': '8000',
        
        # URLs
        'FRONTEND_URL': 'http://localhost:5173',
        'BACKEND_URL': 'http://localhost:8000',
        
        # CVLAC
        'CVLAC_BASE_URL': 'http://scienti.colciencias.gov.co:8084',
        
        # Config
        'DEBUG': 'true',
        'LOG_LEVEL': 'INFO',
        'MAX_UPLOAD_SIZE': '50',
        'RATE_LIMIT_PER_MINUTE': '60',
    }
    
    # Leer .env actual si existe
    current_vars = {}
    if env_file.exists():
        print(f"\n📄 Leyendo .env existente...")
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    current_vars[key] = value
    
    # Determinar qué variables agregar/actualizar
    vars_to_add = {}
    vars_updated = {}
    
    for key, default_value in default_vars.items():
        if key not in current_vars:
            vars_to_add[key] = default_value
        elif current_vars[key] != default_value:
            # Variable existe pero con valor diferente
            pass  # Mantener valor existente
    
    # Mostrar estado
    print(check_color(f"\n📊 Estado actual:", "blue"))
    print(f"   Variables existentes: {len(current_vars)}")
    print(f"   Variables a agregar: {len(vars_to_add)}")
    
    if vars_to_add:
        print(check_color(f"\n📝 Variables que se agregarán:", "cyan"))
        for key, value in vars_to_add.items():
            masked = value[:4] + "****" if 'PASSWORD' in key or 'SECRET' in key else value
            print(f"   + {key}={masked}")
    
    # Preguntar confirmación
    if vars_to_add:
        print(check_color(f"\n⚠️  ATENCIÓN: Esto modificará el archivo .env", "yellow"))
        response = input(check_color("   ¿Deseas continuar? (s/N): ", "yellow")).strip().lower()
        
        if response not in ['s', 'si', 'yes', 'y']:
            print(check_color("\n❌ Cancelado por el usuario", "red"))
            return False
    else:
        print(check_color(f"\n✅ El .env ya tiene todas las variables necesarias", "green"))
        return True
    
    # Escribir/actualizar el .env
    print(check_color(f"\n💾 Actualizando .env...", "blue"))
    
    # Crear contenido nuevo preservando variables existentes
    new_content = []
    
    # Header
    new_content.append("# ==========================================")
    new_content.append("# SENNOVA CGAO - Variables de Entorno")
    new_content.append("# Auto-generado para desarrollo local")
    new_content.append("# ==========================================")
    new_content.append("")
    
    # Base de datos
    new_content.append("# 🗄️ BASE DE DATOS")
    new_content.append(f"DB_HOST={current_vars.get('DB_HOST', default_vars['DB_HOST'])}")
    new_content.append(f"DB_PORT={current_vars.get('DB_PORT', default_vars['DB_PORT'])}")
    new_content.append(f"DB_NAME={current_vars.get('DB_NAME', default_vars['DB_NAME'])}")
    new_content.append(f"DB_USER={current_vars.get('DB_USER', default_vars['DB_USER'])}")
    new_content.append(f"DB_PASSWORD={current_vars.get('DB_PASSWORD', default_vars['DB_PASSWORD'])}")
    new_content.append("")
    
    # JWT
    new_content.append("# 🔐 JWT")
    jwt_secret = current_vars.get('JWT_SECRET', default_vars['JWT_SECRET'])
    if len(jwt_secret) < 32:
        jwt_secret = default_vars['JWT_SECRET']
    new_content.append(f"JWT_SECRET={jwt_secret}")
    new_content.append(f"JWT_ALGORITHM={current_vars.get('JWT_ALGORITHM', default_vars['JWT_ALGORITHM'])}")
    new_content.append(f"JWT_EXPIRATION_HOURS={current_vars.get('JWT_EXPIRATION_HOURS', default_vars['JWT_EXPIRATION_HOURS'])}")
    new_content.append("")
    
    # Admin
    new_content.append("# 👤 ADMIN INICIAL")
    new_content.append(f"INITIAL_ADMIN_EMAIL={current_vars.get('INITIAL_ADMIN_EMAIL', default_vars['INITIAL_ADMIN_EMAIL'])}")
    new_content.append(f"INITIAL_ADMIN_PASSWORD={current_vars.get('INITIAL_ADMIN_PASSWORD', default_vars['INITIAL_ADMIN_PASSWORD'])}")
    new_content.append("")
    
    # CORS
    new_content.append("# 🌐 CORS")
    new_content.append(f"ALLOWED_ORIGINS={current_vars.get('ALLOWED_ORIGINS', default_vars['ALLOWED_ORIGINS'])}")
    new_content.append(f"ADDITIONAL_CORS_ORIGINS={current_vars.get('ADDITIONAL_CORS_ORIGINS', default_vars['ADDITIONAL_CORS_ORIGINS'])}")
    new_content.append("")
    
    # Servidor
    new_content.append("# 🖥️ SERVIDOR")
    new_content.append(f"HOST={current_vars.get('HOST', default_vars['HOST'])}")
    new_content.append(f"PORT={current_vars.get('PORT', default_vars['PORT'])}")
    new_content.append("")
    
    # URLs
    new_content.append("# 🔗 URLS")
    new_content.append(f"FRONTEND_URL={current_vars.get('FRONTEND_URL', default_vars['FRONTEND_URL'])}")
    new_content.append(f"BACKEND_URL={current_vars.get('BACKEND_URL', default_vars['BACKEND_URL'])}")
    if 'DATABASE_URL' in current_vars:
        new_content.append(f"DATABASE_URL={current_vars['DATABASE_URL']}")
    if 'VITE_API_URL' in current_vars:
        new_content.append(f"VITE_API_URL={current_vars['VITE_API_URL']}")
    new_content.append("")
    
    # CVLAC
    new_content.append("# 📚 CVLAC")
    new_content.append(f"CVLAC_BASE_URL={current_vars.get('CVLAC_BASE_URL', default_vars['CVLAC_BASE_URL'])}")
    new_content.append("")
    
    # Config
    new_content.append("# ⚙️ CONFIGURACIÓN")
    new_content.append(f"DEBUG={current_vars.get('DEBUG', default_vars['DEBUG'])}")
    new_content.append(f"LOG_LEVEL={current_vars.get('LOG_LEVEL', default_vars['LOG_LEVEL'])}")
    new_content.append(f"MAX_UPLOAD_SIZE={current_vars.get('MAX_UPLOAD_SIZE', default_vars['MAX_UPLOAD_SIZE'])}")
    new_content.append(f"RATE_LIMIT_PER_MINUTE={current_vars.get('RATE_LIMIT_PER_MINUTE', default_vars['RATE_LIMIT_PER_MINUTE'])}")
    
    # Escribir archivo
    with open(env_file, 'w') as f:
        f.write('\n'.join(new_content))
    
    print(check_color(f"\n✅ Archivo .env actualizado correctamente", "green"))
    print(f"   Ubicación: {env_file}")
    
    # Resumen
    print(check_color(f"\n📊 Resumen de configuración:", "blue"))
    print(f"   Host: {default_vars['HOST']}:{default_vars['PORT']}")
    print(f"   Base de datos: {default_vars['DB_USER']}@{default_vars['DB_HOST']}:{default_vars['DB_PORT']}/{default_vars['DB_NAME']}")
    print(f"   Admin: {default_vars['INITIAL_ADMIN_EMAIL']}")
    print(f"   CORS: localhost habilitado para desarrollo")
    
    print(check_color(f"\n💡 Próximos pasos:", "cyan"))
    print(f"   1. Verificar: python scripts/verify_env_config.py")
    print(f"   2. Iniciar backend: cd backend && python -m uvicorn app.main:app --reload")
    print(f"   3. Iniciar frontend: cd frontend && npm run dev")
    
    return True

if __name__ == "__main__":
    success = setup_env()
    sys.exit(0 if success else 1)
