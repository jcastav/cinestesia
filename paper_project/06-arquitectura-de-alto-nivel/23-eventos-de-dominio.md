## 6.23. Eventos de dominio

Los módulos podrán comunicar determinados cambios mediante eventos.

Ejemplos:

catalog.media.created

catalog.media.updated

source.created

source.health_changed

source.unavailable

resolution.succeeded

resolution.failed

playback.started

playback.failed

playback.source_switched

report.created

Estos nombres representan el contrato conceptual y podrán ajustarse
durante el diseño de eventos.

No toda interacción deberá convertirse en un evento.

Las operaciones que requieran respuesta inmediata continuarán utilizando
comunicación síncrona cuando resulte apropiado.
