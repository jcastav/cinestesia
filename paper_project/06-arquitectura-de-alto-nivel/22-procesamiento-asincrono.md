## 6.22. Procesamiento asíncrono

Las operaciones que no requieran respuesta síncrona inmediata podrán
ejecutarse mediante workers.

Ejemplos:

Discovery

Ingestion

Health Checks

Metadata enrichment

Report processing

Cache invalidation

Index synchronization

Background resolution

Analytics aggregation

Arquitectura inicial:

Core API

   │

   ▼

Queue

   │

   ├── Worker: Health

   ├── Worker: Ingestion

   └── Worker: Maintenance

Para el MVP podrá utilizarse Redis con una cola compatible con el stack
seleccionado.

No se requerirá introducir Kafka u otra plataforma de streaming
distribuido mientras el volumen y los requisitos operativos no lo
justifiquen.
