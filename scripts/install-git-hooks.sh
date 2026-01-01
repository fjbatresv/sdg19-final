#!/bin/bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
HOOKS_DIR="$ROOT_DIR/.git/hooks"
SOURCE_DIR="$ROOT_DIR/scripts/git-hooks"

if [ ! -d "$HOOKS_DIR" ]; then
  echo "❌ No se encontró .git/hooks. Ejecuta este script desde un repo git."
  exit 1
fi

echo "🔧 Instalando hooks de git..."
install -m 755 "$SOURCE_DIR/pre-commit" "$HOOKS_DIR/pre-commit"
install -m 755 "$SOURCE_DIR/pre-push" "$HOOKS_DIR/pre-push"

echo "✅ Hooks instalados en .git/hooks"
