#!/bin/bash
# ==========================================
# SENNOVA CGAO - Script de Inicialización
# Para Coolify / Docker Compose
# ==========================================

set -e

echo "🚀 SENNOVA CGAO - Inicialización de Base de Datos"
echo "=================================================="

# Esperar a que PostgreSQL esté listo
echo "⏳ Esperando a PostgreSQL..."
until pg_isready -h postgres -U sennova -d sennova 2>/dev/null; do
    echo "   PostgreSQL no está listo aún - esperando..."
    sleep 2
done
echo "✅ PostgreSQL está listo"

# Verificar conexión
echo "🔍 Verificando conexión a la base de datos..."
if psql -h postgres -U sennova -d sennova -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Conexión exitosa"
else
    echo "❌ Error de conexión"
    exit 1
fi

# Verificar si ya existen tablas
echo "🔍 Verificando estado de la base de datos..."
TABLE_COUNT=$(psql -h postgres -U sennova -d sennova -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null || echo "0")
TABLE_COUNT=$(echo $TABLE_COUNT | xargs)

if [ "$TABLE_COUNT" -eq "0" ]; then
    echo "📦 Base de datos vacía - Las tablas se crearán automáticamente al iniciar el backend"
    echo "   El backend FastAPI ejecuta Base.metadata.create_all() en el startup"
else
    echo "✅ Base de datos ya contiene $TABLE_COUNT tablas"
fi

echo ""
echo "🎉 Inicialización completada"
echo "=================================================="
