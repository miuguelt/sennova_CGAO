#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════
# SENNOVA CGAO — Script de Ejecución de Poblado con Docker Compose
# ════════════════════════════════════════════════════════════════════════
# Este script detecta el estado de los contenedores y ejecuta el poblado
# masivo en la base de datos (mínimo 20 registros por tabla + usuarios test).
#
# Uso:
#   chmod +x scripts/poblar_db.sh
#   ./scripts/poblar_db.sh
# ════════════════════════════════════════════════════════════════════════

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "========================================================================"
echo "  🌱 SENNOVA CGAO — POBLAR BASE DE DATOS CON DOCKER COMPOSE"
echo "========================================================================"

# Verificar si docker compose está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker no está instalado o no se encuentra en el PATH."
    exit 1
fi

# Detectar si el backend ya está corriendo
if docker compose ps --services --filter "status=running" | grep -q "sennova-backend"; then
    echo "🚀 Servicio 'sennova-backend' detectado en ejecución."
    echo "📡 Ejecutando script de semillado dentro del contenedor activo..."
    docker compose exec sennova-backend python scripts/seed_database.py
else
    echo "📦 Contenedores no detectados en ejecución o backend apagado."
    echo "🔄 Ejecutando contenedor efímero mediante el servicio 'sennova-seed'..."
    docker compose --profile seed run --rm sennova-seed
fi

echo "========================================================================"
echo "  ✅ Proceso de poblado finalizado con éxito."
echo "========================================================================"
