# DEVELOPMENT_STATE

Estado factual del repositorio. Nunca declarar terminado algo que no fue verificado (AGENTS.md §10).

## Versión actual

v0.1.0-alpha — **EN DESARROLLO** (sin releases; ninguna versión cerrada).

## Último slice completado

Ninguno.

## Trabajo actual

Fase B (estructura del monorepo) completada y verificada: `pnpm typecheck`, `pnpm lint` y `pnpm build` en verde; `GET /v1/health` responde OK.

## Trabajo pendiente inmediato

Fase C: persistencia mínima en Supabase (Drizzle + `media_items` + seed). Plan completo de v0.1.0-alpha en `CURRENT_TASK.md`.

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

## Problemas conocidos

- `next build` avisa: "The Next.js plugin was not detected in your ESLint configuration" (no bloqueante; `eslint-config-next` pendiente de evaluar).
- Fuente de prueba HLS autorizada pendiente de elegir y documentar.

## Tests ejecutados

Ningún test unitario todavía (sin framework definido; los tests de funcionalidad llegan tras la funcionalidad — AGENTS.md §8). Verificación de la Fase B: `pnpm typecheck`, `pnpm lint`, `pnpm build` en verde + smoke test manual de `GET /v1/health`.

## Último commit

`chore: bootstrap de documentacion de control y especificacion paper_project` (`f98db3b`, root commit: 63 archivos — AGENTS.md, los 4 archivos de control y `paper_project/`).

## Bloqueos existentes

Ninguno bloqueante. Decisiones abiertas de v0.1.0-alpha resueltas (ver arriba); queda elegir el stream HLS concreto durante la implementación.
