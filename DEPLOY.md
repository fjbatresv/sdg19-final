# Deploy

Guia de pasos previos al deploy para configurar Route53 y el acceso OIDC de
GitHub Actions.

## Prerequisitos

- Cuenta AWS con permisos para IAM, Route53 y CDK.
- Dominio registrado (ej. `tu-dominio.com`).
- Repo de GitHub donde corre el workflow de deploy.

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
   - `repo:<user>/<repository name>:*`
4. Crea el role con ese trust policy.
5. Adjunta la policy de permisos `oidc_role/permission-policy.json` luego de
   reemplazar el `ACCOUNT_ID`.
6. El nombre del role debe coincidir con `aws_role_name` en el workflow.

## Verificacion rapida

- El workflow `deploy.yml` debe poder asumir el role via OIDC.
- El deploy requiere el `hosted_zone_id` y los dominios en el `config_json`.

