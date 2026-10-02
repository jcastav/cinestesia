## 6.43. Security, Abuse Prevention & Trust Architecture

### a. Propósito general

Security será una **capacidad transversal de la plataforma**, no un dominio funcional centralizado.

Su propósito será:

> **Reducir la superficie de ataque, controlar el acceso, limitar abuso, proteger recursos internos y externos, detectar actividad anómala y preservar la confidencialidad, integridad y disponibilidad del sistema mediante controles distribuidos y defensa en profundidad.**

Por tanto:

```text
Security
≠
one service
```

Será:

```text
Security
=
Edge Controls
+
Identity Security
+
Authorization
+
Application Security
+
Media Access Control
+
Egress Security
+
Abuse Prevention
+
Secrets Management
+
Security Observability
```

---

### b. Principio fundamental: Defense in Depth

Conservamos y ampliamos una de las mejores ideas del original:

```text
Internet
   │
   ▼
EDGE SECURITY
   │
   ▼
TRANSPORT SECURITY
   │
   ▼
APPLICATION SECURITY
   │
   ▼
IDENTITY / AUTHORIZATION
   │
   ▼
DOMAIN SECURITY
   │
   ▼
DATA / SECRETS
   │
   ▼
EGRESS SECURITY
```

Ninguna capa individual constituye “la seguridad”.

---

### c. Security no será un request oracle central

Evitaríamos que toda petición haga:

```text
Request
   │
   ▼
POST /security/verify-request
   │
   ▼
Security Service
   │
   ├── PASS
   └── DENY
```

porque introduce:

```text
latency
network dependency
single point of failure
global blast radius
```

Si ese servicio falla:

```text
entire platform?
```

No queremos esa ambigüedad.

---

### d. Distribución de controles

La arquitectura será:

```text
                     INTERNET
                        │
                        ▼
                 EDGE / CDN / WAF
                        │
                        ▼
                REVERSE PROXY / API
                        │
          ┌─────────────┼─────────────┐
          │             │             │
          ▼             ▼             ▼
        AUTH         CORE API       GATEWAY
          │             │             │
          ▼             ▼             ▼
      Identity      Domain Auth    Media Tokens

                        │
                        ▼
                 INTERNAL SERVICES
                        │
                        ▼
                 EGRESS CONTROLS
                        │
                        ▼
               EXTERNAL PROVIDERS
```

Cada frontera aplica controles apropiados.

---

### e. Security Domains

Formalizaremos:

```text
SECURITY ARCHITECTURE
│
├── Edge Security
├── Transport Security
├── Identity & Session Security
├── Authorization
├── Application Security
├── Abuse Prevention
├── Media Access Security
├── Egress / SSRF Security
├── Data Protection
├── Secrets & Key Management
├── Administrative Security
├── Supply Chain Security
└── Security Observability & Response
```

No todos necesitan componentes independientes.

---

### f. Edge Security

Responsabilidad:

> Filtrar amenazas y tráfico abusivo antes de consumir recursos costosos de aplicación.

Puede incluir:

```text
DDoS mitigation
connection limits
basic bot filtering
request size limits
coarse rate limiting
WAF rules
TLS termination
```

según infraestructura.

---

### g. CDN/WAF es una capacidad, no una dependencia de marca

El original habla específicamente de Cloudflare.

Lo generalizamos:

```text
Edge Provider
```

podría ser cualquier solución adecuada.

La arquitectura no dependerá de:

```text
Cloudflare-specific semantics
```

salvo en adaptadores/configuración de despliegue.

---

### h. Transport Security

Baseline:

```text
HTTPS
```

para tráfico público.

Además:

```text
secure TLS configuration
redirect HTTP → HTTPS
secure cookies
HSTS when deployment is ready
```

según superficie.

---

### i. Internal Transport

No asumiremos:

```text
internal network = trusted
```

Las comunicaciones internas tendrán:

```text
service authentication
network policy
authorization
```

según sensibilidad.

En MVP de una sola máquina, muchas llamadas pueden incluso ser:

```text
in-process
```

y no requieren inventar mTLS entre módulos que viven en el mismo proceso.

---

### j. Identity Security

Ya está principalmente definida por el Motor 6:

```text
credentials
AuthSession
access token/session
refresh token
MFA
password reset
external identity
session revocation
```

Motor 10 no vuelve a implementar Auth.

---

### k. Authorization

La seguridad transversal exige:

```text
authenticate
       │
       ▼
AuthContext
       │
       ▼
authorize operation
       │
       ▼
Domain Action
```

Nunca:

```text
valid JWT
=
allowed to do everything
```

---

### l. Object-level Authorization

Especialmente importante:

```text
GET /users/{id}
POST /sources/{id}/disable
GET /reports/{id}
```

No basta comprobar:

```text
user authenticated
```

Hay que comprobar:

```text
may this actor perform this action on this resource?
```

Esto protege contra:

```text
IDOR / BOLA
```

---

### m. Domain Authorization

Algunas reglas no pueden vivir solamente en middleware.

Ejemplo:

```text
Moderator
```

puede tener permiso general:

```text
reports.moderate
```

pero quizá no:

```text
change admin role
```

La autorización final pertenece también a la operación de dominio.

