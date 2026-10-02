# 11. DEVOPS, TESTING Y OPERACIÓN

## 11.1 Propósito

La estrategia DevOps, Testing y Operación define cómo la plataforma pasa de código fuente a un sistema ejecutable, verificable, observable y recuperable.

Esta sección no se limita a describir herramientas.

Define el ciclo operativo completo:

```text
Código
   ↓
Validación
   ↓
Build
   ↓
Testing
   ↓
Artifact
   ↓
Deploy
   ↓
Health Check
   ↓
Observabilidad
   ↓
Operación
   ↓
Incidente / cambio
   ↓
Rollback / Recovery
```

La arquitectura debe asumir desde el principio que:

> **Un sistema de streaming no está terminado cuando compila; está terminado cuando puede desplegarse, observarse, diagnosticarse y recuperarse de fallos conocidos.**

La estrategia deberá cubrir especialmente:

* aplicación web;
* Core API;
* Playback Orchestrator;
* Source Resolver;
* adapters;
* Media Gateway;
* workers;
* PostgreSQL;
* Redis;
* cola de trabajos;
* búsqueda;
* Health Checker;
* servicios administrativos;
* observabilidad;
* almacenamiento de backups.

---

# 11.2 Principios operativos

La operación de la plataforma seguirá estos principios:

### 1. Reproducibilidad

El mismo commit debe producir artifacts deterministas y trazables.

### 2. Automatización

Las validaciones repetibles no deben depender de ejecución manual.

### 3. Inmutabilidad de artifacts

Una imagen construida y validada debe poder promoverse entre entornos sin reconstruirla arbitrariamente.

### 4. Observabilidad

Todo componente crítico debe proporcionar señales suficientes para diagnosticar su estado.

### 5. Fallos parciales

La caída de un componente no debe provocar innecesariamente la caída de toda la plataforma.

### 6. Recuperabilidad

Los datos persistentes y la configuración crítica deben poder restaurarse.

### 7. Cambios reversibles

Los despliegues deben permitir rollback cuando una versión introduzca regresiones.

### 8. Seguridad desde CI/CD

El pipeline forma parte de la superficie de seguridad.

### 9. Operación basada en evidencia

Los objetivos de capacidad y rendimiento deben validarse mediante mediciones reales y no tratarse como constantes universales.

### 10. Simplicidad inicial

El MVP debe utilizar la menor cantidad de infraestructura necesaria para demostrar y operar correctamente el producto.

---

# 11.3 Arquitectura física del entorno

El entorno MVP conservará una arquitectura física relativamente simple:

```text
                         INTERNET
                            │
                            ▼
                 ┌────────────────────┐
                 │ CDN / Reverse Proxy│
                 │ TLS / WAF opcional │
                 └─────────┬──────────┘
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
     ┌────────────────┐         ┌─────────────────┐
     │ Web Application │         │ Media Gateway   │
     └───────┬────────┘         └────────┬────────┘
             │                           │
             ▼                           │
     ┌───────────────────────────────────┐
     │             Core API              │
     │                                   │
     │ Catalog / Search / User           │
     │ Source Registry / Playback        │
     │ Health / Reports / Admin          │
     └───────────────┬───────────────────┘
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
 PostgreSQL        Redis         Queue
       │             │             │
       │             │             ▼
       │             │       Resolver Worker
       │             │       Health Worker
       │             │       Ingestion Worker
       │             │
       └─────────────┴─────────────┘
```

Esta topología no implica que cada bloque deba ser una máquina independiente.

En desarrollo y MVP varios componentes pueden coexistir dentro de un mismo host o conjunto pequeño de hosts.

La separación lógica debe existir desde el código aunque la separación física todavía no exista.

---

# 11.4 Contenerización

Docker será la unidad principal de empaquetado para los servicios ejecutables.

Una composición inicial puede contener:

```text
web
core-api
media-gateway
resolver-worker
health-worker
ingestion-worker
postgres
redis
queue
```

No todos los componentes requieren necesariamente un contenedor independiente desde el primer día.

Por ejemplo:

```text
MVP
    Core API
       ├── Catalog
       ├── Search
       ├── Users
       ├── Source Registry
       ├── Playback Orchestrator
       ├── Reports
       └── Admin
```

puede desplegarse como una sola aplicación modular.

En cambio, el Media Gateway merece una frontera física independiente antes debido a su perfil de tráfico.

---

# 11.5 Docker Compose para desarrollo

El entorno local utilizará Docker Compose o una herramienta equivalente para reproducir las dependencias principales.

Ejemplo conceptual:

```text
docker-compose.yml
│
├── web
├── api
├── gateway
├── resolver-worker
├── health-worker
├── postgres
├── redis
└── queue
```

El objetivo es permitir:

```bash
docker compose up
```

y obtener un entorno funcional de desarrollo.

La configuración local deberá separar:

```text
application code
configuration
secrets
persistent volumes
```

Los secretos reales nunca deben almacenarse en el repositorio.

---

# 11.6 Entornos

Se utilizarán como mínimo tres niveles:

```text
Development
    ↓
Staging
    ↓
Production
```

### Development

Propósito:

* desarrollo diario;
* debugging;
* pruebas rápidas;
* integración local.

Puede utilizar datos sintéticos.

### Staging

Propósito:

* validación previa a producción;
* pruebas E2E;
* pruebas de integración;
* migraciones;
* smoke tests;
* pruebas de despliegue.

Debe aproximarse razonablemente a la arquitectura de producción.

### Production

Propósito:

* tráfico real;
* datos reales;
* operación controlada.

Las credenciales y recursos deben ser independientes de staging.

---

# 11.7 Configuración por entorno

La configuración no debe estar hardcodeada en el código.

Ejemplos:

```text
DATABASE_URL
REDIS_URL
QUEUE_URL
SESSION_SECRET
JWT_KEY_ID
LOG_LEVEL
PUBLIC_API_URL
GATEWAY_PUBLIC_URL
```

