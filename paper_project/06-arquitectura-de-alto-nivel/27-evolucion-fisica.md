## 6.27. Evolución física

La arquitectura podrá evolucionar únicamente cuando existan razones
medibles para hacerlo.

### Etapa 1 --- MVP

Web

Core API

PostgreSQL

Redis

Worker

Media Gateway

### Etapa 2 --- Separación operativa

Web/BFF

Core API

├── Catalog

├── Sources

├── Playback

└── Users

Resolver Workers

Health Workers

Media Gateway

Search Engine

### Etapa 3 --- Escala significativa

Los módulos que presenten necesidades independientes de:

- capacidad;

- disponibilidad;

- despliegue;

- aislamiento;

- seguridad;

- ownership;

podrán convertirse en servicios físicamente independientes.

Por tanto:

\> La transición a microservicios será consecuencia de necesidades
operativas demostradas y no un requisito previo del proyecto.