---

### n. Application Security

Controles generales:

```text
input validation
output encoding
parameterized SQL
safe serialization
request size limits
content-type validation
secure error handling
dependency management
```

No construiremos un “sanitizador universal”.

Cada contexto tiene reglas diferentes.

---

### o. Validation Boundary

Cada entrada no confiable:

```text
HTTP request
external provider response
webhook
manifest
VAST XML
search query
uploaded metadata
admin input
```

debe atravesar validación apropiada.

---

### p. Client input is untrusted

Incluso si proviene de:

```text
our own frontend
```

seguirá siendo:

```text
untrusted input
```

El navegador no es una frontera de confianza.

---

### q. Mass Assignment

Como vimos en Admin:

```json
{
  "displayName": "X",
  "role": "admin"
}
```

no puede aceptarse porque el objeto tenga una propiedad `role`.

Usaremos:

```text
explicit DTOs
explicit commands
allowlisted fields
```

---

### r. SQL Injection

Baseline:

```text
parameterized queries
ORM/query builder used safely
```

Nunca:

```text
"SELECT ... WHERE id = '" + input + "'"
```

---

### s. Search Injection

Motor 7 ya define:

```text
Query Parser
+
structured SearchQuery
```

en lugar de entregar directamente sintaxis arbitraria al Search Engine.

---

### t. XSS

Superficies:

```text
catalog metadata
user-generated content
admin-entered text
ad creatives
external metadata
```

requieren:

```text
context-aware output encoding
CSP
HTML sanitization only where HTML is actually allowed
```

Por defecto:

```text
plain text
```

es preferible a HTML arbitrario.

---

### u. CSP

Podremos definir políticas distintas:

```text
Public Web CSP
Admin CSP
Player CSP
```

porque sus necesidades difieren.

Admin debería ser especialmente restrictivo.

---

### v. CSRF

Si usamos cookies para autenticación:

```text
SameSite
Origin validation
CSRF token where required
```

según arquitectura.

No asumiremos que:

```text
JWT
```

elimina automáticamente CSRF; depende de cómo se transporte.

---

### w. CORS

CORS será explícito:

```text
allowed origins
allowed methods
allowed headers
credentials policy
```

No:

```text
Access-Control-Allow-Origin: *
```

indiscriminadamente en endpoints autenticados.

---

### x. Security Headers

Según superficie:

```text
Content-Security-Policy
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
frame-ancestors
```

y otros controles pertinentes.

No todos los headers aplican idénticamente a todos los recursos.

---

### y. Abuse Prevention

Ahora sí recuperamos parte del Motor original.

Objetivo:

> **Evitar que un cliente consuma recursos de forma desproporcionada o utilice funcionalidades fuera de sus límites previstos.**

Incluye:

```text
rate limiting
quotas
concurrency limiting
request budgets
challenge mechanisms
abuse detection
```

---

### z. Rate Limit ≠ Security completa

Un atacante puede:

```text
distribute requests
```

y un usuario legítimo puede:

```text
send many valid requests
```

Así que:

```text
rate limiting
```

es solo una capa.

---

### aa. Rate-limit dimensions

Podemos aplicar límites según:

```text
route
account
AuthSession
anonymous session
network/IP
resource
provider
operation
```

dependiendo del endpoint.

No habrá necesariamente:

```text
one global IP limit
```

---

### ab. Endpoint-specific Policies

Ejemplo conceptual:

```text
LOGIN
→ strict credential abuse controls

SEARCH
→ query-rate limits

SOURCE REPORT
→ deduplication + rate limits

PLAYBACK SESSION CREATION
→ session creation limits

MEDIA GATEWAY
→ bandwidth/concurrency controls

ADMIN
→ privileged operation limits
```

Cada superficie tiene amenazas diferentes.

---

### ac. IP como señal, no identidad

El documento original ya reconoce correctamente el riesgo de bloquear usuarios legítimos detrás de universidades, redes corporativas o CGNAT.

Formalizamos:

> **IP address is a security signal, not a user identity.**

Puede utilizarse para:

```text
rate limiting
incident investigation
coarse abuse detection
```

pero con minimización y retención.

---

### ad. Permanent IP Blocklist

El original modela:

```sql
ip_blocklist
```

con bloqueo incluso permanente.

No la convertiremos en primitive central.

Preferiremos:

```text
temporary controls
progressive restrictions
account/session signals
provider-level edge rules
```

y bloqueos duraderos solo cuando exista una razón operacional clara.

---

### ae. Block Entry

Si existe una blocklist persistente, conceptualmente tendrá:

```text
subject type
subject value
reason
created_at
expires_at
created_by
scope
```

en lugar de asumir únicamente:

```text
IP
```

---

### af. Progressive Enforcement

Podemos pensar:

```text
NORMAL
   │
   ▼
RATE_LIMITED
   │
   ▼
CHALLENGE
   │
   ▼
TEMPORARILY_BLOCKED
```

según superficie.

No toda anomalía termina inmediatamente en:

```text
403 forever
```

---

### ag. Challenge

El original utiliza Turnstile/CAPTCHA.

Lo mantenemos como:

```text
optional challenge provider
```

para determinadas rutas y niveles de riesgo.