La aplicación debe validar su configuración al iniciar.

Una variable obligatoria ausente deberá producir un error de startup claro en lugar de generar un fallo ambiguo posteriormente.

---

# 11.8 Gestión de secretos

Los secretos deben mantenerse fuera del repositorio.

Ejemplos:

```text
database credentials
API keys
signing keys
encryption keys
provider credentials
refresh secrets
```

En desarrollo puede utilizarse un mecanismo local controlado.

En producción deberá utilizarse un secret manager o mecanismo equivalente.

Nunca debe aparecer un secreto en:

```text
Git
Docker image
frontend bundle
logs
API response
error message
telemetry
```

---

# 11.9 Estrategia Git

El repositorio debe utilizar control de versiones con una estrategia que permita distinguir:

```text
feature
bugfix
refactor
hotfix
release
```

El flujo exacto puede ser:

```text
feature/*
    ↓
Pull Request
    ↓
CI
    ↓
review
    ↓
main
    ↓
build artifact
    ↓
staging
    ↓
production
```

No se requiere una estrategia Git extremadamente compleja para el MVP.

La regla importante es:

> **Producción debe poder rastrearse inequívocamente hasta un commit y un artifact concreto.**

---

# 11.10 Integración Continua — CI

Cada Pull Request debe activar automáticamente las verificaciones apropiadas.

Pipeline conceptual:

```text
Git Push / Pull Request
          │
          ▼
     Install / Cache
          │
          ▼
      Formatting
          │
          ▼
        Lint
          │
          ▼
      Type Check
          │
          ▼
      Unit Tests
          │
          ▼
 Integration Tests
          │
          ▼
 Security Checks
          │
          ▼
      Build
          │
          ▼
   Contract Validation
```

Una modificación que rompa una prueba crítica no debe poder avanzar automáticamente hacia producción.

---

# 11.11 Quality Gates

Los Quality Gates mínimos deberán incluir:

```text
lint
type-check
unit tests
integration tests
contract validation
build
dependency/security checks
```

Para componentes críticos podrán añadirse:

```text
E2E
smoke tests
migration tests
load tests
Gateway streaming tests
Resolver fixture tests
```

No se establecerá inicialmente una regla universal como:

```text
"coverage > 90% = sistema correcto"
```

La cobertura es una métrica auxiliar.

Una cobertura elevada no garantiza que:

```text
PlaybackSession
Gateway
Resolver
fallback
security boundary
```

funcionen correctamente.

---

# 11.12 Build de imágenes

Las imágenes Docker deberán construirse después de superar los controles de CI.

Flujo:

```text
Commit
  ↓
Tests
  ↓
Build
  ↓
Docker Image
  ↓
Image Scan
  ↓
Registry
```

Cada imagen deberá ser identificable mediante:

```text
repository
version/tag
commit SHA
build metadata
```

Ejemplo:

```text
core-api:<version>
```

y adicionalmente una referencia inmutable mediante digest.

---

# 11.13 Registro de artifacts

El registry almacenará las imágenes que hayan superado el pipeline correspondiente.

No debe utilizarse:

```text
latest
```

como única referencia de producción.

Producción debe utilizar una versión o digest concreto.

Esto permite:

```text
Version N
    ↓
Production
    ↓
Problem
    ↓
Rollback
    ↓
Version N-1
```

sin reconstruir la versión anterior.

---

# 11.14 Continuous Delivery — CD

El pipeline de despliegue podrá seguir:

```text
Artifact aprobado
       ↓
Deploy Staging
       ↓
Smoke Tests
       ↓
Approval / Policy
       ↓
Deploy Production
       ↓
Health Checks
       ↓
Observability Validation
```

En etapas posteriores podrá automatizarse más el paso a producción.

El nivel de automatización deberá depender del riesgo de la operación.

---

# 11.15 Estrategia de despliegue

Para el MVP puede utilizarse un despliegue controlado con capacidad de rollback.

No es obligatorio comenzar con:

```text
Kubernetes
service mesh
multi-region
canary mesh
blue/green distribuido
```

Una implementación inicial puede utilizar:

```text
Reverse Proxy
      ↓
Application Instance(s)
      ↓
Database / Redis
```

con reemplazo controlado de la versión.

---

# 11.16 Zero-Downtime

El documento original contemplaba despliegues Zero-Downtime. Ese objetivo se conserva como capacidad deseable, pero no debe confundirse con una propiedad automática de Docker.

Para conseguirlo realmente se requiere:

```text
new instance
     ↓
health check
     ↓
traffic switch
     ↓
old instance drain
     ↓
shutdown
```

El sistema debe implementar además:

* readiness checks;
* graceful shutdown;
* conexión correcta a la base de datos;
* manejo de requests en vuelo;
* compatibilidad temporal de esquemas.

---

# 11.17 Migraciones de base de datos

Las migraciones deben formar parte del proceso de despliegue.

Principio:

> **Una migración debe ser segura tanto para la versión anterior como para la nueva durante la transición cuando el despliegue lo requiera.**

Se recomienda una estrategia:

```text
Expand
   ↓
Deploy new application
   ↓
Migrate data
   ↓
Contract
```

Ejemplo:

```text
Versión N
    ↓
añadir columna nullable
    ↓
Versión N+1 utiliza nueva columna
    ↓
backfill
    ↓
eliminar estructura antigua posteriormente
```

No se recomienda ejecutar cambios destructivos inmediatamente antes de levantar una nueva versión sin una estrategia de recuperación.

---

# 11.18 Testing — Estrategia general

El sistema utilizará una pirámide de pruebas:

```text
                E2E
               /   \
        Integration / Contract
             /       \
           Unit       Component
```

La mayor cantidad de pruebas deberá estar en los niveles rápidos.

Las E2E cubrirán únicamente flujos críticos.

---

# 11.19 Pruebas unitarias

