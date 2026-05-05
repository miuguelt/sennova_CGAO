#!/bin/bash
# ==========================================
# Script de Validación Anti-Hardcoding
# SENNOVA CGAO - DevBrain Security
# ==========================================
# Este script verifica que no existan valores hardcodeados
# que deberían estar en variables de entorno
# ==========================================

set -e

echo "🔍 Validando configuración anti-hardcoding..."
echo ""

ERRORS=0

# ==========================================
# 1. Buscar URLs hardcodeadas (excepto ejemplos/fallbacks)
# ==========================================
echo "📍 Verificando URLs hardcodeadas..."

# Buscar URLs de localhost que NO usen variables de entorno
if grep -r "http://localhost" \
    --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" \
    --include="*.py" \
    frontend/src backend/app 2>/dev/null | \
    grep -v "import.meta.env\|process.env\|os.getenv\|or \'http://\|fallback\|example\|// " || true; then
    echo "   ⚠️  Se encontraron posibles URLs hardcodeadas de localhost"
    ERRORS=$((ERRORS + 1))
else
    echo "   ✅ No se encontraron URLs hardcodeadas"
fi

# ==========================================
# 2. Buscar secrets/secrets hardcodeados
# ==========================================
echo ""
echo "🔐 Verificando secrets hardcodeados..."

# Patrones de secrets que NO deberían estar en el código
PATTERNS=(
    "jwt_secret.*=.*['\"][^'\"]{8,}['\"]"
    "secret.*=.*['\"][^'\"]{8,}['\"]"
    "password.*=.*['\"][^'\"]{8,}['\"]"
    "api_key.*=.*['\"][^'\"]{8,}['\"]"
    "token.*=.*['\"][^'\"]{20,}['\"]"
)

for pattern in "${PATTERNS[@]}"; do
    if grep -riE "$pattern" \
        --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" \
        --include="*.py" \
        frontend/src backend/app 2>/dev/null | \
        grep -vi "env\|getenv\|process.env\|os.getenv\|example\|test\|mock\|dummy" || true; then
        echo "   ⚠️  Posible secret hardcodeado encontrado con patrón: $pattern"
        ERRORS=$((ERRORS + 1))
    fi
done

if [ $ERRORS -eq 0 ]; then
    echo "   ✅ No se encontraron secrets hardcodeados"
fi

# ==========================================
# 3. Verificar que .env.example esté actualizado
# ==========================================
echo ""
echo "📋 Verificando .env.example..."

if [ ! -f ".env.example" ]; then
    echo "   ❌ ERROR: No existe archivo .env.example"
    ERRORS=$((ERRORS + 1))
elif [ ! -f "frontend/.env.example" ]; then
    echo "   ❌ ERROR: No existe archivo frontend/.env.example"
    ERRORS=$((ERRORS + 1))
else
    echo "   ✅ Archivos .env.example existen"
fi

# ==========================================
# 4. Verificar variables críticas en .env.example
# ==========================================
echo ""
echo "🔍 Verificando variables críticas documentadas..."

CRITICAL_VARS=(
    "JWT_SECRET"
    "ALLOWED_ORIGINS"
    "VITE_API_URL"
    "DATABASE_URL\|DB_PASSWORD"
    "DEBUG"
)

for var in "${CRITICAL_VARS[@]}"; do
    if ! grep -qE "^#?.*$var" .env.example 2>/dev/null; then
        echo "   ⚠️  Variable $var no documentada en .env.example"
        ERRORS=$((ERRORS + 1))
    fi
done

# ==========================================
# 5. Verificar que config.py/settings carguen desde env
# ==========================================
echo ""
echo "⚙️  Verificando carga de configuración..."

if [ -f "backend/app/config.py" ]; then
    if ! grep -q "os.getenv\|os.environ" backend/app/config.py; then
        echo "   ⚠️  config.py no parece cargar variables de entorno"
        ERRORS=$((ERRORS + 1))
    else
        echo "   ✅ Backend config.py usa variables de entorno"
    fi
else
    echo "   ⚠️  No se encontró backend/app/config.py"
fi

# ==========================================
# 6. Resumen
# ==========================================
echo ""
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
    echo "✅ VALIDACIÓN EXITOSA"
    echo "   No se encontraron problemas de hardcoding"
    echo "=========================================="
    exit 0
else
    echo "❌ VALIDACIÓN FALLIDA"
    echo "   Se encontraron $ERRORS problema(s)"
    echo "=========================================="
    echo ""
    echo "📖 Consulta la regla anti-hardcoding en:"
    echo "   - rules.md"
    echo "   - DEPLOY-CORS-FIX.md"
    echo ""
    exit 1
fi
