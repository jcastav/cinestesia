# CURRENT_TASK

## Tarea actual

**v0.2.0-alpha — Catálogo mínimo. Plan aprobado por humano (2026-10-02). Luz verde.**

- Objetivo (§12.6): transformar el prototipo en una aplicación con catálogo persistente. Se introduce formalmente el **Motor de Catálogo**.
- Criterio de salida (§12.6): 1) crear contenido; 2) almacenarlo; 3) consultarlo; 4) visualizarlo desde frontend; 5) reproducir un contenido asociado a una fuente de prueba.
- Regla arquitectónica (§12.6): el Catalog es la fuente canónica de identidad. No confundir `MediaItem` con `Source` ni con `Playable Representation` (AGENTS §5, §8.85 regla 8).

## Plan de fases (aprobado)

Un commit coherente por fase; verificación entre cada una; typecheck/lint/build siempre.

### Fase A — Esquema de datos v2
- **Objetivo:** `MediaItem` completo + estructura episódica + géneros + external IDs en Postgres, con migración aplicada y seed enriquecido.
- **Archivos:** `apps/api/src/db/schema.ts` (media_items += original_title, release_date, runtime_seconds, publication_status, production_status, poster_url, backdrop_url, version; tablas genres, media_genres, media_external_ids, seasons, episodes; índices §6.34k); migración `apps/api/drizzle/0001_*.sql`; `db/seed.ts` (PUBLISHED + artwork + géneros + external id + serie demo 1×3 sin Source); `db/verify.ts`.
- **Verificación:** typecheck/lint/build + migración aplicada + seed idempotente ×2 + db:verify con tablas nuevas.
- **Commit:** `feat: esquema v2 del catalogo con estados, generos, external ids y estructura episodica (Fase A)`

### Fase B — Capa de aplicación del Catalog (repository + service + DTOs)
- **Objetivo:** separar HTTP de dominio y ampliar contratos, sin cambiar comportamiento de los 4 endpoints v0.1.
- **Archivos:** `packages/shared/src/index.ts` (PublicationStatus/ProductionStatus, MediaItemDetail, MediaListItem, página {page,limit,total}, códigos UNAUTHORIZED/CONFLICT); `apps/api/src/catalog/{repository,service,mapper}.ts`; refactor `routes/catalog.ts`, `routes/media.ts`; absorber `lib/media-mapper.ts`.
- **Verificación:** typecheck/lint/build + respuestas idénticas a v0.1 en los 4 endpoints (regresión).
- **Commit:** `feat: capa de repositorios y servicios del modulo Catalog (Fase B)`

### Fase C — Lectura pública completa
- **Objetivo:** «consultar»: listado paginado, detalle enriquecido, endpoint de episodios.
- **Archivos:** `routes/media.ts` += `GET /v1/media?page&limit` (solo PUBLISHED, meta page/limit/total, 400 params inválidos, limit máx 50), detalle enriquecido (genres/artwork/status/seasons resumen, §8.13), `GET /v1/media/{id}/seasons/{n}` (§8.14); dual id/slug (aprobado); featured con artwork; tests `node:test` nativos de validaciones del servicio.
- **Verificación:** curl (meta, filtro DRAFT, 400, serie demo 3 episodios, 404, regresión) + `pnpm test`.
- **Commit:** `feat: listado paginado, detalle completo y episodios (Fase C)`

### Fase D — Catalog Admin API con token («crear contenido»)
- **Objetivo:** crear/editar/publicar contenido por API con autorización mínima (decisión humana: token estático; RBAC real en v0.6/v0.8 → BACKLOG).
- **Archivos:** `routes/admin-media.ts` (`POST /v1/admin/media` 201, `PATCH /v1/admin/media/{mediaId}`); auth `Authorization: Bearer ADMIN_API_TOKEN` → 401 UNAUTHORIZED (capacidad catalog.write §8.76); validación enums, slug único → 409, genres upsert por slug, externalIds UNIQUE → 409, 422 INVALID_ARGUMENT; `server.ts`, `.env`/`.env.example`.
- **Verificación:** curl create → listado → detalle; sin token 401; duplicado 409; PATCH DRAFT→PUBLISHED; grep credenciales staged; typecheck/lint/build.
- **Commit:** `feat: Catalog Admin API con token estatico (Fase D)`

