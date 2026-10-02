## 6.14. Media Gateway

El **Media Gateway** será el componente principal del Media/Data Plane.

Su responsabilidad será proporcionar acceso controlado a los recursos
requeridos por una Playback Session.

Conceptualmente:

Playable Representation

          │

          ▼

     Media Gateway

          │

          ├── session validation

          ├── token validation

          ├── manifest handling

          ├── controlled rewriting

          ├── resource mediation

          ├── rate limiting

          └── telemetry

          │

          ▼

        Player

El Gateway **no deberá**:

- seleccionar Sources;

- descubrir contenido;

- decidir prioridades;

- administrar catálogo;

- implementar lógica específica de Providers;

- convertirse en el propietario del estado permanente de una Source.

Además, no deberá asumirse que absolutamente todos los bytes
audiovisuales tendrán que atravesarlo.

El modo de entrega dependerá de:

- características de la Source;

- seguridad;

- arquitectura;

- condiciones de acceso;

- compatibilidad del cliente;

- costo de ancho de banda.
