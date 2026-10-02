## 6.42. Administration, CMS & Operations Control Plane

### a. Propósito general

El **Administration Control Plane** proporciona interfaces seguras para que operadores autorizados puedan administrar, moderar, observar y configurar la plataforma.

Su responsabilidad será:

> **Permitir intervención humana controlada sobre los dominios de la plataforma mediante APIs y comandos de aplicación autorizados, trazables y auditables.**

No será propietario de Catalog.

No será propietario de Sources.

No será propietario de Users.

No será propietario de Health.

No será propietario de infraestructura.

Es una **capa de administración** sobre esos dominios.

---

### b. Principio fundamental

La regla más importante:

```text
Admin UI
   │
   ▼
Admin/Application API
   │
   ▼
Domain
   │
   ▼
Persistence
```

Nunca:

```text
Admin UI
   │
   ▼
Database
```

El Panel Admin no obtiene privilegios especiales para saltarse las reglas de dominio.

---

### c. Human Control Plane

Hasta ahora construimos un control plane principalmente automatizado:

```text
Catalog
Source Registry
Playback Orchestrator
Source Resolver
Health
Discovery/Ingestion
Identity
```

Ahora añadimos:

```text
        HUMAN OPERATORS
              │
              ▼
      ADMIN CONTROL PLANE
              │
              ▼
        DOMAIN SYSTEMS
```

Es decir, el Panel Admin es la interfaz humana del Control Plane.

---

### d. Separación conceptual interna

El bloque original llamado simplemente:

```text
Panel Admin / CMS
```

realmente contiene al menos cinco capacidades:

```text
ADMINISTRATION CONTROL PLANE
│
├── Content Management
│
├── Source Operations
│
├── Moderation
│
├── User Administration
│
├── System Operations
│
└── Audit & Diagnostics
```

Podrán vivir físicamente en una única aplicación administrativa.

---

### e. CMS / Content Management

Responsabilidad:

> Administrar editorialmente el catálogo canónico.

Incluye:

```text
create MediaItem
edit metadata
manage seasons/episodes
publication state
localized metadata
artwork
genres/taxonomy
editorial collections
```

No incluye:

```text
resolve Source
probe Source
play video
modify Search Index directly
```

---

### f. Source Operations

Permitirá:

```text
inspect Sources
add Source
disable Source
restore Source eligibility
inspect Provider
inspect resolution attempts
request controlled validation
```

pero mediante:

```text
Source Registry API
```

y:

```text
Health API
```

no mediante SQL.

---

### g. Health Operations

La consola podrá mostrar:

```text
Source Health
Provider Health
User Reports
Active Incidents
Probe History
Coverage Problems
```

y permitir operaciones como:

```text
request probe
acknowledge report
resolve report
manual source disable
remove manual override
```

---

### h. Discovery / Ingestion Operations

La interfaz administrativa podrá inspeccionar:

```text
discovered candidates
ingestion jobs
duplicates
rejected candidates
failed ingestion
coverage gaps
```

y realizar:

```text
approve
reject
retry
manually ingest
```

según política.

---

### i. Moderation

Moderation será una capacidad separada conceptualmente.

Puede abarcar:

```text
user reports
content reports
source reports
user-generated content
```

si posteriormente existen comentarios u otras funciones sociales.

Un moderador no necesita acceso administrativo completo.

---

### j. User Administration

Permitirá operaciones autorizadas sobre cuentas:

```text
view limited account information
suspend
restore
change authorized roles
revoke sessions
review security state
```

No permitirá:

```text
view password
view refresh token
impersonate silently
```

---

### k. System Operations

Algunas operaciones podrán incluir:

```text
feature flags
maintenance state
operational configuration
job inspection
cache invalidation requests
```

pero serán tratadas como comandos explícitos.

No como botones que ejecutan infraestructura arbitraria.

---

### l. Audit & Diagnostics

Finalmente:

```text
Audit
```

será transversal.

Debe responder:

```text
Who?
Did what?
To what?
When?
Through which operation?
Was it successful?
```

y, cuando sea seguro:

```text
What changed?
```

---

### m. Arquitectura conceptual

```text
                         ADMIN USER
                             │
                             ▼
                        ADMIN WEB
                             │
                             ▼
                     ADMIN API / BFF
                             │
       ┌─────────────────────┼─────────────────────┐
       │                     │                     │
       ▼                     ▼                     ▼
    Catalog             Source Registry          Users
       │                     │                     │
       ▼                     ▼                     ▼
 Application           Application            Application
 Commands              Commands               Commands
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             │
                             ▼
                          AUDIT
```

---

### n. Admin UI no conoce persistencia

La UI trabaja con:

```text
MediaItem
Source
Provider
User
Report
IngestionJob
FeatureFlag
```

No con:

```text
table row
Redis key
database shard
```

La persistencia es detalle interno.

---

### o. Ejemplo: editar contenido

El original tiene:

```http
PATCH /v1/admin/animes/:id
```

con campos específicos de anime.

Lo generalizamos:

