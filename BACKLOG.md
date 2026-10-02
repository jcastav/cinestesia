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

<!-- Formato por entrada:
### <Título de la idea>
- **Propuesta por:** agente / usuario
- **Fecha:** YYYY-MM-DD
- **Contexto:** por qué surge
- **Impacto:** arquitectura, contrato, modelo de datos, infraestructura, alcance
- **Estado:** pendiente de revisión / aprobada / descartada
-->
