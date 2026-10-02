# DEVELOPMENT_STATE

Estado factual del repositorio. Nunca declarar terminado algo que no fue verificado (AGENTS.md §10).

## Versión actual

v0.1.0-alpha — **CERRADA** (tag `v0.1.0-alpha`, 2026-10-02). Siguiente versión del roadmap: v0.2.0-alpha (§12.6, no iniciada).

## Último slice completado

**v0.1.0-alpha — Primer Vertical Slice** (§12.5): los 7 criterios de salida cumplidos y verificados (reproducción visual confirmada por persona el 2026-10-02).

## Trabajo actual

Ninguno en curso. El repositorio queda en estado verificado tras el cierre de v0.1.0-alpha.

## Trabajo pendiente inmediato

Decidir con humano el inicio de v0.2.0-alpha — Catálogo mínimo (§12.6): `MediaItem` completo, estados de publicación, listado básico, repositorios y DTOs de Catalog.

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

## Problemas conocidos

- `next build` avisa: "The Next.js plugin was not detected in your ESLint configuration" (no bloqueante; `eslint-config-next` pendiente de evaluar).
- La password del pooler de Supabase fue compartida en el chat; está solo en `.env` local, nunca en el repositorio. Recomendable rotarla desde el Dashboard si se desea.

## Tests ejecutados

Ningún test unitario todavía (sin framework definido; los tests de funcionalidad llegan tras la funcionalidad — AGENTS.md §8). Verificación de v0.1.0-alpha: `pnpm typecheck`, `pnpm lint`, `pnpm build` en verde; `db:seed` idempotente + `db:verify` (`mediaItems: 1, sources: 1`); smoke HTTP de los 4 endpoints + 404/400 + `X-Request-Id` + preflight CORS; smoke end-to-end del frontend (home con destacados y enlace, detalle con título/sinopsis/`<video>`, 404 para id inexistente, `role="alert"` con API caída); **reproducción visual del video confirmada por persona (2026-10-02)**.

## Último commit

`feat: frontend con pagina de detalle y Player Hls.js (Fase E)` (`264fa4a`).

Anteriores: `docs: registrar commit de la Fase D en DEVELOPMENT_STATE` (`2f1ea81`), `feat: endpoints de contenido con contrato Seccion 8 (Fase D)` (`4be3a6f`), Fase C (`d70011a`), Fase B (`df371ae`), bootstrap (`f98db3b`).

## Bloqueos existentes

Ninguno. Decisiones de v0.1.0-alpha resueltas (persistencia, estructura, stream de prueba, tabla `sources`).