```http
PATCH /v1/admin/media/{mediaItemId}
```

Ejemplo conceptual:

```json
{
  "title": "Blade Runner",
  "publicationStatus": "PUBLISHED"
}
```

---

### p. Flujo correcto de edición

```text
Admin
  │
  ▼
Admin UI
  │
  ▼
PATCH /admin/media/123
  │
  ▼
Authorization
  │
  ▼
Catalog Application Service
  │
  ▼
validate domain rules
  │
  ▼
Catalog Repository
  │
  ▼
PostgreSQL
  │
  ▼
media.updated
```

Entonces:

```text
media.updated
    │
    ├── Search Projection
    ├── Cache Invalidation
    └── other consumers
```

---

### q. Lo que NO hacemos

No:

```text
Admin UI
  │
  ▼
UPDATE media_items
SET title = ...
```

Ni:

```text
Admin UI
  │
  ▼
DELETE Redis key
```

Ni:

```text
Admin UI
  │
  ▼
call CDN vendor directly
```

---

### r. Cache invalidation

El original permite al Panel realizar purgas de CDN/Redis.

La necesidad es válida.

Cambiaremos el mecanismo.

Admin solicita:

```text
InvalidateMediaCache(mediaId)
```

El backend decide:

```text
which caches
which keys
which CDN paths
```

Esto evita exponer detalles de infraestructura a la UI.

---

### s. Comandos administrativos

Podemos pensar en operaciones explícitas:

```text
UpdateMediaMetadata
PublishMedia
ArchiveMedia

AddSource
DisableSource
RequestSourceProbe

SuspendUser
RestoreUser
RevokeUserSessions

RetryIngestionJob

EnableFeature
DisableFeature
```

Esto hace mucho más clara la auditoría.

---

### t. Command ≠ Domain Event

Importante:

```text
COMMAND
PublishMedia
```

significa:

> “haz esto”.

Mientras:

```text
EVENT
media.published
```

significa:

> “esto ocurrió”.

No intercambiaremos ambos conceptos.

---

### u. Admin API

Podemos agrupar rutas bajo:

```text
/v1/admin/*
```

Ejemplos conceptuales:

```http
GET    /v1/admin/media
POST   /v1/admin/media
PATCH  /v1/admin/media/{id}

GET    /v1/admin/sources
POST   /v1/admin/sources
POST   /v1/admin/sources/{id}/disable
POST   /v1/admin/sources/{id}/probe

GET    /v1/admin/reports

GET    /v1/admin/users/{id}
POST   /v1/admin/users/{id}/suspend

GET    /v1/admin/ingestion/jobs

GET    /v1/admin/audit
```

Los contratos exactos vendrán en diseño API.

---

### v. Acciones semánticas vs CRUD

No todo debe modelarse como:

```http
PATCH /resource
```

Para operaciones importantes:

```text
Suspend User
Publish Media
Disable Source
Retry Job
```

puede ser más claro usar acciones explícitas.

Por ejemplo:

```http
POST /v1/admin/users/{id}/suspend
```

Esto comunica intención y facilita auditoría.

---

### w. RBAC

El original distingue:

```text
admin
moderator
editor
```

en la descripción, aunque el esquema previo de usuarios estaba centrado en `user/moderator/admin`.

No hardcodearemos todo alrededor de nombres de rol.

Usaremos:

```text
Role
  │
  ▼
Permissions
```

---

### x. Permissions administrativas

Ejemplos:

```text
catalog.read
catalog.write
catalog.publish

sources.read
sources.write
sources.disable

health.read
health.probe

reports.read
reports.moderate

users.read
users.suspend
users.roles.write

system.flags.read
system.flags.write

audit.read
```

---

### y. Least Privilege

Un editor de catálogo puede tener:

```text
catalog.read
catalog.write
```

sin:

```text
users.suspend
system.flags.write
```

Un moderador puede tener:

```text
reports.moderate
```

sin poder:

```text
delete catalog
```

---

### z. No confiar en la UI

Aunque el frontend no muestre:

```text
Suspend User
```

a un editor, la API igualmente verifica:

```text
users.suspend
```

en cada operación.

---

### aa. Sensitive Operations

Algunas acciones merecen controles adicionales:

```text
change admin role
disable authentication
maintenance mode
mass source disable
delete content
rotate critical configuration
```

Podemos clasificarlas:

```text
NORMAL
SENSITIVE
CRITICAL
```

---

### ab. Step-up Authentication

Para acciones críticas futuras podemos exigir:

```text
recent authentication
```

o:

```text
MFA confirmation
```

aunque el usuario ya tenga una AuthSession válida.

Ejemplo:

```text
Admin logged in 8 hours ago
       │
       ▼
Change another admin role
       │
       ▼
step-up required
```

---

### ac. MFA

El original obliga 2FA/TOTP para moderator y admin.

La intención de seguridad es buena.

La arquitectura deberá soportar:

```text
MFA required for privileged accounts
```

pero el método puede evolucionar:

```text
TOTP
Passkey/WebAuthn
security key
```

