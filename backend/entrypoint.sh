#!/bin/sh

# SENNOVA CGAO - Container Entrypoint
echo "🔧 Verificando integridad de la base de datos..."

# Ejecutar script de reparación de esquema
python scripts/fix_db_schema.py

# Iniciar la aplicación
echo "🚀 Iniciando servidor FastAPI..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
