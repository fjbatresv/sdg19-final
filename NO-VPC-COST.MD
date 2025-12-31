📊 CONTEO DETALLADO DE RECURSOS:
================================
  12 AWS::IAM::Role
  11 AWS::Lambda::Function
  10 AWS::IAM::Policy
   7 AWS::Lambda::Permission
   7 AWS::ApiGatewayV2::Route
   7 AWS::ApiGatewayV2::Integration
   4 AWS::SQS::Queue
   3 Custom::S3AutoDeleteObjects
   3 AWS::S3::BucketPolicy
   3 AWS::S3::Bucket
   3 AWS::Logs::LogGroup
   3 AWS::Lambda::EventSourceMapping
   3 AWS::CloudWatch::Alarm
   2 AWS::SQS::QueuePolicy
   2 AWS::SNS::Subscription
   1 Custom::CrossRegionExportReader
   1 AWS::SNS::Topic
   1 AWS::SES::Template
   1 AWS::Route53::RecordSet
   1 AWS::Logs::ResourcePolicy
   1 AWS::KinesisFirehose::DeliveryStream
   1 AWS::Kinesis::Stream
   1 AWS::KMS::Key
   1 AWS::Glue::Table
   1 AWS::Glue::Database
   1 AWS::DynamoDB::Table
   1 AWS::CloudTrail::Trail
   1 AWS::CloudFront::ResponseHeadersPolicy
   1 AWS::CloudFront::Distribution
   1 AWS::CloudFront::CachePolicy
   1 AWS::CertificateManager::Certificate
   1 AWS::CDK::Metadata
   1 AWS::ApiGatewayV2::Stage
   1 AWS::ApiGatewayV2::Authorizer
   1 AWS::ApiGatewayV2::Api

💰 ESTIMACIÓN DE COSTOS DETALLADA:
==================================
🔸 COMPUTE & API:
  • 8x Lambda Functions: -15/mes
  • 1x API Gateway: .50/millón requests
  • 1x Kinesis Stream (on-demand): 5/mes
  • 1x Firehose: bash.029/GB

🔸 STORAGE:
  • 4x S3 Buckets: -10/mes
  • 1x DynamoDB Table: -5/mes
  • CloudWatch Logs: bash.50/GB

🔸 NETWORKING:
  • 2x CloudFront Distributions: -20/mes
  • Route53 Records: bash.50/zona + bash.40/millón queries
  • 1x ACM Certificate: GRATIS

🔸 MESSAGING:
  • 1x SNS Topic: bash.50/millón mensajes
  • 4x SQS Queues: bash.40/millón requests

🔸 SEGURIDAD & MONITOREO:
  • 1x KMS Key: /mes + bash.03/10K requests
  • 1x CloudTrail: /100K eventos
  • 3x CloudWatch Alarms: bash.10/alarma/mes
  • 1x SES Template: bash.10/1K emails

💡 ESTIMACIÓN TOTAL:
  📊 Uso Mínimo: ~0-50/mes
  📈 Uso Medio: ~0-100/mes
  🚀 Uso Alto: ~00-300/mes

⚠️  FACTORES QUE AFECTAN EL COSTO:
  • Tráfico web (CloudFront)
  • Requests API (Lambda + API Gateway)
  • Volumen de datos (S3 + DynamoDB)
  • Emails enviados (SES)
  • Logs generados (CloudWatch)

> ## 💰 ESTIMACIÓN DE COSTOS MENSUAL

### **📊 Recursos Desplegados:**
- **11 Lambda Functions** (8 de negocio + 3 CDK helpers)
- **2 CloudFront Distributions** (Web + API)
- **4 S3 Buckets** (Web, Data, Emails, Logs)
- **1 DynamoDB Table** (pay-per-request)
- **1 Kinesis Stream** (on-demand)
- **1 Firehose Delivery Stream**
- **4 SQS Queues** (con DLQs)
- **1 SNS Topic**
- **1 API Gateway HTTP API**
- **1 KMS Key**
- **1 CloudTrail**
- **3 CloudWatch Alarms**

### **💵 Costos Estimados por Categoría:**

🔸 COSTOS FIJOS (independientes del uso):
- Kinesis Stream (on-demand): ~$15/mes
- KMS Key: ~$1/mes
- Route53 Hosted Zone: ~$0.50/mes
- CloudWatch Alarms (3): ~$0.30/mes

🔸 COSTOS VARIABLES (dependen del uso):

| Servicio | Uso Bajo | Uso Medio | Uso Alto |
|----------|----------|-----------|----------|
| Lambda | $2-5 | $10-20 | $50-100 |
| API Gateway | $1-3 | $5-15 | $20-50 |
| CloudFront | $1-5 | $10-30 | $50-150 |
| S3 Storage | $1-3 | $5-15 | $20-50 |
| DynamoDB | $1-2 | $5-10 | $20-50 |
| SQS/SNS | $0.50 | $2-5 | $10-20 |
| CloudWatch Logs | $1-2 | $3-8 | $10-25 |
| SES | $0.10 | $1-3 | $5-15 |

### **🎯 ESTIMACIÓN TOTAL:**

- **💚 Uso Mínimo**: $25-35/mes
- **💛 Uso Medio**: $55-85/mes 
- **🔴 Uso Alto**: $150-300/mes

### **⚠️ Factores Críticos de Costo:**
1. Kinesis Stream: Mayor costo fijo ($15/mes)
2. CloudFront: Escala rápido con tráfico
3. Lambda invocations: Depende de requests API
4. S3 storage: Crece con datos del data lake

💡 Recomendación: Para desarrollo/testing, espera $30-50/mes. En producción con tráfico real, $60-120/mes.