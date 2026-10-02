## 6.24. Seguridad arquitectónica

Los componentes con acceso a redes externas deberán tratar toda URL
recibida como potencialmente no confiable.

Especialmente:

Discovery

Resolver

Health Checker

Media Gateway

deberán aplicar controles frente a SSRF.

Arquitectura conceptual:

External URL

    │

    ▼

URL Validator

    │

    ├── scheme validation

    ├── hostname validation

    ├── DNS resolution

    ├── private/reserved IP blocking

    ├── redirect validation

    └── policy evaluation

    │

    ▼

Controlled HTTP Client

Una redirección deberá volver a validarse.

Igualmente, una URL descubierta dentro de un manifest no deberá
considerarse automáticamente segura.

Los componentes externos deberán utilizar:

- timeouts;

- límites de respuesta;

- límites de redirección;

- límites de concurrencia;

- egress control cuando esté disponible.
