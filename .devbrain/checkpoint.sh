#!/bin/bash
# .devbrain/checkpoint.sh
# Guarda snapshot automático del trabajo en sesión
# Uso: ./.devbrain/checkpoint.sh [mensaje_opcional]

MSG="${1:-auto checkpoint $(date +%Y-%m-%d_%H:%M:%S)}"
BRANCH="auto/session-$(date +%Y%m%d-%H%M%S)"

echo "[DevBrain] Guardando checkpoint..."

# Verificar si estamos en un repo git
if [ ! -d ".git" ]; then
    echo "❌ ERROR: No hay repositorio Git. Ejecutar 'git init' primero."
    exit 1
fi

# Crear rama de checkpoint si no existe
git rev-parse --verify "$BRANCH" >/dev/null 2>&1 || git branch "$BRANCH" 2>/dev/null

# Stash + commit
git add -A
git commit -m "checkpoint: $MSG" --allow-empty 2>/dev/null

echo "✅ Checkpoint guardado."
echo "   Para revertir: git reset --hard HEAD~1"
echo "   Para ver diff: git diff HEAD~1 --stat"
