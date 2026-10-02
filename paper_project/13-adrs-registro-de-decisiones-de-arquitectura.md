# 13. ADRs — ARCHITECTURE DECISION RECORDS

## 13.1 Propósito

Esta sección constituye el registro formal de las decisiones arquitectónicas relevantes del proyecto.

Un **Architecture Decision Record (ADR)** documenta una decisión que afecta de forma significativa la estructura, comportamiento, evolución, operación, seguridad o mantenibilidad de la plataforma.

El objetivo no es registrar cada decisión de implementación, sino conservar el razonamiento detrás de aquellas decisiones que podrían:

* afectar varios motores simultáneamente;
* imponer restricciones técnicas futuras;
* introducir dependencias importantes;
* modificar contratos entre componentes;
* afectar seguridad o disponibilidad;
* comprometer costos operativos;
* requerir migraciones posteriores;
* determinar la estrategia de evolución de la plataforma.

Los ADR complementan, pero no sustituyen, la arquitectura descrita en las secciones anteriores.

La relación entre ambos documentos es:

```text
Arquitectura
    ↓
Define cómo funciona el sistema
    ↓
ADR
    ↓
Explica por qué se tomó una decisión arquitectónica concreta
    ↓
Implementación
    ↓
Materializa esa decisión
```

Un ADR no debe utilizarse para justificar retrospectivamente una implementación accidental. Cuando una decisión es suficientemente importante para afectar la arquitectura, debe documentarse explícitamente.

---

## 13.2 Principios del registro ADR

Los ADR del proyecto siguen los siguientes principios:

1. **Las decisiones deben ser explícitas.**
2. **Las decisiones deben ser trazables a un problema concreto.**
3. **Debe documentarse el contexto que hizo necesaria la decisión.**
4. **Las alternativas relevantes deben quedar registradas cuando existan.**
5. **Las consecuencias deben incluir ventajas, costos y restricciones.**
6. **Una decisión puede ser provisional.**
7. **Una decisión puede cambiar posteriormente.**
8. **Cambiar una decisión no elimina su historial.**
9. **Las métricas deben utilizarse para sustituir hipótesis por evidencia.**
10. **Los ADR no deben utilizarse para justificar complejidad innecesaria.**
11. **Las decisiones de MVP deben favorecer simplicidad y reversibilidad.**
12. **Las decisiones de seguridad deben tratarse como restricciones arquitectónicas, no como mejoras opcionales.**

---

## 13.3 Estados de un ADR

Cada ADR tendrá uno de los siguientes estados:

| Estado       | Significado                                                         |
| ------------ | ------------------------------------------------------------------- |
| `PROPOSED`   | Decisión identificada, pero todavía no adoptada definitivamente.    |
| `ACCEPTED`   | Decisión adoptada y vigente.                                        |
| `SUPERSEDED` | La decisión fue reemplazada por otro ADR.                           |
| `DEPRECATED` | La decisión dejó de ser aplicable, pero se conserva como historial. |

Un ADR `PROPOSED` no debe interpretarse como una instrucción de implementación.

Un agente de código no debe implementar automáticamente una decisión únicamente porque aparezca documentada como `PROPOSED`.

---

## 13.4 Estructura estándar de un ADR

Cada ADR desarrollado deberá utilizar, como mínimo, la siguiente estructura:

```text
# ADR-ID — Título

Estado:
Fecha:
Versión afectada:

## Contexto

Problema o necesidad que origina la decisión.

## Decisión

Decisión adoptada.

## Alternativas consideradas

Alternativas relevantes y motivo por el cual no fueron seleccionadas.

## Justificación

Razones técnicas, operativas, de seguridad, costo o producto.

## Consecuencias

Efectos positivos, negativos y restricciones introducidas.

## Impacto

Motores, componentes o contratos afectados.

## Evolución / Revisión

Condiciones bajo las cuales la decisión debería revisarse.
```

No todos los ADR necesitan una sección extensa de alternativas. Cuando una alternativa sea irrelevante o no exista una decisión comparable, puede indicarse explícitamente.

---

# 13.5 Registro consolidado de ADR

Los ADR identificados durante el diseño se agrupan por dominio:

```text
Catalog
Source Registry
Source Resolver / Adapters
Playback Orchestrator
Media Gateway
Media Player
Identity / User
Search / Discovery
Health / Reliability
Admin / CMS
APIs / Contracts
DevOps / Operations
Cross-cutting / Security
```

La agrupación es organizativa. Un ADR puede afectar más de un motor.

# 13.5.1. Registro General de los ADRs (REGISTRO DE DECISIONES DE ARQUITECTURA)

## Motor de Catálogo
**ADR-CAT-01 --- Taxonomía extensible.** Determinar si ciertos tipos y
clasificaciones permanecerán como ENUM o evolucionarán hacia tablas
configurables.

**ADR-CAT-02 --- Personas y créditos.** Decidir cuándo normalizar
actores, directores, estudios y demás créditos en entidades propias.

**ADR-CAT-03 --- Búsqueda especializada.** Determinar mediante
mediciones cuándo PostgreSQL deja de ser suficiente y se justifica
Meilisearch, Typesense, Elasticsearch u otra solución.

**ADR-CAT-04 --- Internacionalización de metadatos.** Definir modelo
definitivo para títulos, sinopsis y otros campos traducibles.

**ADR-CAT-05 --- Colecciones y universos.** Evaluar soporte explícito
para sagas, franquicias, colecciones y relaciones entre obras.

**ADR-CAT-06 --- Contenido en vivo.** El modelo inicial se orientará a
VOD. LIVE_EVENT requerirá estudiar posteriormente scheduling, ventanas
temporales, estado de emisión y diferencias de playback.

**ADR-CAT-07 --- Versionado editorial.** Evaluar si el audit log resulta
suficiente o si determinadas entidades necesitan historial completo de
versiones.

## Motor de Fuentes
#### ADR-SRC-01 — Playback Target

Determinar si mantener referencias polimórficas:

```text
target_type + target_id
```

o crear una entidad explícita `playback_targets`.

#### ADR-SRC-02 — Adapter deployment

Determinar si los Adapters se compilan con Resolver o si posteriormente se necesita un mecanismo controlado de plugins.

Para el MVP:

> compilados y versionados junto con Resolver.

Mucho más sencillo y seguro.

#### ADR-SRC-03 — Resolution Cache

Determinar estrategia exacta de:

```text
TTL
refresh-ahead
stale representation
negative caching
```

a partir de comportamiento real.

#### ADR-SRC-04 — Circuit Breaker

Introducirlo cuando existan suficientes métricas para determinar ventanas y umbrales adecuados.

#### ADR-SRC-05 — Health derivation

Definir cómo convertir múltiples ResolutionAttempts y HealthObservations en:

```text
ACTIVE
DEGRADED
UNAVAILABLE
```

sin reaccionar excesivamente a fallos transitorios.

#### ADR-SRC-06 — Representation renewal

Definir mecanismo para renovar una representación que expira durante una Playback Session prolongada.

#### ADR-SRC-07 — Provider configuration

Determinar qué configuración vive en PostgreSQL, cuál en variables de entorno y cuál en Secret Manager.

## Media Gateway
#### ADR-GW-01 — Session representation

¿Sesiones completamente stateful en Redis o token firmado parcialmente autocontenido?

---

#### ADR-GW-02 — Delivery Modes

Determinar qué Providers permiten:

```text
DIRECT
GATEWAY_MANIFEST
FULL_PROXY
```

y bajo qué condiciones.

---

#### ADR-GW-03 — Runtime

Mantener Node.js mientras las métricas sean satisfactorias.

Evaluar Go/Rust únicamente con evidencia de cuello de botella.

---

#### ADR-GW-04 — CDN

Definir qué recursos pueden cachearse y qué política de cache key utilizar.

---

#### ADR-GW-05 — Session Renewal

Diseñar renovación transparente de representaciones de vida corta.

---

#### ADR-GW-06 — Range

Determinar política exacta de:

```text
single-range
multi-range
maximum range size
```

según necesidades reales.

---

#### ADR-GW-07 — Statelessness

Evaluar proporción entre estado almacenado en Redis y tokens autocontenidos.

---

#### ADR-GW-08 — Revocation

Determinar si la revocación se realiza mediante:

```text
session state
token blacklist
versioned session
```

o combinación.

---

## Media Player Core
### ADR-PLAYER-01 — Player framework

Evaluar definitivamente:

```text
Vidstack
custom UI + Hls.js
otra abstracción
```

según accesibilidad, control, bundle y mantenibilidad.

### ADR-PLAYER-02 — State management

Determinar si basta:

```text
React state/context
```

o si el Player Core necesita una state machine explícita implementada con otra herramienta.

La arquitectura no obliga todavía a una librería.

### ADR-PLAYER-03 — Recovery contract

Definir endpoint exacto para:

```text
recover playback session
```

y su idempotencia.

### ADR-PLAYER-04 — Timeline equivalence

Determinar cómo manejar Sources con duraciones/ediciones diferentes.

### ADR-PLAYER-05 — Anonymous storage

Evaluar:

```text
localStorage
vs
IndexedDB
```

para historial según volumen real.

### ADR-PLAYER-06 — Telemetry batching

Definir frecuencia, sampling y mecanismo de envío.

### ADR-PLAYER-07 — Native mobile/TV

Determinar cuánto Player Core conceptual puede compartirse y cuánto deberá reimplementarse por plataforma.

### ADR-PLAYER-08 — Ads integration

Definir interfaz formal entre Player Core y Ad Manager sin introducir VAST/VMAP dentro del núcleo de reproducción.

## Ad Manager
### ADR-ADS-01 — Client-side vs Server-side VAST Resolution

Determinar dónde resolver wrappers y normalizar VAST.

Probablemente:

```text id="d74zho"
server-side
```

ofrezca mejor control, pero deberá contrastarse con requisitos de los Providers.

### ADR-ADS-02 — Ad SDK

Evaluar si utilizaremos:

```text id="36rhr5"
custom VAST integration
```

o SDK compatible con el proveedor/estándar.

No fijarlo todavía.

### ADR-ADS-03 — Frequency Cap Authority

Determinar relación entre:

```text id="b8a18l"
client state
server state
```

para anónimos y autenticados.

### ADR-ADS-04 — Display Creative Isolation

Definir política exacta para:

```text id="hiz0kb"
iframe
image
third-party script
```

### ADR-ADS-05 — Consent

Definir arquitectura de consentimiento y señalización según despliegue y Providers.

### ADR-ADS-06 — Provider Selection

Empezar con:

```text id="fd4s5q"
priority / simple waterfall
```

y evaluar posteriormente sistemas más complejos.

### ADR-ADS-07 — Tracking Delivery

Decidir qué eventos se envían:

```text id="4j5nr0"
client → Provider
```

y cuáles:

```text id="83upem"
client → Ad Manager → Provider
```

según contratos, seguridad y medición.

### ADR-ADS-08 — Ad Media Delivery

Determinar si los creatives publicitarios se consumen directamente desde el CDN publicitario o necesitan una capa propia en casos concretos.

No reutilizar automáticamente Media Gateway.

## Identity Access
### ADR-USER-01 — Session Architecture

Decidir:

```text
opaque server-side session
```

vs:

```text
short-lived JWT + rotating refresh token
```

según topología real.

---

### ADR-USER-02 — JWT Signing

Si usamos JWT:

```text
algorithm
key management
rotation
issuer/audience
```

---

### ADR-USER-03 — Session Revocation

Comparar:

```text
short TTL
session lookup
blacklist
session version
```