Las pruebas unitarias validarán lógica aislada.

Ejemplos:

### Catalog

```text
normalización de MediaItem
validación de estados
reglas de publicación
deduplicación
```

### Source Registry

```text
validación de Source
transiciones de estado
asociación Content/Source
```

### Orchestrator

```text
ranking de Sources
restricciones de capabilities
fallback
selección
```

### Resolver

```text
adapter selection
normalización
errores
timeouts
```

### Gateway

```text
session validation
resource authorization
URL validation
manifest rewriting
Range handling
```

### Player

```text
state machine
session handling
recovery
progress
track selection
```

### User

```text
auth state
permissions
progress persistence
library rules
```

---

# 11.20 Pruebas de integración

Las pruebas de integración verifican que varios componentes funcionen conjuntamente.

Ejemplos:

```text
API ↔ PostgreSQL
API ↔ Redis
API ↔ Queue
Orchestrator ↔ Resolver
Resolver ↔ Adapter
Gateway ↔ Session Store
Health Worker ↔ Source Registry
```

Una prueba importante:

```text
POST /playback/sessions
        ↓
Orchestrator
        ↓
Resolver mock
        ↓
PlayableRepresentation
        ↓
PlaybackSession
```

Otra:

```text
PlaybackSession
       ↓
Gateway manifest
       ↓
resource request
       ↓
authorized response
```

---

# 11.21 Contract Testing

Los contratos entre motores deben probarse explícitamente.

Ejemplo:

```text
Orchestrator
     │
     │ expected Resolver contract
     ▼
Resolver
```

Si Resolver cambia:

```json
{
  "protocol": "HLS"
}
```

a una estructura incompatible, el test contractual debe detectar el problema antes del despliegue.

Esto es especialmente importante porque la arquitectura utiliza módulos desacoplados.

---

# 11.22 Pruebas End-to-End

Las E2E deben cubrir los flujos que representan el producto completo.

Flujo principal:

```text
Open application
    ↓
Search content
    ↓
Open detail
    ↓
Select episode
    ↓
Start playback
    ↓
PlaybackSession
    ↓
Gateway
    ↓
Video playback
```

Flujo de recuperación:

```text
Start playback
    ↓
simulate source failure
    ↓
Player detects error
    ↓
Recovery API
    ↓
Orchestrator selects alternative
    ↓
new PlaybackSession
    ↓
resume playback
```

Flujo de Source Switch:

```text
Playback
    ↓
Open source selector
    ↓
Select alternative
    ↓
Backend validates
    ↓
New session
    ↓
Continue playback
```

---

# 11.23 Testing del Player

El Player requiere pruebas específicas porque el navegador introduce variabilidad.

Se probarán:

```text
Chrome
Firefox
Safari
Edge
```

cuando resulte necesario para el alcance soportado.

También:

```text
native HLS
MSE
Hls.js
MP4
subtitles
audio tracks
quality selection
seeking
autoplay restrictions
session expiration
network interruption
```

No se debe confundir:

```text
browser compatibility
```

con:

```text
source compatibility
```

Son problemas distintos.

---

# 11.24 Testing del Media Gateway

El Gateway requiere pruebas específicas de seguridad y streaming.

### Funcionales

```text
manifest retrieval
segment retrieval
Range
HLS rewriting
relative URLs
subtitles
audio
session expiration
```

### Seguridad

```text
expired session
invalid session
invalid resourceId
resource from another session
malformed manifest
redirect validation
SSRF payloads
oversized response
rate limiting
```

### Resiliencia

```text
upstream timeout
client disconnect
upstream disconnect
partial response
slow upstream
repeated segment requests
```

---

# 11.25 Testing del Resolver

El Resolver deberá utilizar fixtures controlados para simular respuestas externas.

Ejemplos:

```text
valid response
invalid response
timeout
redirect
malformed HTML
unsupported representation
expired resource
provider unavailable
```

Los adapters deben probarse contra interfaces simuladas siempre que sea posible.

Las pruebas contra servicios externos reales no deben constituir el único mecanismo de validación.

---

# 11.26 Live Integration Tests

Puede existir una suite programada de pruebas contra integraciones externas autorizadas y controladas.

Objetivo:

```text
detectar cambios externos
```

No:

```text
depender de servicios externos para determinar si CI pasa
```

Estas pruebas pueden ejecutarse:

```text
diariamente
semanalmente
bajo demanda
```

y producir alertas operativas.

Un fallo externo no debe bloquear automáticamente todos los Pull Requests internos.

---

# 11.27 Testing del Health Checker

Debe probarse:

```text
healthy source
degraded source
unavailable source
recovery
flapping
false positive
false negative
```

También:

```text
hysteresis
confidence
minimum samples
probe timeout
probe concurrency
```

La prueba importante no es únicamente:

```text
"¿respondió HTTP 200?"
```

sino:

```text
"¿la observación produjo correctamente la evidencia
y la proyección de estado?"
```

---

# 11.28 Testing de fallos

El sistema debe probar explícitamente fallos parciales.

Ejemplos:

```text
PostgreSQL unavailable
Redis unavailable
Queue unavailable
Resolver unavailable
Gateway unavailable
external provider unavailable
one Source unavailable
one adapter unavailable
health worker unavailable
```

El objetivo es verificar que:

```text
one failed dependency
        ≠
entire platform failure
```

cuando arquitectónicamente sea posible.

---

# 11.29 Pruebas de rendimiento

Las pruebas de rendimiento deben realizarse sobre escenarios concretos.

### Core API

Medir:

```text
latency
throughput
error rate
CPU
memory
DB utilization
Redis utilization
```

### Resolver

Medir:

```text
resolution latency
concurrency
success rate
timeouts
adapter distribution
```

### Gateway

Medir:

```text
active connections
bandwidth
TTFB
stream throughput
CPU
memory
upstream latency
disconnects
```

No debe utilizarse únicamente RPS para medir el Gateway.

