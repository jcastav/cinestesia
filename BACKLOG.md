# BACKLOG

Registro de ideas, mejoras y redefiniciones propuestas por el agente.

No alteran el roadmap ni el alcance de la versión en curso; requieren revisión humana (AGENTS.md §3 y §17).

## Decisiones de diseño registradas (v0.3.0-alpha)

Decisiones tomadas durante la implementación y aprobadas en el plan de v0.3
(2026-10-03). Se dejan constancia aquí para no perderlas entre fases (AGENTS §10/§11).

### Nombre de tabla: `discovery_candidates` (no `discovered_candidates`)

- **Registrada por:** agente — Fase A (2026-10-03)
- **Contexto:** §7.90 llama `discovered_candidates` con columnas `discovery_source`/`external_reference`/`metadata`; el motor 6.44 §67 (documento-motor de la versión) dice `discovery_candidates` con `provider`/`external_id`/`normalized_data`/`match_reference`/`confidence`/`payload_checksum`.
- **Impacto:** modelo de datos. Se usa la nomenclatura de 6.44 (superset operativo); equivalencia documentada en `apps/api/src/db/schema.ts`.
- **Estado:** decidida (plan de v0.3 aprobado)

### `adapter_id` como clave lógica snapshot (no FK)

- **Registrada por:** agente — Fase A (2026-10-03)
- **Contexto:** contrato §14/§5 define `adapterId = "provider_x"` (lógico); runs y candidatos son provenance inmutable (§18) y deben sobrevivir a cambios/bajas del registry (`discovery_adapters`).
- **Impacto:** modelo de datos. `runs.adapter_id` y `candidates.adapter_id` son `varchar` con `adapter_version` snapshot; la integridad hacia el registry es por `adapter_key` único.
- **Estado:** decidida

### `available_at` ≡ `scheduled_at` (§7.93)

- **Registrada por:** agente — Fase A (2026-10-03)
- **Contexto:** §6.44 §67 llama `available_at` a la programación del job; §7.93 la llama `scheduled_at`.
- **Impacto:** modelo de datos. Un solo campo (`available_at`, `NOT NULL DEFAULT now()`), usado por el índice de dispatcher `(status, available_at)`.
- **Estado:** decidida

### `rejection_reason` y `version` (OCC) en `discovery_candidates` desde la Fase A

- **Registrada por:** agente — Fase A (2026-10-03)
- **Contexto:** motivos de rechazo §21 y concurrencia optimista §35 (409 ante candidato modificado mientras el admin lo revisa) pertenecen al dominio del candidato; incluirlos en la migración `0002` evita migraciones adicionales en la Fase E1.
- **Impacto:** modelo de datos. Columnas nullable/default listas para su uso en E1.
- **Estado:** decidida

### Ejecución de Discovery Runs en proceso (202 + polling), sin Queue/Worker/Redis

- **Registrada por:** agente — plan de v0.3 (2026-10-03)
- **Contexto:** §12.7 esquematiza `Run → Job → Queue → Worker`, pero la propia sección exige «infraestructura proporcional al tamaño real del MVP»; §6.44 §61 prohíbe crear API HTTP interna por estética; AGENTS §15 prohíbe infraestructura prematura.
- **Impacto:** infraestructura/contrato. `POST /v1/admin/discovery/runs` → 202 `{runId,status:"QUEUED"}` (§16: «no debe esperar»); ejecución en background en el mismo proceso; estado durable en Postgres; `GET .../runs/{runId}` para polling. Queue/Worker/DLQ → más abajo en este BACKLOG.
- **Estado:** decidida

### Candidato nuevo → `MediaItem` con `publicationStatus = DRAFT`

- **Registrada por:** agente — plan de v0.3 (2026-10-03)
- **Contexto:** §46 separa ingesta técnica de publicación editorial; los criterios de §12.7 no exigen publicar.
- **Impacto:** contrato/comportamiento. El contenido ingerido no aparece en `GET /v1/media` ni en la home hasta que un admin lo publique.
- **Estado:** decidida

### Solo `kind = CONTENT` se procesa en v0.3

- **Registrada por:** agente — plan de v0.3 (2026-10-03)
- **Contexto:** §12.7 soporta CONTENT y SOURCE, pero Source Registry es v0.4 (§12.8) y Health v0.7 (AGENTS §5).
- **Impacto:** alcance. Los candidatos SOURCE se modelan y persisten pero quedan `DISCOVERED` (visibles para revisión); su asociación → entrada «Candidatos SOURCE → Source Registry».
- **Estado:** decidida

### Admin UI: token de operador en memoria/`sessionStorage`

- **Registrada por:** agente — plan de v0.3 (decisión humana 2026-10-03)
- **Contexto:** no existe Identity hasta v0.6; el token `ADMIN_API_TOKEN` no puede vivir en el bundle ni en código (AGENTS §6); un proxy server-side en Next crearía un endpoint admin sin autenticación propia.
- **Impacto:** seguridad/UI. El operador pega el token en la página; nunca se persiste en el repo.
- **Estado:** decidida (alternativas descartadas registradas en la conversación de aprobación)

### Límites de normalización alineados con `catalog/validation.ts`

