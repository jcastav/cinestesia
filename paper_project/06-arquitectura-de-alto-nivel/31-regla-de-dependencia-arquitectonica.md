## 6.31. Regla de dependencia arquitectónica

La regla final de dependencias será:

                    ┌──────────────┐

                    │   Catalog    │

                    └──────┬───────┘

                           │

                           ▼

                    Source Registry

                           │

                           ▼

                 Playback Orchestrator

                    │             │

                    ▼             │

              Source Resolver     │

                    │             │

                    ▼             │

                  Adapter         │

                    │             │

                    ▼             │

          Playable Representation │

                    │             │

                    └──────┬──────┘

                           ▼

                    Media Gateway

                           │

                           ▼

                   Playback Session

                           │

                           ▼

                  Media Player Core

Discovery e Ingestion alimentan Catalog y Source Registry desde el lado
upstream:

Discovery

    ↓

Ingestion

    ↓

Normalization

    ↓

Deduplication

    ↓

┌──────────────┬────────────────┐

▼              ▼

Catalog    Source Registry

Health y Reporting actúan transversalmente:

              Health Checker

                    │

                    ▼

               Source Registry

Player ──► Reporting ──► Source / Session / Content
