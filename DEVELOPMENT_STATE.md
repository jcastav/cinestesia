# DEVELOPMENT_STATE

Estado factual del repositorio. Nunca declarar terminado algo que no fue verificado (AGENTS.md §10).

## Versión actual

v0.1.0-alpha — **EN DESARROLLO** (sin releases; ninguna versión cerrada).

## Último slice completado

Ninguno.

## Trabajo actual

Fase C (persistencia) completada y verificada: migración v1 aplicada en Supabase (`media_items` + `sources`), seed idempotente con contenido de prueba, lectura real verificada (`mediaItems: 1, sources: 1`), `typecheck`/`lint`/`build` en verde.

## Trabajo pendiente inmediato

Fase D: endpoints de contenido de la API. Plan completo de v0.1.0-alpha en `CURRENT_TASK.md`.

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

## Problemas conocidos

- `next build` avisa: "The Next.js plugin was not detected in your ESLint configuration" (no bloqueante; `eslint-config-next` pendiente de evaluar).
- La password del pooler de Supabase fue compartida en el chat; está solo en `.env` local, nunca en el repositorio. Recomendable rotarla desde el Dashboard si se desea.

## Tests ejecutados

Ningún test unitario todavía (sin framework definido; los tests de funcionalidad llegan tras la funcionalidad — AGENTS.md §8). Verificación acumulada: `pnpm typecheck`, `pnpm lint`, `pnpm build` en verde; smoke test `GET /v1/health` OK; `db:seed` idempotente + `db:verify` con lectura real (`mediaItems: 1, sources: 1`).

## Último commit

`feat: estructura de monorepo con pnpm workspaces (Fase B)` (`df371ae`).

Anteriores: `docs: actualizar DEVELOPMENT_STATE tras el commit inicial` (`b362433`), `chore: bootstrap de documentacion de control y especificacion paper_project` (`f98db3b`, root commit: 63 archivos).

## Bloqueos existentes

Ninguno bloqueante. Decisiones abiertas de v0.1.0-alpha resueltas (ver arriba); queda elegir el stream HLS concreto durante la implementación.
