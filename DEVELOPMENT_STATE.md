# DEVELOPMENT_STATE

Estado factual del repositorio. Nunca declarar terminado algo que no fue verificado (AGENTS.md §10).

## Versión actual

v0.3.0-alpha — **EN CURSO** (plan aprobado 2026-10-03). **Fases A y B completadas y verificadas.** Versión anterior: v0.2.0-alpha **CERRADA** (tag `v0.2.0-alpha`, 2026-10-03).

## Último slice completado

**v0.2.0-alpha — Catálogo mínimo** (§12.6): los 5 criterios de salida cumplidos y verificados — 1) crear contenido (Catalog Admin API con token), 2) almacenarlo (esquema v2 en Postgres), 3) consultarlo (listado paginado + detalle dual + temporadas), 4) visualizarlo (frontend `/catalog` y `/media/[id]`) y 5) reproducir un contenido con Source (Hls.js sobre `big-buck-bunny`). Demo verificada visualmente por persona el 2026-10-03.

## Trabajo actual

**v0.3.0-alpha — Discovery & Ingestion (§12.7).** Fase A (esquema de datos, `3a5587b`) y Fase B (contratos de dominio + normalización + provenance, `15799d7`) completadas y verificadas; documentación de ambas fases registrada en `BACKLOG.md`, `DEVELOPMENT_STATE.md` y `CURRENT_TASK.md`.

Regla nueva v0.3+ (decisión humana 2026-10-03): **cada fase cierra con commit de código + actualización de `BACKLOG.md` y `DEVELOPMENT_STATE.md`** (y `CURRENT_TASK.md` con ✓ y hash), antes de parar y pedir aprobación. `CHANGELOG.md` solo al cerrar la versión; `AGENTS.md` no se toca.

## Trabajo pendiente inmediato

**Fase C — Discovery Run manual de extremo a extremo con el primer adapter** (pendiente de aprobación humana para iniciar). Detalle completo en `CURRENT_TASK.md`.

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
- `production_status` sigue **§7.20** (`UPCOMING/ONGOING/ENDED/UNKNOWN`); la lista de §6.34 (`RELEASING/COMPLETED/CANCELLED`) no aplica — misma regla de precedencia §7 > §6.34 aprobada en el punto 5. Seed corregido de `COMPLETED` a `ENDED` durante la Fase B.
- Fase B: los errores de dominio del Catalog se expresan con `CatalogError(code, message)` en `catalog/service.ts` y las rutas los traducen a HTTP con `sendError`; el módulo Catalog no conoce Fastify ni `sources` (temp endpoints v0.1 siguen sin refactorizar hasta v0.4).
- Fase D: token `ADMIN_API_TOKEN` generado localmente en `apps/api/.env` (gitignored; `.env.example` solo con placeholder). Slug restringido a `^[a-z0-9]+(-[a-z0-9]+)*$` para que funcione en URLs. `genres` llega como arreglo de slugs y el nombre se deriva capitalizando segmentos (`sci-fi` → `Sci Fi`). `genres`/`externalIds` en PATCH son reemplazo completo. Escrituras del admin dentro de `db.transaction` (rollback total si algo falla; violación 23505 → 409). Admin resuelve dual UUID/slug como el público pero sin filtro de visibilidad (ve DRAFTs). El handler global de Fastify ahora mapea `CatalogError` y errores 4xx del parser a los códigos §8 (antes todo caía a 500).
- Fase E: el selector de temporada se resuelve en servidor con `?season=N` (sin estado cliente); parámetro inválido o inexistente → primera temporada. El Player solo se monta si `type !== "SERIES"` y un fallo de playback (404 sin Source) ya no tumba la página: muestra un aviso en su lugar. Imágenes con `<img>` plano (sin `next/image`) para no añadir configuración `remotePatterns` en v0.2. El texto de versión de la home se mantiene hasta el cierre (Fase F).

- Decisiones de v0.3.0-alpha (plan completo y aprobado 2026-10-03, ver `CURRENT_TASK.md`): alcance = slice vertical de §12.7/§6.44 §83 (1 adapter + run manual + matching + ingesta + review + UI mínima); **CAPTCHA/anti-bot/proxies NO en v0.3** (contradicción `02-alcance:390` vs ADR-SRC-10/ADR-DI-034 registrada en `BACKLOG.md`, pendiente de enmienda); adapter API keyless = **TVMaze** (Wikidata → v0.4); Admin UI con token de operador en memoria/`sessionStorage`; `query?`/`limit?` opcionales en `POST /v1/admin/discovery/runs` (adición a contrato → BACKLOG); `provider ≡ namespace` (§7.27); Fase E dividida en **E1** (review/jobs/errores) y **E2** (adapters admin); asincronía = 202 + ejecución en proceso + Postgres como estado durable (sin Queue/Worker/Redis); candidato nuevo → `MediaItem` DRAFT; solo `kind=CONTENT` se procesa (SOURCE queda `DISCOVERED` hasta Source Registry en v0.4).
- Decisiones de esquema Fase A (registradas en `BACKLOG.md`): tabla `discovery_candidates` (6.44 §67) sobre `discovered_candidates` (§7.90); `adapter_id` = clave lógica snapshot (no FK) para provenance inmutable; `available_at` ≡ `scheduled_at` (§7.93); `rejection_reason` y `version` (OCC, §35) incluidos desde la Fase A para no migrar en E1; `UNIQUE(kind, provider, external_id)` como deduplicación/idempotencia (§24.1/§37); `ingestion_errors.candidate_id` nullable (errores de run sin candidato, criterio 10 de §12.7); FKs: `run_id` RESTRICT, `match_reference` SET NULL, jobs/errors CASCADE.