### Fase E — Frontend navegable
- **Objetivo:** «visualizarlo desde frontend»: listado paginado + detalle completo + estructura de series.
- **Archivos:** `lib/api.ts` (getCatalog/getSeason); nueva `app/catalog/page.tsx`; `app/media/[id]/page.tsx` (artwork, genres, status, selector de temporada si SERIES; Player solo contenido unitario); `app/page.tsx` (enlace Catálogo).
- **Verificación:** typecheck/lint/build + smoke HTML + revisión manual en navegador (paginar, serie demo con episodios, película reproduce).
- **Commit:** `feat: listado y detalle navegable del catalogo (Fase E)`

### Fase F — Cierre + tag
- **Objetivo:** cerrar versión con evidencia.
- **Archivos:** `CHANGELOG.md` (`[0.2.0-alpha]`), `DEVELOPMENT_STATE.md` (incluye hashes de fases A–E), `CURRENT_TASK.md`, `BACKLOG.md`.
- **Verificación:** 5 criterios de §12.6, 4 dimensiones de §12.17, checklist de §12.52, typecheck/lint/build, demo reproducible verificada por persona.
- **Commit + tag:** `v0.2.0-alpha`

## Decisiones aprobadas (ambigüedades resueltas)

1. Seasons/episodes: **sí, mínimo** (schema + endpoint + display). Creación por API → BACKLOG.
2. «Crear contenido»: **API admin con token estático** (`ADMIN_API_TOKEN`). Migración a RBAC (§8.76) en v0.6/v0.8 → BACKLOG.
3. Listado: **`GET /v1/media` paginado** (adición a §8, no definido allí) → BACKLOG.
4. **Resolución dual** en `GET /v1/media/{identifier}`: UUID→id, si no→slug (§6.34 `:slug` vs §8.13 `{mediaId}`).
5. External IDs: campo **`namespace`** (§7.27 prevalece sobre `provider` de §6.34).
6. Enums en **mayúsculas** (§7.17; ejemplos de §8 en minúsculas no son contrato).
7. 422→`INVALID_ARGUMENT`, 409→`CONFLICT`, 401→`UNAUTHORIZED` (§8.7 no define código para 422).
8. Tests con **`node:test` nativo** (cero dependencias): validaciones de servicio en Fase C.
9. Episodios **display-only** en v0.2 (sources es media-level; playback de episodios → v0.4) → BACKLOG.

## Fuera de alcance de v0.2

- **Versiones ajenas:** Search, Discovery & Ingestion (v0.3), Sources/Orchestrator (v0.4), Resolver/Gateway (v0.5), Identity (v0.6), Health (v0.7), Admin/CMS completo (v0.8).
- **Diferido §6.34:** caché Redis/CDN, eventos de dominio, Idempotency-Key, OCC completa con 409 (columna `version` sí), audit_log, métricas/tracing, rate limiting, feature flags.
- **Diferido §7:** `media_titles` (§7.28), `genre_translations` (§7.31), `media_assets` (§7.32), `metadata` JSONB, créditos/colecciones (ADR-CAT-02/05); `production_status` solo columna.
- **Sin infraestructura nueva** (AGENTS §15): no Redis, Elasticsearch, proveedor de auth, CDN ni microservicios.

## Notas de continuidad

- Estado factual del repo en `DEVELOPMENT_STATE.md`; deudas en `BACKLOG.md`.
- Contratos vigentes en `packages/shared/src/index.ts`.
- El endpoint `GET /v1/media/{mediaId}/playback` sigue temporal hasta PlaybackSession (BACKLOG de v0.1).
