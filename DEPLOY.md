# Deploy

Guia de pasos previos al deploy para configurar Route53 y el acceso OIDC de
GitHub Actions.

## Prerequisitos

- Cuenta AWS con permisos para IAM, Route53 y CDK.
- Dominio registrado (ej. `tu-dominio.com`).
- Repo de GitHub donde corre el workflow de deploy.
- Remitente SES (`ses.from`) con formato de email valido.

## 1) Hosted Zone en Route53

1. Crea un Hosted Zone publico para el dominio raiz.
2. Guarda el **Hosted Zone ID** (se usa en CDK).
3. Actualiza los name servers en tu registrador con los NS del Hosted Zone.

## 2) Identity Provider OIDC (GitHub Actions)

Crear el provider en IAM:

1. IAM -> Identity providers -> Add provider.
2. Tipo: **OpenID Connect**.
3. Provider URL: `https://token.actions.githubusercontent.com`.
4. Audience: `sts.amazonaws.com`.

Referencia: `oidc_role/identity-provider.json`.

## 3) Role OIDC + policy

1. IAM -> Roles -> Create role -> Web identity.
2. Selecciona el provider creado y el audience `sts.amazonaws.com`.
3. Reemplaza los placeholders en `oidc_role/trust-relationship.json`:
   - `$ACCOUNT_ID`
   - `repo:<user>/<repository name>:environment:aws`
4. Crea el role con ese trust policy.
5. Adjunta la policy de permisos `oidc_role/permission-policy.json` luego de
   reemplazar el `ACCOUNT_ID`.
6. El nombre del role debe coincidir con `aws_role_name` en el workflow.

### Environment `aws` (GitHub)

Los jobs de `deploy.yml` y `destroy.yml` que asumen el role corren en el
environment `aws`, por lo que el `sub` del token OIDC es
`repo:<user>/<repo>:environment:aws`. El trust policy acepta **solo** ese
`sub`: ninguna otra rama, PR o workflow puede asumir el role.

1. Settings -> Environments -> `aws` (se crea solo en la primera ejecución, o
   créalo antes).
2. Activa **Required reviewers** para aprobar cada deploy/destroy.
3. En **Deployment branches and tags** limita a `main`.

> Si tu role existente aún usa `repo:<user>/<repo>:*`, sigue funcionando, pero
> actualiza el trust policy al valor de arriba para cerrar el acceso desde
> otras ramas.

### Validación del `config_json`

La action `.github/actions/parse-config` valida el formato de cada campo
(cuenta de 12 dígitos, regiones, dominios, email SES, nombre de role, ARN KMS)
antes de exportarlos, y rechaza valores con saltos de línea para evitar
inyección de variables en `GITHUB_ENV`.

## Verificación rápida

- El workflow `deploy.yml` debe poder asumir el role via OIDC.
- El deploy requiere el `hosted_zone_id` y los dominios en el `config_json`.

## Documentación local

- Ejecuta `npm run docs:dev` para preview de Astro Starlight.
- Ejecuta `npm run docs:check` para validar TypeDoc + doc coverage.
- Usa `OPENAPI_BASE_URL=finalapi.tu-dominio.com` antes de `npm run docs:sync-openapi` para fijar el server por entorno.
- En despliegues del frontend, configura `window.__env.apiBaseUrl` en `apps/web/src/assets/env.js` para apuntar al dominio real de la API.