sin asumir Redis blacklist por defecto.

---

### ADR-USER-04 — Playback Target Persistence

Decidir cómo garantizar integridad referencial entre:

```text
playback_progress
```

y diferentes tipos de Playback Target.

---

### ADR-USER-05 — Progress Conflict Resolution

Definir:

```text
out-of-order checkpoints
multiple devices
restart
seek backwards
completion
```

---

### ADR-USER-06 — Progress Write Path

Inicialmente:

```text
PostgreSQL UPSERT
```

y evaluar:

```text
Redis/Queue write-behind
```

solo si métricas justifican el cambio.

---

### ADR-USER-07 — External Identity Linking

Definir cómo vincular:

```text
password account
OAuth identity
passkey
```

sin introducir account takeover.

---

### ADR-USER-08 — User Preferences

Determinar qué preferencias son:

```text
device-local
```

y cuáles:

```text
account-synchronized
```

---

### ADR-USER-09 — Account Deletion & Retention

Formalizar eliminación, anonimización y retención por categoría de datos.

---

### ADR-USER-10 — Administrative Authentication

Determinar si cuentas:

```text
moderator/admin
```

requieren MFA/passkey u otras medidas adicionales.

---

## Search Discovery
### ADR-SEARCH-01 — PostgreSQL vs Dedicated Search Engine

Baseline:

```text
PostgreSQL FTS + pg_trgm
```

Migrar cuando existan razones medibles.

### ADR-SEARCH-02 — Dedicated Search Technology

Evaluar posteriormente:

```text
Meilisearch
Typesense
Elasticsearch/OpenSearch
```

según requisitos reales.

### ADR-SEARCH-03 — Index Synchronization

Comparar:

```text
direct DB projection
domain events
transactional outbox
CDC
```

cuando exista índice externo.

### ADR-SEARCH-04 — Multilingual Titles

Definir representación canónica de:

```text
localized titles
alternate titles
scripts
transliterations
```

### ADR-SEARCH-05 — Search Ranking

Formalizar señales y benchmark.

### ADR-SEARCH-06 — Search Analytics Privacy

Definir:

```text
query retention
sampling
access
anonymization
```

### ADR-REC-01 — Similarity Strategy

Comparar:

```text
metadata rules
weighted similarity
embeddings
```

### ADR-REC-02 — Personalized Recommendations

Definir cuándo el volumen de interacciones justifica personalización real.

### ADR-REC-03 — Vector Infrastructure

Decidir si futuros embeddings viven en:

```text
pgvector
search engine
specialized vector store
```

solo cuando aparezca necesidad.

### ADR-REC-04 — Recommendation Feedback

Definir eventos de:

```text
impression
click
playback
completion
dismiss
```

### ADR-REC-05 — Trending Algorithm

Formalizar:

```text
time window
decay
anti-abuse
signal weighting
```

---

## Source Health Reporting
### ADR-HEALTH-01 — Health State Derivation

Definir algoritmo:

```text id="4fttz3"
window
weights
thresholds
hysteresis
minimum sample
```

---

### ADR-HEALTH-02 — Observation Retention

Determinar cuánto conservar:

```text id="ck8tr1"
raw observations
aggregates
reports
incidents
```

---

### ADR-HEALTH-03 — Active Probe Strategy

Definir por Provider/Source:

```text id="qpgk8j"
HEAD
GET
manifest validation
limited segment validation
```

---

### ADR-HEALTH-04 — Probe Scheduling

Comparar:

```text id="psxbgk"
fixed interval
priority queue
adaptive scheduling
```

---

### ADR-HEALTH-05 — User Report Identity

Definir mecanismos de deduplicación para:

```text id="gshfo8"
anonymous
authenticated
```

sin depender exclusivamente de IP.

---

### ADR-HEALTH-06 — Provider Incident Detection

Definir:

```text id="g8d1cn"
window
minimum sample
threshold
recovery condition
```

---

### ADR-HEALTH-07 — Source Status Ownership

Formalizar exactamente cómo:

```text id="yp3us8"
Health Projection
```

actualiza o influye:

```text id="iqp8se"
Source Registry state
```

sin crear dos fuentes de verdad.

---

### ADR-HEALTH-08 — Manual Override

Definir precedencia entre:

```text id="y4v4sc"
automatic health
admin disable
security disable
compliance disable
```

---

### ADR-HEALTH-09 — Replenishment

Determinar cuándo:

```text id="m99h60"
source.health.unavailable
```

debe convertirse en:

```text id="8yx1yw"
discovery.replenishment.requested
```

según cobertura restante y demanda.

---

### ADR-HEALTH-10 — Notification Channels

Mantener desacoplados:

```text id="fvx50l"
Discord
Telegram
Email
Admin UI
```

del motor de Health.

---

## Administration CMS
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

## Security Abuse Prevention
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

## Modelo de Datos
### ADR-DATA-01 — Playback Target Persistence

Elegir entre:

```text
polymorphic media_item_id / episode_id
```

o una futura:

```text
media_units
```

Mi baseline para MVP sigue siendo la primera.

### ADR-DATA-02 — PostgreSQL Schemas

Evaluar:

```text
single public schema
```

vs:

```text
catalog.*
source.*
identity.*
...
```

### ADR-DATA-03 — Database Enum Strategy

Elegir:

```text
PostgreSQL ENUM
```

vs:

```text
VARCHAR + CHECK
```

por categoría.

### ADR-DATA-04 — Source Reference Storage

Definir representación segura de:

```text
SourceReference
```

según Provider.

### ADR-DATA-05 — Health Retention

Definir retención de:

```text
HealthObservation
ResolutionAttempt
```

y agregación histórica.

### ADR-DATA-06 — Auth Session Storage

Decidir:

```text
PostgreSQL
Redis
hybrid
```

según arquitectura de Motor 6.

### ADR-DATA-07 — PlaybackSession Storage

Baseline:

```text
Redis
```

pero formalizar recuperación y comportamiento ante pérdida.

### ADR-DATA-08 — User Deletion

Definir:

```text
deletion
anonymization
retention
```

por entidad.

### ADR-DATA-09 — External Assets

Decidir estrategia de:

```text
poster
backdrop
avatar
subtitle
```

y object storage.

### ADR-DATA-10 — Search Projection

Decidir cuándo PostgreSQL deja de ser suficiente y se introduce motor especializado.

### ADR-DATA-11 — Analytics Storage

Definir cuándo eventos de:

```text
Player
Gateway
Ads
Search
```

salen del OLTP principal.

### ADR-DATA-12 — Outbox

Determinar qué eventos requieren entrega confiable mediante transactional outbox.

### ADR-DATA-13 — Audit Storage

Definir evolución desde PostgreSQL a almacenamiento adicional append-only/WORM si se justifica.

### ADR-DATA-14 — Cross-domain Foreign Keys

Formalizar cuáles mantenemos mientras exista una DB compartida y cómo evolucionarían si algún módulo se separa.

### ADR-DATA-15 — Taxonomy

Formalizar:

```text
genres
tags
origin
anime classification
content collections
```

sin convertir cada clasificación en un `media_type`.

---

## APIs
### ADR-08.1 — API Versioning

Definir estrategia de `/v1`, compatibilidad y deprecación.

### ADR-08.2 — API Response Envelope

Determinar qué respuestas utilizarán envelope común y cuáles utilizarán semántica HTTP directa.

### ADR-08.3 — Playback Session Contract

Definir el esquema definitivo de `PlaybackSession`.

### ADR-08.4 — Playback Recovery Contract

Definir errores recuperables, posición y preservación de estado.

### ADR-08.5 — Source Switch Contract

Definir cambio manual de Source y sus condiciones de compatibilidad.

### ADR-08.6 — Media Gateway Resource Model

Definir `resourceId`, sesión y resolución server-side.

### ADR-08.7 — API Authentication

Definir JWT, sesiones opacas, cookies y refresh tokens.

### ADR-08.8 — Internal Service Authentication

Definir autenticación entre Core API, Resolver, Health y workers.

### ADR-08.9 — Idempotency

Definir qué comandos requieren `Idempotency-Key` y cómo se almacenan las respuestas.

### ADR-08.10 — Pagination

Definir page-based versus cursor-based pagination.

### ADR-08.11 — Error Taxonomy

Definir códigos estables y correspondencia HTTP.

### ADR-08.12 — OpenAPI Governance

Definir cómo se versionan y validan los contratos.

### ADR-08.13 — Anonymous Playback

Definir qué parte de Playback puede ejecutarse sin autenticación.

### ADR-08.14 — Anonymous Progress Reconciliation

Definir cómo se combina el progreso local y el progreso remoto.

### ADR-08.15 — API Gateway / BFF Boundary

Definir qué responsabilidades pertenecen al BFF y cuáles permanecen en módulos internos.

## DevOps
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

# 13.6 ADR-CAT-01 — Modelo canónico de contenido

**Estado:** `ACCEPTED`

### Contexto

La plataforma necesita representar películas, series, episodios, documentales, cortos, conciertos, clips y otros contenidos audiovisuales sin depender del proveedor que los distribuya.

Un contenido puede tener múltiples Sources y una Source puede cambiar sin que cambie la identidad del contenido.

### Decisión

El catálogo utilizará una entidad canónica de contenido independiente de las Sources.

La identidad del contenido será responsabilidad del Catalog y no de los proveedores externos.

El modelo distinguirá como mínimo:

* `media_items`;
* `seasons`;
* `episodes`;
* `media_external_ids`.

### Justificación

Evita duplicar contenido cuando existen múltiples fuentes y permite reemplazar Sources sin alterar la identidad editorial.

### Consecuencias

**Positivas:**

* catálogo independiente de proveedores;
* múltiples Sources por contenido;
* búsqueda y recomendaciones sobre entidades canónicas;
* reemplazo de Sources sin alterar el contenido.

**Negativas:**

* requiere reconciliación de identificadores externos;
* la ingestión debe resolver posibles duplicados.

### Impacto

Catalog, Search, Discovery, Source Registry, Playback Orchestrator, Admin/CMS.

---

# 13.7 ADR-CAT-02 — Separación entre publicación y disponibilidad técnica

**Estado:** `ACCEPTED`

### Contexto

Un contenido puede estar publicado editorialmente aunque temporalmente no tenga una Source disponible.

### Decisión

La publicación editorial del contenido será independiente de la disponibilidad técnica de sus Sources.

El Catalog no eliminará automáticamente un contenido porque sus Sources estén temporalmente `UNAVAILABLE`.

### Justificación

La disponibilidad de una Source es una condición técnica mutable y no debe modificar la identidad editorial.

### Consecuencias

El usuario puede encontrar contenido que temporalmente no pueda reproducirse.

La interfaz deberá distinguir adecuadamente:

```text
Contenido publicado
        +
Sin fuente disponible actualmente
```

---

# 13.8 ADR-CAT-03 — Identificadores externos del contenido

**Estado:** `ACCEPTED`

### Contexto

La plataforma puede integrar contenido proveniente de múltiples fuentes y sistemas externos.

### Decisión

Los identificadores externos se almacenarán separadamente mediante `media_external_ids`.

El identificador externo no será utilizado como identidad primaria de `media_items`.

### Consecuencias

La plataforma puede asociar múltiples identificadores externos al mismo contenido sin acoplar el modelo canónico a un proveedor concreto.

---

# 13.9 ADR-CAT-04 — Taxonomía audiovisual extensible

**Estado:** `ACCEPTED`

### Contexto

El proyecto no se limita a una única categoría audiovisual.

