#!/bin/bash

# Script para sanitizar cdk.out antes de commit para Snyk
# Reemplaza información sensible con valores genéricos

echo "🧹 Sanitizando cdk.out para Snyk..."

if [ ! -d "cdk.out" ]; then
    echo "❌ Directorio cdk.out no encontrado"
    exit 1
fi

# Reemplazar Account ID
echo "🔄 Reemplazando Account ID..."
find cdk.out -name "*.json" -exec sed -i.bak 's/605134457500/123456789012/g' {} +

# Reemplazar dominio personal
echo "🔄 Reemplazando dominio..."
find cdk.out -name "*.json" -exec sed -i.bak 's/javierba3\.com/example.com/g' {} +

# Reemplazar buckets CDK específicos
echo "🔄 Reemplazando buckets CDK..."
find cdk.out -name "*.json" -exec sed -i.bak 's/cdk-hnb659fds/cdk-bootstrap/g' {} +

# Limpiar archivos backup
find cdk.out -name "*.bak" -delete

echo "✅ Sanitización completada"
echo "💾 Backup guardado en cdk.out.backup"
echo "🔍 Ahora puedes commitear cdk.out para Snyk"