No fijaremos TOTP como única solución.

---

### ad. Admin Session

Podremos aplicar políticas más estrictas a sesiones privilegiadas:

```text
shorter idle timeout
reauthentication
MFA
session revocation
security event logging
```

sin imponer necesariamente esas mismas reglas a un visitante normal.

---

### ae. IP Whitelisting

El original restringe `admin.tudominio.com` a IP corporativa/VPN.

Eso puede ser excelente en determinados despliegues, pero no será requisito universal.

Especialmente para:

```text
solo developer
remote administration
dynamic IP
```

puede ser incómodo.

Lo dejamos como:

```text
optional network access policy
```

con alternativas:

```text
VPN
Zero Trust Access
identity-aware proxy
IP allowlist
```

según infraestructura.

---

### af. Defense in Depth

Acceso administrativo idealmente:

```text
Internet
   │
   ▼
Edge / Access Control
   │
   ▼
Authentication
   │
   ▼
MFA
   │
   ▼
Authorization
   │
   ▼
Admin API
   │
   ▼
Domain Authorization
```

Una sola capa nunca es suficiente.

---

### ag. Audit Log

Conservamos la idea original de:

```text
admin_audit_logs
```

pero la generalizamos.

Conceptualmente:

```sql
CREATE TABLE audit_events (
    id UUID PRIMARY KEY,

    actor_user_id UUID,
    actor_session_id UUID,

    action VARCHAR(100) NOT NULL,

    target_type VARCHAR(100),
    target_id VARCHAR(255),

    outcome VARCHAR(32) NOT NULL,

    metadata JSONB,

    occurred_at TIMESTAMPTZ NOT NULL
);
```

---

### ah. Audit Actor

No siempre será:

```text
admin_id
```

En el futuro una acción podría ser:

```text
SYSTEM
SERVICE
ADMIN
MODERATOR
```

Por eso conceptualmente:

```text
actor
```

es más flexible.

---

### ai. Audit Event

Ejemplo:

```json
{
  "actor": {
    "type": "USER",
    "id": "usr_123"
  },

  "action": "SOURCE_DISABLED",

  "target": {
    "type": "SOURCE",
    "id": "src_456"
  },

  "outcome": "SUCCESS",

  "occurredAt": "..."
}
```

---

### aj. Before/After

Para ciertos cambios puede ser útil guardar:

```text
before
after
```

o:

```text
diff
```

pero no indiscriminadamente.

Porque un diff podría incluir:

```text
secrets
PII
tokens
credentials
```

La auditoría también necesita sanitización.

---

### ak. Audit ≠ Application Logs

Diferencia:

```text
Application Log
```

sirve para diagnóstico técnico.

```text
Audit Event
```

sirve para trazabilidad de acciones relevantes.

No deberían depender exactamente de la misma retención ni controles.

---

### al. Audit Immutability

El original habla de un registro “Write-Only” inmutable.

Mantendremos la propiedad deseada:

> Los operadores normales no deben poder alterar silenciosamente el historial de auditoría.

Pero no afirmaremos que una tabla PostgreSQL convencional es criptográficamente inmutable.

Podemos fortalecerla posteriormente con:

```text
restricted DB permissions
append-only policy
external log sink
WORM storage
hash chaining
```

si la amenaza lo justifica.

---

### am. Correlation ID

Cada operación administrativa importante tendrá:

```text
request_id
correlation_id
```

para conectar:

```text
Admin Action
   │
   ▼
Domain Command
   │
   ▼
DB Mutation
   │
   ▼
Domain Event
   │
   ▼
Audit
```

---

### an. Reason

Para acciones sensibles podremos exigir:

```text
reason
```

Ejemplo:

```json
{
  "reason": "Source contains incorrect content"
}
```

especialmente:

```text
user suspension
source disable
content archive
manual override
```

---

### ao. Idempotency

Acciones susceptibles a doble envío:

```text
Retry Job
Publish Media
Disable Source
```

deben ser idempotentes cuando sea posible.

Ejemplo:

```text
disable already disabled Source
```

no debería crear un estado incoherente.

---

### ap. Optimistic Concurrency

Problema:

```text
Admin A opens MediaItem v10
Admin B opens MediaItem v10

B saves → v11
A saves old form → overwrites B
```

Solución:

```text
version
```

o:

```text
ETag / If-Match
```

---

### aq. Conflict Response

```text
PATCH
If-Match: "v10"
```

pero el servidor ya tiene:

```text
v11
```

→

```text
409 Conflict
```

o `412 Precondition Failed`, según contrato.

La UI muestra diferencias en lugar de sobrescribir silenciosamente.

---

### ar. Draft vs Published

Para CMS editorial puede convenir separar:

```text
DRAFT
PUBLISHED
ARCHIVED
```

como ya definimos en Catalog.

Editar un draft:

```text
≠
```

publicarlo.

---

### as. Publish Operation

```text
Draft
  │
  ▼
Validation
  │
  ▼
PublishMedia
  │
  ▼
PUBLISHED
  │
  ├── Search projection
  ├── cache invalidation
  └── discovery eligibility
```

