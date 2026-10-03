# DEVELOPMENT_STATE

Estado factual del repositorio. Nunca declarar terminado algo que no fue verificado (AGENTS.md §10).

## Versión actual

v0.1.0-alpha — **CERRADA** (tag `v0.1.0-alpha`, 2026-10-02). En curso: **v0.2.0-alpha — Catálogo mínimo** (plan aprobado en `CURRENT_TASK.md`).

## Último slice completado

**v0.1.0-alpha — Primer Vertical Slice** (§12.5): los 7 criterios de salida cumplidos y verificados (reproducción visual confirmada por persona el 2026-10-02).

## Trabajo actual

**v0.2.0-alpha — Fase A (esquema de datos v2) completada y verificada:** migración `0001` aplicada en Supabase (media_items completo + genres/media_genres/media_external_ids/seasons/episodes + índices), seed enriquecido idempotente (película PUBLISHED + serie demo con 1 temporada/3 episodios sin Source), `db:verify` con conteos nuevos. typecheck/lint/build en verde.

## Trabajo pendiente inmediato

**Fase B** del plan de `CURRENT_TASK.md`: capa repository/service del módulo Catalog + ampliación de DTOs compartidos, sin cambio de comportamiento de los 4 endpoints v0.1.

## Decisiones recientes

- `paper_project/` tratado como especificación vinculante del proyecto.
- Sección 6 (`06-arquitectura-de-alto-nivel/00–33`) = arquitectura madre leída; archivos `34–44` (motores individuales) pendientes de lectura cuando la tarea lo requiera.
- Definidos los 4 archivos de control en la raíz.
- Persistencia v0.1: **Supabase (Postgres, free tier)** + Drizzle ORM.
- Estructura del repo: **monorepo pnpm workspaces** (`apps/web`, `apps/api`, `packages/shared`).
- Fuente de prueba de v0.1: **stream HLS público de demo**, elegido y documentado durante la implementación.
- Git: commit inicial del bootstrap; un commit coherente por sub-slice; tag `v0.1.0-alpha` al cerrar el DoD (AGENTS.md §9).
- pnpm 12 instalado globalmente (no venía en el equipo); scripts de build de terceros aprobados en `pnpm-workspace.yaml` (`allowBuilds: esbuild, sharp, @tailwindcss/oxide`).
- `packages/shared` es TypeScript puro sin paso de build (los consumidores lo transpilan: `transpilePackages` en Next, `tsx` en la API).
- La API se ejecuta con `tsx` (`build` = verificación de tipos, sin emisión a `dist`); si en el futuro se necesita un artefacto emitido, será una decisión explícita.
- Lint con ESLint 9 flat config compartido en la raíz (sin `eslint-plugin-next` todavía).
- Persistencia v0.1: conexión mediante **Session pooler de Supabase** (puerto 6543, `sslmode=require`) con el driver `postgres` (porsager, `prepare: false`) y Drizzle ORM. Credenciales solo en `apps/api/.env` (gitignored; `.env.example` sin valores).
- La referencia de reproducción vive en una tabla **`sources` mínima** (`id`, `media_item_id` FK cascade, `playback_url`, `is_active`) — decisión humana sobre §12.5; difiere del DDL de §7.37 y deberá alinearse en v0.4 (registrado en `BACKLOG.md`).
- Seed de prueba: contenido `big-buck-bunny` con stream HLS público `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`.
- `media_type` sigue la lista de §7.17 en mayúsculas (`MOVIE`, `SERIES`, …), también en `packages/shared`.
- API v0.1: rutas `GET /v1/catalog/featured` (§8.12), `GET /v1/media/{mediaId}` (§8.13), `GET /v1/media/{mediaId}/sources` (§8.16). Ninguna expone `streamUrl` excepto el endpoint temporal `GET /v1/media/{mediaId}/playback`, necesario para que Hls.js reproduzca antes de existir PlaybackSession/Gateway (deuda registrada en `BACKLOG.md`).
- `requestId` por petición (acepta `X-Request-Id` entrante válido, si no genera `req_<hex>`), propagado en header y body (§8.50).
- CORS restringido al origen de `WEB_ORIGIN` (`http://localhost:3000` en `.env` de la API).
- Frontend v0.1: fetch en Server Components con `dynamic = "force-dynamic"` (sin fetch al construir); `NEXT_PUBLIC_API_URL` en `apps/web/.env.local` (gitignored). Player carga Hls.js mediante import dinámico dentro de `useEffect` (evita `window` en SSR) y destruye la instancia al desmontar.
- v0.2 decisiones aprobadas por humano (2026-10-02, plan completo en `CURRENT_TASK.md`): temporadas/episodios sí (mínimo: schema + endpoint + display; creación por API → BACKLOG); creación de contenido vía `POST/PATCH /v1/admin/media` con token estático `ADMIN_API_TOKEN` (RBAC real → v0.6/v0.8); listado vía nuevo `GET /v1/media` paginado (adición a §8 → BACKLOG); resolución dual id/slug en `GET /v1/media/{identifier}`; external IDs con campo `namespace` (§7.27); enums en mayúsculas (§7.17); 422→`INVALID_ARGUMENT`, 409→`CONFLICT`, 401→`UNAUTHORIZED`; tests con `node:test` nativo; episodios display-only (sources es media-level → v0.4).
- Esquema v2: índices añadidos solo donde justifica un patrón de consulta (§6.34k) — los UNIQUE de `seasons` y `episodes` ya proveen sus índices de consulta; `idx_episodes_media` añadido para conteos por media en detalle.

## Problemas conocidos

- `next build` avisa: "The Next.js plugin was not detected in your ESLint configuration" (no bloqueante; `eslint-config-next` pendiente de evaluar).
- La password del pooler de Supabase fue compartida en el chat; está solo en `.env` local, nunca en el repositorio. Recomendable rotarla desde el Dashboard si se desea.

## Tests ejecutados

Ningún test unitario todavía (sin framework definido; los tests de funcionalidad llegan tras la funcionalidad — AGENTS.md §8). Verificación de v0.1.0-alpha: `pnpm typecheck`, `pnpm lint`, `pnpm build` en verde; `db:seed` idempotente + `db:verify` (`mediaItems: 1, sources: 1`); smoke HTTP de los 4 endpoints + 404/400 + `X-Request-Id` + preflight CORS; smoke end-to-end del frontend (home con destacados y enlace, detalle con título/sinopsis/`<video>`, 404 para id inexistente, `role="alert"` con API caída); **reproducción visual del video confirmada por persona (2026-10-02)**. v0.2.0-alpha Fase A: migración `0001` aplicada; seed ×2 idempotente; `db:verify` (`mediaItems: 2, published: 2, sources: 1, genres: 4, mediaGenres: 4, externalIds: 2, seasons: 1, episodes: 3`); typecheck/lint/build en verde.

## Último commit

`chore: cerrar v0.1.0-alpha` (`70cb335`) — es decir, el tag `v0.1.0-alpha`.

*Los commits de las fases A–E de v0.2.0-alpha se registrarán aquí en la Fase F (cierre), para mantener «1 commit por fase» sin commits de documentación intermedios (decisión del plan aprobado en `CURRENT_TASK.md`).*

Anteriores: Fase E (`264fa4a`), Fase D (`4be3a6f`), Fase C (`d70011a`), Fase B (`df371ae`), bootstrap (`f98db3b`).

## Bloqueos existentes

Ninguno. Decisiones de v0.1.0-alpha resueltas (persistencia, estructura, stream de prueba, tabla `sources`).