No será requisito de cada request.

---

### ah. CAPTCHA no como segunda contraseña

Un challenge puede reducir abuso automatizado, pero no sustituye:

```text
authentication
authorization
rate limiting
```

ni debe bloquear innecesariamente usuarios legítimos.

---

### ai. Risk Score

El original devuelve:

```json
{
  "risk_score": 0.82
}
```

No estableceremos un `0..1` global como verdad universal.

¿Por qué?

Porque:

```text
login abuse risk
≠
gateway abuse risk
≠
search abuse risk
```

---

### aj. Risk Decisions contextualizadas

Podremos tener:

```text
LoginAbuseDecision
SearchAbuseDecision
GatewayAbuseDecision
```

con señales específicas.

No necesariamente:

```text
GlobalUserRiskScore = 0.73192
```

---

### ak. Device Fingerprinting

El original incluye:

```text
JA3/JA4
```

en la evaluación.

No lo pondremos como baseline.

Fingerprinting implica:

```text
privacy considerations
false positives
infrastructure coupling
maintenance
```

Puede evaluarse posteriormente para seguridad concreta.

---

### al. User-Agent

También:

```text
User-Agent
```

puede ser una señal débil.

Es trivialmente modificable.

No debe considerarse prueba de identidad ni legitimidad.

---

### am. Media Access Security

Ahora una capa muy importante para nuestra arquitectura.

Gateway recibe:

```text
PlaybackSession
```

y debe verificar:

```text
session validity
expiry
authorization
resource scope
revocation
```

antes de entregar recursos.

---

### an. Playback Token

Recordemos:

```text
AuthSession
≠
PlaybackSession
```

y:

```text
PlaybackSession
≠
raw upstream URL
```

El Gateway trabaja con autorización temporal específica de playback.

---

### ao. Opaque Resource IDs

Ya decidimos:

```text
/v1/playback/{session}/resources/{resourceId}
```

en lugar de:

```text
/proxy?url=https://external.example/...
```

Esto reduce una superficie enorme.

---

### ap. Media Token Scope

Un token/sesión debe tener scope limitado.

Por ejemplo:

```text
PlaybackSession PS1
```

no autoriza:

```text
every media resource in the platform
```

solo los recursos asociados a esa sesión.

---

### aq. Expiration

Tokens:

```text
short-lived
```

y su TTL estará relacionado con:

```text
PlaybackSession
Playable Representation
```

No habrá tokens multimedia permanentes.

---

### ar. HMAC

El original asigna al Motor de Seguridad algoritmos HMAC usados por Gateway.

Corregimos:

> Gateway puede utilizar una primitive criptográfica compartida, pero Security no necesita ser un servicio remoto de firmado para cada request.

Podemos tener:

```text
SigningKeyProvider
TokenSigner
TokenVerifier
```

como infraestructura/librería segura.

---

### as. Key Rotation

Si usamos HMAC:

```text
kid
```

identifica la clave.

Conceptualmente:

```text
Key K1 active
Key K0 verification-only
```

durante rotación.

Después:

```text
K0 retired
```

---

### at. Secret isolation

Las claves nunca aparecen en:

```text
frontend
PlaybackSession public payload
logs
Admin ordinary configuration
```

Viven en:

```text
secret manager
environment/injected secret
protected runtime configuration
```

según despliegue.

---

### au. Hotlinking

El original busca impedir hotlinking.

Nuestra protección real será:

```text
short-lived session
+
resource authorization
+
opaque resource identifiers
+
Gateway validation
+
rate/concurrency controls
```

No dependeremos solo de:

```text
Referer
```

porque no es una frontera robusta de seguridad.

---

### av. Bandwidth Abuse

Gateway necesita controles diferentes al API.

Porque:

```text
1 API request
≈ KB
```

mientras:

```text
1 playback
≈ GB
```

Por tanto debemos controlar:

```text
concurrent streams
session creation
bandwidth
resource request patterns
```

según necesidad.

---

### aw. Gateway rate limiting

No será necesariamente:

```text
100 requests/minute
```

porque HLS legítimamente genera muchas requests de segmentos.

Mejor evaluar:

```text
session validity
concurrency
request pattern
bandwidth
resource scope
```

---

### ax. Egress Security

Esta es una de las piezas más importantes de toda la arquitectura.

Resolver, Gateway, Health y Discovery pueden realizar:

```text
server-side outbound requests
```

a destinos externos.

Eso crea:

```text
SSRF
```

como riesgo transversal.

---

### ay. Egress Trust Boundary

```text
OUR SYSTEM
    │
    ▼
EGRESS POLICY
    │
    ▼
PUBLIC NETWORK
```

No debemos dejar que cualquier input del usuario se convierta directamente en una request del servidor.

---

### az. URL Validation

Controles baseline:

```text
allowed schemes
host validation
port policy
DNS resolution validation
redirect validation
private/reserved address rejection
response size limits
timeouts
```

---

### ba. Schemes

Normalmente:

```text
https
http where explicitly required
```

No permitiremos arbitrariamente:

```text
file:
ftp:
gopher:
data:
```

en fetches de red.

---

### bb. Private Networks

Bloquear:

```text
loopback
private RFC1918 ranges
link-local
metadata endpoints
reserved ranges
```

según stack/IP version.

Incluyendo IPv6 equivalente.

---

### bc. Redirect SSRF

Validar solo:

```text
initial URL
```

no basta.

Ejemplo:

```text
https://public.example
       │
       ▼
302
       │
       ▼
http://127.0.0.1
```

Cada redirect debe revalidarse.

---

### bd. DNS Rebinding

También debemos considerar:

```text
hostname
   │
   ▼
safe IP
   │
later resolution
   ▼
private IP
```

La estrategia exacta dependerá del cliente HTTP/runtime.

Pero el riesgo queda explícitamente documentado.

---

### be. Response Limits

Un endpoint externo podría responder:

```text
500 GB
```

o nunca terminar.

Cada fetch necesita:

```text
connect timeout
header timeout
body timeout/deadline
max bytes
```

según propósito.

---

### bf. Different Egress Policies

No todos los motores necesitan las mismas capacidades.

Ejemplo:

```text
Resolver
→ provider endpoints

Gateway
→ resources belonging to Playable Representation

Health
→ controlled Source probes

Discovery
→ configured discovery targets
```

Esto permite políticas más restrictivas.

---

### bg. No arbitrary fetch API

Nunca expondremos algo como:

```http
GET /fetch?url=<anything>
```

ni internamente sin autorización/contexto.

Es exactamente el tipo de primitive que facilita SSRF.

---

### bh. Provider Allowlisting

Cuando sea posible:

```text
known Provider
    │
    ▼
allowed domains / policies
```

reduce superficie.

Pero los redirects igualmente requieren validación.

---

### bi. Data Protection

Clasificaremos datos conceptualmente:

```text
PUBLIC
INTERNAL
SENSITIVE
SECRET
```

Ejemplos:

```text
movie title → PUBLIC

internal Source metadata → INTERNAL

email / IP → SENSITIVE

password hash / signing key → SECRET
```

La clasificación concreta se documentará posteriormente.

---

### bj. Encryption at Rest

No inventaremos criptografía aplicación-campo por campo sin necesidad.

Primero:

```text
disk/storage encryption
database access control
backup protection
secret isolation
```

y cifrado adicional de campos cuando exista una amenaza/requisito concreto.

---

### bk. Password Hash

Como definimos:

```text
Argon2id
```

con parámetros calibrados y versionados.

Eso es hashing, no “encrypted password”.

Nunca debemos poder descifrar una contraseña.

---

### bl. Logging Security

Nunca registrar:

```text
password
refresh token
access token
PlaybackSession secret
signed media token
provider credential
authorization header
cookie contents
```

---

### bm. URL Logging

También cuidado con:

```text
full external URLs
```

porque pueden contener:

```text
tokens
signatures
credentials
```

Preferiremos:

```text
provider
host where safe
resource identifier
redacted URL
```

---

### bn. Structured Redaction

El logger debería soportar redacción sistemática:

```text
authorization
cookie
set-cookie
token
secret
password
signature
```

en lugar de depender de que cada desarrollador recuerde ocultarlos manualmente.

---

### bo. Error Responses

Cliente:

```json
{
  "error": "PLAYBACK_SESSION_INVALID"
}
```

No:

```text
SQLSTATE...
stack trace...
/home/server/src/...
secret...
```

Los detalles técnicos van a observabilidad interna.

---

### bp. Secrets Management

Tipos:

```text
database credentials
signing keys
provider credentials
OAuth secrets
ad provider secrets
SMTP credentials
```

No vivirán:

```text
committed in Git
frontend bundle
plain admin settings
```

---

### bq. Secret Rotation

El diseño deberá permitir:

```text
old credential
   ↓
new credential introduced
   ↓
services updated
   ↓
old credential revoked
```

sin reconstruir toda la arquitectura.

---

### br. Environment Separation

Idealmente:

```text
development
staging
production
```

tienen:

```text
different secrets
different databases
different external credentials
```

No compartiremos producción con desarrollo por comodidad.

---

### bs. Administrative Security

Motor 9 ya define:

```text
MFA
least privilege
audit
step-up
session revocation
optional network restrictions
```

Motor 10 simplemente los reconoce como parte de Defense in Depth.

---

### bt. Supply Chain Security

También debemos proteger:

```text
dependencies
container images
build pipeline
CI/CD credentials
```

porque una plataforma segura con una dependencia comprometida sigue siendo vulnerable.

---

### bu. Dependency Management

Baseline:

```text
lockfiles
version review
dependency vulnerability scanning
remove unused dependencies
controlled updates
```

sin asumir que cada CVE implica automáticamente explotación.

---

### bv. Container Security

Cuando usemos Docker:

```text
minimal images
non-root where practical
read-only filesystem where practical
drop unnecessary capabilities
resource limits
```

según componente.

Especialmente:

```text
Resolver
Gateway
Health Worker
```

por interactuar con red externa.

---

### bw. Runtime Isolation

Adapters que necesiten procesamiento activo no deben obtener automáticamente:

```text
filesystem
environment secrets
internal network
database
```

Podremos usar:

```text
process isolation
container sandbox
resource limits
```

si el riesgo lo justifica.

