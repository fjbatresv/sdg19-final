# CDK Output Sanitization for Snyk

Este proyecto incluye automatización para mantener `cdk.out` sanitizado y actualizado para escaneos de Snyk.

## 🔧 Configuración Automática

### Git Hooks Configurados:

**Pre-commit Hook:**
- Detecta cambios en código CDK
- Regenera templates automáticamente (`cdk synth`)
- Sanitiza información sensible
- Agrega archivos al commit

**Pre-push Hook:**
- Verifica que no haya información sensible
- Bloquea push si encuentra datos no sanitizados
- Garantiza seguridad antes de subir al repositorio

## 🚀 Workflow Automático

```bash
# 1. Modificas código CDK
vim apps/infra/lib/primary-stack.ts

# 2. Haces commit (automáticamente se ejecuta)
git add .
git commit -m "Update infrastructure"
# ↳ Pre-commit regenera y sanitiza cdk.out

# 3. Haces push (verificación automática)
git push origin main
# ↳ Pre-push verifica que esté sanitizado
```

## 📁 Archivos Incluidos

- `.git/hooks/pre-commit` - Regeneración y sanitización automática
- `.git/hooks/pre-push` - Verificación de seguridad
- `sanitize-cdk-out.sh` - Script de sanitización. No contiene datos reales: lee `SANITIZE_ACCOUNT_IDS` / `SANITIZE_DOMAINS` (o `AWS_ACCOUNT_ID` / `ROOT_DOMAIN_NAME`) y además normaliza cualquier account ID dentro de ARNs a `123456789012`.
- `.snyk` - Configuración de Snyk para escaneo selectivo

## ✅ Beneficios

- **Siempre actualizado**: cdk.out se regenera con cada cambio
- **Siempre sanitizado**: Información sensible reemplazada automáticamente
- **Snyk compatible**: Escaneo continuo de vulnerabilidades
- **Seguro**: Verificación antes de cada push
- **Automático**: Sin intervención manual necesaria

## 🔍 Verificación Manual

Si necesitas verificar manualmente:

```bash
# Regenerar y sanitizar (los valores reales sólo viven en tu entorno)
npx cdk synth
# Exporta tus valores reales (no se commitean), p. ej. en tu shell o direnv
export SANITIZE_ACCOUNT_IDS="111122223333" SANITIZE_DOMAINS="midominio.com"
./sanitize-cdk-out.sh

# Verificar sanitización con los mismos valores
grep -rE "${SANITIZE_ACCOUNT_IDS// /|}|${SANITIZE_DOMAINS// /|}" cdk.out/ || echo "✅ Sanitizado correctamente"
```