### Decisión

El catálogo utilizará una taxonomía extensible basada inicialmente en:

```text
movie
series
documentary
short
concert
clip
special
other
```

La incorporación de nuevos tipos deberá realizarse mediante una decisión explícita cuando tenga impacto sobre el dominio.

### Consecuencia

La arquitectura evita asumir que toda entidad reproducible es una película o episodio.

---

# 13.10 ADR-SRC-01 — Separación entre Source y Playable Representation

**Estado:** `ACCEPTED`

### Contexto

Una Source persistente puede producir diferentes representaciones reproducibles dependiendo de su estado, protocolo, resolución, tracks o sesión.

### Decisión

Se distinguirán:

```text
Source
    ↓
Resolution
    ↓
Playable Representation
```

`Source` representa el origen registrado.

`Playable Representation` representa el resultado efímero de resolver una Source para un contexto de reproducción determinado.

### Consecuencia

Las representaciones no necesitan convertirse automáticamente en entidades persistentes.

---

# 13.11 ADR-SRC-02 — Registro de adapters mediante Strategy + Factory

**Estado:** `ACCEPTED`

### Contexto

Cada proveedor puede requerir una estrategia diferente de resolución.

### Decisión

El Resolver utilizará un registro de adapters basado conceptualmente en:

```text
AdapterRegistry
    ↓
canHandle(source)
    ↓
resolve(source, context)
```

El patrón combinará Strategy para el comportamiento de cada adapter y Factory/Registry para seleccionar la implementación adecuada.

### Consecuencia

Agregar un proveedor no requiere modificar el núcleo del Resolver siempre que pueda integrarse mediante el contrato existente.

---

# 13.12 ADR-SRC-03 — Contrato de resolución normalizado

**Estado:** `ACCEPTED`

### Decisión

Todo adapter deberá producir un resultado normalizado independientemente de la estructura interna del proveedor.

Contrato conceptual:

```text
resolve(Source, ResolutionContext)
        ↓
ResolutionResult
```

El resultado puede contener:

* protocolo;
* manifest;
* recursos;
* tracks;
* calidad;
* expiración;
* capacidades;
* errores normalizados.

### Consecuencia

El Orchestrator no necesita conocer detalles específicos de cada proveedor.

---

# 13.13 ADR-SRC-04 — El Resolver no selecciona Sources

**Estado:** `ACCEPTED`

### Decisión

El Resolver no será responsable de:

* elegir la mejor Source;
* realizar fallback entre Sources;
* decidir prioridad;
* gestionar preferencias del usuario;
* transportar el contenido.

Su responsabilidad será exclusivamente transformar una Source en una representación reproducible o producir un error normalizado.

### Consecuencia

La selección permanece en Playback Orchestrator.

---

# 13.14 ADR-SRC-05 — Fallos de acceso no disponibles

**Estado:** `ACCEPTED`

### Contexto

Una Source puede existir en el catálogo pero no ser accesible técnicamente en un momento determinado.

### Decisión

El Resolver utilizará errores normalizados, incluyendo:

```text
ACCESS_NOT_AVAILABLE
```

El Orchestrator podrá intentar otra Source compatible.

### Consecuencia

La indisponibilidad de una Source no debe convertirse automáticamente en un error fatal de reproducción.

---

# 13.15 ADR-SRC-06 — Adapters compilados en MVP

**Estado:** `PROPOSED`

### Contexto

El proyecto necesita determinar cómo se desplegarán los adapters.

### Decisión propuesta

Durante MVP, los adapters serán módulos compilados y versionados junto con Resolver.

No se utilizará un sistema de plugins dinámicos.

### Justificación

Reduce:

* complejidad de despliegue;
* superficie de ataque;
* incompatibilidades de runtime;
* problemas de versionado.

### Consecuencia

Agregar un adapter requiere desplegar una nueva versión del Resolver.

### Revisión

La decisión podrá revisarse cuando exista evidencia de que la frecuencia de cambios, cantidad de adapters o necesidades operativas justifican separación independiente.

---

# 13.16 ADR-SRC-07 — Caché de resoluciones

**Estado:** `PROPOSED`

### Contexto

La resolución puede ser costosa y algunos proveedores producen resultados reutilizables durante un período limitado.

### Decisión propuesta

Se podrá utilizar caché de resultados de resolución, siempre limitado por la expiración real de la representación o por un TTL máximo seguro.

Nunca se asumirá que una URL externa tiene validez indefinida.

### Consecuencia

El sistema debe respetar:

```text
TTL efectivo = min(TTL configurado, expiración conocida)
```

cuando la expiración sea conocida.

---

# 13.17 ADR-SRC-08 — Retries y deadlines del Resolver

**Estado:** `ACCEPTED`

### Decisión

Las operaciones de resolución utilizarán:

* timeout;
* deadline total;
* número máximo de reintentos;
* backoff;
* jitter;
* límites de concurrencia por proveedor.

Los retries no serán ilimitados.

### Justificación

Evita que una dependencia externa lenta produzca acumulación de trabajo y saturación del Resolver.

---

# 13.18 ADR-SRC-09 — Protección SSRF en resolución

**Estado:** `ACCEPTED`

### Decisión

Todo acceso del Resolver a URLs externas deberá aplicar validación SSRF.

Como mínimo se considerarán:

* esquemas permitidos;
* hosts válidos;
* resolución DNS;
* IPs privadas;
* loopback;
* link-local;
* rangos reservados;
* redirecciones;
* timeouts;
* límites de tamaño;
* políticas de egress.

### Consecuencia

Una Source maliciosa no podrá convertir al Resolver en un proxy arbitrario hacia infraestructura interna.

---

# 13.19 ADR-SRC-10 — CAPTCHA y mecanismos anti-bot

**Estado:** `ACCEPTED`

### Decisión

El sistema no incluirá como requisito arquitectónico mecanismos destinados a evadir CAPTCHA, Cloudflare u otros controles anti-bot.

Cuando una integración autorizada no pueda ser utilizada, el Resolver registrará la imposibilidad mediante un error normalizado y el Orchestrator podrá intentar otra Source.

### Consecuencia

La disponibilidad de una Source depende de que su integración sea técnicamente y legalmente utilizable bajo las condiciones establecidas para el proyecto.

---

# 13.20 ADR-ORCH-01 — Playback Orchestrator como autoridad de selección

**Estado:** `ACCEPTED`

### Decisión

Playback Orchestrator será responsable de:

* obtener Sources;
* evaluar disponibilidad;
* considerar Health;
* considerar calidad;
* considerar idioma;
* considerar capacidades;
* seleccionar Source;
* solicitar resolución;
* crear PlaybackSession;
* gestionar fallback;
* procesar cambio manual de Source.

### Regla

```text
Orchestrator decide.
Resolver resuelve.
Gateway transporta.
Player reproduce.
```

---

# 13.21 ADR-ORCH-02 — Player no selecciona Sources

**Estado:** `ACCEPTED`

### Decisión

El Player no recibirá una lista de URLs crudas para decidir cuál reproducir.

El flujo será:

```text
Player
  ↓
Playback Session
  ↓
Backend
  ↓
Orchestrator
  ↓
Source + Resolver
```

### Consecuencia

La lógica de selección permanece centralizada y puede evolucionar sin actualizar el cliente.

---

# 13.22 ADR-ORCH-03 — PlaybackSession como contrato de reproducción

**Estado:** `ACCEPTED`

### Decisión

La reproducción se representará mediante `PlaybackSession`.

La sesión contendrá contexto autorizado para reproducir el contenido, incluyendo un entrypoint o recursos opacos.

El cliente no recibirá innecesariamente:

* credenciales;
* secretos;
* URLs internas;
* detalles de adapters;
* información operacional privada.

### Consecuencia

PlaybackSession funciona simultáneamente como:

* contrato de integración;
* contexto de reproducción;
* frontera de seguridad.

---

# 13.23 ADR-ORCH-04 — Recuperación mediante nueva sesión

**Estado:** `ACCEPTED`

### Decisión

Cuando la Source actual falle de forma recuperable, el cliente solicitará recuperación al backend.

El Orchestrator podrá seleccionar una Source alternativa y generar una nueva PlaybackSession.

El Player conservará el contexto de reproducción necesario, especialmente `currentTime`.

### Consecuencia

El Player no implementará su propio algoritmo de selección de Sources.

---

# 13.24 ADR-ORCH-05 — Cambio manual de Source mediante backend

**Estado:** `ACCEPTED`

### Decisión

El cambio manual de Source seguirá el mismo camino arquitectónico que la recuperación automática:

```text
Player
    ↓
switch-source
    ↓
Orchestrator
    ↓
Source Registry / Health / Resolver
    ↓
PlaybackSession
    ↓
Player
```

### Consecuencia

La selección manual no crea un segundo mecanismo de reproducción paralelo.

---

# 13.25 ADR-GW-01 — Media Gateway como Data Plane

**Estado:** `ACCEPTED`

### Decisión

Media Gateway será responsable del transporte de recursos autorizados de reproducción.

No será responsable de:

* descubrir Sources;
* seleccionar Sources;
* resolver Sources;
* catalogar contenido;
* ejecutar fallback;
* decidir preferencias.

### Regla

```text
Control Plane → decide qué reproducir
Data Plane → transporta lo autorizado
```

---

# 13.26 ADR-GW-02 — No aceptar URLs arbitrarias

**Estado:** `ACCEPTED`

### Decisión

Los endpoints del Gateway no aceptarán una URL externa arbitraria enviada por el cliente como mecanismo para iniciar una reproducción.

Se utilizarán identificadores opacos asociados a una PlaybackSession y a recursos previamente autorizados.

### Justificación

Reduce la superficie de SSRF, abuso como proxy abierto y acceso no autorizado.

---

# 13.27 ADR-GW-03 — Modos de entrega

**Estado:** `PROPOSED`

### Contexto

No todos los contenidos requieren necesariamente el mismo mecanismo de transporte.

### Decisión propuesta

La arquitectura contempla:

```text
DIRECT
GATEWAY_MANIFEST
FULL_PROXY
REDIRECT
```

pero el MVP no implementará necesariamente todos los modos.

La selección final dependerá del comportamiento real de los proveedores, requisitos de seguridad y características del contenido.

---

# 13.28 ADR-GW-04 — Reescritura estructural de manifests

**Estado:** `ACCEPTED`

### Decisión

Cuando el Gateway deba modificar un manifest HLS, deberá realizar parsing estructural en lugar de aplicar sustituciones textuales frágiles.

Se validarán también las URLs resultantes.

### Consecuencia

La lógica de reescritura queda preparada para:

* playlists;
* segmentos;
* sub-playlists;
* recursos asociados;
* atributos URI relevantes.

---

# 13.29 ADR-GW-05 — Recursos opacos y tokens de corta duración

**Estado:** `ACCEPTED`

### Decisión

Los recursos reproducibles podrán exponerse mediante identificadores opacos y tokens de duración limitada.

Los tokens deberán permitir:

* expiración;
* validación de contexto;
* revocación cuando sea necesaria;
* rotación de claves cuando corresponda.

### Consecuencia

El cliente no necesita conocer directamente la infraestructura de origen.

---

# 13.30 ADR-GW-06 — Streaming con backpressure

**Estado:** `ACCEPTED`

### Decisión

El Gateway utilizará streaming real y backpressure.

Debe soportar:

* cancelación;
* timeouts;
* cierre de conexión;
* propagación controlada de errores;
* límites de recursos.

### Consecuencia

Un cliente lento no debe provocar consumo ilimitado de memoria en el servidor.

