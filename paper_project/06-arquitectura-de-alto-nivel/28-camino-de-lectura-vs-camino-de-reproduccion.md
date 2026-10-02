## 6.28. Camino de lectura vs. camino de reproducción

La arquitectura deberá diferenciar claramente dos tipos de tráfico.

### Catalog Path

Browser

   ↓

CDN

   ↓

Web / API

   ↓

Catalog

   ↓

Redis / PostgreSQL

Características:

- muchas solicitudes;

- payload pequeño;

- alta cacheabilidad;

- bajo consumo de ancho de banda por petición.

### Playback Path

Player

   ↓

Playback Orchestrator

   ↓

Resolver

   ↓

Gateway

   ↓

Media

Características:

- menor cantidad relativa de sesiones;

- mayor duración;

- tráfico potencialmente enorme;

- conexiones prolongadas;

- impacto directo sobre costos de egress;

- mayor sensibilidad a latencia, buffering y fallos.

No deberán dimensionarse ambos caminos como si fueran equivalentes.