- Decisiones de Fase B (registradas en `BACKLOG.md`): límites de normalización **alineados con `catalog/validation.ts`** (nunca más estrictos que el catálogo, para que la Fase D no encuentre 400s); campos inválidos → se descartan y se registra el motivo en `normalizedData.issues[]` (AGENTS §6), salvo identidad (`provider`/`externalId`/`title`) que aborta con `DiscoveryError("INVALID_ARGUMENT")`; año inválido se descarta y si existe `releaseDate` válida se deriva el año de ella (con issue); checksum canónico sha256 con claves ordenadas recursivamente (§11: mismo payload en distinto orden = mismo checksum); truncado de `title`/`synopsis`/`slugBase` con issue en lugar de error.

## Problemas conocidos

- `next build` avisa: "The Next.js plugin was not detected in your ESLint configuration" (no bloqueante; `eslint-config-next` pendiente de evaluar).
- La password del pooler de Supabase fue compartida en el chat; está solo en `.env` local, nunca en el repositorio. Recomendable rotarla desde el Dashboard si se desea.

## Tests ejecutados

Tests unitarios con `node:test` nativo (`pnpm test`, vía `tsx --test`) desde la Fase C de v0.2.0-alpha. Verificación de v0.1.0-alpha: `pnpm typecheck`, `pnpm lint`, `pnpm build` en verde; `db:seed` idempotente + `db:verify` (`mediaItems: 1, sources: 1`); smoke HTTP de los 4 endpoints + 404/400 + `X-Request-Id` + preflight CORS; smoke end-to-end del frontend (home con destacados y enlace, detalle con título/sinopsis/`<video>`, 404 para id inexistente, `role="alert"` con API caída); **reproducción visual del video confirmada por persona (2026-10-02)**. v0.2.0-alpha Fase A: migración `0001` aplicada; seed ×2 idempotente; `db:verify` (`mediaItems: 2, published: 2, sources: 1, genres: 4, mediaGenres: 4, externalIds: 2, seasons: 1, episodes: 3`); typecheck/lint/build en verde. v0.2.0-alpha Fase B: typecheck/lint/build en verde + smoke HTTP de regresión — `health` (200 + X-Request-Id entrante), `featured` (shape v0.1 intacto), `media/{id}` (200 shape idéntico), 400 `INVALID_ARGUMENT`, 404 `MEDIA_NOT_FOUND`, `sources`, `playback`, 404 de ruta; todos los cuerpos idénticos a los de v0.1; API detenida tras las pruebas. v0.2.0-alpha Fase C: **`pnpm test` (7/7 `node:test`: paginación, `UUID_PATTERN`, `CatalogError`, mappers)**; typecheck/lint/build en verde; smoke HTTP — listado default y `page=2&limit=1` con `meta` correcto, 400 en `page=0`/`page=abc`/`limit=51`, detalle enriquecido por UUID y por slug (dual), serie con `genres`+`seasons`, `seasons/1` con 3 episodios (shape §8.14), 404 `SEASON_NOT_FOUND`/400 `seasonNumber`/404 en película, 404 para slug y UUID inexistentes, regresión `sources`/`playback`; **filtro de visibilidad verificado con flip temporal a DRAFT** (listado 1 item, detalle/featured/seasons ocultan la serie) y restaurado vía `db:seed` (2 items, 200 PUBLISHED); `db:verify` OK tras restaurar; script temporal eliminado; API detenida tras las pruebas. v0.2.0-alpha Fase D: **`pnpm test` (20/20 `node:test`: 7 de catálogo + 13 de validación del admin)**; typecheck/lint/build en verde; smoke HTTP de 16 checks — POST sin token 401 y con token incorrecto 401, POST válido 201 (DRAFT con genres derivados), listado público sin el DRAFT (total 2) y detalle 404, slug duplicado 409, enum inválido 400 (lista los valores permitidos), JSON malformado 400, PATCH sin token 401, PATCH DRAFT→PUBLISHED 200 con artwork, listado total 3 y detalle público 200 con genres, externalId de otro contenido 409, body vacío 400 y `publicationStatus` minúscula 400, PATCH por slug con reemplazo de genres 200, regresión `health`/`featured`; limpieza del contenido de prueba vía script temporal (géneros huérfanos sci-fi/action borrados) con `db:verify` restaurado a `mediaItems: 2, published: 2, sources: 1, genres: 4, mediaGenres: 4, externalIds: 2, seasons: 1, episodes: 3`; scripts temporales eliminados; API detenida. v0.2.0-alpha Fase E: typecheck/lint/build en verde (`/catalog` nueva ruta); smoke HTML con API + `next start` — home con enlace Catálogo y destacados, `/catalog` con «2 títulos» y 2 tarjetas, `?page=999` fuera de rango con enlace de vuelta, `?page=abc` cae a página 1, película por slug con `<video>`/géneros/metadata/estado y sin secciones de serie, serie con pestaña Temporada 1 y episodios 1–3 sin `<video>`, `?season=99` hace fallback a la primera temporada, id inexistente → 404; **paginación real**: 21 contenidos creados vía Admin API (0 fallos) → página 1 con 20 tarjetas de 23 y «Siguiente», página 2 con 3 tarjetas y «2 de 2»+«Anterior», página 3 fuera de rango; limpieza `tmp-pag-%` con `db:verify` restaurado; servidores detenidos. v0.2.0-alpha Fase F (cierre, 2026-10-03): **re-verificación completa tras crash de equipo** — `pnpm typecheck`, `pnpm lint`, `pnpm test` (20/20), `pnpm build` (rutas `/`, `/catalog`, `/media/[id]` generadas) y `db:verify` (`mediaItems: 2, published: 2, sources: 1, genres: 4, mediaGenres: 4, externalIds: 2, seasons: 1, episodes: 3`); smoke HTTP final de la demo — health, `GET /v1/media` con `total:2`, home con destacados y enlace Catálogo, `/catalog` con «2 títulos» y 2 tarjetas (links por UUID), película con `<video>`/géneros/chips «Publicado»/«Finalizada», serie sin `<video>` con Temporada 1 y episodios 1–3, id inexistente → 404, `?season=99` → fallback; **verificación visual de la demo en navegador confirmada por persona (2026-10-03)**.

