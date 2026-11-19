#!/bin/bash
# Sanitiza cdk.out antes de commitearlo (escaneo Snyk).
#
# No contiene valores reales: los datos a ocultar llegan por variables de entorno.
#   SANITIZE_ACCOUNT_IDS  IDs de cuenta AWS separados por espacio/coma
#                         (por defecto: AWS_ACCOUNT_ID / CDK_DEFAULT_ACCOUNT)
#   SANITIZE_DOMAINS      Dominios separados por espacio/coma
#                         (por defecto: ROOT_DOMAIN_NAME / ROOT_DOMAIN)
# Además, cualquier account ID de 12 dígitos dentro de un ARN se reemplaza
# siempre por 123456789012 como red de seguridad.
set -euo pipefail

PLACEHOLDER_ACCOUNT=123456789012
PLACEHOLDER_DOMAIN=example.com
OUT_DIR=${CDK_OUT_DIR:-cdk.out}

echo "🧹 Sanitizando ${OUT_DIR} para Snyk..."

if [ ! -d "$OUT_DIR" ]; then
  echo "❌ Directorio ${OUT_DIR} no encontrado"
  exit 1
fi

accounts=${SANITIZE_ACCOUNT_IDS:-${AWS_ACCOUNT_ID:-${CDK_DEFAULT_ACCOUNT:-}}}
domains=${SANITIZE_DOMAINS:-${ROOT_DOMAIN_NAME:-${ROOT_DOMAIN:-}}}

if [ -z "$accounts" ] || [ -z "$domains" ]; then
  if [ "${SANITIZE_STRICT:-false}" = "true" ]; then
    echo "❌ Define SANITIZE_ACCOUNT_IDS y SANITIZE_DOMAINS (SANITIZE_STRICT=true)"
    exit 1
  fi
  echo "⚠️  SANITIZE_ACCOUNT_IDS/SANITIZE_DOMAINS no definidos: solo se normalizan ARNs."
  echo "    Si cdk.out se generó con valores reales, exporta ambas variables."
fi

replace() {
  # $1 = expresión sed (ERE)
  find "$OUT_DIR" -name '*.json' -exec sed -E -i.bak "$1" {} +
}

for acct in ${accounts//,/ }; do
  if [[ ! $acct =~ ^[0-9]{12}$ ]]; then
    echo "❌ Account ID inválido en SANITIZE_ACCOUNT_IDS"
    exit 1
  fi
  [ "$acct" = "$PLACEHOLDER_ACCOUNT" ] && continue
  echo "🔄 Reemplazando account ID configurado..."
  replace "s/${acct}/${PLACEHOLDER_ACCOUNT}/g"
done

for domain in ${domains//,/ }; do
  if [[ ! $domain =~ ^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
    echo "❌ Dominio inválido en SANITIZE_DOMAINS"
    exit 1
  fi
  [ "$domain" = "$PLACEHOLDER_DOMAIN" ] && continue
  echo "🔄 Reemplazando dominio configurado..."
  replace "s/${domain//./\\.}/${PLACEHOLDER_DOMAIN}/g"
done

echo "🔄 Normalizando account IDs en ARNs..."
replace "s/(arn:aws[a-z-]*:[a-z0-9-]*:[a-z0-9-]*:)[0-9]{12}:/\\1${PLACEHOLDER_ACCOUNT}:/g"

echo "🔄 Reemplazando buckets CDK..."
replace 's/cdk-hnb659fds/cdk-bootstrap/g'

find "$OUT_DIR" -name '*.bak' -delete

echo "✅ Sanitización completada"