- **Registrada por:** agente — Fase B (2026-10-03)
- **Contexto:** la normalización (§6.44 §19) y la validación (§28) viven en fases distintas (B y D); si la normalización impusiera límites más estrictos que el catálogo, la Fase D rechazaría candidatos que la normalización ya aceptó.
- **Impacto:** modelo/validación. Reglas únicas: `title`/`originalTitle` ≤ 500, `synopsis` ≤ 5000, `releaseYear` entero 1..9999, `runtimeSeconds` 1..2147483647, URLs `^https?:\/\/\S+$`, `namespace` ≤ 64 / `externalId` ≤ 255 únicos por par, `slugBase` ≤ 100 con `SLUG_PATTERN`. Los sinónimos de `type` (movie/series/…) viven en `MEDIA_TYPES` y son ampliables; desconocido → `OTHER` + issue.
- **Estado:** decidida

### Política de errores de normalización: `issues[]` vs abort

- **Registrada por:** agente — Fase B (2026-10-03)
- **Contexto:** AGENTS §6 (no ocultar errores técnicos) vs. robustez del pipeline: un campo inválido aislado no debe matar el candidato entero. La identidad (`provider`/`externalId`/`title` o `raw` no-objeto) sí aborta con `DiscoveryError("INVALID_ARGUMENT")` porque sin ella no hay candidato persistible.
- **Impacto:** comportamiento. Todo lo demás (año, runtime, URLs, `externalIds` malformados, `type` desconocido, truncados) se descarta y se registra en `normalizedData.issues[]` (visible en el detalle del candidato, Fase E1) en lugar de fallar.
- **Estado:** decidida

### Derivación del año desde `releaseDate` y detección de desajuste

- **Registrada por:** agente — Fase B (2026-10-03)
- **Contexto:** muchos proveedores emiten fecha completa pero no año (o un año inválido tipo `N/A`); §7.18 permite `releaseYear` y `releaseDate` por separado.
- **Impacto:** comportamiento. Si `releaseYear` falta o se descarta por inválido y `releaseDate` es válida → se deriva el año (con issue cuando el original era inválido); si ambos existen y discrepan → se conservan los dos y se registra `issues` (la revisión editorial de la Fase E1 lo ve).
- **Estado:** decidida

### Checksum canónico (claves ordenadas) para `payload_checksum`

- **Registrada por:** agente — Fase B (2026-10-03)
- **Contexto:** §6.44 §3/§11 exige `sha256:...` (≤ 80 chars, `varchar(80)`), pero el orden de claves de un objeto JSON depende de cómo el adapter construya el payload: sin canonicidad, dos ejecuciones idénticas producirían checksums distintos.
- **Impacto:** modelo/auditoría. `sha256:<hex>` sobre JSON con claves ordenadas recursivamente; el orden de los arreglos se conserva (es significativo). Test: mismo payload en distinto orden → mismo checksum.
- **Estado:** decidida

### DTOs compartidos como superset operativo del contrato conceptual

- **Registrada por:** agente — Fase B (2026-10-03)
- **Contexto:** §3 define `DiscoveryCandidate` mínimo (identidad + normalized + checksum); los endpoints admin (§18–§20) necesitan además `status`, `version` (OCC) y `rejectionReason`, y §5/§6 definen `DiscoveryRunDto` con contadores.
- **Impacto:** contrato. `DiscoveryCandidateDto` = §3 + `status`/`version`/`rejectionReason`/`match`/`rawPayload` (solo se exponen en rutas admin); `DiscoveryRunDto` añade `mode`/`query`/`maxItems`/`counters`/`errorSummary`. Mapper row → DTO de runs en `discovery/mapper.ts` (Fase C); el de candidatos llega en E1.
- **Estado:** decidida

### Registry de código como verdad runtime de adapters (capabilities/version)

- **Registrada por:** agente — Fase C (2026-10-03)
- **Contexto:** `discovery_adapters` (fila administrativa, Fase A) y `discovery/registry.ts` (código) pueden divergir: la capability `REQUIRES_QUERY` que gatesa el 400 en `POST /runs` debe venir del código que se ejecuta, no de metadatos editables.
- **Impacto:** seguridad/comportamiento. El runtime lee `capabilities`/`version` del registry; la fila es metadato para la UI (E2). Seed alineado en la Fase C (`["CONTENT_DISCOVERY", "REQUIRES_QUERY"]` en ambos adapters).
- **Estado:** decidida

### Un solo run activo: advisory lock transaccional (sin índice único parcial)

- **Registrada por:** agente — Fase C (2026-10-03)
- **Contexto:** decisión 11 del plan (un solo run activo → 409 `RUN_ALREADY_RUNNING`) sin migración en la Fase C; el índice único parcial `WHERE status IN (QUEUED, RUNNING)` no existe en la migración `0002`.
- **Impacto:** modelo de datos/concurrencia. `createRunWithLock` toma `pg_advisory_xact_lock(hashtext('cinestesia:discovery_run_active'))` y chequea runs activos dentro de la misma transacción. El índice único queda en «Ideas futuras» como refuerzo/consulta.
- **Estado:** decidida (índice diferido)

### Estados del run y política de errores del orquestador (§32/§40)

- **Registrada por:** agente — Fase C (2026-10-03)
- **Contexto:** §32 define `SUCCEEDED/PARTIAL/FAILED`; §40 exige que los fallos terminen como filas `ingestion_errors` visibles (criterio 10 de §12.7) y la ejecución en proceso (decisión del plan) no debe dejar runs colgados ni excepciones escapando del proceso.
- **Impacto:** comportamiento. `executeRun` nunca relanza: errores=0 → `SUCCEEDED`; errores>0 con ítems procesados → `PARTIAL`; sin ítems procesados o fallo del adapter/registry → `FAILED` (con `errorSummary`). `candidatesFound` = emitidos, `processed` = persistidos `DISCOVERED`, `errors` = filas de error (matched/new/ambiguous/rejected/sourcesDiscovered esperan a D/E1).
- **Estado:** decidida

