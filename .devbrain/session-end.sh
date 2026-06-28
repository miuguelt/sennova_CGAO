#!/bin/bash
# .devbrain/session-end.sh
# Protocolo de cierre de sesión de agente DevBrain

echo "=========================================="
echo "  DevBrain Session End Protocol"
echo "=========================================="

# 1. Verificar que no hay archivos sin commitear
UNCOMMITTED=$(git status --short 2>/dev/null)
if [ -n "$UNCOMMITTED" ]; then
    echo ""
    echo "[1/5] Archivos sin commit detectados:"
    echo "$UNCOMMITTED"
    echo ""
    read -p "¿Deseas hacer commit automático? (s/n): " RESP
    if [ "$RESP" = "s" ]; then
        git add -A
        git commit -m "session-end: cambios de sesión $(date +%Y-%m-%d_%H:%M)"
    else
        echo "❌ ABORTADO - No puedes cerrar sesión con archivos sin commit"
        exit 1
    fi
else
    echo "[1/5] ✅ Sin archivos pendientes"
fi

# 2. Verificar build
if [ -f "frontend/package.json" ]; then
    echo ""
    echo "[2/5] Verificando build..."
    (cd frontend && npm run build >/dev/null 2>&1) && echo "   ✅ Build exitoso" || echo "   ⚠️  Build falló o no disponible"
fi

# 3. Verificar integridad
echo ""
echo "[3/5] Verificando integridad..."
bash .devbrain/integrity-check.sh || true

# 4. Actualizar FEATURE_MANIFEST si se agregó funcionalidad crítica
echo ""
echo "[4/5] Si agregaste funcionalidad crítica:"
echo "   • Actualiza FEATURE_MANIFEST.md"
echo "   • Agrega header ⚠️ COMPONENTE CRÍTICO al archivo"

# 5. Tag de fin de sesión
echo ""
echo "[5/5] Creando tag de sesión..."
TAG="session-end-$(date +%Y%m%d-%H%M%S)"
git tag "$TAG" 2>/dev/null || true
echo "   Tag creado: $TAG"

echo ""
echo "✅ Protocolo de cierre completado. Sesión finalizada."
