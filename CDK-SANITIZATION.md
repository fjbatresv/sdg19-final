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
- `sanitize-cdk-out.sh` - Script de sanitización
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
# Regenerar y sanitizar
npx cdk synth
./sanitize-cdk-out.sh

# Verificar sanitización
grep -r "605134457500\|javierba3\.com" cdk.out/ || echo "✅ Sanitizado correctamente"
```