### Candidato con error: `FAILED` persistido sólo con identidad estable

- **Registrada por:** agente — Fase C (2026-10-03)
- **Contexto:** `provider`/`externalId` son `NOT NULL` (§67): si la normalización falla por identidad inválida no existe fila posible.
- **Impacto:** comportamiento. Identidad estable (`hasStableIdentity`) → candidato en `FAILED` con su `raw_payload`/checksum + `ingestion_errors` con `candidateId`; sin identidad → sólo `ingestion_errors` con `candidateId = null`. En ambos casos el run **continúa** con el resto de ítems (un ítem malo no mata el lote) y los contadores deciden `PARTIAL`/`FAILED`.
- **Estado:** decidida

### Upsert de candidatos sólo refresca estados descubribles (§21)

- **Registrada por:** agente — Fase C (2026-10-03)
- **Contexto:** §21 exige transiciones controladas; en Fase D+ existirán candidatos `APPROVED`/`INGESTED` que una re-detección no debe pisar.
- **Impacto:** modelo de datos. `ON CONFLICT (kind, provider, external_id) DO UPDATE ... WHERE status IN ('DISCOVERED','FAILED','STALE')`; `version` (OCC §35) sube sólo si cambia `payload_checksum`, `adapter_version` o `status`; `discovered_at` se preserva y `run_id` queda como último observador. Si el `WHERE` no aplica, se devuelve la fila existente sin modificar.
- **Estado:** decidida

### Fetch externo delimitado por adapter (§52/§53/§38)

- **Registrada por:** agente — Fase C (2026-10-03)
- **Contexto:** sin CAPTCHA/proxies (decisión 1 del plan), el SSRF y la fiabilidad se controlan en el cliente HTTP compartido; ningún host externo puede usarse sin estar en `registry.ts` + allowlist.
- **Impacto:** seguridad/resiliencia. Sólo https con allowlist de hosts por adapter, `redirect: "error"`, timeout 10s, máx. 1MB y `content-type` JSON, reintentos ≤ 3 sólo ante timeout/red/5xx/429 con backoff 250ms·2^n + jitter ≤ 100ms y deadline total 30s, rate limit 5 req/s por adapter, UA `Cinestesia-Discovery/0.3.0`. Errores clasificados (`UPSTREAM_TIMEOUT`, `UPSTREAM_RATE_LIMIT`, `DISCOVERY_ADAPTER_ERROR`, `INVALID_EXTERNAL_PAYLOAD`) con `retryable`.
- **Estado:** decidida

### Runs huérfanos → `FAILED` al arrancar

- **Registrada por:** agente — Fase C (2026-10-03)
- **Contexto:** la ejecución vive en el proceso: si el proceso muere, los runs `QUEUED`/`RUNNING` quedarían colgados para siempre.
- **Impacto:** comportamiento. `recoverOrphanedRuns()` al hacer boot marca esos runs como `FAILED` con `errorSummary = "Interrumpido por reinicio del proceso"` (sin inventar códigos fuera de §40). Re-ejecución automática de runs interrumpidos → «Queue/Worker» en este BACKLOG.
- **Estado:** decidida

### Normalización aplicada al persistir el candidato (ajuste sobre el plan)

- **Registrada por:** agente — Fase C (2026-10-03)
- **Contexto:** el plan reservaba «normalización aplicada» al criterio de la Fase D, pero el upsert del candidato necesita `normalized_data` desde su primera aparición (§19 vive antes de matching).
- **Impacto:** alcance/fases. La Fase C ya ejecuta `normalizeContent` al persistir (y guarda `issues[]`); la Fase D queda en matching (§23) + validación §28 + ingesta + transiciones, sin repetir normalización.
- **Estado:** decidida

### Máquina de estados del candidato: `NORMALIZING` no se persiste

- **Registrada por:** agente — Fase D (2026-10-03)
- **Contexto:** §21 incluye `NORMALIZING` entre `DISCOVERED` y `MATCHING`, pero la normalización se aplica ya al persistir (decisión de la Fase C): no existe ventana en la que un candidato persistido esté «sin normalizar».
- **Impacto:** modelo de datos/comportamiento. `CANDIDATE_TRANSITIONS` (`discovery/pipeline.ts`) cubre `DISCOVERED→MATCHING→MATCHED|AMBIGUOUS|VALIDATING→INGESTING→INGESTED|FAILED`, `AMBIGUOUS→PENDING_REVIEW`, `*→FAILED` y `FAILED→DISCOVERED|MATCHING` (reintento); `assertCandidateTransition` impide `FAILED→INGESTED` y compañía. `NORMALIZING` queda documentado como fase interna de `normalizeContent`, no como estado.
- **Estado:** decidida

### Pipeline de candidato inyectado como dependencia opcional del orquestador

- **Registrada por:** agente — Fase D (2026-10-03)
- **Contexto:** los tests de la Fase C (`discovery-run.test.ts`) ejecutan `executeRun` sin matching/ingesta y deben seguir verdes sin reescribirlos; el plan exigía ampliar el orquestador sin romper contratos previos.
- **Impacto:** diseño/test. `ExecuteRunDeps.pipeline?: CandidatePipeline`; sin pipeline o con candidato no `DISCOVERED` → se contabiliza procesado sin transiciones (idempotencia §37). `discovery/service.ts` siempre inyecta `buildCandidatePipeline()` en producción.
- **Estado:** decidida

