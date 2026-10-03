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

<!-- Formato por entrada:
### <Título de la idea>
- **Propuesta por:** agente / usuario
- **Fecha:** YYYY-MM-DD
- **Contexto:** por qué surge
- **Impacto:** arquitectura, contrato, modelo de datos, infraestructura, alcance
- **Estado:** pendiente de revisión / aprobada / descartada
-->