Una operación de:

```text
GET /catalog
```

no equivale en carga a:

```text
video segment streaming
```

---

# 11.30 Carga y concurrencia

Las pruebas de carga deben distinguir:

```text
requests per second
```

de:

```text
concurrent viewers
```

Un usuario reproduciendo HLS genera una secuencia de solicitudes de segmentos.

Por ello la capacidad debe modelarse mediante:

```text
concurrent sessions
average bitrate
segment duration
request rate
bandwidth
connection count
```

Una prueba artificial de miles de requests HTTP pequeños no representa necesariamente miles de espectadores de video.

---

# 11.31 Capacity Planning

La capacidad del Media Gateway estará determinada en gran medida por:

```text
concurrent viewers
×
average bitrate
```

Aproximación:

```text
Monthly Egress
≈
Concurrent Viewers
×
Average Bitrate
×
Viewing Hours
×
3600
÷
8
```

Ejemplo:

```text
100 viewers
× 3 Mbps
× 4 h/day
× 30 days
```

produce aproximadamente:

```text
16.2 TB/month
```

Este valor es ilustrativo y no constituye un presupuesto fijo.

El costo real depende de:

```text
CDN
egress provider
cache hit rate
delivery mode
average bitrate
viewing duration
concurrency
regional distribution
```

---

# 11.32 Testing de seguridad

El pipeline deberá incorporar controles para:

```text
dependency vulnerabilities
secret leakage
container vulnerabilities
static analysis
input validation
authentication
authorization
SSRF
CSRF
XSS
SQL injection
path traversal
rate limiting
```

Para el Gateway:

```text
session abuse
resource enumeration
token tampering
manifest injection
upstream redirect abuse
```

Para el Admin:

```text
privilege escalation
IDOR
CSRF
session fixation
audit bypass
```

---

# 11.33 SAST / Dependency Scanning

El CI puede ejecutar:

```text
SAST
dependency scanning
secret scanning
container image scanning
```

Las herramientas concretas podrán cambiar.

Lo importante es que:

```text
vulnerability detected
        ↓
risk classification
        ↓
policy
        ↓
merge / block / exception
```

No toda vulnerabilidad requiere necesariamente bloquear el despliegue, pero toda excepción debe quedar registrada y justificada.

---

# 11.34 Observabilidad

La plataforma utilizará tres pilares:

```text
Logs
Metrics
Traces
```

y una cuarta señal esencial para el producto:

```text
Playback / QoE telemetry
```

---

# 11.35 Logs estructurados

El backend utilizará logs estructurados en JSON.

El documento original contemplaba herramientas como Pino o Winston; la herramienta concreta queda subordinada al runtime seleccionado.

Ejemplo:

```json id="s3r5xe"
{
  "timestamp": "2026-10-01T01:20:00Z",
  "level": "warn",
  "service": "resolver",
  "operation": "resolve_source",
  "sourceId": "source_123",
  "requestId": "req_456",
  "durationMs": 842,
  "errorCode": "UPSTREAM_TIMEOUT"
}
```

Los logs no deben contener secretos.

---

# 11.36 Métricas

Cada motor debe producir métricas propias.

### API

```text
http_requests_total
http_request_duration_seconds
http_errors_total
```

### Playback

```text
playback_sessions_created_total
playback_sessions_failed_total
playback_recovery_total
playback_recovery_success_total
```

### Resolver

```text
resolution_attempts_total
resolution_success_total
resolution_failures_total
resolution_duration_seconds
```

### Gateway

```text
gateway_requests_total
gateway_active_connections
gateway_bytes_transferred_total
gateway_upstream_errors_total
```

### Health

```text
health_observations_total
source_state_changes_total
health_probe_failures_total
```

Los labels deberán mantener baja cardinalidad.

No se deben utilizar URLs completas, tokens o identificadores infinitamente variables como labels de Prometheus.

---

# 11.37 Distributed Tracing

Las operaciones críticas podrán utilizar tracing distribuido.

Ejemplo:

```text
HTTP Request
    │
    ▼
Playback API
    │
    ▼
Orchestrator span
    │
    ├── Source Registry span
    ├── Health span
    └── Resolver span
             │
             └── Adapter span
```

Esto permite localizar dónde se produce la latencia:

```text
API
vs
DB
vs
Orchestrator
vs
Resolver
vs
External Integration
```

---

# 11.38 Error Monitoring

Se podrá utilizar una plataforma como Sentry o equivalente para capturar:

```text
unhandled exceptions
frontend crashes
backend exceptions
selected playback errors
```

El documento original contemplaba explícitamente Sentry para frontend y backend.

La integración deberá filtrar:

```text
tokens
cookies
personal data
raw URLs
secrets
```

antes de enviar contexto.

---

# 11.39 Dashboards

Los dashboards iniciales deberán cubrir:

### Plataforma

```text
request rate
error rate
latency
CPU
RAM
database
Redis
queue
```

### Playback

```text
Playback Success Rate
TTFF
Playback Failure Rate
Rebuffer Ratio
Recovery Success Rate
```

### Sources

```text
Source Availability
Resolution Success
Source Failures
Health state distribution
```

### Gateway

```text
active viewers
bandwidth
egress
upstream errors
timeouts
```

### Operations

```text
deployments
failed deployments
incidents
backup status
```

---

# 11.40 Alertas

Una alerta debe representar una condición operacional accionable.

Ejemplos:

```text
API error rate elevated
Gateway bandwidth saturation
PostgreSQL unavailable
Redis unavailable
Resolver failure rate elevated
Playback Success Rate degraded
TTFF significantly increased
Backup failed
Disk approaching capacity
Queue backlog growing
```

No se recomienda crear alertas para cada métrica disponible.

Una alerta sin acción asociada se convierte en ruido.

---

# 11.41 SLOs

Los SLO deberán definirse gradualmente a partir de mediciones reales.

