## 6.33. Esquema General de Capas y Flujo de Datos

\[ Cliente (Navegador Desktop/Mobile) \]

                  │

                  ▼

         \[ CDN / Edge Cache \] (Vercel / Cloudflare)

                  │

                  ▼

       \[ API Gateway / Reverse Proxy \]

        ┌─────────┴─────────┐

        ▼                   ▼

\[ Frontend SSR/SPA \]   \[ Backend API Services \]

(Next.js / Nuxt)       (Node.js / Express / FastAPI)

                            │

        ┌───────────────────┼───────────────────┐

        ▼                   ▼                   ▼

\[ Motor Proxy Medios \] \[ Base de Datos \]   \[ Workers / Scrapers \]

 (HLS/Proxy Stream)   (Postgres / Mongo)  (Tareas en segundo plano)

        │                   │                   │

        └───────────────────┼───────────────────┘

                            ▼

               \[ Caché / Cola de Tareas \]

                     (Redis / BullMQ)