---

# 13.31 ADR-GW-07 — Cache del Gateway

**Estado:** `PROPOSED`

### Contexto

La caché de segmentos puede reducir tráfico hacia determinados orígenes, pero puede introducir costos de almacenamiento, problemas de invalidación y riesgos de servir contenido incorrecto.

### Decisión propuesta

No se utilizará una política global de caché agresiva en MVP.

La caché de segmentos podrá introducirse posteriormente cuando exista evidencia de:

* repetición suficiente;
* ahorro real de egress;
* compatibilidad con derechos/permisos;
* comportamiento estable del contenido;
* beneficio económico u operativo.

---

# 13.32 ADR-GW-08 — Capacidad medida por tráfico y concurrencia

**Estado:** `ACCEPTED`

### Decisión

La capacidad del Gateway no será evaluada únicamente mediante RPS.

Se utilizarán también:

* viewers concurrentes;
* bitrate promedio;
* conexiones activas;
* ancho de banda;
* TTFB;
* throughput;
* duración de sesiones;
* desconexiones.

### Consecuencia

La planificación de capacidad se realizará sobre el perfil real de reproducción.

---

# 13.33 ADR-PLAYER-01 — Player reproduce PlaybackSessions

**Estado:** `ACCEPTED`

### Decisión

La responsabilidad del Media Player Core es reproducir una PlaybackSession.

No es responsabilidad del Player:

* descubrir Sources;
* resolver Sources;
* seleccionar proveedores;
* consultar Health;
* manejar credenciales de proveedores;
* construir URLs internas;
* ejecutar fallback entre Sources.

---

# 13.34 ADR-PLAYER-02 — Abstracción del motor de reproducción

**Estado:** `ACCEPTED`

### Decisión

Playback Engine se mantendrá abstraído de la UI.

El sistema podrá utilizar:

* `HTMLMediaElement`;
* Hls.js;
* capacidades nativas del navegador;
* futuros motores compatibles.

### Consecuencia

La UI y los controladores de reproducción no quedan acoplados directamente a una biblioteca concreta.

---

# 13.35 ADR-PLAYER-03 — Capability Detection

**Estado:** `ACCEPTED`

### Decisión

La compatibilidad se determinará mediante detección de capacidades reales del entorno, no mediante listas rígidas de navegadores.

### Consecuencia

El Player podrá elegir estrategias compatibles con:

* HLS nativo;
* MSE;
* codecs;
* audio;
* subtítulos;
* otras capacidades disponibles.

---

# 13.36 ADR-PLAYER-04 — Estado de reproducción explícito

**Estado:** `ACCEPTED`

### Decisión

El Player utilizará una máquina de estados explícita:

```text
IDLE
INITIALIZING
LOADING
READY
PLAYING
PAUSED
BUFFERING
ENDED
ERROR
RECOVERING
```

Además, `PlaybackState` y `SessionState` permanecerán conceptualmente separados.

### Consecuencia

Los errores y transiciones no dependerán únicamente de múltiples booleanos dispersos.

---

# 13.37 ADR-PLAYER-05 — Recovery local vs recovery de Source

**Estado:** `ACCEPTED`

### Decisión

El Player podrá ejecutar recuperación local para problemas transitorios del motor, pero no seleccionará una nueva Source por sí mismo.

La recuperación de Source pertenece al backend.

### Consecuencia

Se evita duplicar la lógica del Orchestrator en el cliente.

---

# 13.38 ADR-PLAYER-06 — Quality Rendition != Source

**Estado:** `ACCEPTED`

### Decisión

El sistema distinguirá:

```text
Source
    ≠
Quality Rendition
```

Una Source puede proporcionar múltiples renditions de calidad.

El cambio de calidad dentro de la misma representación no implica necesariamente cambio de Source.

---

# 13.39 ADR-ADS-01 — Ads separados de disponibilidad de contenido

**Estado:** `ACCEPTED`

### Decisión

El sistema publicitario será un subsistema desacoplado de la disponibilidad del contenido.

Una falla de publicidad no debe impedir la reproducción del contenido cuando este se encuentre disponible.

### Invariante

```text
Ad failure ≠ Content failure
```

---

# 13.40 ADR-ADS-02 — Fail-open publicitario

**Estado:** `ACCEPTED`

### Decisión

Ante:

* timeout;
* no-fill;
* error técnico;
* proveedor indisponible;
* creative inválida;

el sistema deberá continuar hacia el contenido cuando corresponda.

### Consecuencia

La monetización no se convierte en dependencia crítica del playback.

---

# 13.41 ADR-ADS-03 — Procesamiento VAST/VMAP controlado

**Estado:** `ACCEPTED`

### Decisión

Los procesadores VAST/VMAP deberán imponer:

* profundidad máxima de wrappers;
* detección de loops;
* límite de bytes;
* deadline;
* cantidad máxima de redirecciones;
* validación SSRF en fetch server-side.

---

# 13.42 ADR-USER-01 — Separación Identity / Profile / Library

**Estado:** `ACCEPTED`

### Decisión

La arquitectura separará conceptualmente:

```text
Identity & Access
User Profile & Preferences
User Library & Playback History
```

Aunque inicialmente puedan desplegarse dentro del mismo Core API.

### Consecuencia

La separación lógica no obliga a introducir microservicios.

---

# 13.43 ADR-USER-02 — AuthSession separada de PlaybackSession

**Estado:** `ACCEPTED`

### Decisión

`AuthSession` y `PlaybackSession` representan conceptos diferentes.

```text
AuthSession
→ identidad y acceso del usuario

PlaybackSession
→ autorización y contexto de reproducción
```

No se utilizará una como sustituto de la otra.

---

# 13.44 ADR-USER-03 — Progreso como checkpoint

**Estado:** `ACCEPTED`

### Decisión

El progreso persistido representa el último checkpoint relevante del usuario.

No se almacenará cada evento de reproducción como historial permanente durante MVP.

### Consecuencia

Se reduce volumen de escritura y se mantiene clara la diferencia entre:

```text
Playback Telemetry
vs
Playback Progress
```

---

# 13.45 ADR-USER-04 — Persistencia anónima local

**Estado:** `ACCEPTED`

### Decisión

Los usuarios anónimos podrán conservar determinadas preferencias y progreso localmente.

La cuenta autenticada utilizará persistencia server-side.

Se podrá considerar posteriormente un mecanismo explícito de merge.

---

# 13.46 ADR-USER-05 — Credenciales de usuario

**Estado:** `ACCEPTED`

### Decisión

Las contraseñas deberán almacenarse mediante un algoritmo moderno de hashing resistente a ataques offline, con Argon2id como estrategia prevista.

Los tokens de refresh serán de alta entropía y no se almacenarán en texto plano cuando se persistan server-side.

---

# 13.47 ADR-SEARCH-01 — Catálogo como Source of Truth de búsqueda

**Estado:** `ACCEPTED`

### Decisión

El índice de búsqueda será una proyección reconstruible.

El Catalog seguirá siendo la fuente de verdad.

```text
Catalog
   ↓ eventos
Search Projection
   ↓
Search API
```

### Consecuencia

El índice puede reconstruirse sin perder la información canónica.

---

# 13.48 ADR-SEARCH-02 — PostgreSQL FTS + pg_trgm para MVP

**Estado:** `ACCEPTED`

### Decisión

MVP utilizará capacidades de PostgreSQL, incluyendo búsqueda textual y similitud mediante `pg_trgm`, antes de introducir un motor de búsqueda especializado.

### Justificación

Reduce infraestructura inicial y es suficiente para el volumen esperado durante las primeras fases.

---

# 13.49 ADR-SEARCH-03 — Migración a motor especializado basada en evidencia

**Estado:** `PROPOSED`

### Decisión propuesta

Un motor especializado de búsqueda solamente se incorporará cuando las métricas demuestren que PostgreSQL ya no satisface los requisitos de:

* latencia;
* relevancia;
* volumen;
* concurrencia;
* funcionalidades de búsqueda.

No se introducirá por anticipación.

---

# 13.50 ADR-SEARCH-04 — Popular != Trending

**Estado:** `ACCEPTED`

### Decisión

Las métricas de popularidad y tendencia se modelarán como conceptos diferentes.

```text
Popular
→ volumen acumulado o histórico

Trending
→ crecimiento reciente / velocidad
```

La implementación exacta podrá evolucionar.

---

# 13.51 ADR-SEARCH-05 — Recomendaciones por etapas

**Estado:** `ACCEPTED`

### Decisión

La recomendación evolucionará progresivamente:

```text
MVP
→ popularidad
→ recientes
→ similares

Posterior
→ personalización

Posterior
→ embeddings / vector search
```

No se implementará un sistema avanzado de ML como requisito del MVP.

---

# 13.52 ADR-HEALTH-01 — Observation != Health State != Playback Decision

**Estado:** `ACCEPTED`

### Decisión

Se mantendrán tres conceptos independientes:

```text
HealthObservation
        ↓
Health State
        ↓
Playback Decision
```

Una observación individual no determina automáticamente una decisión de reproducción.

### Consecuencia

Se evita que un único fallo transitorio marque definitivamente una Source como inutilizable.

---

# 13.53 ADR-HEALTH-02 — Histeresis y confianza

**Estado:** `ACCEPTED`

### Decisión

Health utilizará mecanismos de:

* agregación;
* ventanas temporales;
* confianza;
* hysteresis;
* cooldown;
* evidencia acumulada.

### Objetivo

Reducir flapping:

```text
ACTIVE
 ↓
UNAVAILABLE
 ↓
ACTIVE
 ↓
UNAVAILABLE
```

cuando el problema real sea transitorio.

---

# 13.54 ADR-HEALTH-03 — Estados canónicos de Source

**Estado:** `ACCEPTED`

Los estados persistentes serán:

```text
DISCOVERED
ACTIVE
DEGRADED
UNAVAILABLE
```

`CHECKING` será tratado como estado operativo de una comprobación y no necesariamente como estado canónico persistente.

---

# 13.55 ADR-HEALTH-04 — Health técnico separado de corrección de contenido

**Estado:** `ACCEPTED`

### Decisión

Se distinguirá entre:

```text
Technical Availability
```

y:

```text
Content Correctness
```

Una Source puede responder técnicamente y entregar contenido incorrecto.

### Consecuencia

Los reportes de usuarios y observaciones técnicas no deben reducirse a una única métrica de disponibilidad.

---

# 13.56 ADR-HEALTH-05 — Probes progresivos

**Estado:** `ACCEPTED`

Las comprobaciones activas podrán evolucionar mediante niveles:

```text
L0 → metadata
L1 → manifest
L2 → structural validation
L3 → limited media validation
```

La profundidad de una prueba deberá considerar costo, seguridad y riesgo operativo.

---

# 13.57 ADR-HEALTH-06 — No eliminar Sources por una observación

**Estado:** `ACCEPTED`

### Decisión

Una observación negativa individual no provocará automáticamente la eliminación de una Source.

Las transiciones de Health dependerán de evidencia agregada.

La eliminación o desactivación administrativa seguirá un flujo diferente.

---

# 13.58 ADR-ADMIN-01 — Admin UI como Control Plane

**Estado:** `ACCEPTED`

### Decisión

El Panel Admin será una interfaz de Control Plane.

No accederá directamente a PostgreSQL, Redis u otras infraestructuras.

```text
Admin UI
    ↓
Admin API / Application Commands
    ↓
Domain Modules
    ↓
Persistence / Workers
```

---

# 13.59 ADR-ADMIN-02 — Role != Permission

