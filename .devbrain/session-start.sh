#!/bin/bash
# .devbrain/session-start.sh
# Protocolo de inicio de sesión de agente DevBrain

echo "=========================================="
echo "  DevBrain Session Start Protocol"
echo "=========================================="

# 1. Verificar directorio prohibido
CWD=$(pwd)
if echo "$CWD" | grep -qiE "VALIDATED|backup|archive|tmp|duplicate"; then
    echo "❌ FATAL: Estás en un directorio prohibido: $CWD"
    echo "   Debes estar en: villaluz/frontend/src/"
    exit 1
fi

# 2. Verificar repo git
if [ ! -d ".git" ]; then
    echo "⚠️  Inicializando repositorio Git..."
    git init
    git add -A
    git commit -m "chore: inicialización del repositorio" --allow-empty
fi

# 3. Guardar estado actual
echo ""
echo "[1/4] Guardando checkpoint inicial..."
git add -A 2>/dev/null
git commit -m "checkpoint: inicio de sesión $(date +%Y-%m-%d_%H:%M:%S)" --allow-empty 2>/dev/null || true
TAG="session-start-$(date +%Y%m%d-%H%M%S)"
git tag "$TAG" 2>/dev/null || true
echo "   Tag creado: $TAG"

# 4. Verificar integridad
echo ""
echo "[2/4] Verificando integridad..."
bash .devbrain/integrity-check.sh || true

# 5. Mostrar archivos críticos
echo ""
echo "[3/4] Archivos críticos activos:"
grep -l "COMPONENTE CRÍTICO" frontend/src/shared/types/crud.ts frontend/src/widgets/admin-crud/ui/*.tsx frontend/src/pages/dashboard/admin/animals/index.tsx 2>/dev/null | while read f; do
    echo "   🛡️  $(basename $f)"
done

# 6. Recordatorio
echo ""
echo "[4/4] Recordatorios:"
echo "   • Solo editar en frontend/src/"
echo "   • Nunca crear carpetas duplicadas"
echo "   • Un cambio = un commit"
echo "   • Verificar build antes de terminar"
echo "   • Actualizar FEATURE_MANIFEST.md si agregas funcionalidad crítica"

echo ""
echo "✅ Protocolo de inicio completado. Puedes trabajar."
