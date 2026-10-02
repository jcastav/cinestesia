## 6.10. Source Registry

El documento original coloca parte del estado de las fuentes dentro del
Motor de Fuentes/Extractor. En la arquitectura revisada conviene
establecer explícitamente un **Source Registry**.

Su modelo conceptual será:

MediaItem / Episode

          │

          │ 1:N

          ▼

       Source

          │

          ├── Provider

          ├── Adapter

          ├── Language

          ├── Declared Quality

          ├── Priority

          ├── Health

          ├── Status

          └── Operational Metadata

El Registry será responsable de la identidad y estado lógico de una
Source.

El Resolver será responsable de resolverla.

Esta separación evita convertir al Extractor simultáneamente en:

- inventario;

- base de datos;

- selector;

- scraper;

- health checker;

- resolver.
