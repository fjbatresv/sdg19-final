# Data Lake - Consumo y Validación

Guía rápida para consumir el data lake una vez desplegado y validar que sea
útil para el equipo de data.

## 1) Verifica llegada de datos en S3

- Ubica el bucket de data (`DataBucket`).
- Confirma prefijos con particiones por hora:
  `year=YYYY/month=MM/day=DD/hour=HH/`
- Espera archivos Parquet dentro de esos prefijos.

Si no hay data nueva:
- Revisa los logs de Firehose.
- Revisa la Lambda `order-lake` en CloudWatch.

## 2) Crea o actualiza el catálogo en Glue

Opción A (recomendada): Crawler
- Crea un crawler en AWS Glue apuntando al prefijo del data lake.
- Formato: Parquet.
- Ejecuta el crawler para generar la tabla.

Opción B: Tabla manual

```sql
CREATE EXTERNAL TABLE IF NOT EXISTS orders_lake (
  orderId string,
  userPk string,
  createdAt string,
  total double,
  status string
)
PARTITIONED BY (
  year string,
  month string,
  day string,
  hour string
)
STORED AS PARQUET
LOCATION 's3://<data-bucket>/orders/';
```

Luego:

```sql
MSCK REPAIR TABLE orders_lake;
SELECT count(*) FROM orders_lake;
SELECT * FROM orders_lake LIMIT 10;
```

## 3) Consultas rápidas en Athena

- Validar volumen:
  `SELECT count(*) FROM orders_lake;`
- Validar datos recientes:
  `SELECT * FROM orders_lake WHERE year='2026' AND month='01' LIMIT 50;`
- Validar totales:
  `SELECT sum(total) FROM orders_lake WHERE year='2026' AND month='01';`

## 4) Checklist de utilidad (equipo de data)

- Hay particiones recientes (últimas horas/días).
- El esquema es estable (orderId, userPk, createdAt, total, status).
- No hay PII sensible almacenada.
- Las consultas por particiones son rápidas.
- La data coincide con métricas básicas de la app (conteo de órdenes, totals).

## 5) Buenas prácticas operativas

- Ajustar el crawler a intervalos periódicos si hay cambios frecuentes.
- Mantener el particionado por hora para eficiencia de consultas.
- Revisar el costo de Athena y Firehose con métricas mensuales.
