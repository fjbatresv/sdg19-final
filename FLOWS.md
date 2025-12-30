# Flujos (Mermaid)

Diagramas de secuencia para los flujos principales.

## Registro

```mermaid
sequenceDiagram
  actor User as Usuario
  participant Web as Web Angular
  participant API as API Gateway
  participant Auth as Lambda Auth
  participant Cognito as Cognito User Pool

  User->>Web: Completa formulario de registro
  Web->>API: POST /auth/register
  API->>Auth: Invoca handler
  Auth->>Cognito: SignUp
  Cognito-->>Auth: Tokens
  Auth-->>API: 200 OK + JWT
  API-->>Web: Respuesta
  Web-->>User: Sesion iniciada
```

## Login

```mermaid
sequenceDiagram
  actor User as Usuario
  participant Web as Web Angular
  participant API as API Gateway
  participant Auth as Lambda Auth
  participant Cognito as Cognito User Pool

  User->>Web: Ingresa credenciales
  Web->>API: POST /auth/login
  API->>Auth: Invoca handler
  Auth->>Cognito: InitiateAuth
  Cognito-->>Auth: Tokens
  Auth-->>API: 200 OK + JWT
  API-->>Web: Respuesta
  Web-->>User: Sesion iniciada
```

## Salida (logout)

```mermaid
sequenceDiagram
  actor User as Usuario
  participant Web as Web Angular

  User->>Web: Cierra sesion
  Web->>Web: Limpia localStorage
  Web-->>User: Redirige a /login
```

## Crear orden

```mermaid
sequenceDiagram
  actor User as Usuario
  participant Web as Web Angular
  participant API as API Gateway
  participant Orders as Lambda Orders
  participant DDB as DynamoDB

  User->>Web: Confirma compra
  Web->>API: POST /orders (JWT)
  API->>Orders: Invoca handler
  Orders->>DDB: PutItem (order)
  DDB-->>Orders: OK
  Orders-->>API: 201 Created
  API-->>Web: Respuesta
```

## Leer ordenes

```mermaid
sequenceDiagram
  actor User as Usuario
  participant Web as Web Angular
  participant API as API Gateway
  participant Orders as Lambda Orders
  participant DDB as DynamoDB

  User->>Web: Abre mis ordenes
  Web->>API: GET /orders (JWT)
  API->>Orders: Invoca handler
  Orders->>DDB: Query por userPk
  DDB-->>Orders: Items
  Orders-->>API: 200 OK + ordenes
  API-->>Web: Respuesta
```

## Enviar email al crear orden

```mermaid
sequenceDiagram
  participant DDB as DynamoDB
  participant Stream as DynamoDB Stream
  participant StreamFn as Lambda Order Stream
  participant SNS as SNS Orders Topic
  participant SQS as SQS Orders Queue
  participant EmailFn as Lambda Order Email
  participant SES as SES
  participant S3 as EmailsBucket

  DDB-->>Stream: Nuevo item
  Stream-->>StreamFn: Evento
  StreamFn->>SNS: Publish(order)
  SNS-->>SQS: Mensaje
  SQS-->>EmailFn: Evento
  EmailFn->>SES: Send templated email
  EmailFn->>S3: Guarda copia
```

## Envio a data lake al crear orden

```mermaid
sequenceDiagram
  participant SNS as SNS Orders Topic
  participant SQS as SQS Orders Lake Queue
  participant LakeFn as Lambda Order Lake
  participant Kinesis as Kinesis Data Stream
  participant Firehose as Firehose
  participant S3 as DataBucket

  SNS-->>SQS: Mensaje
  SQS-->>LakeFn: Evento
  LakeFn->>Kinesis: PutRecord
  Kinesis-->>Firehose: Stream
  Firehose-->>S3: Parquet particionado
```