### Contadores del run: definición de `matched`, `newContent`, `ambiguous`, `rejected` y `errors`

- **Registrada por:** agente — Fase D (2026-10-03)
- **Contexto:** §5/§6 exigen contadores de resultado, pero su semántica exacta (qué suma cada transición) no está cerrada hasta que existe pipeline.
- **Impacto:** comportamiento/contrato. `matched` = candidatos `INGESTED` con `NO_CHANGE` (entidad existente enlazada); `newContent` = `INGESTED` con `CREATE` (entidad nueva); `ambiguous` = `PENDING_REVIEW`; `rejected` = `FAILED` por validación §28 (`VALIDATION_ERROR`); `errors` = todos los `FAILED` del pipeline (incluye `rejected` y `INGESTION_ERROR`; un run con `rejected>0` termina `PARTIAL`); los errores técnicos no clasificados abortan el run (`FAILED`, §32). `sourcesDiscovered` sigue a 0 (solo `kind=CONTENT`).
- **Estado:** decidida

### Matching sin año: política conservadora (`≥1 → AMBIGUOUS`)

- **Registrada por:** agente — Fase D (2026-10-03)
- **Contexto:** §22/§23 no fijan la política cuando el candidato no tiene `releaseYear` y el plan me dejó decidirla y documentarla.
- **Impacto:** comportamiento/matching. Con año: exacto → `DETERMINISTIC`, >1 → `AMBIGUOUS`, 0 → `NO_MATCH`. Sin año: la búsqueda es sólo título+tipo; 1 coincidencia → `AMBIGUOUS` (no se asume identidad sin año), 0 → `NO_MATCH`. Evita falsos positivos a costa de más revisión manual (E1).
- **Estado:** decidida

### Validación §28: `ERROR` bloquea, `WARNING`/`INFO` no; año mínimo 1888

- **Registrada por:** agente — Fase D (2026-10-03)
- **Contexto:** §28 define severidades; el umbral de año procede de §28 (primera obra audiovisual) y es **más estricto que `catalog/validation.ts`** (1..9999), a diferencia de la regla de la Fase B (la normalización nunca más estricta que el catálogo — aquí aplica la validación, no la normalización).
- **Impacto:** comportamiento. `validateNormalizedContent` devuelve `issues[]`; con al menos un `ERROR` (`TITLE_REQUIRED`, `TITLE_TOO_LONG`, `TYPE_INVALID`, `YEAR_OUT_OF_RANGE` 1888..9999, `EXTERNAL_ID_INVALID`, `SLUG_INVALID`, `RUNTIME_INVALID`, `DATE_INVALID`) el candidato pasa a `FAILED` con `VALIDATION_ERROR` (resumen = códigos+mensajes en `ingestion_errors`) y el run queda `PARTIAL`; `WARNING` (`YEAR_MISSING`, `NORMALIZATION_ISSUE` = avisos de normalización trasladados) e `INFO` (`SYNOPSIS_MISSING`) no bloquean y viajan en el resultado para la revisión de la Fase E1.
- **Estado:** decidida

### Clasificación de errores de ingesta (`VALIDATION_ERROR` vs `INGESTION_ERROR` vs abort)

- **Registrada por:** agente — Fase D (2026-10-03)
- **Contexto:** al crear/enlazar en el Catalog pueden fallar la validación de payload, los conflictos de unicidad o fallos técnicos; §32/§40 exigen distinguir rechazo de error.
- **Impacto:** comportamiento. `CatalogError("INVALID_ARGUMENT")` → `VALIDATION_ERROR` (rechazo, `rejected++`); resto de `CatalogError` (p. ej. `CONFLICT`) → `INGESTION_ERROR` (`errors++`, run `PARTIAL`); cualquier otro error (DB, bug) se relanza y aborta el run como `FAILED` — los fallos técnicos no se ocultan (AGENTS §6).
- **Estado:** decidida

### Creación desde ingesta: resolución de slug y conflicto de identidad

- **Registrada por:** agente — Fase D (2026-10-03)
- **Contexto:** `createMediaItemFromIngestion` parte del `slugBase` del candidato (p. ej. `breaking-bad`) que puede colisionar con una entidad ya existente.
- **Impacto:** comportamiento/unicidad. Slug libre → `base`, `base-2` … `base-50` (máx. 50 intentos, luego `CONFLICT`); la identidad primaria (`namespace`/`externalId` del candidato) que ya pertenece a otra entidad → `CONFLICT` (nunca se re-asigna); identidades secundarias conflictivas se omiten (ya enlazadas a otra entidad) sin fallar la creación. Todo dentro de `db.transaction` con `executeWrite` del Catalog (sin SQL de catálogo desde `discovery/`).
- **Estado:** decidida

### `GET /v1/admin/media/:mediaId` (detalle admin sin filtro de visibilidad)

- **Registrada por:** agente — Fase D (2026-10-03)
- **Contexto:** el criterio de smoke exige ver un candidato ingerido como `DRAFT`, invisible en `GET /v1/media/{id}`; el detalle público filtra por `PUBLISHED` (`assertPubliclyVisible`) y no existe ruta admin de lectura (v0.2 solo tenía `POST`/`PATCH`).
- **Impacto:** contrato público administrativo (adición → §8 junto al resto de endpoints de Discovery). Requiere `requireAdmin`; devuelve `getAdminMediaDetail` (mismo `MediaDetail` público, sin filtro de estado).
- **Estado:** decidida (consolidar en §8 al cerrar v0.3)

