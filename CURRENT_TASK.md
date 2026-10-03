# CURRENT_TASK

## Tarea actual

**v0.3.0-alpha — Discovery & Ingestion: EN CURSO.**
Fase A completada y verificada; **Fase B pendiente de aprobación**.

Objetivo (§12.7): que la plataforma descubra información externa, la convierta en
candidatos, determine a qué contenido pertenece e incorpore al Catalog de forma
trazable. Los 10 criterios de salida de §12.7 definen el Done de la versión.

### Regla de control de archivos (v0.3+, decisión humana 2026-10-03)

- `BACKLOG.md` → **cada fase** (deudas, decisiones y contradicciones nuevas).
- `DEVELOPMENT_STATE.md` → **cada fase** (fase completada, decisiones, trabajo actual).
- `CURRENT_TASK.md` → inicio: plan completo; cada fase: ✓ + hash; cierre: COMPLETADA + próxima tarea.
- `CHANGELOG.md` → **solo** al cerrar la versión (Fase G).
- `AGENTS.md` → **no tocar** salvo indicación explícita.

Orden de cierre de cada fase: código → verificación (typecheck/lint/test/build) →
actualizar BACKLOG + DEVELOPMENT_STATE + CURRENT_TASK → commit → PARAR y pedir aprobación.

## Plan de fases (aprobado 2026-10-03)

Un commit de código por fase + commit de documentación de la fase; verificación
entre cada una; ALTO obligatorio al terminar cada fase.

**Ajustes aprobados sobre el plan original:** Fase E dividida en **E1** (review
queue/jobs/errores) y **E2** (adapters admin); adapter API keyless decidido =
**TVMaze** (Wikidata → v0.4).

### Fase A — Esquema de datos de Discovery/Ingestion ✓
- **Objetivo:** persistencia del dominio (§6.44 §67, §7.90/§7.93) sin tocar Catalog; idempotencia por integridad.
- **Archivos:** `apps/api/src/db/schema.ts` (`discovery_adapters`, `discovery_runs`, `discovery_candidates` con `UNIQUE(kind, provider, external_id)`, `ingestion_jobs` con `UNIQUE(candidate_id, job_type)`, `ingestion_errors` con `candidate_id` nullable); migración `apps/api/drizzle/0002_fancy_lila_cheney.sql`; `db/seed.ts` (adapters `tvmaze_metadata` y `manual_import`); `db/verify.ts` (contadores nuevos).
- **Verificación:** typecheck/lint/build/test en verde; migración aplicada; `db:seed` ×2 idempotente; `db:verify` → `discoveryAdapters: 2, discoveryRuns: 0, discoveryCandidates: 0, ingestionJobs: 0, ingestionErrors: 0`; catálogo intacto (mediaItems 2, published 2, sources 1, genres 4, mediaGenres 4, externalIds 2, seasons 1, episodes 3).
- **Commit código:** `3a5587b` · **Commit docs:** `docs: registrar Fase A en BACKLOG y DEVELOPMENT_STATE`

### Fase B — Contratos de dominio, normalización y provenance
- **Objetivo:** tipos compartidos + motor puro de normalización y provenance (criterios 4 y núcleo del 5), testable sin red ni BD.
- **Archivos:** `packages/shared/src/index.ts` (`DiscoveryRunStatus`, `CandidateKind`, `CandidateStatus`, `DiscoveryRunDto`, `RunCounters`, `DiscoveryCandidateDto`; `ApiErrorCode` += `RUN_NOT_FOUND`, `CANDIDATE_NOT_FOUND`, `ADAPTER_NOT_FOUND`, `ADAPTER_DISABLED`, `CANDIDATE_NOT_PENDING`, `RUN_ALREADY_RUNNING`); `apps/api/src/discovery/errors.ts` (`DiscoveryError`); `discovery/normalize.ts` (raw → normalized: título, año, tipo → `MOVIE/SERIES`, sinopsis, runtime, `externalIds[]`, slug base); `discovery/provenance.ts` (sha256 del payload); `lib/errors.ts` (`STATUS_BY_CODE` ampliado); `server.ts` (mapear `DiscoveryError`); `apps/api/tests/discovery-normalize.test.ts`.
- **Verificación:** typecheck/lint/build/test en verde (normalización: tipo/año/ids/payload inválido; provenance: mismo payload → mismo checksum).
- **Commit:** `feat: contratos, normalizacion y provenance del Discovery (Fase B)`

