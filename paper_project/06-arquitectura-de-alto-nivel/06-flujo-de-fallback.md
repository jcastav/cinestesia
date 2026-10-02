## 6.6. Flujo de fallback

La arquitectura deberá admitir recuperación cuando una Source no pueda
utilizarse.

Source A

   │

   ▼

Resolution

   │

   X failure

   │

   ▼

Playback Orchestrator

   │

   ├── registra fallo

   ├── actualiza evidencia de salud

   └── selecciona alternativa

                 │

                 ▼

              Source B

                 │

                 ▼

              Resolver

                 │

                 ▼

              Gateway

                 │

                 ▼

          Playback Session

                 │

                 ▼

               Player

El Player no deberá implementar por sí mismo un algoritmo específico
para decidir qué proveedor utilizar como respaldo.

Su responsabilidad será solicitar o aceptar la recuperación coordinada
por el backend.

Cuando resulte técnicamente posible, deberá conservarse la posición
temporal de reproducción.
