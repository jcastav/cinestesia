## 6.26. Arquitectura física del MVP

Aquí hacemos una distinción crucial.

La arquitectura lógica anterior **no deberá convertirse inmediatamente
en quince microservicios**.

Para una primera versión operativa, se recomienda:

                        INTERNET

                           │

                           ▼

                   CDN / Reverse Proxy

                           │

             ┌─────────────┴─────────────┐

             ▼                           ▼

          Web App                    Core API

       (Next.js)                         │

                                  ┌──────┼───────┐

                                  │      │       │

                                  ▼      ▼       ▼

                            PostgreSQL Redis   Queue

                                           │

                                           ▼

                                         Worker

                                           │

                                     ┌─────┴─────┐

                                     ▼           ▼

                                  Resolver    Health

                           Core API

                              │

                              ▼

                     Playback Orchestrator

                              │

                              ▼

                        Media Gateway

                              │

                              ▼

                           Player

Dentro de \`Core API\` podrán convivir inicialmente como módulos:

Catalog

Source Registry

Playback Orchestration

Reporting

Admin

Search básico

El Resolver podrá ejecutarse inicialmente como worker o módulo separado
debido a su perfil operativo particular.

El Media Gateway sí deberá mantener una frontera clara porque su perfil
de tráfico, seguridad y escalabilidad es distinto al del Core API.
