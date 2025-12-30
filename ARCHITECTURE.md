# Architecture

Este documento resume la implementacion en AWS basada en `architecture.drawio`.

## Componentes principales

- CloudFront (web): distribucion para contenido estatico en S3.
- CloudFront (api): distribucion para API Gateway HTTP API.
- Route53: DNS para `finalweb` y `finalapi`.
- WAF: aplicado a ambas distribuciones.
- VPC: subredes publicas/privadas con 3 NAT gateways (egress fijo).
- Cognito User Pool + Client: registro/login con JWT.
- API Gateway HTTP API: endpoints de auth, productos y ordenes.
- Lambdas: auth, products, orders, stream, options, email y data lake.
- Lambda de correos: consume SQS y envia por SES con plantilla, guarda copia en S3.
- DynamoDB: single-table con GSI para ordenes.
- SNS + SQS: stream de ordenes publica en SNS, SQS encola para envio de correo y data lake.
- Kinesis Data Stream + Firehose: ingestion de eventos de ordenes hacia S3 (data lake).
- S3:
  - `WebBucket`: sitio web
  - `DataBucket`: datos internos
  - `LogsBucket`: logs (retencion 30 dias)
  - `EmailsBucket`: correos con transición a Glacier a 1 año y expiración a 1 año
  - `EmailsReplicaBucket` (us-east-2): replica del bucket de emails
- SES: identidad de dominio + DKIM + MAIL FROM (subdominio mail.*) para envio.
- X-Ray: trazas activas para lambdas.

## Flujo API

- Web -> CloudFront (API) -> API Gateway -> Lambdas
- Auth: /auth/register, /auth/login, /auth/refresh
- Productos: /products (cacheable en CloudFront)
- Ordenes: /orders (POST/GET) con JWT

## Flujo de correos

- DynamoDB Stream -> Lambda (order-stream) -> SNS (orders topic)
- SNS -> SQS (orders queue) -> Lambda (order-email)
- Lambda (order-email) -> SES (plantilla) + copia en S3 (EmailsBucket)

## Flujo de data lake

- SNS -> SQS (orders lake queue) -> Lambda (order-lake)
- Lambda (order-lake) -> Kinesis Data Stream -> Firehose -> S3 (DataBucket)

## Fases

- Fase 1: registro, autenticacion, productos, ordenes, lectura de ordenes
- Fase 2: envio de correos
- Fase 3: data lake (SQS -> Lambda -> Kinesis -> Firehose -> S3)