---

### at. Preview

Podremos tener posteriormente:

```text
preview unpublished content
```

para administradores/editorial.

Pero el preview deberá utilizar una ruta autorizada.

No convertiremos un draft en público temporalmente para verlo.

---

### au. Source Management

Vista:

```text
MediaItem
   │
   └── Playback Target
          │
          ├── Source A ACTIVE
          ├── Source B DEGRADED
          └── Source C UNAVAILABLE
```

Desde allí un operador podrá inspeccionar cada Source.

---

### av. Source Details

Mostrar:

```text
provider
state
operational eligibility
last resolution
health
recent failures
reports
created_at
updated_at
```

sin exponer necesariamente:

```text
provider secrets
raw temporary URLs
session tokens
```

---

### aw. Manual Source Addition

Flujo:

```text
Admin
  │
  ▼
Add Source
  │
  ▼
Source Registry validation
  │
  ▼
DISCOVERED
  │
  ▼
validation/resolution
  │
  ▼
ACTIVE
```

No:

```text
Admin enters URL
  ↓
immediately ACTIVE
```

---

### ax. Source Disable

```text
POST /admin/sources/{id}/disable
```

produce:

```text
manual operational override
```

como definimos en Health.

Health puede seguir observando la Source, pero no reactivarla automáticamente.

---

### ay. Health Dashboard

Puede mostrar:

```text
Sources by state
Providers by health
Recent incidents
Reports pending
Coverage gaps
Probe queue
Resolution failure rate
```

---

### az. User Reports Moderation

Vista:

```text
Report
├── Source
├── Playback Target
├── category
├── reporter context
├── related observations
├── current health
└── status
```

Operaciones:

```text
verify
reject
resolve
request probe
disable source
```

cada una con permisos distintos.

---

### ba. User Administration

El Panel no necesita descargar toda la tabla `users`.

Debe utilizar búsquedas y filtros controlados.

Ejemplo:

```text
username
internal user id
email when authorized
account status
role
created date
```

---

### bb. Sensitive User Data

Datos como:

```text
email
security events
sessions
IP-derived information
```

deberán requerir permisos más fuertes que:

```text
view public profile
```

RBAC puede evolucionar hacia permisos más granulares.

---

### bc. Passwords

Nunca:

```text
Admin can see password
```

Ni siquiera:

```text
password_hash
```

debe exponerse al Panel.

Para recuperación:

```text
password reset workflow
```

no “mostrar contraseña”.

---

### bd. User Suspension

Flujo:

```text
Admin/Moderator
      │
      ▼
SuspendUser
      │
      ▼
Authorization
      │
      ▼
User Domain
      │
      ├── status = SUSPENDED
      └── revoke sessions if policy requires
```

Auditado.

---

### be. Role Change

Operación crítica:

```text
user → moderator
moderator → admin
```

deberá generar:

```text
security audit event
```

y posiblemente:

```text
session re-evaluation
```

como vimos en Motor 6.

---

### bf. No self-escalation

Regla:

> Ningún usuario puede otorgarse a sí mismo permisos que no posea autoridad para conceder.

Además podemos prohibir:

```text
admin removes last admin
```

si el producto necesita garantizar al menos una cuenta administrativa.

---

### bg. Ingestion Dashboard

Mostrar:

```text
jobs queued
running
succeeded
failed
candidates pending
duplicates
coverage gaps
```

y operaciones:

```text
retry
cancel when safe
approve
reject
inspect
```

---

### bh. Retry no significa ejecutar desde navegador

Botón:

```text
Retry
```

produce:

```text
RetryIngestionJob
```

y el backend:

```text
validates state
creates/enqueues job
```

El navegador no controla directamente workers.

---

### bi. Job State

Conceptualmente:

```text
QUEUED
RUNNING
SUCCEEDED
FAILED
CANCELLED
```

con timestamps e información diagnóstica sanitizada.

---

### bj. Feature Flags

El Admin podrá administrar algunos flags.

Pero no todos los flags deben ser editables desde UI.

Clasificación:

```text
Product Flags
Operational Flags
Safety Flags
Developer/Internal Flags
```

---

### bk. Feature Flag Metadata

Un flag debería tener:

```text
key
description
current value
environment
owner
updated_by
updated_at
```

y opcionalmente:

```text
expiry/review date
```

para evitar flags eternos.

---

### bl. Kill Switches

Funciones críticas pueden tener:

```text
gateway_proxy_enabled
ads_enabled
discovery_automation_enabled
registration_enabled
```

según diseño.

Un kill switch debe ser:

```text
fast
auditable
reversible
```

---

### bm. Maintenance Mode

El original permite activarlo desde el dashboard.

Es razonable, pero será una operación crítica.

Ejemplo:

```text
EnableMaintenanceMode
```

con:

```text
reason
scope
expected duration
```

y auditoría.

---

### bn. Scoped Maintenance

Más adelante podríamos distinguir:

```text
GLOBAL
PLAYBACK
REGISTRATION
ADMIN_ONLY
```

en lugar de apagar toda la plataforma por cualquier incidente.

---

### bo. Configuración dinámica

No convertiremos Admin en:

```text
edit arbitrary environment variables
```

Eso sería peligroso.

Solo configuración explícitamente registrada:

```text
ConfigKey
type
allowed range
validation
scope
```

podrá modificarse.

---

### bp. Secret Management

Nunca aparecerán en configuración editable ordinaria:

```text
database passwords
JWT private keys
provider secrets
API secret keys
```

Estos pertenecen a:

```text
Secret Management
```

fuera del CMS.

---

### bq. Observability Dashboard

Admin puede mostrar vistas derivadas de:

```text
metrics
logs summaries
health
jobs
incidents
```

pero no necesita convertirse en Grafana.

El ADR original propone embeds de Grafana.

Lo conservamos como opción.

---

### br. Admin Dashboard ≠ Observability Platform

Podemos mostrar:

```text
Playback Success Rate
TTFF
Sources unavailable
Resolution failures
Active incidents
```

y enlazar a herramientas especializadas para diagnóstico profundo.

No reimplementaremos Prometheus/Grafana/Loki dentro del CMS.

---

### bs. Read Model

El Panel necesita consultas complejas:

```text
content + sources + health + reports
```

No significa hacer un join distribuido desde el navegador.

Podemos crear:

```text
Admin Read API
```

que componga datos de múltiples dominios.

---

### bt. CQRS ligero

Esto se parece a:

```text
Commands
→ domain APIs

Queries
→ admin read models
```

pero no necesitamos implementar full CQRS/Event Sourcing.

Es simplemente una separación útil.

---

### bu. Admin Search

La búsqueda administrativa es distinta de Search público.

Puede permitir:

```text
internal IDs
source IDs
provider
status
email when authorized
job ID
report ID
```

No tiene por qué usar el mismo Search Engine.

---

### bv. Read Freshness

El original dice que Admin siempre debe leer directamente de Master DB para garantizar consistencia fuerte.

La intención —evitar datos administrativos engañosamente obsoletos— es válida.

Pero:

> **Admin necesita políticas explícitas de consistencia por operación, no una regla universal de “bypass all cache”.**

---

### bw. Read-your-writes

Después de:

```text
UpdateMedia
```

el operador debería ver inmediatamente:

```text
new Media state
```

Eso sí es una propiedad útil.

Puede lograrse sin obligar a que cada dashboard histórico consulte siempre la primary DB.

---

### bx. Dashboard Staleness

Una métrica agregada puede indicar:

```text
Updated 12 seconds ago
```

y ser perfectamente aceptable.

Mientras una pantalla de edición requiere estado más fresco.

---

### by. Pagination

Toda lista potencialmente grande:

```text
users
media
sources
reports
audit events
jobs
```

deberá ser paginada.

No:

```text
GET /admin/users
→ 5 million rows
```

---

### bz. Bulk Operations

Posteriormente podremos soportar:

```text
select 100 sources
disable
```

pero operaciones masivas necesitan:

```text
preview
authorization
limits
confirmation
audit
async job
```

según riesgo.

---

### ca. Dangerous Actions

UX administrativa debe diferenciar claramente:

```text
reversible
```

de:

```text
destructive
```

Preferiremos:

```text
archive
disable
suspend
```

sobre:

```text
hard delete
```

cuando el dominio lo permita.

---

### cb. Hard Delete

Si existe:

```text
Delete Permanently
```

deberá tener política explícita.

No será equivalente a:

```text
Archive
```

---

### cc. Confirmation

No todas las operaciones necesitan:

```text
"Are you sure?"
```

pero las críticas sí pueden requerir confirmación contextual.

Por ejemplo:

```text
Disable 4,300 Sources
```

debe mostrar el impacto antes de ejecutar.

---

### cd. Dry Run

Para ciertas operaciones masivas:

```text
dry run
```

puede devolver:

```text
affected resources
validation errors
estimated impact
```

sin mutar estado.

Muy útil posteriormente.

---

### ce. Admin API Rate Limiting

Aunque sean usuarios confiables:

```text
admin endpoints
```

también necesitan límites.

Especialmente:

```text
bulk actions
exports
search
probe triggers
cache invalidations
```

para evitar accidentes y abuso.

---

### cf. CSRF

Si Admin usa autenticación basada en cookies:

```text
CSRF protection
```

es particularmente importante por el poder de sus operaciones.

Aplicaremos las decisiones del Motor 6:

```text
SameSite
Origin validation
CSRF tokens
```

según arquitectura.

---

### cg. CSP

El Admin debería tener una política CSP incluso más estricta que el frontend público cuando sea viable.

Especialmente porque una XSS administrativa puede tener consecuencias enormes.

---

### ch. Third-party Scripts

Minimizaremos:

```text
third-party analytics
advertising
untrusted widgets
```

en Admin.

No hay razón para cargar el stack publicitario dentro del panel administrativo.

---

### ci. Clickjacking

