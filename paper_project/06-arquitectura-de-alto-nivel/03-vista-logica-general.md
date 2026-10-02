## 6.3. Vista lógica general

La arquitectura lógica objetivo será:

┌──────────────────────────────────────────────────────────────┐

│                         CLIENTES                             │

│                                                              │

│     Web              Mobile futuro          TV futuro        │

│      │                                                       │

│      └──────────── Media Player Core ───────────────────┐     │

└─────────────────────────────────────────────────────────│─────┘

                                                          │

                                                          ▼

┌──────────────────────────────────────────────────────────────┐

│                  EDGE / PRESENTACIÓN                         │

│                                                              │

│       CDN / Edge Cache / Reverse Proxy / Web-BFF             │

└──────────────────────────────┬───────────────────────────────┘

                               │

                               ▼

┌──────────────────────────────────────────────────────────────┐

│                         CORE API                             │

│                                                              │

│   Catalog       Search          Users/Auth       Reporting   │

│      │                                                        │

│      ├──────────── Source Registry                            │

│      │                    │                                   │

│      │                    ▼                                   │

│      │          Playback Orchestrator                         │

│      │                    │                                   │

│      │                    ▼                                   │

│      │           Playback Session                             │

└──────┼────────────────────┼───────────────────────────────────┘

       │                    │

       │                    ▼

       │          ┌─────────────────────┐

       │          │ Source Resolver     │

       │          │                     │

       │          │ Adapter Registry    │

       │          │  ├── Adapter A      │

       │          │  ├── Adapter B      │

       │          │  └── Adapter N      │

       │          └──────────┬──────────┘

       │                     │

       │                     ▼

       │          Playable Representation

       │                     │

       │                     ▼

       │          ┌─────────────────────┐

       │          │    Media Gateway    │

       │          └──────────┬──────────┘

       │                     │

       │                     ▼

       │              Media Player Core

       │

       ▼

┌──────────────────────────────────────────────────────────────┐

│                DISCOVERY / INGESTION                         │

│                                                              │

│ Discovery → Normalization → Deduplication → Matching         │

└──────────────────────────────────────────────────────────────┘

                 INFRAESTRUCTURA COMPARTIDA

      ┌───────────────────────────────────────────┐

      │ PostgreSQL │ Redis │ Queue │ Object Store │

      │ Logs │ Metrics │ Tracing │ Secrets       │

      └───────────────────────────────────────────┘

Este diagrama representa **responsabilidades lógicas**, no
necesariamente procesos, contenedores o servidores independientes.