### Fase C — Discovery Run manual de extremo a extremo con el primer adapter
- **Objetivo:** criterios 1–4 y 9 de §12.7 (adapter obtiene info externa, se crea Run, candidatos con provenance, re-ejecución sin duplicados).
- **Archivos:** `discovery/http.ts` (fetch delimitado: https, allowlist, timeout, límite de bytes, content-type, retry acotado + backoff/jitter, UA identificable, rate limit por adapter); `discovery/adapter.ts` (contrato §14/§23); `discovery/registry.ts`; `discovery/adapters/tvmaze-metadata.ts`; `discovery/adapters/manual-import.ts` (§13.4); `discovery/orchestrator.ts` (run `QUEUED→RUNNING→SUCCEEDED/PARTIAL/FAILED`, upsert idempotente de candidatos, counters, errores → `ingestion_errors`, ejecución en proceso); `routes/admin-discovery.ts` (`POST /v1/admin/discovery/runs` 202, `GET /v1/admin/discovery/runs`, `GET .../runs/{runId}`); tests de contrato con fixtures + orquestador con repositorio falso.
- **Verificación:** smoke con token — POST 202 → polling `SUCCEEDED` con counters; candidatos con provenance completa; repetir POST → 0 candidatos nuevos; 404 `RUN_NOT_FOUND`; 401 sin token; adapter desconocido/disabled → 404/409.
- **Commit:** `feat: Discovery Run manual con primer adapter autorizado y candidatos con provenance (Fase C)`
- *Nota:* `query?`/`limit?` como parámetros opcionales del run (adición de contrato → BACKLOG).

### Fase D — Matching y ingesta al Catalog
- **Objetivo:** criterios 5, 6, 7 y 9 completos (normalización aplicada, match por External ID, candidato nuevo → MediaItem, re-ejecución sin duplicados).
- **Archivos:** `discovery/matching.ts` (Nivel 1 `provider+externalId` ≡ `namespace`/`external_id`; Nivel 2 título normalizado+año+tipo → `MATCHED/NO_MATCH/AMBIGUOUS` con strategy/confidence); `discovery/validation.ts` (§28 mínimo, `ERROR/WARNING/INFO`); `discovery/ingestion.ts` (`CREATE/UPDATE/NO_CHANGE`, crea `MediaItem` **DRAFT** vía `catalog/service.ts`); orquestador ampliado con transiciones controladas (§12 de contratos); `catalog/{repository,service}.ts` (funciones del Application Service; sin SQL desde `discovery/`); tests de matching/idempotencia/validación.
- **Verificación:** smoke — (a) candidato con external id existente → `MATCHED` sin crear entidad; (b) candidato nuevo → DRAFT ausente de `GET /v1/media` y home; (c) re-ejecutar run → 0 duplicados; (d) ambiguo → no crea entidad.
- **Commit:** `feat: matching por external id e ingesta de candidatos al Catalog (Fase D)`

### Fase E1 — Review Queue, jobs y errores
- **Objetivo:** criterios 8 y 10 (ambiguo no se ingesta silenciosamente; errores registrados; admin aprueba/rechaza/reintenta).
- **Archivos:** `routes/admin-discovery.ts` += `GET /v1/admin/ingestion/candidates` (filtros `status/kind/provider/runId` + paginación §8.48), `GET .../candidates/{id}` (provenance, matchResult, errores, `version`), `POST .../approve`, `POST .../reject` (motivos §21), `POST .../retry`; `discovery/review.ts`; `ingestion_jobs` con `attempt_count`/backoff acotado/`FAILED` tras máx. intentos; counters del run (`matched/new/ambiguous/rejected/errors`) + status `PARTIAL` (§32); DTOs/códigos en `shared`; tests de transiciones, motivos y retry.
- **Verificación:** smoke — ambiguo → `PENDING_REVIEW`; approve → `INGESTED` con entidad; reject → `REJECTED` con motivo; retry → +intentos; run con errores → `PARTIAL`; 409 candidato no pendiente; 404 `CANDIDATE_NOT_FOUND`.
- **Commit:** `feat: review queue, jobs de ingesta y registro de errores (Fase E1)`

### Fase E2 — Adapters admin
- **Objetivo:** visibilidad y control administrativo de adapters (§60).
- **Archivos:** `routes/admin-discovery.ts` += `GET /v1/admin/discovery/adapters`, `POST .../adapters/{id}/enable`, `POST .../adapters/{id}/disable`; comprobación de `enabled` en el registry.
- **Verificación:** smoke — listado con los 2 adapters, disable → run rechazado (`ADAPTER_DISABLED`), enable → vuelve a funcionar; 404 adapter inexistente.
- **Commit:** `feat: administracion de Discovery Adapters (Fase E2)`

### Fase F — Admin UI mínima
- **Objetivo:** «Admin sees result» (§83) — ver runs/candidatos y decidir sin curl.
- **Archivos:** `apps/web/src/app/admin/discovery/page.tsx`; `components/admin/discovery.tsx` (token en memoria/`sessionStorage`, ejecutar run, tabla de runs con counters, candidatos con filtro, detalle, aprobar/rechazar/reintentar); `lib/admin-api.ts`. Sin enlace en la home pública.
- **Verificación:** typecheck/lint/build + smoke en navegador (401 con token inválido, ejecutar run, transiciones, aprobar/rechazar); grep del bundle: el token no aparece.
- **Commit:** `feat: admin UI minima de Discovery e Ingestion (Fase F)`

