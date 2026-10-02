# CURRENT_TASK

## Tarea actual

**Ninguna en curso.** v0.1.0-alpha fue cerrada y verificada (tag `v0.1.0-alpha`, 2026-10-02).

## Próxima tarea (pendiente de luz verde humana)

**v0.2.0-alpha — Catálogo mínimo** (fuente: `paper_project/12-roadmap-riesgos-y-costos.md` §12.6).

### Objetivo

Transformar el prototipo en una aplicación que posea un catálogo persistente. Se introduce formalmente el **Motor de Catálogo**.

### Alcance según §12.6

- `MediaItem` completo;
- tipos de contenido;
- títulos;
- identificadores;
- slug;
- estado de publicación;
- página de detalle;
- listado básico;
- persistencia PostgreSQL;
- repositorios y servicios de aplicación;
- DTOs de Catalog.

### Regla arquitectónica (§12.6)

El Catalog será la fuente canónica de identidad del contenido. No confundir `MediaItem` con `Source` ni con `Playable Representation`.

### Criterio de salida (§12.6)

1. crear contenido;
2. almacenarlo;
3. consultarlo;
4. visualizarlo desde frontend;
5. reproducir un contenido asociado a una fuente de prueba.

### Qué NO hacer

Todo lo no listado arriba (AGENTS.md §3): múltiples fuentes, Discovery & Ingestion, Health, identidad, CMS, Ads, etc. No leer motores de la Sección 6 (archivos 34–44) hasta que la tarea lo requiera.

## Notas de continuidad

- Estado factual del repo en `DEVELOPMENT_STATE.md`.
- Deudas y decisiones abiertas en `BACKLOG.md`.
- Contratos vigentes en `packages/shared/src/index.ts`.
- El endpoint `GET /v1/media/{mediaId}/playback` es temporal hasta PlaybackSession (ver BACKLOG).