---

### bx. Database Security

Cada runtime debería tener:

```text
minimum necessary DB permissions
```

cuando la separación física lo permita.

Por ejemplo, un Gateway idealmente no necesita:

```text
UPDATE users
```

---

### by. Redis Security

Redis no será:

```text
publicly accessible database
```

Debe permanecer en red interna/controlada.

Además:

```text
TTL
memory limits
auth where applicable
```

según despliegue.

---

### bz. PostgreSQL Security

Baseline:

```text
network restriction
authentication
least privilege
encrypted transport where appropriate
backups
patching
```

---

### ca. Security Events

Crearemos eventos normalizados como:

```text
AUTH_LOGIN_FAILED
AUTH_SESSION_REVOKED
AUTH_REFRESH_REUSE_DETECTED

AUTHORIZATION_DENIED

RATE_LIMIT_TRIGGERED
CHALLENGE_REQUIRED

ADMIN_PRIVILEGED_ACTION

PLAYBACK_TOKEN_INVALID

SSRF_REQUEST_BLOCKED

SECRET_ROTATED
```

No todos serán domain events.

Muchos serán:

```text
security telemetry
```

---

### cb. Security Event ≠ Domain Event

Ejemplo:

```text
user.session.revoked
```

puede ser evento de dominio.

Mientras:

```text
rate_limit_triggered
```

es principalmente telemetría operacional.

No llenaremos el event bus de cada request bloqueada.

---

### cc. Security Logs

Campos conceptuales:

```text
timestamp
event
component
outcome
request_id
actor/session where applicable
reason_code
```

con datos sensibles minimizados.

---

### cd. SIEM

El documento original menciona formato SIEM.

Perfectamente válido posteriormente:

```text
Security Logs
     │
     ▼
Central Log Pipeline
     │
     ▼
SIEM / Detection
```

pero no necesitamos desplegar un SIEM empresarial para el MVP.

---

### ce. Security Metrics

Ejemplos:

```text
auth_login_failures_total

authorization_denied_total{
  operation
}

rate_limit_actions_total{
  policy,
  action
}

playback_token_validation_failures_total{
  reason
}

egress_requests_blocked_total{
  reason,
  component
}
```

con cardinalidad controlada.

---

### cf. No IP en labels

Nunca:

```text
blocked_requests_total{
  ip="190.x.x.x"
}
```

Los identificadores específicos viven en logs de seguridad con acceso/retención controlados.

---

### cg. Security Alerts

Ejemplos:

```text
credential abuse spike
admin authentication anomalies
mass authorization failures
provider credential failures
unusual Gateway traffic
SSRF blocks spike
```

Alertar sobre patrones, no sobre cada evento individual.

---

### ch. Detection vs Prevention

Diferenciamos:

```text
PREVENTIVE
```

por ejemplo:

```text
authorization
input validation
SSRF block
```

de:

```text
DETECTIVE
```

como:

```text
alerts
anomaly detection
audit
```

y:

```text
RESPONSIVE
```

como:

```text
revoke sessions
disable integration
rotate key
```

---

### ci. Incident Response

Flujo conceptual:

```text
Detection
   │
   ▼
Triage
   │
   ▼
Containment
   │
   ▼
Recovery
   │
   ▼
Review
```

No necesitamos un SOC para documentar estas fases.

---

### cj. Kill Switches

Podremos tener:

```text
registration disable
provider disable
gateway mode disable
ads disable
discovery automation disable
```

como controles operacionales.

Security puede recomendar su activación, pero el cambio se ejecuta mediante el dominio/Admin correspondiente.

---

### ck. Security no toma propiedad del sistema

Esto sigue nuestra filosofía de Health.

Security puede decir:

```text
Provider integration appears compromised
```

pero:

```text
Source Registry / Operations
```

gestiona el disable correspondiente.

---

### cl. False Positives

El documento original ya identifica este problema con IP compartida.

Nuestra política general será:

```text
uncertain signal
→ proportionate action
```

No:

```text
uncertain signal
→ permanent ban
```

---

### cm. Fail-open vs Fail-closed

No existe una respuesta universal.

Ejemplo:

```text
authorization service uncertain
→ fail closed
```

mientras:

```text
optional bot reputation provider unavailable
→ perhaps continue with local controls
```

según amenaza.

Cada control crítico documentará:

```text
failure behavior
```

---

### cn. Security Dependency Classification

Podremos clasificar:

```text
CRITICAL
IMPORTANT
OPTIONAL
```

Ejemplo:

```text
Authorization → CRITICAL

Gateway token verification → CRITICAL

CAPTCHA provider → OPTIONAL/CONTEXTUAL
```

Esto evita que una integración auxiliar tumbe toda la plataforma.

---

### co. Redis Failure

Si Redis almacena rate limits:

```text
Redis unavailable
```

¿Qué hacemos?

No podemos decidirlo globalmente.

Para login:

```text
more conservative fallback
```

podría ser apropiado.

Para búsqueda pública:

```text
local temporary limiter
```

o degradación.

Debe quedar en ADR.

---

### cp. Rate Limiter Implementation

El original fija:

```text
Redis Lua
```

para todas las evaluaciones.

Lo trataremos como opción.

