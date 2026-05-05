import os
import sys

# Mock settings - En producción todo viene de variables de entorno
class MockSettings:
    ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 
        'http://localhost:5173,http://localhost:3000,http://localhost:3001')
    DEBUG = os.getenv('DEBUG', 'true').lower() == 'true'

settings = MockSettings()

# Orígenes adicionales solo para desarrollo desde variable de entorno
additional_origins_str = os.getenv('ADDITIONAL_CORS_ORIGINS', '')
BASE_ORIGINS = [o.strip() for o in additional_origins_str.split(',') if o.strip()] if additional_origins_str else []

if settings.ALLOWED_ORIGINS:
    all_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")] + BASE_ORIGINS
else:
    all_origins = BASE_ORIGINS

ALLOWED_ORIGINS_LIST = list(set([o.strip() for o in all_origins if o]))
print(f"ALLOWED_ORIGINS_LIST: {ALLOWED_ORIGINS_LIST}")