### Fase G — Cierre y tag v0.3.0-alpha
- **Objetivo:** cerrar versión con evidencia (AGENTS §9/§10).
- **Archivos:** `CHANGELOG.md` (`[0.3.0-alpha]`), `DEVELOPMENT_STATE.md` (hashes A–F), `CURRENT_TASK.md` (COMPLETADA + próxima tarea v0.4), `BACKLOG.md`.
- **Verificación:** recorrido de los 10 criterios de §12.7 con evidencia; typecheck/lint/build/test en verde; demo end-to-end verificada por persona; grep de credenciales; diff revisado.
- **Commit + tag:** `chore: cerrar v0.3.0-alpha` → **tag `v0.3.0-alpha`**

## Decisiones aprobadas (plan de v0.3, 2026-10-03)

1. **CAPTCHA/anti-bot/proxies: NO en v0.3.** Contradicción `02-alcance:390` vs ADR-SRC-10/ADR-DI-034 (ACCEPTED), 6.44 §13.3, §6.12, §6.35 §2.63, §03:361, §05:439 → registrada en `BACKLOG.md` pendiente de enmienda. El adapter usa integraciones autorizadas (rate limit, UA identificable, robots.txt).
2. **Adapter API keyless = TVMaze** (REST/JSON, ids externos IMDb/TVDB, rate limit claro, sin auth). Wikidata (SPARQL) → v0.4.
3. **Admin UI: token pegado por el operador** (memoria/`sessionStorage`, nunca en código ni bundle).
4. **`query?`/`limit?` opcionales en `POST /v1/admin/discovery/runs`** (adición de contrato → BACKLOG para consolidar en §8).
5. **`provider` ≡ `namespace`** (§7.27) para el Nivel 1 de matching — coherente con la decisión de v0.2.
6. **Split de Fase E en E1 (review/jobs/errores) y E2 (adapters admin).**
7. **Asincronía sin infraestructura nueva:** 202 + ejecución en proceso + estado durable en Postgres + polling (AGENTS §15); Queue/Worker/Redis → BACKLOG.
8. **Candidato nuevo → `MediaItem` DRAFT** (§46: ingesta ≠ publicación).
9. **Solo `CONTENT` se procesa en v0.3**; `kind=SOURCE` se modela y registra pero queda `DISCOVERED` (Source Registry = v0.4).
10. **Manual Import Adapter incluido** (§77 punto 2, §13.4) — demos offline deterministas.
11. **Un solo run `RUNNING` a la vez** (otro → 409 `RUN_ALREADY_RUNNING`).
12. **Nombres de esquema:** `discovery_candidates` (6.44 §67) sobre `discovered_candidates` (§7.90); `adapter_id` = clave lógica snapshot; `available_at` ≡ `scheduled_at`; `rejection_reason` y `version` (OCC) desde la Fase A.
13. **Regla de documentación por fase** (sección superior): BACKLOG + DEVELOPMENT_STATE en cada fase; CHANGELOG solo al cierre.
14. Tests con **`node:test`** nativo (precedente v0.2); ficheros de test se añaden a `apps/api/package.json`.

## Fuera de alcance de v0.3 (→ `BACKLOG.md`)

- Scheduler/cron, Queue/Worker/DLQ (Redis), Reconciliation, Enrichment multi-provider, matching niveles 3/4 (alias/fuzzy; requiere `media_titles`), múltiples adapters, Approval Policy Engine configurable, candidatos SOURCE → Source Registry (v0.4), UPDATE real de MediaItem, eventos de dominio/Search, métricas/tracing/dashboard, audit events, RBAC `discovery.write` (v0.6/v0.8), API interna HTTP.
- Sin infraestructura nueva (AGENTS §15): no Redis, Elasticsearch, CDN ni microservicios.

## Notas de continuidad

- Estado factual del repo en `DEVELOPMENT_STATE.md`; deudas y decisiones en `BACKLOG.md`.
- Contratos vigentes en `packages/shared/src/index.ts`; catálogo en `apps/api/src/catalog/`.
- Histórico: v0.1.0-alpha y v0.2.0-alpha cerradas y pusheadas (tags `v0.1.0-alpha`, `v0.2.0-alpha`); sus planes viven en CHANGELOG.md y en los commits de cierre (`70cb335`, `f626077`).
- El endpoint `GET /v1/media/{mediaId}/playback` sigue temporal hasta PlaybackSession (BACKLOG de v0.1).
