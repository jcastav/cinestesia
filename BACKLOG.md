# BACKLOG

Registro de ideas, mejoras y redefiniciones propuestas por el agente.

No alteran el roadmap ni el alcance de la versión en curso; requieren revisión humana (AGENTS.md §3 y §17).

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

<!-- Formato por entrada:
### <Título de la idea>
- **Propuesta por:** agente / usuario
- **Fecha:** YYYY-MM-DD
- **Contexto:** por qué surge
- **Impacto:** arquitectura, contrato, modelo de datos, infraestructura, alcance
- **Estado:** pendiente de revisión / aprobada / descartada
-->