Admin deberá impedir embedding no autorizado mediante políticas como:

```text
frame-ancestors
```

según despliegue.

---

### cj. Sensitive Response Caching

Respuestas administrativas:

```text
user details
audit
configuration
```

no deben terminar accidentalmente en caches públicas/CDN compartidas.

---

### ck. Exports

Si permitimos:

```text
export CSV
```

de usuarios/reportes/auditoría:

```text
authorization
size limits
audit
expiration
PII handling
```

serán obligatorios.

Exports grandes pueden generarse como jobs asíncronos.

---

### cl. Admin Notifications

Podemos mostrar:

```text
Provider incident
Source coverage critical
Ingestion backlog
Security warning
```

pero las notificaciones vienen de dominios productores.

Admin no detecta incidentes por sí mismo.

---

### cm. Operational Inbox

Una futura vista muy útil:

```text
OPERATIONS INBOX
│
├── 7 source reports pending
├── 2 provider incidents
├── 14 failed ingestion jobs
├── 3 contents without viable source
└── 1 security alert
```

Eso convierte el Panel en una consola operativa real.

---

### cn. Audit Metrics

```text
admin_actions_total{
  action,
  outcome
}
```

con cardinalidad controlada.

También:

```text
admin_authorization_denied_total
admin_sensitive_actions_total
```

---

### co. No `admin_id` como metric label

Nunca:

```text
admin_actions_total{
  admin_id="usr_123"
}
```

en Prometheus.

La atribución individual vive en Audit Logs.

---

### cp. Logs

Ejemplo:

```json
{
  "module": "admin_api",
  "event": "source_disable_requested",
  "requestId": "...",
  "sourceId": "...",
  "outcome": "success"
}
```

Los identificadores de alta cardinalidad pertenecen a logs/traces, no métricas.

---

### cq. IP en Audit

El original hace `ip_address NOT NULL`.

Nosotros lo consideraremos:

```text
optional security context
```

sujeto a:

```text
retention
minimization
access control
```

No convertiremos la IP en identidad del operador.

La identidad principal es:

```text
actor_user_id + auth session
```

---

### cr. Performance

Los objetivos originales:

```text
CMS initial load <1.2s
CRUD p95 <150ms
```

se conservan como hipótesis históricas, no SLO finales.

Mediremos:

```text
admin page load
API p50/p95/p99
command execution latency
query latency
job queue latency
error rate
```

---

### cs. UX performance ≠ Command completion

Ejemplo:

```text
Retry 10,000 ingestion jobs
```

no debe mantener un HTTP request abierto hasta terminar.

Respuesta:

```text
202 Accepted
operationId = op_123
```

y Admin observa progreso.

---

### ct. Administrative Operation

Podemos introducir:

```text
AdminOperation
```

para procesos largos:

```json
{
  "operationId": "op_123",
  "type": "BULK_SOURCE_VALIDATION",
  "status": "RUNNING",
  "progress": {
    "completed": 413,
    "total": 1000
  }
}
```

No necesario para CRUD básico, sí para operaciones masivas.

---

### cu. Testing — Authorization

Necesitamos matriz explícita:

| Operación             | User | Editor |     Moderator |         Admin |
| --------------------- | ---: | -----: | ------------: | ------------: |
| Ver CMS               |   No |    Sí* |           Sí* |            Sí |
| Editar catálogo       |   No |     Sí | Según permiso |            Sí |
| Moderar reportes      |   No |     No |            Sí |            Sí |
| Suspender usuario     |   No |     No | Según permiso |            Sí |
| Cambiar roles         |   No |     No |            No |            Sí |
| Configuración crítica |   No |     No |            No | Según permiso |

`*` según modelo final de roles.

La tabla es ilustrativa; la política definitiva se documentará por permisos.

---

### cv. Security Testing

Casos:

```text
privilege escalation
IDOR/BOLA
CSRF
XSS
mass assignment
role tampering
session expiration
MFA bypass
audit bypass
unauthorized exports
```

---

### cw. Mass Assignment

Especialmente importante con:

```http
PATCH /admin/users/{id}
```

No debemos aceptar automáticamente cualquier campo del objeto.

Ejemplo peligroso:

```json
{
  "displayName": "Juan",
  "role": "admin"
}
```

si el endpoint solo debía cambiar perfil.

Usaremos DTOs/commands explícitos.

---

### cx. Audit Testing

Para cada operación crítica verificamos:

```text
action succeeded
→ audit exists
```

y:

```text
action rejected
→ security/audit evidence where appropriate
```

---

### cy. Concurrency Testing

Dos operadores editando:

```text
same MediaItem
same Source
same configuration
```

no deben producir silent lost updates.

---

### cz. Failure Testing

Simular:

```text
Catalog unavailable
Redis unavailable
Health worker unavailable
audit sink unavailable
queue unavailable
```

y definir comportamiento.

Especialmente:

```text
critical mutation succeeds
but audit fails
```

requiere una política explícita.

---

### da. Audit Atomicity

Idealmente:

```text
Domain mutation
+
audit evidence
```

no deberían divergir silenciosamente.

Dependiendo de la arquitectura podremos usar:

```text
same transaction
transactional outbox
reliable audit sink
```

según el tipo de evento.

---

### db. MVP físico

No necesitamos una infraestructura separada enorme.

```text
Browser
   │
   ▼
Admin Web
   │
   ▼
Core API
   │
   ├── Admin Routes
   │
   ├── Catalog Module
   │
   ├── Source Registry
   │
   ├── Health
   │
   ├── User Domain
   │
   └── Ingestion
   │
   ▼
PostgreSQL
```

Perfectamente válido.

---

### dc. Admin BFF

Un Admin-specific BFF puede aparecer posteriormente si la UI necesita mucha composición.

Pero:

```text
separate Admin microservice
```

no es requisito MVP.

---

### dd. MVP funcional

Primera versión:

```text
Admin Login
     │
     ▼
Dashboard
     │
     ├── Catalog CRUD
     ├── Source Management
     ├── Health/Reports
     ├── Basic User Administration
     └── Audit
```

Eso ya permite operar el vertical slice completo.

---

### de. No MVP

Podemos dejar fuera inicialmente:

```text
complex workflow approvals
multi-admin approval
bulk operation framework
advanced exports
custom dashboards
embedded Grafana
real-time collaborative editing
fine-grained ABAC
advanced Zero Trust integration
full incident-management suite
```

---

### df. Criterios de aceptación

El Admin/CMS MVP estará listo cuando:

1. solo usuarios autorizados puedan acceder;
2. cada operación sea autorizada server-side;
3. Admin UI nunca acceda directamente a PostgreSQL;
4. pueda crear/editar/publicar contenido;
5. pueda administrar Sources mediante Source Registry;
6. pueda inspeccionar Health;
7. pueda revisar reportes;
8. pueda solicitar un probe;
9. pueda aplicar un manual Source override;
10. pueda consultar jobs de Ingestion;
11. pueda reintentar un job fallido;
12. pueda consultar usuarios con permisos adecuados;
13. pueda suspender/restaurar cuentas autorizadamente;
14. operaciones críticas produzcan auditoría;
15. audit records no incluyan secretos;
16. ediciones concurrentes no se sobrescriban silenciosamente;
17. listas grandes estén paginadas;
18. secretos del sistema no sean editables desde configuración ordinaria;
19. acciones administrativas no dependan de manipular Redis/CDN directamente;
20. el Panel pueda operar aunque Search público esté degradado;
21. una operación asíncrona pueda representarse sin mantener abierta la request;
22. el sistema pueda revocar una sesión administrativa comprometida.

---

### dg. ADRs abiertas

### ADR-ADMIN-01 — Admin Application Deployment

Decidir:

```text
same web application
```

vs:

```text
separate admin frontend
```

---

### ADR-ADMIN-02 — Privileged Authentication

Definir:

```text
MFA requirements
passkeys
TOTP
step-up authentication
idle timeout
```

---

### ADR-ADMIN-03 — Network Access

Evaluar:

```text
public + strong identity
VPN
Zero Trust proxy
IP allowlist
```

---

### ADR-ADMIN-04 — Authorization Model

Comenzar con:

```text
RBAC
```

y determinar si alguna vez necesitamos:

```text
fine-grained permissions
ABAC
```

---

### ADR-ADMIN-05 — Audit Architecture

Definir:

```text
PostgreSQL append-only
outbox
external audit sink
WORM storage
```

según amenaza y requisitos.

---

### ADR-ADMIN-06 — Audit Retention

Definir retención diferenciada para:

```text
security events
content edits
user moderation
configuration changes
```

---

### ADR-ADMIN-07 — Admin Read Models

Determinar cuándo crear proyecciones específicas para dashboards en vez de componer consultas en tiempo real.

---

### ADR-ADMIN-08 — Feature Flag Management

Definir qué flags pueden modificarse desde Admin y cuáles requieren deployment/configuration management.

---

### ADR-ADMIN-09 — Bulk Operations

Formalizar:

```text
dry run
approval
async execution
progress
rollback
```

cuando aparezcan operaciones masivas.

---

### ADR-ADMIN-10 — Administrative Impersonation

Si alguna vez se necesita:

```text
"view as user"
```

deberá diseñarse expresamente con:

```text
authorization
visible indication
audit
limited scope
no credential access
```

No implementarlo informalmente.

---

### dh. Arquitectura consolidada