## Ideas futuras

### Reemplazar `GET /v1/media/{mediaId}/playback` por PlaybackSession

- **Propuesta por:** agente
- **Fecha:** 2026-10-02
- **Contexto:** el DoD de v0.1.0-alpha (§12.5) exige que Hls.js reproduzca un stream de prueba, pero PlaybackSession y Media Gateway aún no existen. Se creó un endpoint temporal que devuelve `playbackUrl` directamente. §8.2 y §8.85 (reglas 2, 5, 7) establecen que el Player recibe una PlaybackSession y que las URLs de origen no cruzan las APIs públicas.
- **Impacto:** contrato público. Debe migrarse a `POST /v1/playback/sessions` + entrega vía Gateway (§8.17, §8.25) en v0.4.0-alpha / v0.5.0-beta.
- **Estado:** pendiente de revisión

### Alinear la tabla `sources` con el DDL de §7.37

- **Propuesta por:** agente
- **Fecha:** 2026-10-02
- **Contexto:** v0.1 usó una tabla `sources` mínima (`media_item_id`, `playback_url`, `is_active`) según decisión humana sobre §12.5. El modelo canónico de §7.37 exige `provider_id NOT NULL`, `source_reference`, `lifecycle_status`, `operational_enabled` y el CHECK media/episode.
- **Impacto:** modelo de datos. Requiere migración al implementar el Source Registry (v0.4.0-alpha).
- **Estado:** pendiente de revisión

### Definir `GET /v1/media` paginado en el contrato de la Sección 8

- **Propuesta por:** agente
- **Fecha:** 2026-10-03
- **Contexto:** v0.2 añadió `GET /v1/media?page&limit` (solo PUBLISHED, meta `{page,limit,total}`) porque §8 no define un listado de medios; fue decisión aprobada en el plan de v0.2 como «adición a §8».
- **Impacto:** contrato público. Consolidarlo en §8.13–§8.16 o reemplazarlo cuando Search/Discovery existan (v0.3).
- **Estado:** pendiente de revisión

### Resolver dual UUID/slug: cambiar 400 por 404 en identificadores no-UUID inexistentes

- **Propuesta por:** agente
- **Fecha:** 2026-10-03
- **Contexto:** v0.1 devolvía 400 `INVALID_ARGUMENT` para identificadores que no son UUID; v0.2 (resolución dual aprobada) devuelve 404 `MEDIA_NOT_FOUND` cuando el valor no es UUID y tampoco coincide ningún slug. Es un cambio deliberado respecto a v0.1, ya registrado en el CHANGELOG.
- **Impacto:** contrato público. Confirmar que §8.7/§8.13 aceptan 404 para parámetros con formato no reconocido.
- **Estado:** pendiente de revisión

### Migrar Catalog Admin API de token estático a RBAC (§8.76)

- **Propuesta por:** agente
- **Fecha:** 2026-10-03
- **Contexto:** «crear contenido» se resolvió con `Authorization: Bearer ADMIN_API_TOKEN` (decisión humana, plan v0.2 punto 2). §8.76 exige capacidad `catalog.write` con identidad real.
- **Impacto:** seguridad/contrato. Requiere Identity (v0.6/v0.8). El token actual vive solo en `.env` gitignored.
- **Estado:** pendiente de revisión

### Creación de seasons/episodes por API

- **Propuesta por:** agente
- **Fecha:** 2026-10-03
- **Contexto:** v0.2 creó la estructura episódica solo vía seed (schema + `GET .../seasons/{n}` + display); el plan aprobado difirió la escritura por API a BACKLOG. Hoy `POST/PATCH /v1/admin/media` no acepta `seasons`.
- **Impacto:** contrato/administración. Endpoints tipo `POST /v1/admin/media/{id}/seasons` y `.../episodes` cuando haya caso de uso real.
- **Estado:** pendiente de revisión

### Reproducción de episodios y Player para SERIES

- **Propuesta por:** agente
- **Fecha:** 2026-10-03
- **Contexto:** las `sources` son media-level, así que los episodios son display-only y el Player solo se monta en contenido unitario (`type !== "SERIES"`). §8.2/§8.85 requieren PlaybackSession por representación.
- **Impacto:** funcionalidad. Necesario junto con Source Registry/Playback (v0.4.0-alpha / v0.5.0-beta); de ahí dependerá también la migración del endpoint temporal `playback`.
- **Estado:** pendiente de revisión

### Contradicción CAPTCHA / anti-bot / proxies residenciales (02-alcance:390)

- **Propuesta por:** usuario (2026-10-03) · decidida en la misma sesión
- **Fecha:** 2026-10-03
- **Contexto:** `paper_project/02-alcance-y-mvp.md:390` declara que «las integraciones deberán operar mediante técnicas destinadas a eludir CAPTCHA, controles anti-bot u otras restricciones de acceso» y que «constituye un requisito arquitectónico del MVP». Lo contradicen **ADR-SRC-10 (ACCEPTED)**, **ADR-DI-034 (ACCEPTED)**, motor 6.44 §13.3 («No forma parte del diseño base ningún mecanismo destinado a evadir CAPTCHA, anti-bot...»), §6.12, §6.35 §2.63 (descarta explícitamente OCR/CAPTCHA, evasión de Cloudflare, rotación de identidad y proxies residenciales obligatorios), `03-actores-y-roles.md:361` y `05-requisitos...md:439`.
- **Impacto:** arquitectura + alcance. **Decisión humana 2026-10-03: NO implementar en v0.3** (ni en lo inmediato); el adapter opera mediante integraciones autorizadas con rate limit por adapter, `User-Agent` identificable y respeto de robots.txt (§52/§53 del motor 6.44).
- **Estado:** pendiente de enmienda — decidir si se corrige `02-alcance:390` o si se reabren las ADRs (AGENTS §17: prevalece la arquitectura documentada hasta que una persona decida).