v0.3.0-alpha Fase A: `pnpm typecheck` (3 paquetes) + `pnpm lint` + `pnpm build` + `pnpm test` (**20/20** `node:test`, regresión de v0.2 intacta) en verde; migración `0002_fancy_lila_cheney.sql` aplicada con `db:migrate`; `db:seed` ×2 idempotente (mismos UUIDs en ambas ejecuciones); `db:verify` (exit 0) con los contadores nuevos `discoveryAdapters: 2, discoveryRuns: 0, discoveryCandidates: 0, ingestionJobs: 0, ingestionErrors: 0` y el catálogo intacto (`mediaItems: 2, published: 2, sources: 1, genres: 4, mediaGenres: 4, externalIds: 2, seasons: 1, episodes: 3`); diff revisado: 6 archivos, todos dentro de alcance.

v0.3.0-alpha Fase B: **`pnpm test` (30/30 `node:test`: 20 de regresión de v0.2 + 10 nuevos de Discovery — slugify, normalización feliz, mapeo de tipos, fechas/derivación/desajuste, runtime y URLs, depuración de externalIds, identidad/payload inválidos, truncados, checksum canónico, buildProvenance)**; typecheck (3 paquetes) + lint + build en verde; sin cambios de BD (motor puro, sin migración).

## Último commit

Commit de documentación de la Fase B: `docs: registrar Fase B en BACKLOG y DEVELOPMENT_STATE` (este commit; su hash se registra en la próxima actualización, AGENTS §10).

Commits de código de v0.3.0-alpha (una fase = un commit + su commit de docs): Fase B (`15799d7`), Fase A (`3a5587b`). Commit de documentación de la Fase A: `85ef6df`.

Cierre de v0.2.0-alpha: `chore: cerrar v0.2.0-alpha` (`f626077`, tag `v0.2.0-alpha`); fases: Fase E (`0d08533`), Fase D (`6900dcd`), Fase C (`d58b4c9`), Fase B (`1ac4051`), Fase A (`d5d167b`); post-cierre: `17f8e08` (home con la versión alpha).

Cierre de v0.1.0-alpha: `chore: cerrar v0.1.0-alpha` (`70cb335`, tag `v0.1.0-alpha`); Fase E (`264fa4a`), Fase D (`4be3a6f`), Fase C (`d70011a`), Fase B (`df371ae`), bootstrap (`f98db3b`).

## Bloqueos existentes

Ninguno bloqueante. v0.3: la enmienda de la contradicción CAPTCHA (`02-alcance:390` vs ADRs) queda **pendiente de decisión humana pero NO bloquea** la versión (decisión 2026-10-03: fuera de v0.3). Decisiones de v0.1.0-alpha resueltas (persistencia, estructura, stream de prueba, tabla `sources`).