MVP incluso puede usar:

```text
in-process limiter
```

si existe una sola instancia.

Cuando escalemos horizontalmente:

```text
Redis-backed distributed limiter
```

puede tener sentido.

---

### cq. Algorithms

Podremos elegir según caso:

```text
token bucket
leaky bucket
fixed window
sliding window
concurrency semaphore
```

No todo requiere Sliding Window.

---

### cr. Performance

Los objetivos originales de:

```text
<1.5 ms
25,000 req/s
```

se reclasifican como hipótesis históricas, no SLOs oficiales.

Mediremos por control:

```text
edge overhead
authorization overhead
rate limiter latency
token verification latency
egress validation latency
```

---

### cs. Security Budget

Lo importante será que:

```text
security control
```

no degrade innecesariamente:

```text
TTFF
API latency
Gateway throughput
```

pero nunca sacrificaremos un control crítico simplemente para alcanzar una cifra arbitraria.

---

### ct. Threat Modeling

Antes de implementar controles complejos, documentaremos:

```text
asset
trust boundary
threat
impact
control
residual risk
```

---

### cu. Ejemplo — Playback

```text
Asset:
Gateway bandwidth / authorized media access

Threat:
reused or fabricated playback token

Controls:
short TTL
signature/session validation
resource scope
rate/concurrency limits
revocation

Residual:
authorized user can still consume legitimate bandwidth
```

---

### cv. Ejemplo — Resolver

```text
Asset:
internal network

Threat:
SSRF through malicious Source URL

Controls:
Source Registry validation
egress policy
DNS/IP validation
redirect validation
timeouts
response limits
```

---

### cw. Ejemplo — Admin

```text
Asset:
platform control plane

Threat:
stolen admin session

Controls:
MFA
shorter privileged session
step-up
audit
session revocation
least privilege
optional network access layer
```

---

### cx. Threat Model per Motor

Cada motor crítico tendrá una pequeña sección:

```text
Threats
Trust Boundaries
Controls
Security Tests
```

en lugar de delegar todo a Motor 10.

Eso es precisamente lo que significa que Security sea transversal.

---

### cy. Testing — Application Security

Incluiremos:

```text
SQL injection
XSS
CSRF
IDOR/BOLA
mass assignment
authorization bypass
session fixation
token tampering
```

según superficie.

---

### cz. Testing — SSRF

Casos controlados:

```text
localhost
127.0.0.1
private IPv4
private IPv6
link-local
redirect to private IP
DNS changes
unsupported scheme
oversized response
timeout
```

en infraestructura propia de pruebas.

---

### da. Testing — Authentication

Como ya definimos:

```text
credential stuffing controls
expired session
revoked session
refresh reuse
password reset token reuse
external identity linking
privilege changes
```

---

### db. Testing — Gateway

```text
expired playback session
invalid signature
modified resource ID
cross-session resource access
revoked session
range abuse
concurrency limits
```

---

### dc. Testing — Rate Limits

Verificar:

```text
limit enforcement
window reset
concurrent requests
distributed behavior when applicable
false-positive scenarios
```

sin asumir que “exactamente N+1 siempre 429” para todos los algoritmos.

---

### dd. Dependency Scanning

CI podrá ejecutar:

```text
dependency vulnerability scan
secret scan
static analysis
```

como controles complementarios.

No reemplazan revisión ni testing.

---

### de. Secret Scanning

Especialmente:

```text
Git history
.env accidentally committed
API keys
private keys
```

Debe detectarse antes de deployment cuando sea posible.

---

### df. Security Baseline del MVP

Para MVP considero obligatorio:

```text
HTTPS
secure AuthSession
RBAC
server-side authorization
secure password hashing
CSRF protection where applicable
CORS policy
basic CSP/security headers
input validation
parameterized DB access
basic rate limiting
login abuse controls
Gateway session authorization
short-lived playback access
secret isolation
structured log redaction
strict SSRF controls
outbound timeouts/size limits
Admin audit
dependency/secret scanning
```

Esto sí es baseline.

---

### dg. MVP no necesita

No pondría inicialmente:

```text
machine-learning anomaly detection
JA3/JA4 fingerprint engine
central risk scoring service
enterprise SIEM
service mesh
mTLS everywhere
hardware HSM
global bot reputation platform
complex device fingerprinting
multi-region WAF synchronization
custom DDoS infrastructure
```

La mayoría serían prematuras.

---

### dh. Primera topología

```text
                         INTERNET
                            │
                            ▼
                      EDGE / CDN
                            │
                     TLS / WAF / Limits
                            │
                            ▼
                    REVERSE PROXY
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
           WEB APP        CORE API      GATEWAY
                             │             │
                     Auth / RBAC      Session Auth
                             │             │
                             ▼             ▼
                         DOMAIN         MEDIA
                             │
                             ▼
                         PostgreSQL
                             │
                             ▼
                      Internal Workers
                             │
                             ▼
                      EGRESS POLICY
                             │
                             ▼
                   External Integrations
```

---

### di. Trust Boundaries

Las marcaría explícitamente:

