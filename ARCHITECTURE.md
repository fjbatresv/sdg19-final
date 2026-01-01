# Architecture

Este documento resume la implementación en AWS basada en `architecture.drawio`.

## Componentes principales

- CloudFront (web): distribución para contenido estático en S3.
- CloudFront (api): distribución para API Gateway HTTP API.
- Route53: DNS para `finalweb` y `finalapi`.
- WAF: aplicado a ambas distribuciones.
- GitHub Actions OIDC: role por cuenta para desplegar sin llaves estáticas.
- VPC: subredes públicas/privadas con 3 NAT gateways (egress fijo).
- Cognito User Pool + Client: registro/login con JWT.
- API Gateway HTTP API: endpoints de auth, productos y órdenes.
- Lambdas: auth, products, orders, stream, options, email y data lake.
- Lambda de correos: consume SQS y envía por SES con plantilla, guarda copia en S3.
- DynamoDB: single-table con GSI para órdenes.
- SNS + SQS: stream de órdenes publica en SNS, SQS encola para envío de correo y data lake.
- Kinesis Data Stream + Firehose: ingestión de eventos de órdenes hacia S3 (data lake).
- S3:
  - `WebBucket`: sitio web
  - `DataBucket`: datos internos
  - `LogsBucket`: logs (retención 30 días)
  - `EmailsBucket`: correos con transición a Glacier a 1 año y expiración a 10 años
  - `EmailsReplicaBucket` (us-east-2): replica del bucket de emails
- SES: identidad de dominio + DKIM + MAIL FROM (subdominio mail.*) para envío.
- X-Ray: trazas activas para Lambdas.

## Flujo API

- Web -> CloudFront (API) -> API Gateway -> Lambdas
- Auth: /auth/register, /auth/login, /auth/refresh
- Productos: /products (cacheable en CloudFront)
- Órdenes: /orders (POST/GET) con JWT

## Flujo de correos

- DynamoDB Stream -> Lambda (order-stream) -> SNS (orders topic)
- SNS -> SQS (orders queue) -> Lambda (order-email)
- Lambda (order-email) -> SES (plantilla) + copia en S3 (EmailsBucket)

## Flujo de data lake

- SNS -> SQS (orders lake queue) -> Lambda (order-lake)
- Lambda (order-lake) -> Kinesis Data Stream -> Firehose -> S3 (DataBucket)

## Fases

- Fase 1: registro, autenticación, productos, órdenes, lectura de órdenes.
- Fase 2: envío de correos.
- Fase 3: data lake (SQS -> Lambda -> Kinesis -> Firehose -> S3).
- Fase 4: agregar Astro Starlight para documentación, playground de API y TypeDoc.
- Fase 5: agregar compodoc con github actions y github pages.
- Fase 6: cobertura de pruebas.
- Fase 7: limpiar Security Hotspots e issues de SonarCloud.

## CI/CD y multi-cuenta

Los JSON en `oidc_role/` permiten crear el Identity Provider OIDC y el role
para reutilizar el pipeline de deploy en otras cuentas:

- `oidc_role/identity-provider.json`: datos del OIDC provider.
- `oidc_role/trust-relationship.json`: trust policy (reemplazar placeholders).
- `oidc_role/permission-policy.json`: permisos mínimos (reemplazar placeholders).

Ver `DEPLOY.md` para el paso a paso.
