## 6.25. Observabilidad transversal

Todos los componentes críticos deberán compartir identificadores de
correlación.

Ejemplo:

request_id

     │

     ▼

playback_session_id

     │

     ├── source_id

     ├── resolution_id

     └── gateway_request_id

La observabilidad deberá dividirse en tres pilares:

Logs

Metrics

Traces

y en una cuarta categoría específica del producto:

QoE Events

Las métricas de infraestructura no sustituyen las métricas de
experiencia.

Un servidor puede estar perfectamente saludable mientras los usuarios no
consiguen reproducir contenido.

Por ello deberán observarse conjuntamente:

CPU / RAM / latency

          +

Playback Success Rate

TTFF

Rebuffer Ratio

Resolution Success Rate

Failover Success Rate