### Adición de `query?` y `limit?` a `POST /v1/admin/discovery/runs`

- **Propuesta por:** agente
- **Fecha:** 2026-10-03
- **Contexto:** §16 de contratos solo define `{adapterId, mode}`; los adapters de tipo Metadata API necesitan un criterio de búsqueda y un tope de elementos para ser operables en modo manual (§24 `limits.maxItems`).
- **Impacto:** contrato público administrativo. Consolidar en §8 (o reemplazar cuando se defina el contrato final de Discovery) — mismo tratamiento que `GET /v1/media` en v0.2.
- **Estado:** pendiente de revisión

### `provider` ≡ `namespace` en el matching Nivel 1

- **Propuesta por:** agente
- **Fecha:** 2026-10-03
- **Contexto:** el candidato lleva `provider`+`externalId` (§6.44) y el catálogo guarda `namespace`+`externalId` (§7.27, decisión de v0.2). Para cruzarlos se asume `provider = namespace`.
- **Impacto:** contrato/matching. Documentarlo en §7.27 y en el contrato de Discovery cuando se añada a §8; si algún adapter emite ids externos de terceros (IMDb…), deberá declarar el `namespace` que corresponde.
- **Estado:** pendiente de revisión

### Endpoints de Discovery/Ingestion en el contrato de la Sección 8

- **Propuesta por:** agente
- **Fecha:** 2026-10-03
- **Contexto:** §8.35 solo lista `POST /v1/admin/ingestion/candidates/{id}/approve`; los endpoints completos (`/v1/admin/discovery/runs`, `/candidates`, `/reject`, `/retry`, `/adapters`) viven en 6.44 §60 y en los contratos §15–22.
- **Impacto:** contrato público. Añadirlos a §8 al cerrar v0.3 (adición documentada, precedente v0.2).
- **Estado:** pendiente de revisión

### RBAC `discovery.write` para la Admin API de Discovery (§8.76)

- **Propuesta por:** agente
- **Fecha:** 2026-10-03
- **Contexto:** v0.3 reutiliza `ADMIN_API_TOKEN` estático (decisión de v0.2); §8.76 exige capacidades reales (`catalog.write`, y de forma análoga capacidad de Discovery) con identidad.
- **Impacto:** seguridad/contrato. Requiere Identity (v0.6/v0.8). El token vive solo en `.env` gitignored.
- **Estado:** pendiente de revisión

### Scheduler / Discovery programado (cron)

- **Propuesta por:** agente (derivado de §12.7)
- **Fecha:** 2026-10-03
- **Contexto:** §30.2/§33 definen el modo programado; el criterio de salida de §12.7 solo exige ejecución **manual** y AGENTS §15 prohíbe infraestructura prematura.
- **Impacto:** infraestructura/alcance. Requiere proceso periódico (y probablemente Queue/Worker) → v0.4+.
- **Estado:** pendiente de revisión

### Queue / Worker / Dead Letter Queue (Redis)

- **Propuesta por:** agente (derivado de §12.7)
- **Fecha:** 2026-10-03
- **Contexto:** §35/§36/§39/§68 describen cola, workers y DLQ en Redis; la Fase A–E de v0.3 ejecutan en proceso con estado durable en Postgres (decisión «Ejecución de Discovery Runs en proceso»).
- **Impacto:** infraestructura. Añade Redis al stack (hoy solo Supabase + Upstash planificado más adelante) → v0.4+ cuando el runtime de ejecución lo justifique.
- **Estado:** pendiente de revisión

### Reconciliation Engine (new/updated/missing/stale)

- **Propuesta por:** agente (derivado de §12.7)
- **Fecha:** 2026-10-03
- **Contexto:** §47–49/§76 y §77.15 («basic reconciliation»); los criterios de salida de §12.7 no la exigen y requiere historia de runs + reglas de desaparición con grace period (§48).
- **Impacto:** alcance. Fase 2 de la evolución del motor (§79) → v0.4+.
- **Estado:** pendiente de revisión

### Enrichment multi-provider (§26/§27)

- **Propuesta por:** agente (derivado de §12.7)
- **Fecha:** 2026-10-03
- **Contexto:** prioridad de fuentes de metadatos configurable (`metadata_provider_priority`); añade proveedores externos y política de precedencia.
- **Impacto:** alcance/dependencias externas. Fase 6 de §79 → v0.5+.
- **Estado:** pendiente de revisión

### Matching niveles 3 (alias/título alternativo) y 4 (probabilístico)

- **Propuesta por:** agente (derivado de §12.7)
- **Fecha:** 2026-10-03
- **Contexto:** §22 niveles 3 y 4; requieren `media_titles`/alias (diferido en v0.2, §7.28), similitud textual y modelo de confidence (HIGH/MEDIUM/LOW). En v0.3 solo Nivel 1 (external ID) y Nivel 2 (título normalizado + año + tipo); la ambigüedad se resuelve con `PENDING_REVIEW`.
- **Impacto:** modelo de datos + matching. Fase 5 de §79 → v0.4+.
- **Estado:** pendiente de revisión

### Candidatos SOURCE → Source Registry (y Health)