Ejemplos de indicadores:

```text
API availability
Playback Success Rate
TTFF
Gateway availability
Resolution Success Rate
Automatic Failover Success Rate
```

Los números concretos deberán establecerse después de disponer de:

```text
baseline
traffic profile
production measurements
capacity tests
```

Los valores históricos de otras versiones del documento deben tratarse como hipótesis de rendimiento y no como garantías universales.

---

# 11.42 QoE como señal operativa

La operación del sistema no puede medirse únicamente mediante:

```text
CPU
RAM
RPS
HTTP 200
```

Una plataforma puede presentar:

```text
CPU normal
API normal
Gateway normal
```

y aun así tener una experiencia de reproducción defectuosa.

Por ello deben observarse:

```text
Playback Success Rate
TTFF
Rebuffer Ratio
Playback Failure Rate
Recovery Success Rate
Source Resolution Success Rate
```

---

# 11.43 Release Health

Después de un despliegue se comparará:

```text
antes del deploy
vs
después del deploy
```

para detectar regresiones.

Ejemplo:

```text
Deploy v1.4.2
       ↓
TTFF +35%
       ↓
Playback failures +12%
       ↓
Resolver unchanged
       ↓
Gateway changed
```

Esto permite asociar regresiones con cambios concretos.

---

# 11.44 Rollback

Todo despliegue crítico debe tener una estrategia de rollback.

Conceptualmente:

```text
Version N
   ↓
Deploy N+1
   ↓
Health degradation
   ↓
Rollback
   ↓
Version N
```

El rollback debe considerar:

```text
application
database migrations
configuration
feature flags
cache
queue
```

Una migración irreversible puede impedir un rollback completo.

Por ello las migraciones deben diseñarse junto con la estrategia de despliegue.

---

# 11.45 Feature Flags como mecanismo operacional

Los feature flags permiten reducir el blast radius.

Ejemplos:

```text
playback_recovery_enabled
new_resolver_adapter_enabled
gateway_segment_cache_enabled
recommendations_enabled
ads_enabled
new_player_engine_enabled
```

Ante una regresión:

```text
feature flag → OFF
```

puede ser preferible a:

```text
entire deployment → rollback
```

cuando el cambio lo permita.

Los flags críticos deben poder modificarse mediante el sistema administrativo correspondiente y quedar auditados.

---

# 11.46 Estrategia de despliegue de nuevos Adapters

Un Adapter nuevo debe atravesar:

```text
Development
   ↓
Unit Tests
   ↓
Fixtures
   ↓
Integration Tests
   ↓
Staging
   ↓
Limited Enablement
   ↓
Production
```

Su activación puede controlarse mediante:

```text
adapter_<name>_enabled
```

o una configuración equivalente.

Si falla:

```text
disable adapter
```

sin tener que retirar el Resolver completo.

---

# 11.47 Operación del Resolver

El Resolver debe tener límites operativos explícitos:

```text
maximum concurrency
request timeout
overall deadline
memory limit
CPU limit
queue size
retry policy
```

Una integración externa lenta no debe consumir indefinidamente todos los workers.

El sistema debe poder pasar de:

```text
healthy
```

a:

```text
degraded
```

sin colapsar toda la cola.

---

# 11.48 Operación del Gateway

El Gateway es un componente especialmente sensible a capacidad.

Debe observar:

```text
active connections
bandwidth
upstream connections
response latency
client disconnects
memory
CPU
```

Debe implementar:

```text
backpressure
timeouts
connection cancellation
rate limiting
resource authorization
```

El Gateway debe ser horizontalmente escalable siempre que sea posible.

No debe depender de estado local innecesario.

---

# 11.49 Redis

Redis se utilizará para datos efímeros como:

```text
cache
PlaybackSession context
rate limits
locks
singleflight coordination
queue metadata
temporary state
```

No debe convertirse accidentalmente en la única fuente de verdad de datos críticos.

La arquitectura debe definir qué sucede si Redis falla:

```text
cache
    → degrade gracefully

rate limit
    → fallback policy

session state
    → explicit recovery strategy
```

La política exacta debe quedar documentada.

---

# 11.50 PostgreSQL

PostgreSQL será la fuente persistente principal para:

```text
MediaItem
Seasons
Episodes
Providers
Sources
Users
Auth
PlaybackProgress
Reports
Health projections
Admin audit
configuration
```

El almacenamiento relacional permite mantener integridad entre entidades.

Las operaciones de backup y restore deben probarse periódicamente.

---

# 11.51 Backups

Los backups deben cubrir como mínimo:

```text
PostgreSQL
configuration critical
audit data
```

Los datos efímeros de Redis no necesariamente requieren backup tradicional si pueden reconstruirse.

El documento original proponía dumps diarios y almacenamiento externo. Esa estrategia se mantiene como punto de partida, pero deberá evolucionar hacia una política definida de frecuencia, retención y verificación.

---

# 11.52 Estrategia de Backup

Ejemplo:

```text
PostgreSQL
   │
   ├── automated backup
   ├── retention
   ├── external storage
   └── restore verification
```

No basta con tener archivos de backup.

La propiedad relevante es:

> **Un backup no se considera válido hasta que su restauración haya sido verificada.**

---

# 11.53 RPO y RTO

Se definirán dos objetivos:

### RPO — Recovery Point Objective

Cantidad máxima de datos que puede perderse tras un desastre.

Ejemplo conceptual:

```text
RPO = 24h
```

significaría que se acepta como máximo un día de pérdida de cambios, aunque el valor final deberá definirse según el riesgo real.

### RTO — Recovery Time Objective

Tiempo objetivo para recuperar el servicio.

```text
RTO = tiempo máximo objetivo de restauración
```

Los valores definitivos se establecerán según:

```text
cost
criticality
traffic
infrastructure
backup frequency
```

---

# 11.54 Restore Testing

Debe existir una prueba periódica:

```text
Backup
   ↓
Restore isolated environment
   ↓
Integrity checks
   ↓
Application startup
   ↓
API smoke tests
   ↓
Playback metadata validation
```

Esto permite detectar:

```text
backup corrupt
missing tables
broken credentials
invalid migration
incompatible schema
```

antes de que ocurra un desastre real.

---

# 11.55 Disaster Recovery

Ante pérdida total del servidor:

```text
Infrastructure failure
       ↓
Provision replacement
       ↓
Restore configuration
       ↓
Restore PostgreSQL
       ↓
Deploy known-good artifact
       ↓
Restore secrets
       ↓
Start services
       ↓
Smoke tests
       ↓
Traffic
```

El procedimiento debe estar documentado.

La recuperación no debe depender de que la persona que creó originalmente el sistema recuerde cada paso.

---

# 11.56 Gestión de incidentes

Un incidente puede originarse por:

```text
deployment
dependency
database
network
external provider
source degradation
Gateway overload
security event
```

El proceso mínimo:

```text
Detection
   ↓
Triage
   ↓
Containment
   ↓
Mitigation
   ↓
Recovery
   ↓
Verification
   ↓
Postmortem
```

---

# 11.57 Severidad de incidentes

Puede utilizarse una clasificación sencilla:

```text
SEV-1
Servicio crítico ampliamente afectado

SEV-2
Funcionalidad importante degradada

SEV-3
Problema limitado con workaround

SEV-4
Problema menor / mantenimiento
```

La clasificación exacta podrá evolucionar.

Lo importante es que exista un lenguaje común para priorizar incidentes.

---

# 11.58 Runbooks

Los componentes críticos deben tener procedimientos operativos.

Ejemplos:

```text
RUNBOOK-01 API unavailable
RUNBOOK-02 PostgreSQL failure
RUNBOOK-03 Redis failure
RUNBOOK-04 Gateway saturation
RUNBOOK-05 Resolver degradation
RUNBOOK-06 Source provider outage
RUNBOOK-07 Failed deployment
RUNBOOK-08 Backup restoration
RUNBOOK-09 Security incident
```

Cada runbook debería indicar:

```text
symptoms
diagnostics
safe actions
rollback
verification
escalation
```

---

# 11.59 Mantenimiento

Las operaciones de mantenimiento deben diferenciarse de las operaciones normales.

Ejemplos:

```text
database migration
reindex
backup restore
bulk ingestion
cache invalidation
adapter deployment
health probe maintenance
```

Cuando una operación pueda afectar usuarios, debe existir:

```text
maintenance mode
```

con estados definidos por la arquitectura:

```text
NORMAL
READ_ONLY
PARTIAL_DEGRADED
MAINTENANCE
```

---

# 11.60 Gestión de capacidad

La capacidad deberá revisarse mediante tendencias.

Variables:

```text
CPU growth
RAM growth
database size
storage growth
bandwidth
concurrent viewers
queue backlog
source count
resolution attempts
```

El objetivo no es sobredimensionar desde el día uno.

Es:

```text
measure
   ↓
identify bottleneck
   ↓
scale bottleneck
```

---

# 11.61 Escalamiento horizontal

Los componentes candidatos a escalar horizontalmente son:

```text
Web
Core API
Resolver workers
Health workers
Ingestion workers
Media Gateway
```

PostgreSQL y Redis tienen estrategias de escalamiento diferentes y no deben tratarse simplemente como aplicaciones stateless.

---

# 11.62 Cola de trabajos

Los procesos que no necesitan bloquear la petición del usuario deberán ejecutarse de forma asíncrona.

Ejemplos:

```text
health probes
ingestion
reconciliation
search indexing
notifications
analytics aggregation
certain resolution tasks
```

Flujo:

```text
API
 │
 ▼
Queue
 │
 ├── Worker A
 ├── Worker B
 └── Worker C
```

Esto desacopla la experiencia del usuario de procesos largos.

---

# 11.63 Dead Letter Queue

Los jobs que fallen repetidamente podrán terminar en una DLQ:

```text
Job
 ↓
Retry
 ↓
Retry
 ↓
Retry
 ↓
Dead Letter Queue
```

La DLQ permite:

```text
inspection
manual retry
discard
root-cause analysis
```

No debe utilizarse como sustituto de la resolución de errores.

---

# 11.64 Health Checks de infraestructura

Cada servicio debe proporcionar mecanismos diferenciados:

```text
Liveness
Readiness
```

### Liveness

Pregunta:

> ¿El proceso sigue vivo?

### Readiness

Pregunta:

> ¿El proceso está listo para recibir tráfico?

No deben ser idénticos.

Un servicio puede estar:

```text
alive = true
ready = false
```

durante una migración, startup o recuperación de dependencia.

---

# 11.65 Smoke Tests post-deployment

Después de desplegar:

```text
GET /health
GET /catalog
GET /search
POST /playback/session
GET /playback/{id}/manifest
```

deben validarse las operaciones críticas correspondientes al entorno.

En producción, las pruebas deben utilizar datos/controlados que no generen efectos indeseados.

---

# 11.66 Operación del catálogo

Debe observarse:

```text
catalog read latency
search indexing lag
publication failures
ingestion backlog
duplicate candidates
```

Un catálogo disponible pero desactualizado constituye una degradación funcional.

---

# 11.67 Operación de Sources

El Source Registry debe observar:

```text
active sources
degraded sources
unavailable sources
sources without recent observation
```

El Health Engine debe complementar esta información con:

```text
resolution success
playback evidence
active probes
user reports
```

No debe eliminar automáticamente una Source únicamente por una observación aislada.

---

# 11.68 Operación de Playback

Los indicadores principales:

```text
Playback Success Rate
TTFF
Playback Failure Rate
Rebuffer Ratio
Automatic Recovery Rate
Manual Source Switch Rate
Session Expiration Rate
```

deben analizarse por dimensiones relevantes:

```text
browser
device class
protocol
source
provider
content type
region when appropriate
application version
```

Siempre evitando cardinalidad excesiva en las métricas base.

---

# 11.69 Operación de Ads

Las métricas publicitarias deben permanecer separadas de las métricas de disponibilidad del contenido.

Ejemplos:

```text
Ad Fill Rate
Ad Start Rate
Ad Completion Rate
Ad-related Abandonment Rate
Content Start Delay
```

Un proveedor de anuncios caído no debe interpretarse como una caída del sistema de reproducción.

---

# 11.70 Feature Flags y Kill Switch

Los componentes de riesgo deben disponer de mecanismos de desactivación.

Ejemplos:

```text
ads_enabled
recommendations_enabled
playback_recovery_enabled
new_adapter_enabled
gateway_segment_cache_enabled
advanced_search_enabled
```

Especialmente importante:

```text
global_ads_kill_switch
```

o equivalentes funcionales para deshabilitar rápidamente subsistemas no esenciales.

---

# 11.71 Observabilidad de costos

La operación debe observar también costos indirectos:

```text
bandwidth
storage
database
compute
resolver workloads
headless workloads if ever authorized
logging
monitoring
CDN
```

Un componente puede ser técnicamente correcto y económicamente insostenible.

Por eso:

```text
Performance
+
Reliability
+
Cost
```

forman parte de la operación.

---

# 11.72 Separación entre métricas técnicas y métricas de negocio

No deben mezclarse:

### Technical

```text
HTTP latency
CPU
RAM
errors
bandwidth
queue depth
```

### Product / QoE

```text
Playback Success Rate
TTFF
Rebuffer Ratio
Source Switch Rate
Recovery Rate
```

### Business

```text
ad impressions
fill rate
CTR
revenue
```

Cada categoría responde preguntas distintas.

---

# 11.73 Definition of Done operacional

Una funcionalidad no se considerará completamente terminada si únicamente:

```text
compila
```

Debe existir, según corresponda:

```text
implementation
tests
logging
metrics
error handling
documentation
configuration
deployment path
rollback strategy
security review
```

Para componentes críticos:

```text
runbook
dashboard
alert
```

también deberán formar parte del entregable operativo.

---

# 11.74 Pipeline completo

El pipeline conceptual final será:

```text
                 ┌─────────────────┐
                 │ Developer Commit│
                 └────────┬────────┘
                          │
                          ▼
                    Pull Request
                          │
                          ▼
                 ┌─────────────────┐
                 │      CI         │
                 ├─────────────────┤
                 │ Lint            │
                 │ Type Check      │
                 │ Unit Tests      │
                 │ Contract Tests  │
                 │ Integration     │
                 │ Security Scan   │
                 │ Build           │
                 └────────┬────────┘
                          │
                    PASS  │
                          ▼
                 Docker Artifact
                          │
                          ▼
                     Registry
                          │
                          ▼
                      Staging
                          │
                          ▼
                 Smoke / E2E Tests
                          │
                          ▼
                    Production
                          │
                          ▼
                 Health Validation
                          │
              ┌───────────┴───────────┐
              │                       │
           Healthy                 Degraded
              │                       │
              ▼                       ▼
          Continue                 Rollback /
                                   Mitigation
```

---

# 11.75 Arquitectura operativa por motor

| Motor           | Testing crítico               | Métricas críticas                | Operación                      |
| --------------- | ----------------------------- | -------------------------------- | ------------------------------ |
| Catalog         | Unit + Integration            | latency, errors, DB              | migrations, cache              |
| Source Registry | Unit + Integration            | source states                    | consistency                    |
| Resolver        | Unit + Contract + Integration | resolution success/latency       | worker capacity                |
| Gateway         | Integration + Load + Security | bandwidth, connections, errors   | scaling                        |
| Player          | Unit + E2E + browser matrix   | TTFF, rebuffer, failures         | client telemetry               |
| Ads             | Unit + E2E                    | fill, abandonment                | provider health                |
| User/Auth       | Unit + Integration + Security | login errors, sessions           | credentials/session management |
| Search          | Unit + Integration            | query latency, indexing lag      | rebuild/index                  |
| Health          | Unit + Integration            | probe success, state changes     | scheduling                     |
| Admin           | E2E + Security                | command failures, audit failures | privileged operations          |

---

# 11.76 MVP DevOps

El MVP deberá mantenerse deliberadamente sencillo.

### Obligatorio

```text
Docker
Docker Compose
Git
CI pipeline
lint
type checking
unit tests
integration tests
basic E2E
PostgreSQL backups
structured logs
error monitoring
basic metrics
health checks
staging environment
production deployment
rollback procedure
```

### Recomendado

```text
OpenTelemetry
Prometheus
Grafana
Sentry
container image scanning
dependency scanning
```

### No obligatorio inicialmente

```text
Kubernetes
service mesh
multi-region
complex GitOps
distributed tracing across every component
advanced autoscaling
multi-cluster deployment
full chaos engineering platform
```

---

# 11.77 Evolución DevOps

## Fase 1 — MVP

```text
Docker Compose
+
CI
+
manual/controlled CD
+
PostgreSQL backup
+
basic monitoring
```

## Fase 2 — Operación estable

```text
multiple application instances
+
centralized logs
+
metrics
+
tracing
+
automated backups
+
automated rollback support
```

## Fase 3 — Escala

```text
container orchestration
+
autoscaling
+
dedicated workers
+
advanced deployment strategies
+
CDN optimization
+
regional scaling
```

La infraestructura avanzada debe aparecer como respuesta a necesidades reales, no como requisito previo para comenzar.

---

# 11.78 Riesgos operacionales

### Riesgo 1 — Gateway saturado

**Mitigación:**

* capacity planning;
* bandwidth monitoring;
* horizontal scaling;
* CDN donde sea apropiado;
* límites de concurrencia;
* optimización de delivery.