```text
                         HUMAN CONTROL PLANE

                       ADMIN / MODERATOR
                              │
                              ▼
                          ADMIN WEB
                              │
                              ▼
                     ADMIN API / BFF
                              │
                    Authentication
                              │
                    Authorization
                              │
      ┌───────────────────────┼────────────────────────┐
      │                       │                        │
      ▼                       ▼                        ▼
CONTENT MANAGEMENT      OPERATIONS              MODERATION
      │                       │                        │
      ▼                       ▼                        ▼
   Catalog              Source Registry             Reports
                            │
                            ├── Health
                            ├── Ingestion
                            └── Providers

      ┌───────────────────────┼────────────────────────┐
      │                       │                        │
      ▼                       ▼                        ▼
USER ADMINISTRATION    SYSTEM CONFIG            DIAGNOSTICS
      │                       │                        │
      ▼                       ▼                        ▼
 User Domain            Feature Flags            Read Models
 Auth Sessions          Kill Switches            Metrics
 Roles                  Maintenance              Incidents

                              │
                              ▼
                       APPLICATION COMMANDS
                              │
                              ▼
                         DOMAIN RULES
                              │
                              ▼
                         PERSISTENCE

                              │
                              ▼
                         AUDIT EVENTS
```

### Reglas maestras del Motor 9

Estas las pondría tal cual:

> **1. El Panel Admin es una interfaz del Control Plane; no es propietario de los dominios que administra.**

> **2. Toda mutación administrativa atraviesa autorización y reglas de dominio; la UI nunca modifica bases de datos, Redis, CDN o workers directamente.**

> **3. CMS, Operations, Moderation, User Administration y System Configuration son capacidades distintas aunque compartan una misma aplicación administrativa.**

> **4. Una acción administrativa crítica debe ser atribuible, auditable y, cuando sea posible, reversible.**

> **5. Los privilegios administrativos siguen least privilege: ser moderador/editor no implica acceso universal al sistema.**

> **6. Audit Logs y Application Logs cumplen funciones distintas y no deben tratarse como equivalentes.**

> **7. El Panel Admin puede solicitar acciones operacionales; los componentes propietarios deciden cómo ejecutarlas.**

> **8. Ningún secreto operativo debe exponerse al navegador administrativo salvo que exista una necesidad explícita y segura.**

Y ahora la arquitectura completa gana otra pieza muy bonita:

```text
                    HUMAN
                      │
                      ▼
              ADMIN CONTROL PLANE
                      │
                      ▼
────────────────────────────────────────
             SYSTEM CONTROL PLANE
────────────────────────────────────────
      │          │          │
   Catalog     Sources     Health
      │          │          │
      └──────────┼──────────┘
                 ▼
        Playback Orchestrator
                 │
                 ▼
────────────────────────────────────────
               DATA PLANE
────────────────────────────────────────
                 │
              Gateway
                 │
                 ▼
               Player
                 │
                 ▼
                USER
```

Eso ya se parece mucho más a una arquitectura operable que a una colección de “motores”.

Y el siguiente bloque, **Motor 10: Seguridad y Anti-Abuso**, es probablemente el último de los motores originales antes de entrar al modelo de datos. Ahí vamos a tener que hacer otra corrección bastante grande. El original propone un “motor” central que calcula **risk score de IP/dispositivo**, recibe JA3/JA4, hace bloqueos dinámicos, CAPTCHA/Turnstile, Redis Lua submilisegundo, blocklists permanentes de IP, Cloudflare/WAF/iptables y hasta dice que el Scraper aporta “patrones de evasión”.

Nuestra dirección debería ser distinta: **Security no es realmente un motor único por el que deba pasar cada request**. Es un **cross-cutting security architecture** distribuido por Edge, Auth, API, Gateway, egress y dominios sensibles.

Ahí vamos a separar definitivamente:

```text
EDGE SECURITY
      +
APPLICATION SECURITY
      +
IDENTITY SECURITY
      +
MEDIA ACCESS CONTROL
      +
EGRESS / SSRF SECURITY
      +
ABUSE PREVENTION
      +
SECURITY OBSERVABILITY
```

y también vamos a evitar que un supuesto `POST /security/verify-request` se convierta en un **single point of failure y latencia para toda la plataforma**. Ese Motor 10 nos va a cerrar prácticamente toda la arquitectura transversal antes de reconstruir el **Modelo de Datos**, que también va a cambiar muchísimo porque el original todavía conserva `anime`, `episodio`, `favorito`, `fuentes` y demás como modelo central.


Perfecto. Vamos con el **Motor 10**, y aquí conviene cambiar incluso la forma de pensar el bloque.

El documento original define un **“Motor de Seguridad y Anti-Abuso”** como una capa perimetral central: recibe IP, User-Agent, JA3/JA4, ruta y tasa de peticiones; calcula un `risk_score`; devuelve `PASS` o `CHALLENGE_REQUIRED`; mantiene blocklists de IP en PostgreSQL y rate limits en Redis; puede sincronizar reglas con Cloudflare/WAF/iptables; contempla Turnstile/CAPTCHA y plantea tres capas de defensa: CDN, API Gateway y tokens HMAC para recursos multimedia. También fija objetivos de `<1.5 ms` de overhead y `25.000 req/s` en Redis.

Hay material aprovechable, especialmente **defense in depth, rate limiting, protección de recursos multimedia y cuidado con falsos positivos por CGNAT**. Pero la frontera arquitectónica es incorrecta: Security no debería convertirse en un megaservicio síncrono que decide si cada request de toda la plataforma puede existir.
