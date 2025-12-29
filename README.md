# SDG19 Final

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
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=fjbatresv_sdg19-final&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=fjbatresv_sdg19-final)
[![Known Vulnerabilities](https://snyk.io/test/github/fjbatresv/sdg19-final/badge.svg)](https://snyk.io/test/github/fjbatresv/sdg19-final)



Proyecto final del curso de Arquitecto de Soluciones AWS. Monorepo con Angular, Lambdas y CDK.

## Apps

- `apps/web`: frontend Angular 21
- `apps/backend`: Lambdas y contrato OpenAPI
- `apps/infra`: infraestructura CDK (VPC, CloudFront, Route53, WAF, Cognito, DynamoDB, S3)

## Dominios

- Web: `https://finalweb.javierba3.com`
- API: `https://finalapi.javierba3.com`

## Arquitectura

Ver `ARCHITECTURE.md` y `architecture.drawio`.

## Sonar Cloud

- [![Bugs](https://sonarcloud.io/api/project_badges/measure?project=fjbatresv_sdg19-final&metric=bugs)](https://sonarcloud.io/summary/new_code?id=fjbatresv_sdg19-final)
- [![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=fjbatresv_sdg19-final&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=fjbatresv_sdg19-final)
- [![Coverage](https://sonarcloud.io/api/project_badges/measure?project=fjbatresv_sdg19-final&metric=coverage)](https://sonarcloud.io/summary/new_code?id=fjbatresv_sdg19-final)
- [![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=fjbatresv_sdg19-final&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=fjbatresv_sdg19-final)

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
AWS_REGION=us-east-1 npx cdk bootstrap aws://605134457500/us-east-1 -c hostedZoneId=xxxx
AWS_REGION=us-east-2 npx cdk bootstrap aws://605134457500/us-east-2 -c hostedZoneId=xxxx

AWS_REGION=us-east-2 npx cdk deploy Sdg19ReplicaStack --require-approval never -c hostedZoneId=xxxx
AWS_REGION=us-east-1 npx cdk deploy Sdg19PrimaryStack --require-approval never -c hostedZoneId=xxxx
```
