#!/bin/sh

# SENNOVA CGAO - Container Entrypoint
echo "🔧 Verificando integridad de la base de datos..."

# Esperar a que la base de datos esté lista
echo "⏳ Esperando a que la base de datos esté lista..."
DB_HOST=$(echo $DATABASE_URL | sed -e 's/.*@//' -e 's/:.*//' -e 's/\/.*//')
DB_PORT=$(echo $DATABASE_URL | sed -e 's/.*://' -e 's/\/.*//')

while ! pg_isready -h $DB_HOST -p ${DB_PORT:-5432} > /dev/null 2>1; do
  echo "... esperando a PostgreSQL en $DB_HOST:$DB_PORT ..."
  sleep 2
done

echo "✅ Base de datos detectada"

# Ejecutar script de reparación de esquema
python scripts/fix_db_schema.py

# Iniciar la aplicación
echo "🚀 Iniciando servidor FastAPI..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