**Estado:** `ACCEPTED`

### Decisión

Los roles serán agrupaciones de permisos.

La autorización deberá evaluarse conceptualmente como:

```text
Actor
+
Action
+
Resource
+
Context
```

Los roles iniciales podrán incluir:

```text
user
moderator
admin
```

sin impedir una futura granularidad mayor.

---

# 13.60 ADR-ADMIN-03 — Audit obligatorio para acciones administrativas

**Estado:** `ACCEPTED`

### Decisión

Las acciones administrativas relevantes deberán generar eventos de auditoría.

El registro deberá permitir identificar:

* actor;
* sesión;
* acción;
* recurso;
* resultado;
* motivo cuando corresponda;
* correlation/request ID;
* contexto de seguridad;
* cambios relevantes antes/después.

Nunca deberán registrarse secretos ni tokens sensibles.

---

# 13.61 ADR-ADMIN-04 — AdminOperation para operaciones asíncronas

**Estado:** `ACCEPTED`

### Decisión

Las operaciones administrativas que no puedan completarse razonablemente dentro de una petición síncrona utilizarán una entidad operacional:

```text
PENDING
RUNNING
SUCCEEDED
FAILED
CANCELLED
```

### Consecuencia

El usuario administrativo podrá consultar el estado sin mantener una petición HTTP abierta durante toda la operación.

---

# 13.62 ADR-ADMIN-05 — Override administrativo separado de Health

**Estado:** `ACCEPTED`

### Decisión

La decisión administrativa de deshabilitar una Source será distinta del Health State automático.

Por ejemplo:

```text
Health:
ACTIVE

Administrative Override:
DISABLED
```

### Consecuencia

Una Source técnicamente saludable puede permanecer deshabilitada por una decisión editorial, operativa, legal o de mantenimiento sin corromper la información de Health.

---

# 13.63 ADR-API-01 — API versionada

**Estado:** `ACCEPTED`

### Decisión

Las APIs públicas utilizarán versionado explícito:

```text
/v1/...
```

Los cambios incompatibles requerirán una nueva versión mayor de contrato.

Los cambios compatibles deberán preferirse antes que romper innecesariamente consumidores existentes.

---

# 13.64 ADR-API-02 — Core API como frontera de integración

**Estado:** `ACCEPTED`

### Decisión

Core API funcionará como frontera principal para las operaciones de aplicación.

No significa que todos los módulos deban convertirse en microservicios.

La separación será primero lógica y contractual.

---

# 13.65 ADR-API-03 — DTOs independientes de modelos internos

**Estado:** `ACCEPTED`

### Decisión

Los DTOs públicos no expondrán directamente las entidades internas de persistencia.

Esto aplica especialmente a:

* Sources;
* usuarios;
* PlaybackSession;
* Health;
* Admin;
* Resolver.

### Consecuencia

Los modelos internos podrán evolucionar sin romper automáticamente los contratos externos.

---

# 13.66 ADR-API-04 — Error Envelope normalizado

**Estado:** `ACCEPTED`

Las APIs utilizarán una estructura común conceptualmente equivalente a:

```json
{
  "error": {
    "code": "SOURCE_UNAVAILABLE",
    "message": "The selected source is currently unavailable.",
    "details": {},
    "requestId": "req_123"
  }
}
```

El código será estable y apto para consumo programático.

El `message` será informativo, pero no deberá utilizarse como identificador lógico del error.

---

# 13.67 ADR-API-05 — Idempotencia

**Estado:** `ACCEPTED`

Las operaciones donde una repetición accidental pueda producir efectos duplicados deberán utilizar mecanismos de idempotencia cuando corresponda.

Especialmente:

* comandos administrativos;
* operaciones de creación sensibles;
* procesamiento de eventos;
* trabajos asíncronos.

---

# 13.68 ADR-API-06 — Eventos vs comandos

**Estado:** `ACCEPTED`

Se distinguirán:

```text
Command
→ solicita que ocurra algo

Event
→ informa que algo ocurrió
```

Ejemplo:

```text
Command:
CreatePlaybackSession

Event:
PlaybackSessionCreated
```

La plataforma no adoptará event sourcing completo como consecuencia automática de utilizar eventos.

---

# 13.69 ADR-API-07 — Pagination y límites

**Estado:** `ACCEPTED`

Las APIs que devuelvan colecciones deberán establecer:

* límites máximos;
* paginación;
* ordenamiento determinista cuando corresponda;
* validación de parámetros.

Nunca se permitirán consultas sin límites que puedan cargar cantidades arbitrarias de datos.

---

# 13.70 ADR-DEVOPS-01 — Docker como unidad de ejecución

**Estado:** `ACCEPTED`

### Decisión

La aplicación utilizará contenedores Docker para obtener entornos reproducibles.

El uso de Docker no implica que cada módulo lógico deba convertirse inmediatamente en un servicio independiente.

---

# 13.71 ADR-DEVOPS-02 — Docker Compose para desarrollo local

**Estado:** `ACCEPTED`

### Decisión

MVP utilizará Docker Compose para facilitar la ejecución local de:

* aplicaciones;
* PostgreSQL;
* Redis;
* servicios auxiliares necesarios.

La topología local debe mantenerse razonablemente cercana a la arquitectura real sin introducir complejidad innecesaria.

---

# 13.72 ADR-DEVOPS-03 — Monolito modular antes de microservicios

**Estado:** `ACCEPTED`

### Decisión

La primera implementación física favorecerá un **modular monolith**.

Los motores estarán separados mediante límites lógicos, contratos y ownership, pero no se crearán microservicios solamente por simetría arquitectónica.

### Justificación

El proyecto es inicialmente desarrollado por una sola persona y requiere minimizar complejidad operacional.

---

# 13.73 ADR-DEVOPS-04 — CI como Quality Gate

**Estado:** `ACCEPTED`

El pipeline CI deberá validar, progresivamente:

```text
Lint
↓
Type Check
↓
Unit Tests
↓
Integration Tests
↓
Contract Tests
↓
Security Checks
↓
Build
```

Las pruebas E2E, smoke, load y otras validaciones podrán ejecutarse en etapas apropiadas del pipeline.

---

# 13.74 ADR-DEVOPS-05 — Artefactos inmutables

**Estado:** `ACCEPTED`

Una versión desplegada deberá corresponder a un artefacto identificable.

La trazabilidad mínima será:

```text
Git Commit
    ↓
Build
    ↓
Artifact
    ↓
Deployment
```

No se utilizará `latest` como única referencia de una versión productiva.

---

# 13.75 ADR-DEVOPS-06 — Estrategia de migraciones Expand / Contract

**Estado:** `ACCEPTED`

Las modificaciones de esquema que puedan afectar versiones concurrentes utilizarán una estrategia compatible con despliegues progresivos:

```text
Expand
→ Deploy
→ Migrate / Backfill
→ Contract
```

Se evitarán cambios destructivos que hagan incompatible inmediatamente la versión anterior de la aplicación.

---

# 13.76 ADR-DEVOPS-07 — Kubernetes no es requisito de MVP

**Estado:** `ACCEPTED`

### Decisión

Kubernetes, service mesh, multi-cluster y otras plataformas avanzadas de orquestación no forman parte de los requisitos iniciales.

Podrán incorporarse posteriormente si la escala y la operación justifican su complejidad.

---

# 13.77 ADR-DEVOPS-08 — Observabilidad basada en Logs + Metrics + Traces

**Estado:** `ACCEPTED`

La observabilidad utilizará tres señales principales:

```text
Logs
Metrics
Traces
```

y una cuarta dimensión específica de esta plataforma:

```text
QoE / Playback Telemetry
```

La observabilidad no debe depender únicamente de logs.

---

# 13.78 ADR-DEVOPS-09 — OpenTelemetry como dirección de instrumentación

**Estado:** `PROPOSED`

### Contexto

La plataforma requiere correlación entre API, Orchestrator, Resolver, Gateway y otros componentes.

### Decisión propuesta

OpenTelemetry será considerado como capa de instrumentación para traces y métricas cuando la complejidad operativa lo justifique.

La selección definitiva de backend de observabilidad queda abierta.

---

# 13.79 ADR-DEVOPS-10 — SLOs después del baseline

**Estado:** `ACCEPTED`

### Decisión

Los SLO definitivos no se fijarán exclusivamente a partir de valores teóricos.

Primero deberán obtenerse:

* benchmarks;
* mediciones de staging;
* comportamiento real;
* capacidad disponible;
* costos;
* perfil de usuarios.

Los valores iniciales utilizados durante el diseño serán tratados como hipótesis o benchmarks de referencia.

---

# 13.80 ADR-DEVOPS-11 — Rollback como requisito operativo

**Estado:** `ACCEPTED`

### Decisión

Cada versión desplegable deberá tener una estrategia razonable de reversión.

El rollback deberá considerar:

* aplicación;
* configuración;
* feature flags;
* migraciones;
* cachés;
* colas;
* compatibilidad de datos.

### Regla

Una versión que no pueda ser revertida o mitigada razonablemente no debe considerarse operacionalmente completa.

---

# 13.81 ADR-DEVOPS-12 — Feature Flags para reducir blast radius

**Estado:** `ACCEPTED`

### Decisión

Las funcionalidades de mayor riesgo podrán desplegarse desactivadas y habilitarse posteriormente.

Ejemplos:

```text
player_recovery_enabled
resolver_adapter_x_enabled
gateway_segment_cache_enabled
recommendations_enabled
ads_enabled
```

Las feature flags deberán tener ownership y proceso de eliminación para evitar acumulación permanente.

---

# 13.82 ADR-DEVOPS-13 — Health Checks: Liveness vs Readiness

**Estado:** `ACCEPTED`

### Decisión

Los servicios distinguirán:

```text
Liveness
→ el proceso sigue vivo

Readiness
→ el proceso está preparado para recibir tráfico
```

No se utilizará un único endpoint ambiguo para ambas funciones.

---

# 13.83 ADR-DEVOPS-14 — Backups con restore testing

**Estado:** `ACCEPTED`

### Decisión

Un backup no se considerará válido únicamente porque haya sido creado correctamente.

Deberá existir un mecanismo periódico de restauración controlada que compruebe:

* integridad;
* disponibilidad;
* arranque;
* datos;
* funcionalidad básica.

### Regla

```text
Backup sin restore test
≠
Recovery probado
```

---

# 13.84 ADR-DEVOPS-15 — RPO/RTO dependientes del riesgo

**Estado:** `PROPOSED`

### Decisión propuesta

Los objetivos definitivos de:

* RPO;
* RTO;

se determinarán después de evaluar:

* criticidad;
* costo;
* volumen de datos;
* frecuencia de cambios;
* tolerancia a pérdida;
* complejidad operativa.

No se establecerán valores artificialmente estrictos sin justificación.

---

# 13.85 ADR-DEVOPS-16 — Load testing basado en concurrencia

**Estado:** `ACCEPTED`

### Decisión

Las pruebas de carga del Gateway y playback deberán modelar usuarios concurrentes y tráfico realista.

No se utilizará únicamente:

```text
requests per second
```

como indicador de capacidad.

El modelo deberá considerar:

```text
concurrent viewers
+
average bitrate
+
segment duration
+
active connections
+
bandwidth
```

---

# 13.86 ADR-DEVOPS-17 — Fórmula inicial de egress

**Estado:** `ACCEPTED`

Para estimaciones iniciales se utilizará:

```text
Monthly Egress
≈
Concurrent Viewers
× Average Bitrate
× Viewing Hours
× 3600
÷ 8
```

