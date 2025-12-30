# Proyecto Final - Curso de Arquitecto de Soluciones AWS

[![CI](https://github.com/fjbatresv/sdg19-final/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/fjbatresv/sdg19-final/actions/workflows/ci.yml)
[![Deploy](https://github.com/fjbatresv/sdg19-final/actions/workflows/deploy.yml/badge.svg?branch=develop)](https://github.com/fjbatresv/sdg19-final/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)
![Nx](https://img.shields.io/badge/Nx-143055?logo=nx&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-DD0031?logo=angular&logoColor=white)
![AWS CDK](https://img.shields.io/badge/AWS%20CDK-232F3E?logo=amazonaws&logoColor=white)
![AWS Lambda](https://img.shields.io/badge/AWS%20Lambda-FF9900?logo=awslambda&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-232F3E?logo=amazonaws&logoColor=white)
![DynamoDB](https://img.shields.io/badge/DynamoDB-4053D6?logo=amazondynamodb&logoColor=white)
![S3](https://img.shields.io/badge/S3-569A31?logo=amazons3&logoColor=white)
![CloudFront](https://img.shields.io/badge/CloudFront-232F3E?logo=amazonaws&logoColor=white)
![API Gateway](https://img.shields.io/badge/API%20Gateway-FF4F8B?logo=amazonapigateway&logoColor=white)
[![Known Vulnerabilities](https://snyk.io/test/github/fjbatresv/sdg19-final/badge.svg)](https://snyk.io/test/github/fjbatresv/sdg19-final)

Proyecto final del curso de Arquitecto de Soluciones AWS. Monorepo con Angular, Lambdas y CDK.

## Apps

- `apps/web`: frontend Angular 21
- `apps/backend`: Lambdas y contrato OpenAPI
- `apps/infra`: infraestructura CDK (VPC, CloudFront, Route53, WAF, Cognito, DynamoDB, S3)

## Dominios

- Web: `https://finalweb.<tu-dominio>`
- API: `https://finalapi.<tu-dominio>`

Los dominios se definen via contexto CDK o variables de entorno (`ROOT_DOMAIN_NAME`, `API_DOMAIN_NAME`, `WEB_DOMAIN_NAME`).

## Arquitectura

Ver `ARCHITECTURE.md` y `architecture.drawio`.

## SonarCloud Scan

|Infra|Web|Backend|
|-|-|-|
|[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=sdg19-infra&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=sdg19-infra)|[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=sdg19-web&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=sdg19-web)|[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=sdg19-backend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=sdg19-backend)|
|[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=sdg19-infra&metric=bugs)](https://sonarcloud.io/summary/new_code?id=sdg19-infra)|[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=sdg19-web&metric=bugs)](https://sonarcloud.io/summary/new_code?id=sdg19-web)|[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=sdg19-backend&metric=bugs)](https://sonarcloud.io/summary/new_code?id=sdg19-backend)|
|[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=sdg19-infra&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=sdg19-infra)|[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=sdg19-web&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=sdg19-web)|[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=sdg19-backend&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=sdg19-backend)|
|[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=sdg19-infra&metric=coverage)](https://sonarcloud.io/summary/new_code?id=sdg19-infra)|[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=sdg19-web&metric=coverage)](https://sonarcloud.io/summary/new_code?id=sdg19-web)|[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=sdg19-backend&metric=coverage)](https://sonarcloud.io/summary/new_code?id=sdg19-backend)|
|[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=sdg19-infra&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=sdg19-infra)|[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=sdg19-web&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=sdg19-web)|[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=sdg19-backend&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=sdg19-backend)|
|[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=sdg19-infra&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=sdg19-infra)|[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=sdg19-web&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=sdg19-web)|[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=sdg19-backend&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=sdg19-backend)|

## Desarrollo local

```bash
npx nx run web:serve
```

## Build

```bash
npx nx run @org/backend:build:production
npx nx run @org/infra:build:production
npx nx run web:build:production
```

## Deploy (local)

```bash
export AWS_PROFILE=xxxx
AWS_REGION=<PRINCIPAL_REGION> npx cdk bootstrap aws://<AWS_ACCOUNT_ID>/<PRINCIPAL_REGION> -c hostedZoneId=<HOSTED_ZONE_ID>
AWS_REGION=<SECONDARY_REGION> npx cdk bootstrap aws://<AWS_ACCOUNT_ID>/<SECONDARY_REGION> -c hostedZoneId=<HOSTED_ZONE_ID>

AWS_REGION=<SECONDARY_REGION> npx cdk deploy Sdg19ReplicaStack --require-approval never -c hostedZoneId=<HOSTED_ZONE_ID>
AWS_REGION=<PRINCIPAL_REGION> npx cdk deploy Sdg19PrimaryStack --require-approval never -c hostedZoneId=<HOSTED_ZONE_ID>
```

## Envio de correos (SES)

El stack crea la identidad de dominio SES, DKIM y MAIL FROM usando Route53.
Para enviar a cualquier destinatario necesitas sacar SES del sandbox.

Contexto recomendado en `cdk.json`:
- `rootDomainName`: dominio raiz (ej: `tu-dominio.com`) o `ROOT_DOMAIN_NAME`
- `apiDomainName`: dominio de API (ej: `finalapi.tu-dominio.com`) o `API_DOMAIN_NAME`
- `webDomainName`: dominio de web (ej: `finalweb.tu-dominio.com`) o `WEB_DOMAIN_NAME`
- `sesTemplateName`: nombre de plantilla SES (ej: `sdg19-order-confirmation`)
- `sesFromAddress`: remitente (ej: `noreply@tu-dominio`) o `SES_FROM_ADDRESS`
- `sesMailFromDomain`: subdominio MAIL FROM (ej: `mail.tu-dominio`) o `SES_MAIL_FROM_DOMAIN`

Ejemplo por CLI:

```bash
AWS_REGION=<PRINCIPAL_REGION> npx cdk deploy Sdg19PrimaryStack \
  -c hostedZoneId=<HOSTED_ZONE_ID> \
  -c rootDomainName=tu-dominio.com \
  -c apiDomainName=finalapi.tu-dominio.com \
  -c webDomainName=finalweb.tu-dominio.com \
  -c sesFromAddress=noreply@tu-dominio.com \
  -c sesMailFromDomain=mail.tu-dominio.com
```

Despues del deploy:
1. Verifica que los registros de Route53 se creen (DKIM + MAIL FROM).
2. Solicita salida de SES sandbox para enviar a cualquier correo. Guia oficial: https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html

## Data lake (Fase 3)

Los eventos de ordenes se publican en SNS y se derivan a una cola SQS dedicada.
Una Lambda consume esos mensajes, los escribe en un Kinesis Data Stream y un
Firehose los entrega al bucket de datos (`DataBucket`) bajo el prefijo
`data-lake/orders/`.
