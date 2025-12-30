# Caso de Uso: API de Ecommerce para Ventas Web (Documento original)

---

## Descripción del negocio

Una empresa quiere construir APIs de ecommerce moderna que sea altamente escalable, resiliente y eficiente.

La API permitirá generar órdenes de compra y procesar los pagos. Al realizar los pagos se deben enviar notificaciones de confirmación al cliente sobre el estado de sus pedidos.

Se espera un tráfico variable, con poco uso en la madrugada, pero con picos significativos durante eventos como Black Friday y campañas promocionales.

---

## Auditoría y retención de notificaciones

Las notificaciones (correos) enviadas se deberán guardar en un Bucket S3 para temas de auditoría por **10 años**, y replicadas en una región distinta a la principal.

---

## Integración con Data Lake (near real-time)

Además, el equipo de Data espera que todas estas órdenes sean enviadas por un servicio de mensajería/streaming a su plataforma Data Lake en **near real time** para hacer analítica con los datos.

---

## Requisitos de seguridad

Se debe tener capas de seguridad como:

- Autenticación de la API
- Permisos entre recursos
- Encriptación en tránsito y en reposo de los datos y objetos (**SSE-KMS**)
- Firewalls, etc.

---

## Exposición y dominio

- Exponer la API por un dominio amigable y seguro (**deseable**)

---

## Observabilidad

- Debe tener habilitado el monitoreo (logs, métricas)

---

## Optimización de costos

- Optimización de costos en transferencia de datos

---

## Red / VPC

- El segmento de red de la VPC será a su elección en caso aplique.