Los resultados serán aproximaciones para planificación y no sustituyen mediciones reales.

---

# 13.87 ADR-SEC-01 — SSRF como requisito transversal

**Estado:** `ACCEPTED`

### Decisión

SSRF protection será responsabilidad transversal de cualquier componente que consuma recursos externos.

Aplica especialmente a:

* Resolver;
* Gateway;
* Health Probes;
* Ad Manager;
* ingestión;
* procesamiento de manifests.

### Consecuencia

No podrá existir un endpoint que convierta arbitrariamente una URL proporcionada por el usuario en una solicitud server-side sin validación.

---

# 13.88 ADR-SEC-02 — Secretos fuera del código y del cliente

**Estado:** `ACCEPTED`

Los secretos no deberán aparecer en:

* repositorio;
* imágenes Docker;
* frontend;
* DTOs públicos;
* logs;
* traces;
* mensajes de error;
* URLs públicas.

Se utilizarán variables de entorno o secret management apropiado según el entorno.

---

# 13.89 ADR-SEC-03 — Protección de credenciales y sesiones

**Estado:** `ACCEPTED`

Las credenciales y tokens deberán utilizar mecanismos adecuados de:

* hashing;
* expiración;
* rotación;
* revocación;
* almacenamiento seguro;
* protección contra replay cuando corresponda.

---

# 13.90 ADR-SEC-04 — Seguridad como parte del contrato

**Estado:** `ACCEPTED`

Las restricciones de seguridad no serán añadidas exclusivamente al final del desarrollo.

Los contratos deberán definir desde su diseño:

* quién puede invocarlos;
* qué datos pueden exponerse;
* qué recursos pueden alcanzarse;
* qué duración tienen los permisos;
* qué límites existen;
* qué auditoría se requiere.

---

# 13.91 ADR-ARCH-01 — Vertical Slices sobre construcción por motores

**Estado:** `ACCEPTED`

### Decisión

El desarrollo no seguirá:

```text
Motor 1 completo
→ Motor 2 completo
→ Motor 3 completo
→ ...
```

Seguirá:

```text
Vertical Slice 1
→ Vertical Slice 2
→ Vertical Slice 3
→ ...
```

Cada slice deberá atravesar los componentes necesarios para producir una capacidad observable.

### Justificación

Permite descubrir tempranamente problemas de integración y mantener el sistema ejecutable durante todo el desarrollo.

---

# 13.92 ADR-ARCH-02 — Visible Working Software

**Estado:** `ACCEPTED`

Cada slice deberá terminar con algo que pueda:

* ejecutarse;
* probarse;
* observarse;
* demostrarse.

El código que solamente prepara abstracciones para una funcionalidad futura no cuenta como una capacidad terminada.

---

# 13.93 ADR-ARCH-03 — Complejidad solo cuando exista evidencia

**Estado:** `ACCEPTED`

La arquitectura preferirá:

```text
Simple
→ Medir
→ Identificar límite
→ Justificar complejidad
→ Evolucionar
```

en lugar de:

```text
Complejo
→ Esperar que algún día sea necesario
```

Este principio aplica especialmente a:

* microservicios;
* Kubernetes;
* motores de búsqueda;
* caches distribuidas;
* sistemas de plugins;
* ML;
* multi-región;
* service mesh;
* event sourcing.

---

# 13.94 ADR-ARCH-04 — Infraestructura nueva requiere justificación

**Estado:** `ACCEPTED`

Introducir una nueva pieza de infraestructura requiere responder:

1. ¿Qué problema concreto resuelve?
2. ¿Por qué la infraestructura existente no es suficiente?
3. ¿Qué complejidad añade?
4. ¿Qué costo introduce?
5. ¿Cómo se opera?
6. ¿Cómo se prueba?
7. ¿Cómo se elimina posteriormente?

Si estas preguntas no tienen una respuesta razonable, la incorporación deberá posponerse.

---

# 13.95 ADR-ARCH-05 — Decisiones irreversibles requieren evidencia

**Estado:** `ACCEPTED`

Las decisiones con alto costo de reversión deberán retrasarse cuando sea posible.

Ejemplos:

* elección de arquitectura distribuida;
* dependencia crítica de proveedor;
* esquema de datos difícil de migrar;
* protocolo propietario;
* infraestructura de alto costo;
* estrategia de almacenamiento permanente.

El proyecto priorizará decisiones reversibles durante MVP.

---

# 13.96 ADR-ARCH-06 — Un ADR no sustituye pruebas

**Estado:** `ACCEPTED`

Una decisión arquitectónica no se considerará validada únicamente porque esté documentada.

Cuando una decisión dependa de comportamiento técnico, deberá existir evidencia mediante:

* prototipo;
* benchmark;
* prueba de integración;
* prueba de carga;
* medición de producción;
* análisis de seguridad;
* experimento controlado.

---

# 13.97 ADR-ARCH-07 — El repositorio debe reflejar el estado real

**Estado:** `ACCEPTED`

La documentación arquitectónica, ADR, CHANGELOG, configuración y código deberán mantenerse suficientemente sincronizados.

No se considerará correcto declarar una funcionalidad como implementada cuando solamente existe en documentación.

---

# 13.98 ADR-ARCH-08 — El agente de código no decide el alcance

**Estado:** `ACCEPTED`

Los agentes de IA utilizados durante el desarrollo podrán:

* implementar;
* refactorizar;
* investigar;
* proponer;
* detectar inconsistencias;
* escribir pruebas;
* actualizar documentación requerida.

Pero no podrán ampliar unilateralmente el alcance de una versión.

Una idea nueva deberá registrarse como backlog antes de incorporarse al trabajo actual, salvo que sea necesaria para corregir un bloqueo técnico real.

---

# 13.99 ADR-ARCH-09 — CHANGELOG como registro de evolución

**Estado:** `ACCEPTED`

Cada tarea o slice terminado deberá actualizar `CHANGELOG.md` cuando corresponda al proceso de desarrollo definido.

El CHANGELOG describe **qué cambió**.

Los ADR describen **por qué se tomó una decisión**.

No deben confundirse ambas funciones.

---

# 13.100 ADR-ARCH-10 — Git tags por versión

**Estado:** `ACCEPTED`

Cada versión oficialmente cerrada deberá quedar identificada mediante un tag Git:

```text
v0.1.0-alpha
v0.2.0-alpha
v0.3.0-alpha
...
v1.0.0
```

El tag debe apuntar a un commit reproducible que represente el estado real de esa versión.

---

# 13.101 ADR-ARCH-11 — Definition of Done como contrato de versión

**Estado:** `ACCEPTED`

Antes de comenzar una versión, el agente y el desarrollador deben conocer su criterio de Done.

Una versión no se considera terminada porque:

* el código compile;
* una pantalla exista;
* una API responda;
* un componente parezca funcionar.

Debe cumplir el criterio de aceptación definido para esa versión.

---

# 13.102 ADR-ARCH-12 — Bugs bloqueantes tienen prioridad sobre features

**Estado:** `ACCEPTED`

Si una tarea revela un defecto que impide cumplir una capacidad crítica del slice, la corrección del defecto tendrá prioridad sobre la incorporación de nuevas funcionalidades no relacionadas.

Esto protege la integridad de la vertical slice y evita acumular deuda funcional.

---

# 13.103 ADR-ARCH-13 — Documentación de decisiones no obvias

**Estado:** `ACCEPTED`

La documentación deberá concentrarse en decisiones cuyo motivo no sea evidente a partir del código.

No se documentará cada línea o función.

Debe documentarse especialmente:

* decisiones arquitectónicas;
* restricciones de seguridad;
* trade-offs;
* decisiones temporales;
* mecanismos de recuperación;
* dependencias externas;
* razones para no utilizar una alternativa.

---

# 13.104 ADR-ARCH-14 — Cuando exista incertidumbre relevante, detener implementación

**Estado:** `ACCEPTED`

Cuando una decisión sea ambigua y pueda cambiar la arquitectura, el agente no deberá asumir silenciosamente una interpretación.

Deberá:

```text
detectar incertidumbre
        ↓
explicitarla
        ↓
presentar alternativas relevantes
        ↓
solicitar decisión
```

La regla no aplica a decisiones triviales de implementación que estén claramente determinadas por el contexto existente.

---

# 13.105 ADR-ARCH-15 — Una versión debe ser desplegable

**Estado:** `ACCEPTED`

Cada versión del roadmap deberá poder convertirse en un estado ejecutable y desplegable de la plataforma.

La intención es evitar ramas de desarrollo que acumulen durante meses código imposible de integrar o ejecutar.

---

# 13.106 ADR-ARCH-16 — Arquitectura lógica antes que distribución física

**Estado:** `ACCEPTED`

Los límites entre motores se definirán primero como:

* responsabilidades;
* contratos;
* ownership;
* dependencias;
* eventos;
* interfaces.

La separación física en procesos o servicios se realizará únicamente cuando exista una razón técnica u operativa.

---

# 13.107 ADR-ARCH-17 — Seguridad y observabilidad atraviesan todos los motores

**Estado:** `ACCEPTED`

Security y Observability no se consideran motores funcionales aislados.

Son capacidades transversales.

```text
                    ┌─────────────────────┐
                    │      SECURITY       │
                    └─────────────────────┘
                             ↓
Catalog ─ Source ─ Resolver ─ Orchestrator ─ Gateway ─ Player
   │         │         │          │            │
   └─────────┴─────────┴──────────┴────────────┘
                             ↑
                    ┌─────────────────────┐
                    │   OBSERVABILITY     │
                    └─────────────────────┘
```

---

# 13.108 ADR del Motor Discovery & Ingestion: # ADRs — DISCOVERY & INGESTION

Los siguientes ADRs complementan el registro general de decisiones arquitectónicas de la Sección 13 y formalizan las decisiones específicas del **Motor de Discovery & Ingestion**.

---

## ADR-DI-001 — Discovery & Ingestion como motor independiente

**Estado:** ACCEPTED

### Contexto

La plataforma necesita incorporar y mantener contenido y fuentes procedentes de sistemas externos.

Esta responsabilidad no debe recaer sobre:

* Catalog;
* Source Registry;
* Search;
* Playback Orchestrator;
* Source Resolver;
* Admin/CMS.

### Decisión

Se establece un **Motor de Discovery & Ingestion** como subsistema lógico independiente.

El motor será responsable de:

* descubrir;
* generar candidatos;
* normalizar;
* hacer matching;
* deduplicar;
* enriquecer;
* validar;
* ingerir;
* asociar fuentes;
* reconciliar.

### Consecuencia

El proyecto posee dos grandes ciclos:

```text
External World
    ↓
Discovery & Ingestion
    ↓
Catalog + Sources
```

y:

```text
User
    ↓
Search
    ↓
Playback
```

---

# ADR-DI-002 — Discovery y Search Discovery son dominios diferentes

**Estado:** ACCEPTED

### Contexto

El término Discovery puede referirse tanto al descubrimiento de contenido por parte del usuario como al descubrimiento de contenido por parte de la plataforma.

### Decisión

Se mantienen dos conceptos:

```text
User Discovery
```

para búsqueda, exploración y recomendaciones.

y:

```text
Acquisition Discovery
```

para adquisición de contenido y fuentes externas.

### Consecuencia

No se compartirán responsabilidades de dominio aunque ambos sistemas puedan utilizar conceptos similares de descubrimiento.

---

# ADR-DI-003 — Discovery Candidate como frontera entre adquisición e ingestión

**Estado:** ACCEPTED