```text
TB-01 Internet → Edge

TB-02 Edge → Application

TB-03 Browser → Authenticated API

TB-04 Admin Browser → Admin API

TB-05 Core API → Internal Workers

TB-06 Gateway → External Media Origin

TB-07 Resolver → External Provider

TB-08 Health → External Provider

TB-09 Discovery → External Source

TB-10 Application → Data Stores
```

Esto será tremendamente útil cuando hagamos diagramas finales.

---

### dj. Feature Flags

Security flags deben usarse con cuidado.

Podrían existir:

```text
security_challenge_enabled
security_gateway_strict_limits_enabled
security_registration_restricted
```

pero:

```text
authorization_enabled=false
```

no debería ser un flag casual de producto.

---

### dk. Security Configuration

Mejor para parámetros:

```text
rate limit thresholds
token TTL
session TTL
request size limit
timeout
```

usar:

```text
validated configuration
```

no cientos de feature flags.

---

### dl. Kill Switch vs Feature Flag

Diferencia:

```text
Feature Flag
→ rollout/product behavior
```

```text
Kill Switch
→ emergency operational control
```

No son exactamente lo mismo aunque compartan infraestructura.

---

### dm. Criterios de aceptación

La arquitectura de seguridad MVP estará satisfecha cuando:

1. todo tráfico público sensible use transporte seguro;
2. AuthSession y PlaybackSession estén claramente separados;
3. autorización se aplique server-side;
4. exista protección contra acceso horizontal a recursos;
5. endpoints sensibles tengan rate limiting adecuado;
6. login tenga protección contra abuso;
7. Gateway valide cada PlaybackSession;
8. recursos multimedia estén limitados al scope de la sesión;
9. ningún endpoint permita proxy/fetch arbitrario;
10. Resolver aplique SSRF controls;
11. Gateway aplique SSRF controls;
12. Health aplique SSRF controls;
13. Discovery/Ingestion aplique egress controls;
14. redirects externos sean revalidados;
15. destinos privados/reservados sean bloqueados cuando corresponda;
16. requests externas tengan deadlines y límites;
17. secretos no aparezcan en frontend;
18. secretos no aparezcan en logs;
19. tokens/cookies sensibles sean redactados;
20. Admin use least privilege;
21. operaciones administrativas críticas sean auditadas;
22. inputs externos sean validados;
23. SQL use acceso parametrizado;
24. CORS y CSP tengan políticas explícitas;
25. exista una estrategia CSRF cuando se usen cookies;
26. IP no se trate como identidad;
27. un CAPTCHA externo no sea dependencia crítica global;
28. rate limiter tenga comportamiento definido ante fallo;
29. claves/tokens soporten expiración y rotación;
30. dependencias y secretos puedan analizarse en CI;
31. eventos de seguridad importantes puedan investigarse;
32. los controles críticos tengan pruebas automatizadas.

---

### dn. ADRs abiertas

### ADR-SEC-01 — Edge Provider

Evaluar infraestructura:

```text
CDN
WAF
DDoS protection
TLS
```

según deployment.

### ADR-SEC-02 — Rate Limiting Architecture

Definir transición:

```text
in-process
→
Redis/distributed
```

cuando exista escalamiento horizontal.

### ADR-SEC-03 — Rate Limit Policies

Definir políticas independientes para:

```text
Auth
Search
Reports
Playback Session
Gateway
Admin
```

### ADR-SEC-04 — Challenge Provider

Determinar si y dónde utilizar:

```text
Turnstile
CAPTCHA
other challenge
```

### ADR-SEC-05 — Playback Authorization

Formalizar:

```text
opaque server-side session
signed token
hybrid
```

y estrategia de revocación.

### ADR-SEC-06 — Signing Key Management

Definir:

```text
HMAC vs asymmetric
kid
rotation
storage
```

según topología.

### ADR-SEC-07 — Egress Enforcement

Determinar cuánto se aplica mediante:

```text
application library
network firewall
proxy
container network policy
```

### ADR-SEC-08 — Secret Management

Definir transición entre:

```text
secure environment injection
```

y un Secret Manager dedicado.

### ADR-SEC-09 — Security Logging

Definir:

```text
retention
redaction
access
centralization
```

### ADR-SEC-10 — Privileged Access

Coordinar con Admin:

```text
MFA
step-up
VPN/Zero Trust
session timeout
```

### ADR-SEC-11 — Security Failure Modes

Documentar individualmente:

```text
fail-open
fail-closed
degraded mode
```

para cada dependencia de seguridad.

### ADR-SEC-12 — Data Classification

Formalizar categorías y controles de:

```text
PUBLIC
INTERNAL
SENSITIVE
SECRET
```

---

### do. Arquitectura consolidada

