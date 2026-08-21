#!/bin/sh
# SENNOVA CGAO — Entrypoint del contenedor de backend.
#
# Deja la instalación lista antes de atender tráfico: espera la base de datos,
# crea/repara el esquema y crea el administrador inicial. Si el administrador no
# se puede crear de forma segura, el contenedor falla aquí en vez de publicar una
# instalación abierta.
set -e

if echo "$DATABASE_URL" | grep -q "sqlite"; then
  echo "✅ SQLite detectada (no se requiere espera de PostgreSQL)"
else
  echo "⏳ Esperando a que la base de datos esté lista..."
  # Preferir DB_HOST/DB_PORT explícitas; recurrir al parseo de DATABASE_URL solo
  # cuando el despliegue únicamente define la URL completa.
  WAIT_HOST="${DB_HOST:-$(echo "$DATABASE_URL" | sed -e 's/.*@//' -e 's/:.*//' -e 's/\/.*//')}"
  WAIT_PORT="${DB_PORT:-$(echo "$DATABASE_URL" | sed -e 's/.*://' -e 's/\/.*//')}"

  while ! pg_isready -h "$WAIT_HOST" -p "${WAIT_PORT:-5432}" > /dev/null 2>&1; do
    echo "... esperando a PostgreSQL en $WAIT_HOST:${WAIT_PORT:-5432} ..."
    sleep 2
  done

  echo "✅ Base de datos detectada"
fi

# Esquema + administrador inicial. Idempotente: en redespliegues no duplica nada
# ni reescribe credenciales existentes.
python scripts/bootstrap_initial_data.py

echo "🚀 Iniciando servidor FastAPI..."
if [ "$#" -gt 0 ]; then
  # Respeta el `command:` de docker compose (por ejemplo --workers).
  exec "$@"
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