---

### Riesgo 2 — Resolver saturado

**Mitigación:**

* queue;
* bounded concurrency;
* timeout;
* retry policy;
* circuit breaker futuro;
* adapter health;
* aislamiento de tareas costosas.

---

### Riesgo 3 — Base de datos degradada

**Mitigación:**

* índices;
* connection pooling;
* query monitoring;
* backups;
* replicas cuando sean necesarias;
* límites de carga.

---

### Riesgo 4 — Redis unavailable

**Mitigación:**

* separar cache de estado crítico;
* fallback definido;
* recuperación explícita;
* no utilizar Redis como única fuente persistente.

---

### Riesgo 5 — Deploy defectuoso

**Mitigación:**

```text
CI
+
staging
+
smoke tests
+
health checks
+
rollback
+
feature flags
```

---

### Riesgo 6 — Backup inutilizable

**Mitigación:**

* backup externo;
* checksum/integrity;
* restore testing;
* retención;
* documentación.

---

### Riesgo 7 — Observabilidad insuficiente

**Mitigación:**

* logs estructurados;
* métricas;
* traces;
* correlation IDs;
* dashboards;
* alertas accionables.

---

### Riesgo 8 — Costos inesperados

**Mitigación:**

* egress monitoring;
* storage monitoring;
* bandwidth budgets;
* worker concurrency;
* cache strategy;
* capacity planning.

---

# 11.79 Decisiones que quedan deliberadamente abiertas

Las siguientes decisiones no deben fijarse artificialmente antes de tener datos:

```text
lenguaje definitivo del Gateway
Kubernetes
proveedor de CDN
proveedor de observabilidad
estrategia exacta de autoscaling
multi-region
blue/green vs canary
proveedor de container registry
proveedor definitivo de object storage
RPO/RTO finales
SLO numéricos finales
```

Cada una deberá convertirse en ADR cuando exista información suficiente para tomar la decisión.

---

# 11.80 ADRs relacionados

### ADR-11.1 — Container Strategy

Definir Docker y estructura de imágenes.

### ADR-11.2 — CI/CD Platform

Definir GitHub Actions, GitLab CI u otra plataforma.

### ADR-11.3 — Deployment Strategy

Definir rolling, blue/green o canary cuando la escala lo justifique.

### ADR-11.4 — Database Migration Strategy

Definir migraciones compatibles y rollback.

### ADR-11.5 — Observability Stack

Definir logs, metrics, traces y error monitoring.

### ADR-11.6 — Backup and Retention

Definir frecuencia, almacenamiento, retención y restore testing.

### ADR-11.7 — Disaster Recovery

Definir RPO, RTO y procedimiento de recuperación.

### ADR-11.8 — Load Testing

Definir escenarios de carga y metodología.

### ADR-11.9 — Production Rollback

Definir estrategia de reversión de versiones.

### ADR-11.10 — Feature Flag Governance

Definir propietarios, expiración, auditoría y kill switches.

### ADR-11.11 — Incident Management

Definir severidades, escalamiento y postmortems.

### ADR-11.12 — Gateway Capacity Planning

Definir metodología para concurrent viewers, bitrate, bandwidth y egress.

---

# 11.81 Reglas maestras de DevOps, Testing y Operación

### Regla 1

**Todo cambio que llegue a producción debe ser trazable a un commit y un artifact.**

### Regla 2

**El CI debe detectar regresiones antes del despliegue.**

### Regla 3

**La cobertura de código es una métrica, no una garantía de calidad.**

### Regla 4

**Los componentes críticos deben probarse también mediante integración y E2E.**

### Regla 5

**Gateway y Resolver requieren estrategias de testing específicas debido a su interacción con redes externas.**

### Regla 6

**Los fallos parciales deben probarse deliberadamente.**

### Regla 7

**Los logs no deben convertirse en depósitos de secretos.**

### Regla 8

**Las métricas deben representar el comportamiento real del sistema y mantener cardinalidad controlada.**

### Regla 9

**Playback QoE es una señal operativa de primera clase.**

### Regla 10

**Un backup no probado no debe considerarse una estrategia de recuperación completa.**

### Regla 11

**Todo despliegue crítico debe tener una estrategia de rollback o mitigación.**

### Regla 12

**Las migraciones de base de datos deben diseñarse junto con la estrategia de despliegue.**

### Regla 13

**Redis puede acelerar el sistema, pero no debe convertirse accidentalmente en la única fuente de verdad persistente.**

### Regla 14

**El Media Gateway debe dimensionarse por concurrencia y ancho de banda, no únicamente por RPS.**

### Regla 15

**Los objetivos de rendimiento deben validarse mediante benchmarks y tráfico real.**

### Regla 16

**La infraestructura debe evolucionar cuando el sistema lo necesite, no por complejidad prematura.**

---

# 11.82 Criterio final de operación

La plataforma se considerará operacionalmente madura cuando pueda responder afirmativamente a las siguientes preguntas:

```text
¿Sabemos qué versión está ejecutándose?
¿Podemos desplegarla de forma reproducible?
¿Podemos detectar una regresión?
¿Podemos saber dónde ocurrió un fallo?
¿Podemos distinguir API, Resolver, Gateway y Source failures?
¿Podemos recuperar una PlaybackSession?
¿Podemos desactivar una funcionalidad problemática?
¿Podemos restaurar la base de datos?
¿Hemos probado realmente el restore?
¿Podemos hacer rollback?
¿Sabemos cuánto ancho de banda estamos consumiendo?
¿Podemos detectar degradación de QoE?
¿Podemos operar el sistema sin modificar manualmente la base de datos?
```

Si la respuesta es sí, DevOps deja de ser simplemente:

```text
Docker + GitHub Actions
```

y se convierte en lo que realmente debe ser:

> **la disciplina que mantiene la arquitectura funcionando después de que el código deja de estar en el repositorio y empieza a atender usuarios reales.**