```text
                            INTERNET
                               │
                               ▼
                    ┌────────────────────┐
                    │   EDGE SECURITY    │
                    │ CDN / WAF / DDoS   │
                    │ TLS / Rate Limits  │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ APPLICATION EDGE   │
                    │ Validation / CORS  │
                    │ Limits / Headers   │
                    └─────────┬──────────┘
                              │
             ┌────────────────┼─────────────────┐
             │                │                 │
             ▼                ▼                 ▼
      IDENTITY & ACCESS     CORE API       MEDIA GATEWAY
             │                │                 │
      AuthSession          Domain Auth     PlaybackSession
      Credentials          Validation      Resource Scope
      RBAC                 CSRF            Rate/Concurrency
             │                │                 │
             └────────────────┼─────────────────┘
                              │
                              ▼
                     INTERNAL SERVICES
                              │
                    Least Privilege
                              │
                              ▼
                   ┌────────────────────┐
                   │  EGRESS SECURITY   │
                   │ SSRF Protection    │
                   │ URL/DNS Validation │
                   │ Redirect Checks    │
                   │ Time/Size Limits   │
                   └─────────┬──────────┘
                             │
                             ▼
                    EXTERNAL PROVIDERS


        ───────────────── CROSS-CUTTING ─────────────────

        Secrets │ Audit │ Logs │ Metrics │ Alerts
        Key Rotation │ Dependency Security │ Incident Response
```

### Reglas maestras del Motor 10

Estas son las que dejaría como cierre:

> **1. Security es una propiedad transversal de la arquitectura, no un único servicio central.**

> **2. Ninguna señal aislada —IP, User-Agent, fingerprint, CAPTCHA o risk score— constituye identidad ni prueba suficiente de legitimidad.**

> **3. Authentication, Authorization, AuthSession y PlaybackSession resuelven problemas diferentes.**

> **4. Toda request server-side hacia recursos externos cruza una frontera de confianza y debe estar sometida a políticas de egress y protección SSRF.**

> **5. El navegador nunca constituye una frontera de confianza, aunque ejecute nuestro propio frontend.**

> **6. Los controles de abuso deben ser proporcionales a la superficie protegida; Search, Login y Media Gateway no tienen el mismo patrón legítimo de tráfico.**

> **7. Los secretos permanecen fuera del frontend, de logs ordinarios y de configuración administrativa general.**

> **8. Defense in Depth significa que el compromiso o fallo de una capa no debe eliminar todas las demás protecciones.**

> **9. Los mecanismos auxiliares de reputación o challenge no deben convertirse innecesariamente en dependencias críticas de toda la plataforma.**

> **10. La seguridad debe medirse y probarse, no declararse únicamente mediante tecnologías o headers.**

Y con esto hemos terminado una parte enorme del rediseño. Los diez bloques ya forman un sistema bastante distinto del documento inicial:

```text
                         PLATFORM

                ┌────── CONTROL PLANE ──────┐

                    Catalog
                       │
              Discovery / Ingestion
                       │
                 Source Registry
                       │
                  Source Health
                       │
               Playback Orchestrator
                       │
                 Source Resolver
                       │
                    Identity
                       │
            Search / Recommendations
                       │
              Admin Control Plane

                └────────────────────────────┘

                           │
                           ▼

                 ┌──── DATA PLANE ────┐

                    Media Gateway
                          │
                  Playback Session
                          │
                   Media Player Core

                 └────────────────────┘

                          │
                   Ad Coordination

────────────────────────────────────────────────────────

                CROSS-CUTTING CONCERNS

 Security │ Observability │ Audit │ Cache │ Queue
 Privacy │ Cost │ Reliability │ Feature Flags
```

Y ahora viene una sección que va a ser **gigantesca y muy importante: el Modelo de Datos**.

El modelo original comienza todavía con algo como:

```text
[Usuario] 1────N [Historial] N────1 [Episodio/Pelicula]
    │
    ├────N [Favorito]
    │
    └────N [Reporte]

[Episodio/Pelicula]
    │
    ├────N [Fuentes]
    └────N [Subtitulo]
```

y después define `Usuario`, `Contenido`, etc.

Eso ya no alcanza para representar lo que acabamos de diseñar. Ahora existen relaciones explícitas entre:

```text
MediaItem
Season
Episode

Provider
Source
Adapter
ResolutionAttempt

HealthObservation
SourceHealth
UserReport

User
Credential
ExternalIdentity
AuthSession
UserPreference
UserLibraryEntry
PlaybackProgress

PlaybackSession

AdProvider
AdPlacement
AdPolicy
AdSession

IngestionJob
DiscoveredCandidate

AuditEvent
```

y, sobre todo, tenemos que decidir **qué es persistente, qué es proyección, qué es efímero, qué pertenece a PostgreSQL y qué pertenece a Redis**.

Así que la siguiente revisión no debería consistir simplemente en “agregar unas tablas”. Vamos a reconstruir el **Modelo de Datos completo desde sus agregados, ownership, claves, cardinalidades, invariantes y lifecycle**, y después podremos derivar de él un ERD mucho más serio.


Sí. Ahora entramos en una de las secciones que más va a **consolidar todo lo anterior**: el modelo de datos.

El modelo original es bastante compacto: `Usuario`, `Contenido`, `Temporada`, `Episodio`, `Fuente`, `Subtitulo`, `Historial`, `Reporte` y `Anuncio`. Además, `Fuente` guarda `url_original`, `url_procesada`, `estado` y `prioridad`; `Historial` depende directamente de `episodio_id`; y `Contenido.tipo` todavía mezcla `pelicula`, `serie` y `anime`.

Eso funcionaba para la primera idea, pero ya no representa la arquitectura que diseñamos. Vamos a reemplazar **completamente la Sección 7**.
