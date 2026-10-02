## 6.32. Arquitectura objetivo consolidada

En forma resumida:

                        USERS

                          │

                          ▼

                 ┌─────────────────┐

                 │ Web / App / TV  │

                 │ Media Player    │

                 └────────┬────────┘

                          │

                          ▼

                 CDN / Edge / BFF

                          │

                          ▼

                 ┌─────────────────┐

                 │    Core API     │

                 └────────┬────────┘

                          │

         ┌────────────────┼────────────────┐

         │                │                │

         ▼                ▼                ▼

      Catalog      Source Registry      Users

         │                │

         │                ▼

         │      Playback Orchestrator

         │                │

         │                ▼

         │         Source Resolver

         │                │

         │         Adapter Registry

         │                │

         │                ▼

         │     Playable Representation

         │                │

         │                ▼

         │          Media Gateway

         │                │

         └────────────────┼───────────────►

                          │

                          ▼

                  Playback Session

                          │

                          ▼

                  Media Player Core

Discovery ──► Ingestion ──► Catalog / Source Registry

Health Checker ───────────► Source Registry

Reporting ◄─────────────── Player / Backend

          ┌─────────────────────────────────┐

          │       SHARED INFRASTRUCTURE     │

          │                                 │

          │ PostgreSQL                      │

          │ Redis                           │

          │ Queue / Workers                 │

          │ Object Storage                  │

          │ Logs / Metrics / Traces         │

          │ Secrets / Configuration         │

          └─────────────────────────────────┘