- **Propuesta por:** agente (derivado de §12.7)
- **Fecha:** 2026-10-03
- **Contexto:** §41–45/§64 y criterios 10–13 de §82; Source Registry es v0.4.0-alpha (§12.8) y Health v0.7. En v0.3 los candidatos `SOURCE` se persisten pero no se procesan.
- **Impacto:** alcance/fronteras (AGENTS §5). Requiere el DDL real de `sources` de §7.37 (otra deuda de v0.1).
- **Estado:** pendiente de revisión

### UPDATE real de metadatos de un `MediaItem` existente (§50)

- **Propuesta por:** agente (derivado de §12.7)
- **Fecha:** 2026-10-03
- **Contexto:** §50 exige distinguir `CREATE/UPDATE/NO_CHANGE` y mantener título/sinopsis/géneros/imágenes actualizados; en v0.3 un match solo enlaza (`NO_CHANGE`) para no pisar curaduría manual.
- **Impacto:** comportamiento/contrato. Necesita política de precedencia de metadatos y auditoría de cambios.
- **Estado:** pendiente de revisión

### Approval Policy Engine configurable / auto-approval avanzado (§29)

- **Propuesta por:** agente (derivado de §12.7)
- **Fecha:** 2026-10-03
- **Contexto:** §29 define política configurable por confianza/proveedor/conflictos; v0.3 usa una regla fija y conservadora (ambiguo siempre a revisión).
- **Impacto:** alcance/seguridad editorial. v0.4+.
- **Estado:** pendiente de revisión

### Eventos de dominio y Search projection desde Discovery (§62/§63)

- **Propuesta por:** agente (derivado de §12.7)
- **Fecha:** 2026-10-03
- **Contexto:** §62 define eventos de integración (`MediaItemIngested`, `CandidateMatched`…) y §63 la proyección a Search; no existe bus de eventos ni Search Engine.
- **Impacto:** integración. Cuando exista Search, consumirá eventos de Catalog (nunca escritura directa de Discovery).
- **Estado:** pendiente de revisión

### Métricas, tracing y dashboard de Discovery (§55–§57)

- **Propuesta por:** agente (derivado de §12.7)
- **Fecha:** 2026-10-03
- **Contexto:** en v0.3 la observabilidad mínima son logs estructurados con `runId`/`candidateId`/`adapterId` (§55) y los counters del run; no hay Prometheus ni tracing.
- **Impacto:** observabilidad/infraestructura. Post-MVP, junto con la observabilidad transversal (§6.25).
- **Estado:** pendiente de revisión

### Audit events de approve/reject (§20 de contratos)

- **Propuesta por:** agente
- **Fecha:** 2026-10-03
- **Contexto:** §20 exige `actor`, admin session, timestamp y Audit Event; sin Identity (v0.6) solo se registra un identificador libre y el timestamp.
- **Impacto:** cumplimiento/auditoría. Completar con Audit Domain (§7.106) en v0.6+.
- **Estado:** pendiente de revisión

### API interna HTTP `/internal/v1/ingestion/*` (§61)

- **Propuesta por:** agente
- **Fecha:** 2026-10-03
- **Contexto:** §61 la permite pero prohíbe crearla «por estética» si una llamada de módulo basta en el modular monolith MVP.
- **Impacto:** arquitectura. Solo si en el futuro Discovery se separa en proceso/servicio.
- **Estado:** pendiente de revisión (probablemente descartada mientras sea monolith)

### `DiscoveredItemInput` provisional en `normalize.ts`

- **Propuesta por:** agente
- **Fecha:** 2026-10-03
- **Contexto:** el tipo de entrada común del adapter se definió en la Fase B dentro de `discovery/normalize.ts` porque el contrato completo del adapter (`DiscoveryAdapter`, §14/§23) se crea en la Fase C.
- **Impacto:** organización del código. Moverlo (o re-exportarlo) a `discovery/adapter.ts` en la Fase C y actualizar imports de tests.
- **Estado:** **resuelta en la Fase C** (2026-10-03): `CandidateExternalId` y `DiscoveredItemInput` ahora viven en `discovery/adapter.ts`; `normalize.ts` sólo importa los tipos; test actualizado.

### Índice único parcial para «un solo run activo»

- **Propuesta por:** agente
- **Fecha:** 2026-10-03
- **Contexto:** la Fase C garantiza un solo run activo con advisory lock transaccional para no migrar; un índice único parcial `ON (id) WHERE status IN ('QUEUED','RUNNING')` daría redundancia a nivel de datos y aceleraría el chequeo.
- **Impacto:** modelo de datos. Requiere migración aparte (drizzle-kit generate) — previsible en Fase E1 o cierre si la revisión lo considera necesario.
- **Estado:** pendiente de revisión

### Sincronía de `capabilities`/`version` del seed vs registry de código

- **Propuesta por:** agente
- **Fecha:** 2026-10-03
- **Contexto:** el runtime usa `discovery/registry.ts` (decisión de la Fase C) y la fila `discovery_adapters` es metadato; ambos se actualizaron a mano en la Fase C (`REQUIRES_QUERY`).
- **Impacto:** mantenimiento. Un adapter nuevo o un bump de versión debe tocarse en dos sitios. La Fase E2 (listado/enable/disable) podría derivar capabilities/version del registry y dejar la fila sólo para `enabled`/`configuration`.
- **Estado:** pendiente de revisión

### Smoke de TVMaze end-to-end con red real pendiente

