#!/bin/bash
# .devbrain/integrity-check.sh
# Verifica integridad del código fuente antes de ediciones

echo "[DevBrain] Verificando integridad del proyecto..."
ERRORS=0

# 1. Verificar que no hay archivos minificados/corruptos (archivos .tsx con < 5 líneas)
echo ""
echo "--- 1. Archivos potencialmente corruptos (< 5 líneas) ---"
CORRUPT=$(find frontend/src -name "*.tsx" -print0 2>/dev/null | xargs -0 awk 'END{if(NR<5) print FILENAME}')
if [ -n "$CORRUPT" ]; then
    echo "⚠️  Archivos sospechosamente cortos encontrados:"
    echo "$CORRUPT"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ OK - No hay archivos mínimos"
fi

# 2. Verificar que no se editó en directorios prohibidos
echo ""
echo "--- 2. Directorios prohibidos ---"
PROHIBITED=$(git status --short 2>/dev/null | grep -E "frontend_VALIDATED|_archive/|backup/|tmp/" || true)
if [ -n "$PROHIBITED" ]; then
    echo "❌ ERROR: Se detectaron ediciones en directorios prohibidos:"
    echo "$PROHIBITED"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ OK - Sin ediciones en directorios prohibidos"
fi

# 3. Verificar que hay un repo git inicializado
echo ""
echo "--- 3. Repositorio Git ---"
if [ -d ".git" ]; then
    echo "✅ OK - Repo Git inicializado"
    COMMITS=$(git rev-list --count HEAD 2>/dev/null || echo "0")
    echo "   Commits en rama actual: $COMMITS"
else
    echo "❌ ERROR: No hay repositorio Git"
    ERRORS=$((ERRORS + 1))
fi

# 4. Verificar archivos duplicados sospechosos
echo ""
echo "--- 4. Archivos duplicados (mismo nombre en múltiples rutas) ---"
DUPS=$(find frontend/src -name "*.tsx" -printf "%f\n" 2>/dev/null | sort | uniq -d | head -5)
if [ -n "$DUPS" ]; then
    echo "⚠️  Nombres de archivo duplicados (pueden ser copias):"
    echo "$DUPS"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ OK - Sin duplicados obvios"
fi

# 5. Verificar build disponible
echo ""
echo "--- 5. Build disponible ---"
if [ -f "frontend/package.json" ]; then
    if grep -q '"build"' frontend/package.json; then
        echo "✅ OK - Script 'build' disponible en frontend"
    else
        echo "⚠️  Script 'build' NO encontrado en frontend/package.json"
    fi
else
    echo "⚠️  No se encontró frontend/package.json"
fi

echo ""
if [ $ERRORS -eq 0 ]; then
    echo "🟢 INTEGRIDAD VERIFICADA - Todo OK"
    exit 0
else
    echo "🔴 INTEGRIDAD COMPROMETIDA - $ERRORS problema(s) encontrado(s)"
    exit 1
fi