### Contexto

Un adapter puede descubrir información externa que todavía no constituye una entidad canónica.

### Decisión

Todo resultado de Discovery deberá transformarse en un:

```text
DiscoveryCandidate
```

antes de entrar al pipeline de ingestión.

```text
External Provider
      ↓
Adapter
      ↓
DiscoveryCandidate
      ↓
Ingestion Pipeline
```

### Consecuencia

Los adapters no podrán crear directamente entidades canónicas como comportamiento predeterminado.

---

# ADR-DI-004 — El Collector/Scraper será una capacidad, no el dueño del dominio

**Estado:** ACCEPTED

### Contexto

El proyecto puede necesitar collectors complejos para obtener información externa.

Un scraper monolítico que también decida matching, deduplicación, publicación y asociación de fuentes produciría acoplamiento excesivo.

### Decisión

El Collector se implementará detrás de uno o varios **Discovery Adapters**.

Su responsabilidad termina en producir candidatos normalizados o normalizables.

```text
Collector
    ↓
Discovery Adapter
    ↓
DiscoveryCandidate
```

### Consecuencia

El Collector puede evolucionar internamente sin modificar el resto del pipeline.

---

# ADR-DI-005 — Los candidatos no son entidades canónicas

**Estado:** ACCEPTED

### Contexto

La información externa puede contener:

* duplicados;
* errores;
* títulos ambiguos;
* información incompleta;
* entidades inexistentes;
* contenido que la plataforma todavía no reconoce.

### Decisión

Un:

```text
DiscoveryCandidate
```

no equivale a:

```text
MediaItem
```

ni a:

```text
Source
```

La transformación requiere matching, validación y política de ingestión.

### Consecuencia

No se permitirá que un resultado externo se convierta automáticamente en una entidad canónica simplemente por haber sido descubierto.

---

# ADR-DI-006 — Provenance obligatoria

**Estado:** ACCEPTED

### Contexto

La plataforma debe poder responder:

> ¿De dónde salió esta información?

### Decisión

Todo candidato y toda incorporación automática deberán conservar provenance suficiente.

Como mínimo:

```text
provider
externalId
adapterId
adapterVersion
runId
discoveredAt
payloadChecksum
```

### Consecuencia

Los datos incorporados podrán ser auditados y reprocesados.

---

# ADR-DI-007 — Raw Payload separado de Canonical Data

**Estado:** ACCEPTED

### Contexto

Conservar la respuesta externa completa puede ser útil para debugging y reprocesamiento, pero no debe convertirse en el modelo de dominio.

### Decisión

Se separan:

```text
Raw Payload
Normalized Candidate
Canonical Entity
```

### Consecuencia

Un cambio en un adapter no obliga a modificar el modelo canónico.

La retención del raw payload estará limitada por políticas de tamaño, seguridad, privacidad y coste.

---

# ADR-DI-008 — Matching jerárquico

**Estado:** ACCEPTED

### Contexto

El matching únicamente por similitud textual produce falsos positivos.

### Decisión

El matching utilizará una jerarquía:

```text
1. External ID exacto
2. Identidad determinística
3. Alias / títulos alternativos
4. Matching probabilístico
5. Revisión humana
```

### Consecuencia

La similitud textual nunca será considerada por sí sola evidencia suficiente para un match de alta confianza.

---

# ADR-DI-009 — Matching ambiguo requiere revisión

**Estado:** ACCEPTED

### Contexto

Un candidato puede corresponder a varias entidades.

### Decisión

Los matches de confianza insuficiente pasarán a:

```text
PENDING_REVIEW
```

en lugar de crear o modificar automáticamente una entidad.

### Consecuencia

Se prioriza evitar asociaciones incorrectas sobre maximizar la automatización.

---

# ADR-DI-010 — Deduplicación idempotente

**Estado:** ACCEPTED

### Contexto

El mismo elemento externo puede aparecer en múltiples Discovery Runs.

### Decisión

La identidad externa deberá utilizarse para garantizar idempotencia.

Conceptualmente:

```text
kind + provider + externalId
```

constituye una identidad externa estable cuando el proveedor lo permita.

### Consecuencia

Reprocesar un candidato no deberá crear duplicados.

---

# ADR-DI-011 — No realizar merges destructivos con baja confianza

**Estado:** ACCEPTED

### Contexto

Fusionar incorrectamente dos entidades canónicas puede producir pérdida o corrupción de información.

### Decisión

Los merges automáticos estarán limitados a casos de alta confianza.

Los casos ambiguos pasarán a revisión.

### Consecuencia

El sistema podrá acumular temporalmente candidatos duplicados en vez de destruir incorrectamente una entidad existente.

---

# ADR-DI-012 — Discovery de contenido y Discovery de fuentes independientes

**Estado:** ACCEPTED

### Contexto

Puede descubrirse una fuente antes de que exista una entidad canónica correspondiente.

### Decisión

Se soportarán al menos dos tipos de candidato:

```text
CONTENT
SOURCE
```

El descubrimiento de una fuente no requiere que el contenido ya esté incorporado.

### Consecuencia

Una fuente puede permanecer temporalmente:

```text
UNMATCHED
```

hasta obtener evidencia suficiente para asociarla.

---

# ADR-DI-013 — Discovery no selecciona fuentes de playback

**Estado:** ACCEPTED

### Contexto

El Discovery puede encontrar múltiples fuentes para el mismo contenido.

### Decisión

Discovery únicamente registra o propone fuentes.

La selección durante reproducción corresponde al:

```text
Playback Orchestrator
```

### Consecuencia

No existirá lógica de selección de playback dentro de Discovery.

---

# ADR-DI-014 — Discovery no resuelve Sources

**Estado:** ACCEPTED

### Contexto

Resolver una fuente y descubrir una fuente son operaciones distintas.

### Decisión

Discovery puede descubrir metadata sobre una fuente, pero la transformación:

```text
Source
    ↓
Playable Representation
```

pertenece al Source Resolver.

### Consecuencia

Discovery no entra en el camino crítico de playback.

---

# ADR-DI-015 — Catalog y Source Registry conservan ownership

**Estado:** ACCEPTED

### Contexto

Discovery necesita incorporar entidades pero no debe convertirse en propietario de sus modelos.

### Decisión

El ownership permanece:

```text
Catalog → media entities
Source Registry → source entities
Discovery → acquisition pipeline
```

Discovery utilizará contratos de aplicación para crear o actualizar entidades.

### Consecuencia

No se permiten escrituras arbitrarias de Discovery sobre tablas de otros motores.

---

# ADR-DI-016 — Publication independiente de Ingestion

**Estado:** ACCEPTED

### Contexto

Que una entidad haya sido ingerida no significa necesariamente que deba estar visible públicamente.

### Decisión

Se mantienen separadas:

```text
Ingestion State
Publication State
Technical Availability
```

### Consecuencia

Una película puede existir internamente como:

```text
INGESTED
+
DRAFT
+
SOURCE ACTIVE
```

sin estar publicada todavía.

---

# ADR-DI-017 — Health independiente de Discovery

**Estado:** ACCEPTED

### Contexto

Encontrar una fuente no demuestra que funcione.

### Decisión

Discovery determina existencia y metadata.

Health determina disponibilidad y comportamiento observado.

```text
Discovery → "existe"
Health → "funciona / no funciona"
```

### Consecuencia

No se marcará una fuente como `ACTIVE` simplemente porque haya sido descubierta.

---

# ADR-DI-018 — Reconciliation no elimina inmediatamente

**Estado:** ACCEPTED

### Contexto

Un elemento que desaparece temporalmente de un proveedor puede volver a aparecer.

### Decisión

La ausencia será tratada progresivamente:

```text
MISSING OBSERVATION
    ↓
STALE
    ↓
DEPRECATED
```

según políticas y evidencia acumulada.

Una única ausencia no implica eliminación.

### Consecuencia

El sistema será resistente a fallos temporales de Discovery.

---

# ADR-DI-019 — Jobs con entrega al menos una vez

**Estado:** ACCEPTED

### Contexto

Workers y colas pueden producir ejecuciones duplicadas.

### Decisión

El sistema asumirá:

```text
at-least-once execution
```

y diseñará operaciones idempotentes.

### Consecuencia

No se dependerá de una garantía de exactly-once.

---

# ADR-DI-020 — Retries limitados y con backoff

**Estado:** ACCEPTED

### Decisión

Los errores temporales podrán reintentarse mediante:

```text
bounded retries
exponential backoff
jitter
maximum attempts
total deadline
```

Los errores permanentes no deberán reintentarse indefinidamente.

---

# ADR-DI-021 — Dead Letter Queue

**Estado:** ACCEPTED

### Decisión

Los jobs que superen los límites de retry pasarán a una DLQ o mecanismo equivalente.

El estado deberá permanecer inspeccionable y recuperable desde Admin.

---

# ADR-DI-022 — Discovery asíncrono

**Estado:** ACCEPTED

### Contexto

Discovery, enriquecimiento y reconciliación pueden implicar operaciones lentas.

### Decisión

Estas operaciones se ejecutarán asíncronamente.

El request administrativo no deberá permanecer bloqueado durante todo el procesamiento.

### Consecuencia

El Admin trabaja con:

```text
Run
Job
Candidate
Operation
```

y consulta su estado posteriormente.

---

# ADR-DI-023 — PostgreSQL como fuente de verdad

**Estado:** ACCEPTED

### Decisión

El estado persistente de:

* runs;
* candidates;
* jobs;
* errores;
* provenance;
* relaciones;

permanecerá en PostgreSQL.

Redis será infraestructura efímera.

---

# ADR-DI-024 — Redis para coordinación, no para ownership

**Estado:** ACCEPTED

Redis podrá utilizarse para:

* queues;
* locks;
* deduplication temporal;
* rate limiting;
* coordinación.

Pero la pérdida de Redis no debe destruir la identidad persistente del proceso de ingestión.

---

# ADR-DI-025 — Scheduler separado del Worker

**Estado:** ACCEPTED

### Decisión

El Scheduler crea trabajo.

El Worker ejecuta trabajo.

```text
Scheduler
    ↓
Job
    ↓
Queue
    ↓
Worker
```

No se mezclará scheduling con ejecución pesada.

---

# ADR-DI-026 — Manual Import utiliza el mismo pipeline

**Estado:** ACCEPTED

### Contexto

La plataforma necesita operaciones manuales durante el MVP.

### Decisión

La importación manual generará `DiscoveryCandidate` y atravesará el mismo pipeline que la información automática.

```text
Manual Import
      ↓
Candidate
      ↓
Normalization
      ↓
Matching
      ↓
Validation
      ↓
Ingestion
```

### Consecuencia

No existirán dos caminos de ingestión incompatibles.

---

# ADR-DI-027 — Autonomía basada en políticas

**Estado:** ACCEPTED

### Decisión

La automatización se controlará mediante políticas de confianza, validación y provenance.

La arquitectura no dependerá inicialmente de modelos de machine learning para decidir si un contenido debe incorporarse.

### Consecuencia

Las reglas pueden evolucionar desde determinísticas hacia sistemas probabilísticos posteriormente.

---

# ADR-DI-028 — Revisión humana como mecanismo de excepción

**Estado:** ACCEPTED

### Decisión

La intervención humana se concentrará en:

* matches ambiguos;
* conflictos;
* datos inválidos;
* políticas;
* casos excepcionales.

El objetivo es minimizar intervención, no eliminarla artificialmente.

---

# ADR-DI-029 — Discovery Runs parcialmente exitosos son válidos

**Estado:** ACCEPTED