- **Propuesta por:** agente
- **Fecha:** 2026-10-03
- **Contexto:** el smoke de la Fase C usó `manual_import` (sin red) para ser determinista; el adapter TVMaze está cubierto por tests con fixtures pero no por una llamada real a `api.tvmaze.com` desde este entorno.
- **Impacto:** verificación. Ejecutar al menos una vez (Fase E2/F o cierre) un run `tvmaze_metadata` real para confirmar allowlist, rate limit y formato de respuesta en condiciones de producción.
- **Estado:** **resuelta en la Fase D** (2026-10-03): smoke con 3 runs reales contra `api.tvmaze.com` (`"breaking bad"` ×2 y `"the wire"`, `maxItems:5`) — allowlist, rate limit, formato y matching verificados en producción (`SMOKE_D_ALL_PASS`).

### Matching Nivel 2: post-filtro en JS sin límite de filas ni índice de texto

- **Propuesta por:** agente
- **Fecha:** 2026-10-03
- **Contexto:** `findMediaItemsByTypeAndYear` prefiltra por índice (`media_type`, `release_year`) y `service.ts` compara títulos en JS con `normalizeTitleKey` (insensible a acentos), porque `lower()` de Postgres no descompone acentos. No hay `LIMIT`: se traen todas las filas del tipo (+año).
- **Impacto:** rendimiento/escala. Correcto para el catálogo MVP (decena de filas, verificado en el smoke); si el catálogo crece, añadir índice de texto (`pg_trgm`/`tsvector`) o migrar a `media_titles` (§7.28, necesario igualmente para los niveles 3/4).
- **Estado:** pendiente de revisión

### Candidato puede quedar `INGESTING` si el proceso muere a mitad del pipeline

- **Propuesta por:** agente
- **Fecha:** 2026-10-03
- **Contexto:** las transiciones del candidato son saltos separados (`VALIDATING→INGESTING→INGESTED`); `recoverOrphanedRuns()` sólo recupera **runs** al boot. Si el proceso muere justo entre saltos, la fila queda en `INGESTING` y el upsert no la refresca (no es estado descubrible) → el candidato queda estancado y no se reprocesa.
- **Impacto:** fiabilidad. Baja probabilidad (ventana de ms) y visible en la BD; la recuperación pertenece a un flujo de `STALE`/reconciliación → resolver junto con E1 (review/retry) o Reconciliation (v0.4+).
- **Estado:** pendiente de revisión

### Resultado de validación §28: los `WARNING`/`INFO` no se persisten en el candidato

- **Propuesta por:** agente
- **Fecha:** 2026-10-03
- **Contexto:** `validateNormalizedContent` se ejecuta en el pipeline; sólo los `ERROR` quedan visibles (como `ingestion_errors` con `VALIDATION_ERROR` y sus `details`). Los `WARNING`/`INFO` (p. ej. año ausente, desajuste año/fecha) se descartan al terminar la transición. Los `issues[]` de **normalización** sí persisten (decisión de la Fase B, en `normalizedData.issues[]`).
- **Impacto:** revisión/UX. La Review Queue (E1) convendría mostrar ambos; promover `validationIssues` a `normalizedData` o a columna propia cuando E1 defina el detalle del candidato.
- **Estado:** pendiente de revisión

### Modo `INCREMENTAL` rechazado en v0.3 (sólo `FULL`)

- **Propuesta por:** agente
- **Fecha:** 2026-10-03
- **Contexto:** §60/§16 definen `mode` (`FULL`/`INCREMENTAL`); el alcance de v0.3 sólo ejecuta corridas completas y no existe lógica de delta.
- **Impacto:** contrato. `POST /v1/admin/discovery/runs` con `mode` distinto de `FULL` → 400 `INVALID_ARGUMENT`. Implementar deltas cuando exista scheduler/reconciliation (ver «Scheduler» y «Reconciliation Engine»).
- **Estado:** pendiente de revisión

### `normalizedData.issues[]` embebido en el jsonb

- **Propuesta por:** agente
- **Fecha:** 2026-10-03
- **Contexto:** los avisos de normalización (campos descartados/truncados) se guardan dentro de `normalized_data` (jsonb) en lugar de una columna propia, para no añadir DDL en la Fase B.
- **Impacto:** modelo de datos/consulta. Si en alguna fase se necesita filtrar candidatos con issues (p. ej. ordenar la Review Queue), promover `issues` a columna propia con migración.
- **Estado:** pendiente de revisión

### 6 códigos de error nuevos de Discovery sin documentar en §8

- **Propuesta por:** agente
- **Fecha:** 2026-10-03
- **Contexto:** `RUN_NOT_FOUND`, `CANDIDATE_NOT_FOUND`, `ADAPTER_NOT_FOUND`, `ADAPTER_DISABLED`, `CANDIDATE_NOT_PENDING` (404/409) y `RUN_ALREADY_RUNNING` (409) existen en `ApiErrorCode` desde la Fase B; la Sección 8 todavía no los referencia.
- **Impacto:** contrato público. Documentarlos junto a los endpoints de Discovery/Ingestion cuando se añadan a §8 (misma entrada/destino que «Endpoints de Discovery/Ingestion en el contrato de la Sección 8»).
- **Estado:** pendiente de revisión

<!-- Formato por entrada:
### <Título de la idea>
- **Propuesta por:** agente / usuario
- **Fecha:** YYYY-MM-DD
- **Contexto:** por qué surge
- **Impacto:** arquitectura, contrato, modelo de datos, infraestructura, alcance
- **Estado:** pendiente de revisión / aprobada / descartada
-->
