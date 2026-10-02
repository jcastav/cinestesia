# BACKLOG

Registro de ideas, mejoras y redefiniciones propuestas por el agente.

No alteran el roadmap ni el alcance de la versión en curso; requieren revisión humana (AGENTS.md §3 y §17).

## Ideas futuras

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