### Decisión

Un Run puede terminar como:

```text
PARTIAL
```

cuando produce resultados válidos pero presenta errores parciales.

### Consecuencia

El fallo de un subconjunto de elementos no invalida automáticamente todo el trabajo exitoso.

---

# ADR-DI-030 — Search se actualiza desde Catalog

**Estado:** ACCEPTED

### Decisión

Discovery no escribirá directamente sobre el índice de búsqueda.

El flujo será:

```text
Discovery
    ↓
Catalog
    ↓
Catalog Event / Projection Trigger
    ↓
Search Index
```

---

# ADR-DI-031 — No Discovery en el camino crítico de Playback

**Estado:** ACCEPTED

### Decisión

Una solicitud de reproducción no deberá bloquearse esperando que Discovery encuentre una fuente.

Si no existe una fuente adecuada:

```text
Playback
    ↓
no available source
```

y opcionalmente podrá generarse trabajo posterior de Discovery como evolución futura.

### Consecuencia

La latencia de Playback no dependerá de Discovery.

---

# ADR-DI-032 — Security transversal

**Estado:** ACCEPTED

Todo acceso externo originado por Discovery estará sujeto a:

```text
SSRF protection
URL validation
redirect validation
DNS rebinding protection
timeouts
response-size limits
content-type validation
egress controls
secret isolation
rate limiting
```

Los adapters no constituyen una excepción a la arquitectura de seguridad.

---

# ADR-DI-033 — Adapter Versioning

**Estado:** ACCEPTED

Cada candidato deberá conservar la versión del adapter que lo produjo.

Esto permite identificar cambios de comportamiento entre versiones del parser o integración.

---

# ADR-DI-034 — No CAPTCHA / Anti-Bot Bypass como requisito arquitectónico

**Estado:** ACCEPTED

La arquitectura no dependerá de mecanismos destinados a evadir controles de acceso, CAPTCHA o sistemas anti-bot.

Los adapters deberán operar mediante integraciones autorizadas y mecanismos de acceso permitidos.

---

# ADR-DI-035 — Discovery no implica almacenamiento permanente de vídeo

**Estado:** ACCEPTED

Discovery & Ingestion trabaja principalmente con:

```text
metadata
identities
source references
provenance
```

No constituye un sistema de almacenamiento/transcodificación permanente de vídeo.

---

# ADR-DI-036 — Vertical Slice para implementar Discovery

**Estado:** ACCEPTED

El motor se desarrollará mediante vertical slices.

El primer slice debe ser:

```text
Adapter
→ Candidate
→ Normalize
→ Exact Match
→ Catalog
→ Admin
```

No se implementará primero todo Discovery y posteriormente se intentará conectarlo con el resto del sistema.

---

# ADR-DI-037 — Complejidad sólo cuando exista evidencia

**Estado:** ACCEPTED

No se introducirá:

* Kafka;
* Kubernetes;
* vector databases;
* ML matching;
* distributed crawlers;
* event sourcing;

simplemente porque sean tecnologías posibles.

Cada incorporación requiere una necesidad demostrable.

---

# ADR-DI-038 — Master Rule de Discovery & Ingestion

**Estado:** ACCEPTED

> **El sistema puede automatizar la adquisición, pero nunca debe perder la trazabilidad de cómo llegó a una decisión.**

Toda automatización relevante debe poder responder:

```text
¿Qué encontró?
¿Dónde lo encontró?
¿Qué adapter lo produjo?
¿Qué versión tenía?
¿Qué Run lo descubrió?
¿Cómo hizo matching?
¿Por qué fue aprobado?
¿Qué entidad modificó?
¿Qué fuente creó o actualizó?
¿Qué ocurrió después?
```

Si la plataforma no puede responder estas preguntas, la automatización se considera insuficientemente observable.


# 13.108 Registro de decisiones todavía abiertas

Los siguientes ADR permanecen deliberadamente abiertos o requieren validación posterior:

| ADR             | Decisión pendiente                              | Criterio de resolución              |
| --------------- | ----------------------------------------------- | ----------------------------------- |
| ADR-SRC-06      | Estrategia definitiva de deployment de adapters | Frecuencia/cantidad de adapters     |
| ADR-SRC-07      | Política avanzada de caché de resolución        | TTL y comportamiento real           |
| ADR-GW-03       | Modos de entrega definitivos                    | Compatibilidad y seguridad          |
| ADR-GW-07       | Caché de segmentos                              | Beneficio medido                    |
| ADR-SEARCH-03   | Motor de búsqueda especializado                 | Latencia, volumen y relevancia      |
| ADR-DEVOPS-09   | Backend de observabilidad                       | Necesidades operativas              |
| ADR-DEVOPS-15   | RPO/RTO finales                                 | Riesgo y costo                      |
| Recomendaciones | Vector/embeddings                               | Necesidad real                      |
| Escalamiento    | Kubernetes                                      | Complejidad operacional justificada |
| Gateway         | CDN definitivo                                  | Perfil de tráfico y costo           |
| Deployment      | Blue/Green/Canary                               | Necesidad de releases progresivos   |
| Multi-región    | Distribución geográfica                         | Escala y disponibilidad requerida   |

Estas decisiones no deben cerrarse únicamente para “completar” la documentación.

---

# 13.109 Reglas para modificar un ADR

Un ADR aceptado no deberá editarse silenciosamente cuando la modificación represente una decisión diferente.

Si cambia sustancialmente:

```text
Contexto
o
Decisión
o
Trade-off
o
Consecuencias
```

deberá crearse un nuevo ADR que sustituya al anterior.

Ejemplo:

```text
ADR-GW-07
    ↓
SUPERSEDED BY
    ↓
ADR-GW-12
```

El ADR original permanecerá como registro histórico.

Los errores tipográficos, mejoras de claridad o correcciones que no cambien la decisión pueden corregirse directamente.

---

# 13.110 Relación entre ADR, código y roadmap

La trazabilidad esperada es:

```text
Roadmap
   ↓
Version Definition of Done
   ↓
Relevant ADRs
   ↓
Architecture
   ↓
Implementation
   ↓
Tests
   ↓
Deployment
   ↓
Evidence
```

Por tanto, una versión no deberá implementar decisiones arquitectónicas contradictorias con los ADR vigentes.

Cuando una implementación revele que un ADR ya no es adecuado, primero deberá revisarse la decisión y posteriormente modificarse la implementación, salvo correcciones urgentes de seguridad.

---

# 13.111 ADR y agente de código

Los agentes de IA que participen en el proyecto deberán considerar los ADR como restricciones y contexto arquitectónico.

Antes de modificar una zona relevante del código deberán determinar:

1. qué motor posee esa responsabilidad;
2. qué ADRs afectan al componente;
3. qué contratos debe respetar;
4. qué versión está siendo desarrollada;
5. cuál es el Definition of Done;
6. qué pruebas validan el cambio.

El agente no debe interpretar un ADR como autorización para implementar funcionalidades fuera del alcance actual.

---

# 13.112 ADR y Backlog

Cuando durante la implementación aparezca una idea técnicamente interesante pero no necesaria para cumplir el objetivo de la versión, deberá clasificarse como backlog o como posible ADR futuro.

Ejemplos:

```text
"Podríamos usar Elasticsearch"
→ BACKLOG / ADR futuro

"Podríamos convertir Resolver en microservicio"
→ ADR futuro

"Podríamos usar Kubernetes"
→ ADR futuro

"Necesitamos validar este endpoint porque actualmente permite SSRF"
→ NO es backlog: es corrección de seguridad
```

La diferencia fundamental es:

```text
Mejora opcional
→ backlog

Decisión arquitectónica futura
→ ADR / propuesta

Defecto que compromete una restricción existente
→ corrección
```

---

# 13.113 ADR y cambios de seguridad

Los cambios relacionados con seguridad tendrán prioridad sobre decisiones de conveniencia cuando exista una vulnerabilidad real.

Por ejemplo:

```text
"Esta validación hace el desarrollo más lento"
```

no justifica eliminar una protección SSRF necesaria.

Las restricciones de seguridad deberán evaluarse como parte de la arquitectura y no como una optimización opcional.

---

# 13.114 ADR y evidencia experimental

Cuando un ADR dependa de una hipótesis técnica, deberá registrarse la evidencia que permita revisarlo.

Ejemplo:

```text
Hipótesis:
PostgreSQL FTS será suficiente para MVP.

↓ benchmark

10.000 contenidos
100.000 contenidos
1.000.000 contenidos

↓ resultados

Latencia p50
Latencia p95
CPU
RAM
concurrencia

↓ decisión
Mantener PostgreSQL
o
introducir motor especializado
```

La arquitectura deberá evolucionar desde hipótesis hacia evidencia.

---

# 13.115 ADR mínimos necesarios antes de V1

Antes de declarar `v1.0.0`, deberán estar resueltas o explícitamente aceptadas las decisiones que afecten directamente:

* identidad del contenido;
* Sources;
* resolución;
* selección;
* PlaybackSession;
* Gateway;
* seguridad SSRF;
* autenticación;
* contratos públicos;
* persistencia;
* observabilidad;
* despliegue;
* rollback;
* backups;
* health;
* administración.

No es necesario que todas las decisiones futuras estén cerradas.

---

# 13.116 Regla maestra de ADR

La regla fundamental del registro es:

> **Una decisión arquitectónica importante debe poder responder tres preguntas: qué se decidió, por qué se decidió y bajo qué condiciones debería revisarse.**

Si una decisión no necesita esas respuestas, probablemente no necesita convertirse en ADR.

---

# 13.117 Criterio de calidad del registro ADR

La sección 13 se considera correctamente mantenida cuando:

* las decisiones importantes están identificadas;
* las decisiones vigentes tienen estado;
* las decisiones abiertas están explícitamente marcadas;
* las decisiones reemplazadas conservan historial;
* los ADR no contradicen la arquitectura vigente;
* las decisiones no se inventan retrospectivamente;
* las hipótesis importantes tienen criterios de validación;
* los agentes de código pueden identificar las restricciones relevantes;
* el roadmap puede rastrearse hasta las decisiones que lo sustentan.

---

# 13.118 Resumen del registro arquitectónico

La arquitectura consolidada puede resumirse mediante las siguientes decisiones fundamentales:

```text
CONTENT
    ↓
Catalog owns canonical identity

SOURCE
    ↓
Source Registry owns registered sources

SELECTION
    ↓
Playback Orchestrator decides

RESOLUTION
    ↓
Resolver + Adapter resolves

TRANSPORT
    ↓
Media Gateway transports authorized resources

PLAYBACK
    ↓
Media Player reproduces PlaybackSession

HEALTH
    ↓
Health Engine observes and aggregates

SEARCH
    ↓
Search projects Catalog

IDENTITY
    ↓
Identity owns authentication/access

ADMIN
    ↓
Admin/CMS operates through Control Plane

SECURITY
    ↓
Cross-cutting constraint

OBSERVABILITY
    ↓
Cross-cutting operational capability

ARCHITECTURE EVOLUTION
    ↓
Measure → Decide → Document → Implement
```

La consecuencia más importante de este registro es que la plataforma no depende únicamente de una colección de componentes, sino de **límites explícitos de responsabilidad**.

La regla arquitectónica final permanece:

```text
Catalog knows Content.
Registry knows Sources.
Orchestrator decides.
Resolver resolves.
Gateway transports.
Player reproduces.
Health observes.
Search indexes.
Identity authenticates.
Admin operates.
Security constrains.
Observability explains.
ADR preserves why.
```
