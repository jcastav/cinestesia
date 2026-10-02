## 6.41. Source Health, Reporting & Reliability Engine

### a. Propósito y responsabilidad única

El **Source Health System** observa, registra y agrega evidencia sobre el comportamiento y disponibilidad de las Sources.

Su responsabilidad fundamental será:

> **Transformar señales operacionales heterogéneas en evidencia estructurada de salud que permita al Source Registry y al Playback Orchestrator tomar decisiones informadas.**

No decide directamente qué Source reproducir.

No descubre nuevas Sources.

No resuelve Sources.

No realiza playback.

No transporta video.

---

### b. Principio fundamental

La distinción más importante de este motor será:

```text id="emssaa"
Observation
    ≠
Health State
    ≠
Playback Decision
```

Por ejemplo:

```text id="qj1v95"
HTTP 503 observed
```

es una **observación**.

```text id="bclhtq"
Source = DEGRADED
```

es un **estado derivado**.

```text id="qznhbn"
use Source B instead
```

es una **decisión del Playback Orchestrator**.

No mezclaremos las tres.

---

### c. Arquitectura conceptual

```text id="x7k3v0"
SOURCE HEALTH SYSTEM
│
├── Health Signal Intake
│   ├── Player Signals
│   ├── Gateway Signals
│   ├── Resolver Signals
│   ├── Active Probes
│   └── User Reports
│
├── Health Observation Store
│
├── Health Aggregator
│
├── Source Health Projection
│
├── Provider Health Projection
│
├── Probe Scheduler
│
├── Report Management
│
└── Alerting / Operational Events
```

De nuevo:

```text id="oucp5g"
logical modules
≠
microservices
```

En MVP pueden ser:

```text id="8ihjpk"
Core API
+
Worker
+
PostgreSQL
+
optional Redis
```

---

### d. Source Health ≠ Source Registry

Ya definimos que:

```text id="psv8f1"
Source Registry
```

posee la Source como entidad persistente.

Por ejemplo:

```text id="6zvtfz"
source_id
provider_id
playback_target
status
metadata
created_at
```

Health produce evidencia acerca de ella.

Arquitectura:

```text id="5r0i9c"
Source Registry
      │
      │ Source
      ▼
Health System
      │
      │ observations
      ▼
Health Projection
      │
      ▼
Source Registry / Orchestrator
```

---

### e. Estado canónico

Ya habíamos definido:

```text id="n1r4xq"
DISCOVERED
ACTIVE
DEGRADED
UNAVAILABLE
```

No introduciremos ahora otro vocabulario paralelo:

```text id="ct1t73"
healthy
degraded
dead
checking
```

como estado canónico de Source.

El original usa precisamente ese segundo enum.

Podemos conservar estados de **resultado de health check**, pero no crear dos máquinas de estado competidoras.

---

### f. `CHECKING` tampoco es salud

Este detalle es importante.

```text id="vhdv2p"
CHECKING
```

no describe si una Source está sana.

Describe:

```text id="nldkjd"
an operation is currently running
```

Por tanto no debe coexistir como peer de:

```text id="t2uj0c"
HEALTHY
DEGRADED
DEAD
```

en el mismo enum.

Separaremos:

```text id="t1mcp7"
probe status
```

de:

```text id="ib6hs5"
health result
```

---

### g. Health Observation

La primitive central será:

```text id="k6wru3"
HealthObservation
```

Ejemplo:

```json id="hnh5pb"
{
  "observationId": "obs_123",
  "sourceId": "src_456",

  "origin": "GATEWAY",

  "signal": "UPSTREAM_HTTP_ERROR",

  "outcome": "FAILURE",

  "httpStatus": 503,

  "latencyMs": 1840,

  "observedAt": "..."
}
```

---

### h. Observation Origins

Baseline:

```text id="c9ygg4"
PLAYER
GATEWAY
RESOLVER
ACTIVE_PROBE
USER_REPORT
ADMIN
```

Cada origen tiene distinta confiabilidad semántica.

---

### i. Player Signal

El Player puede decir:

```text id="f5g47n"
manifest failed
media failed
session recovery requested
```

pero no necesariamente sabe:

```text id="0pxhpc"
origin server is dead
```

Por eso Player produce:

```text id="gmvd1l"
playback failure evidence
```

no un veredicto de salud.

---

### j. Gateway Signal

Gateway posee mejor visibilidad de transporte:

```text id="iq5l95"
upstream timeout
HTTP 404
HTTP 403
HTTP 5xx
connection reset
manifest fetch failure
segment failure
```

Por tanto sus observaciones pueden tener un peso distinto.

---

### k. Resolver Signal

Resolver puede producir:

```text id="59zexr"
RESOLUTION_SUCCEEDED
RESOLUTION_FAILED
ACCESS_NOT_AVAILABLE
ADAPTER_ERROR
TIMEOUT
```

Esto informa sobre:

```text id="v7h48c"
resolvability
```

pero tampoco significa necesariamente que toda la Source esté permanentemente caída.

---

### l. Active Probe

El Worker puede realizar una comprobación controlada:

```text id="81o23m"
Source
  │
  ▼
Probe
  │
  ▼
Observation
```

Esto es lo más parecido al `source_health_checks` original.

Pero el probe no modifica directamente:

```text id="uxvnlk"
source.status
```

sin pasar por agregación/política.

---

### m. User Report

El reporte de usuario será otra evidencia:

```json id="s1gz5c"
{
  "sourceId": "src_123",
  "category": "PLAYBACK_FAILURE",
  "playbackSessionId": "ps_456",
  "comment": "..."
}
```

cuando corresponda.

No necesitamos pedir al usuario:

```text id="pbwzj4"
HTTP 404
```

porque normalmente no puede diagnosticarlo.

---

### n. Report Category

Preferiremos categorías normalizadas:

```text id="at84l3"
DOES_NOT_START
STOPS_REPEATEDLY
WRONG_CONTENT
WRONG_AUDIO
WRONG_SUBTITLES
QUALITY_PROBLEM
OUT_OF_SYNC
OTHER
```

Esto es más útil que exigir códigos técnicos al usuario.

---

### o. Technical Failure vs Content Quality Problem

Muy importante.

Una Source puede estar:

```text id="u0epqb"
technically available
```

pero contener:

```text id="dgv9ay"
wrong episode
wrong language
audio desync
corrupt subtitles
```

Por tanto Health no debe limitarse a:

```text id="vxcebh"
HTTP status
```

---

### p. Dimensiones de salud

Conceptualmente podemos separar:

```text id="0ojj7f"
Availability
Resolvability
Transport Reliability
Playback Reliability
Content Correctness
Performance
```

No necesitamos implementar inmediatamente un score para cada una.

Pero evita reducir:

```text id="m04a5s"
Source health
```

a:

```text id="e1o2pt"
HEAD returned 200
```

---

### q. Probe no equivale a playback real

Un endpoint puede devolver:

```text id="o99sqb"
HTTP 200
```

y aun así el contenido ser inutilizable.

Por ejemplo:

```text id="zcxxo9"
manifest malformed
segments unavailable
expired token
unsupported media
wrong content
```

Así que:

> **Probe Success es evidencia positiva, no prueba absoluta de reproducción exitosa.**

---

### r. Passive Signals

Las señales más valiosas pueden venir del tráfico real:

```text id="jygtpx"
Playback Session
      │
      ▼
real user playback
      │
      ▼
success/failure
```

Esto permite medir comportamiento real sin sondear continuamente proveedores externos.

---

### s. Passive + Active

Arquitectura:

```text id="n8a7re"
            HEALTH EVIDENCE
                  │
       ┌──────────┴──────────┐
       │                     │
       ▼                     ▼
Passive Signals         Active Probes
       │                     │
       └──────────┬──────────┘
                  ▼
          Health Aggregator
```

Esta combinación es mucho mejor que depender exclusivamente de cron jobs.

---

### t. Source Health Projection

A partir de observaciones derivaremos algo parecido a:

```json id="f0fqh6"
{
  "sourceId": "src_123",

  "state": "DEGRADED",

  "confidence": "MEDIUM",

  "lastSuccessAt": "...",
  "lastFailureAt": "...",
  "lastProbeAt": "...",

  "recentSuccessRate": 0.73,

  "updatedAt": "..."
}
```

Los campos exactos se definirán posteriormente.

---

### u. Confidence

Introducir conceptualmente:

```text id="y8whpf"
confidence
```

es útil.

No es igual:

```text id="o0nqzd"
1 anonymous report
```

que:

```text id="5hskzt"
100 recent playback failures
+
3 failed active probes
```

Ambos son evidencia negativa, pero con distinta confianza.

---

### v. State Derivation

Ejemplo conceptual:

```text id="30ezhk"
recent observations
       │
       ▼
Health Aggregator
       │
       ├── sufficient positive evidence
       │        ↓
       │      ACTIVE
       │
       ├── mixed/degrading evidence
       │        ↓
       │     DEGRADED
       │
       └── strong failure evidence
                ↓
           UNAVAILABLE
```

Los thresholds no se fijan todavía.

---

### w. Hysteresis

Esto será importante para evitar:

```text id="2uhy0e"
ACTIVE
 ↓
UNAVAILABLE
 ↓
ACTIVE
 ↓
UNAVAILABLE
```

cada pocos segundos.

Podremos exigir:

```text id="eh4q0i"
stronger evidence to disable
```

y:

```text id="p6m7h4"
sustained success to restore
```

o viceversa según política.

Eso es:

```text id="7qbbfv"
hysteresis
```

---

### x. Source Lifecycle

Podría verse:

```text id="3np4j8"
DISCOVERED
    │
    │ validation
    ▼
 ACTIVE
    │
    │ negative evidence
    ▼
DEGRADED
    │
    ├──── recovery ─────► ACTIVE
    │
    │ sustained failure
    ▼
UNAVAILABLE
    │
    │ later successful validation
    └──────────────────► ACTIVE
```

No eliminaremos necesariamente una Source solo porque esté temporalmente unavailable.

---

### y. `DEAD` no significa borrar

El término original `dead` puede inducir a:

```text id="ebz1mv"
DELETE source
```

pero una Source podría recuperarse.

Por eso preferimos:

```text id="exb4ml"
UNAVAILABLE
```

como estado operacional.

El borrado/archivado es otra decisión.

---

### z. Health Score

Podemos tener posteriormente:

```text id="ivv0yb"
health score 0..1
```

pero no lo haría requisito MVP.

Un número como:

```text id="ce1i67"
0.73
```

puede parecer muy preciso sin serlo realmente.

Para MVP:

```text id="qv99io"
state
+
recent observations
+
timestamps
```

puede bastar.

---

### aa. Playback Orchestrator consume Health

La relación correcta será:

```text id="vm3fp2"
Source Registry
      +
Health Projection
      +
Playback Requirements
      │
      ▼
Playback Orchestrator
      │
      ▼
Source Selection
```

Health no ejecuta:

```text id="0p2os5"
priority = priority - 10
```

directamente.

---

### ab. Selection Policy

Orchestrator puede considerar:

```text id="6prkfm"
state
recent success rate
resolution latency
language
quality
compatibility
historical reliability
```

pero la ponderación pertenece a:

```text id="ql0xvz"
Source Selection Policy
```

no al Health Checker.

---

### ac. Fallo durante reproducción

Flujo:

```text id="a8cx0g"
Player detects fatal media failure
        │
        ▼
Playback Recovery Request
        │
        ├────────────► Health Observation
        │
        ▼
Playback Orchestrator
        │
        ▼
select alternative Source
        │
        ▼
new Playback Session
```

El usuario no espera a que:

```text id="0yz3iu"
Health Aggregator
```

termine un diagnóstico completo para hacer fallback.

---

### ad. Health es asíncrono respecto al fallback

Esta distinción es importantísima:

```text id="rwbpc2"
critical playback path
```

no debe convertirse en:

```text id="l2ftlh"
fail
 ↓
run health check
 ↓
wait
 ↓
update DB
 ↓
choose alternative
```

El fallback puede ocurrir inmediatamente.

Health procesa evidencia en paralelo.

---

### ae. User Reports

El endpoint original:

```http id="qbxq8d"
POST /v1/reports/broken-link
```

puede generalizarse a:

```http id="skpq76"
POST /v1/source-reports
```

Request conceptual:

```json id="03c7qs"
{
  "sourceId": "src_123",
  "playbackSessionId": "ps_456",
  "category": "DOES_NOT_START",
  "comment": "No inicia el video"
}
```

---

### af. No confiar en `sourceId` arbitrario

Si existe:

```text id="75cuwi"
playbackSessionId
```

el backend puede comprobar:

```text id="i8lh4m"
this Source actually belonged to this session
```

cuando aplique.

Eso dificulta reportes arbitrarios contra Sources que el usuario nunca recibió.

---

### ag. Anonymous Reports

Podemos permitir:

```text id="9ehgqc"
anonymous report
```

sin exigir cuenta.

Pero su señal podrá tener diferente peso.

No necesitamos identificar permanentemente al visitante para que su reporte sea útil.

---

### ah. Report Deduplication

El original usa:

```text id="4gwf9r"
source_id + IP
10 minutes
```

en Redis.

La idea de debounce se conserva, pero no fijaremos IP como identidad universal.

Podemos combinar:

```text id="zovav7"
authenticated user
anonymous session
playback session
source
time window
```

según disponibilidad.

---

### ai. IP no es usuario

Por CGNAT, redes universitarias, empresas, VPN, etc.:

```text id="byxvmo"
one IP
≠
one person
```

Por tanto:

```text id="1krcnw"
report:{source}:{ip}
```

puede ser una heurística secundaria, no nuestra identidad principal.

---

### aj. Report State

Un reporte puede tener:

```text id="t5y7oh"
RECEIVED
TRIAGED
VERIFIED
REJECTED
RESOLVED
```

No necesariamente necesitamos todos desde MVP.

Pero es mejor que únicamente:

```text id="guzg23"
is_resolved BOOLEAN
```

del modelo original.

---

### ak. Report ≠ Observation

Un:

```text id="5vm18o"
UserReport
```

es una entidad operacional/moderable.

Puede generar:

```text id="slwhw6"
HealthObservation
```

pero no son necesariamente la misma fila.

Así podemos conservar:

```text id="sf7mjq"
comment
reporter
moderation state
```

sin contaminar la serie temporal de health.

---

### al. Active Probe Scheduler

El Scheduler decide:

```text id="dz1nvn"
what to probe
when to probe
```

No el Worker.

Flujo:

```text id="z11v7x"
Scheduler
   │
   ▼
Probe Job
   │
   ▼
Worker
   │
   ▼
Probe Result
```

---

### am. Probe Priority

No fijaremos únicamente:

```text id="cm5xrl"
Top 100 → every 6h
Everything else → every 7d
```

como hace el original.

Podemos calcular prioridad según:

```text id="bxf2rj"
traffic
last observation
state
provider health
recent failures
source age
report volume
business importance
```

---

### an. Adaptive Scheduling

Ejemplo:

```text id="09yy9j"
ACTIVE + frequently used
        │
        ▼
moderate probe interval

DEGRADED
        │
        ▼
shorter verification interval

UNAVAILABLE
        │
        ▼
backoff / occasional recovery probe
```

No queremos martillar continuamente una Source caída.

---

### ao. Jitter

Sí conservaremos la buena idea original:

```text id="3p6a4r"
scheduled time
     +
random jitter
```

para evitar:

```text id="5nft2v"
10,000 probes at exactly 00:00
```

---

### ap. Backoff

Después de fallos repetidos:

```text id="8q69ig"
retry 1
   ↓
retry 2
   ↓
retry 3
```

no debe convertirse en un loop agresivo.

Aplicaremos:

```text id="i5nh92"
bounded exponential backoff
+
jitter
```

cuando corresponda.

---

### aq. Probe Concurrency

Limitaremos:

```text id="zv7qnk"
global concurrency
```

y:

```text id="okigdu"
per-provider concurrency
```

para evitar que nuestro propio sistema genere tráfico abusivo.

---

### ar. Provider Rate Awareness

Si:

```text id="4oj6p9"
Provider A
```

tiene miles de Sources, no queremos:

```text id="s1rf1l"
5,000 simultaneous probes
```

contra ese origen.

Usaremos:

```text id="r2zvhk"
provider concurrency limits
rate budgets
```

según integración permitida.

---

### as. HEAD vs GET

No asumiremos que:

```text id="etxjxu"
HEAD 200
```

es suficiente.

Algunos servidores:

```text id="phq57w"
do not support HEAD correctly
```

y otros pueden responder distinto a GET.

La estrategia de probe dependerá del tipo de Source/Provider.

---

### at. Probe Levels

Conceptualmente:

```text id="e5b2h8"
L0 — metadata/status probe

L1 — manifest availability

L2 — structural manifest validation

L3 — limited media resource verification
```

No todos los probes necesitan llegar a L3.

---

### au. No reproducir el video entero

Health Checker no necesita:

```text id="r5g8gm"
download 2 GB movie
```

para comprobar salud.

La prueba debe consumir el mínimo tráfico necesario para obtener evidencia razonable.

---

### av. Probe Budget

Cada probe tendrá:

```text id="et9p6s"
deadline
max bytes
redirect limit
resource count limit
```

Esto protege:

```text id="gz2t38"
cost
workers
external providers
security
```

---

### aw. SSRF

Health Checker también realiza requests a recursos externos.

Por tanto hereda una superficie SSRF crítica.

Aplicaremos:

```text id="s0fvug"
scheme validation
URL validation
redirect validation
private/reserved IP blocking
DNS rebinding protections
timeouts
response size limits
egress controls
```

igual que Resolver/Gateway.

---

### ax. La Source ya fue validada, pero…

No debemos pensar:

```text id="j2imqb"
Source Registry accepted URL once
→ URL safe forever
```

porque pueden existir:

```text id="i9sk2r"
redirect changes
DNS changes
provider changes
```

Cada fetch externo sigue necesitando controles.

---

### ay. Provider Health

Además de Source Health:

```text id="z23n2k"
Provider Health
```

puede derivarse de muchas Sources.

Ejemplo:

```text id="tmwjs4"
Provider A
 ├── Source 1 failure
 ├── Source 2 failure
 ├── Source 3 failure
 └── Source 4 failure
```

puede indicar un incidente común.

---

### az. Provider Health Projection

Conceptualmente:

```json id="jupdy4"
{
  "providerId": "provider_a",

  "state": "DEGRADED",

  "recentSourcesObserved": 120,
  "recentFailureRate": 0.61,

  "updatedAt": "..."
}
```

No cambia automáticamente todas las Sources a `UNAVAILABLE`.

---

### ba. Correlated Failure

Este es un problema importante.

Si 500 Sources del mismo Provider fallan simultáneamente:

```text id="etq73o"
500 independent failures?
```

probablemente no.

Puede existir:

```text id="21phzq"
provider-level incident
```

El sistema debe poder correlacionarlo.

---

### bb. Massive Failure Alert

El original propone alerta crítica cuando más del 25 % de Sources de un host cambian a `dead` en una hora.

Conservamos la idea, pero:

```text id="81rqwo"
25%
1 hour
```

serán parámetros configurables/baseline, no leyes arquitectónicas.

---

### bc. Minimum Sample Size

Además, porcentaje sin muestra es peligroso.

```text id="u8z79a"
1 failure / 2 observations = 50%
```

no equivale a:

```text id="d5n3mx"
500 / 1000 = 50%
```

Las alertas deberán considerar:

```text id="n3u6t8"
failure ratio
+
sample size
+
time window
```

---

### bd. Health Observations Table

Reemplazaría `source_health_checks` por algo más general:

```sql id="v85hzi"
CREATE TABLE source_health_observations (
    id BIGSERIAL PRIMARY KEY,

    source_id UUID NOT NULL,

    origin VARCHAR(32) NOT NULL,
    signal VARCHAR(64) NOT NULL,
    outcome VARCHAR(32) NOT NULL,

    http_status_code INT,
    latency_ms INT,

    error_code VARCHAR(64),

    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

No toda observation será un active check.

---

### be. Metadata de Observation

Podemos tener:

```text id="7r9dfk"
metadata JSONB
```

para información secundaria.

Pero:

* schema/version;
* tamaño limitado;
* no secretos;
* no URLs sensibles por defecto.

---

### bf. Health Projection Table

Para no recalcular miles de observaciones en cada playback:

```sql id="o1y8lo"
CREATE TABLE source_health (
    source_id UUID PRIMARY KEY,

    state VARCHAR(32) NOT NULL,

    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    last_probe_at TIMESTAMPTZ,

    recent_success_rate DOUBLE PRECISION,

    updated_at TIMESTAMPTZ NOT NULL
);
```

Campos exactos TBD.

---

### bg. Event Store no

La tabla de observations:

```text id="2xplg0"
≠
full event sourcing architecture
```

Es simplemente historial operacional de señales.

No convertiremos toda la plataforma en Event Sourcing.

---

### bh. Retention

No necesitamos guardar:

```text id="gw9k9j"
every successful segment forever
```

Las señales de alta frecuencia pueden:

```text id="7hqfs1"
aggregate
sample
expire
```

según utilidad.

Ejemplo:

```text id="7p23aq"
raw observations → short retention
aggregates → longer retention
```

---

### bi. Cardinalidad

No crearemos métricas Prometheus:

```text id="fzmylp"
source_id="src_847281..."
```

para millones de Sources.

Eso destruye cardinalidad.

Source-specific diagnosis pertenece a:

```text id="4em3qy"
logs
database
traces
```

mientras métricas usan:

```text id="h10d01"
provider
outcome
signal
```

de baja cardinalidad.

---

### bj. Metrics

Ejemplos:

```text id="skgdpa"
health_observations_total{
  origin,
  outcome,
  provider
}

health_probes_total{
  result,
  provider
}

health_probe_duration_seconds

health_sources_by_state{
  state,
  provider
}

health_reports_total{
  category
}
```

---

### bk. Source Availability Rate

Formalmente:

```text id="bd2ryz"
Sources considered available
────────────────────────────
Sources evaluated
```

pero deberemos especificar:

```text id="sx9nyy"
time window
eligible source population
state definition
```

antes de convertirla en KPI.

---

### bl. Playback-derived Reliability

Una métrica muy útil:

```text id="vymamr"
successful playback attempts using source
─────────────────────────────────────────
playback attempts using source
```

con suficiente muestra.

Pero no será el único indicador.

---

### bm. Resolution Reliability

Separada:

```text id="yfcwtv"
successful source resolutions
─────────────────────────────
source resolution attempts
```

Una Source podría resolver correctamente pero fallar durante transporte.

Precisamente por eso separamos dimensiones.

---

### bn. Probe Success Rate

También:

```text id="z66rm6"
successful probes
─────────────────
completed probes
```

pero nunca lo confundimos con:

```text id="5cxpbr"
Playback Success Rate
```

---

### bo. Report Metrics

```text id="a95v7h"
reports received
reports verified
reports rejected
reports resolved
time-to-triage
time-to-resolution
```

si existe workflow de moderación.

---

### bp. Health Events

Podemos emitir:

```text id="k0cvn9"
source.health.degraded
source.health.unavailable
source.health.recovered

provider.health.degraded
provider.health.recovered

source.report.received
source.report.verified
```

Solo cuando existe una transición significativa.

No emitimos:

```text id="0k68w2"
source.health.still_active
```

cada cinco segundos.

---

### bq. Replenishment

Aquí corregimos otra responsabilidad original.

Cuando una Source queda `UNAVAILABLE`:

```text id="8m95kg"
Health System
     │
     ▼
source.health.unavailable
     │
     ▼
Discovery/Ingestion
```

puede decidir:

```text id="tazb7e"
do we need another Source?
```

Health no sale directamente a buscarla.

---

### br. Coverage

Discovery/Ingestion puede combinar:

```text id="1wx1pz"
Source unavailable
+
remaining source count
+
content demand
```

Ejemplo:

```text id="vxhxbm"
Content A
├── Source 1 UNAVAILABLE
├── Source 2 ACTIVE
└── Source 3 ACTIVE
```

quizá no necesita reingesta urgente.

Pero:

```text id="47v6yh"
Content B
└── Source 1 UNAVAILABLE
```

sí puede necesitar:

```text id="q6qkq7"
replenishment priority = high
```

---

### bs. Source Coverage Health

Esto introduce una métrica de nivel superior:

```text id="ijm51n"
playable source count per Playback Target
```

Ejemplo:

```text id="lkn4pp"
0 → unavailable content
1 → fragile coverage
2+ → redundant coverage
```

Los thresholds exactos dependerán del producto.

---

### bt. Content Availability

Muy importante:

```text id="o4uhv4"
Source unavailable
≠
Content unavailable
```

Si existen otras Sources.

Solo:

```text id="v44zpi"
all viable Sources unavailable
```

puede convertir el Playback Target en no reproducible.

---

### bu. Playback Availability Projection

Posteriormente podemos derivar:

```text id="1lspbf"
Playback Target
       │
       ├── Source A ACTIVE
       ├── Source B DEGRADED
       └── Source C UNAVAILABLE
       │
       ▼
PLAYABLE
```

Esto puede alimentar:

```text id="c13g9f"
Catalog UI
Admin
Operations
```

sin contaminar el Catalog canónico.

---

### bv. Admin Override

Operadores podrán:

```text id="oqoc4j"
disable Source manually
```

por razones que Health no puede inferir:

```text id="3jgyzs"
wrong content
legal/compliance
provider policy
security incident
```

Este estado manual no debe ser sobrescrito automáticamente por un probe exitoso.

---

### bw. Operational State vs Health State

Por tanto quizá tengamos:

```text id="4fhfn4"
operational eligibility
```

separada de:

```text id="7btvq5"
observed health
```

Ejemplo:

```text id="ezl7mi"
Health = ACTIVE
Admin = DISABLED
```

Resultado:

```text id="p3ex3l"
not eligible for playback
```

Aunque técnicamente responda.

---

### bx. Manual Override Precedence

Regla:

```text id="cl9w92"
manual/security/compliance disable
>
automatic health recovery
```

hasta que un operador o workflow autorizado retire el override.

---

### by. Health no elimina Sources

El sistema automático podrá:

```text id="f5f7xl"
degrade
mark unavailable
schedule validation
emit replenishment signal
```

pero eliminación definitiva debe ser una acción separada.

Esto conserva historia y facilita diagnóstico.

---

### bz. Admin Diagnosis

Para una Source:

```text id="i89owx"
Source src_123
────────────────────────
State: DEGRADED
Last success: ...
Last failure: ...
Last probe: ...
Recent playback failures: ...
Resolver failures: ...
User reports: ...
Provider incident: ...
```

Eso será mucho más útil que:

```text id="r72c8g"
dead = true
```

---

### ca. Provider Dashboard

También:

```text id="hfg9nh"
Provider A
────────────────────
Sources active
Sources degraded
Sources unavailable
Resolution success rate
Playback failure rate
Probe failure rate
Current incidents
```

---

### cb. Alert Routing

El original menciona Discord/Slack y luego una ADR para Discord/Telegram.

No acoplaremos Health a:

```text id="efm2in"
Discord
Telegram
Slack
```

Emitiremos:

```text id="qef2cz"
OperationalAlert
```

y un:

```text id="93rwo3"
Notification Adapter
```

decidirá destino.

---

### cc. Alert Example

```json id="06crpc"
{
  "type": "PROVIDER_HEALTH_DEGRADED",
  "providerId": "provider_a",
  "severity": "HIGH",
  "detectedAt": "..."
}
```

Después:

```text id="hbf6c8"
Notification System
 ├── Admin UI
 ├── Email
 ├── Discord
 └── Telegram
```

según configuración.

---

### cd. Alert Deduplication

Si 10,000 Sources fallan por un mismo Provider, no queremos:

```text id="3t8m0c"
10,000 Telegram messages
```

Necesitamos:

```text id="0zgvk6"
incident grouping
deduplication
cooldown
```

---

### ce. Incident Concept

Futuro:

```text id="ktiw7g"
ProviderIncident
```

puede agrupar:

```text id="gugr6h"
first detected
affected provider
affected source estimate
severity
status
last update
```

No obligatorio MVP.

---

### cf. Health Queue

Los active probes sí son buenos candidatos para:

```text id="9hzb96"
Queue
```

porque son:

```text id="p5xl0e"
asynchronous
retryable
concurrency-controlled
```

---

### cg. Worker

El Worker será:

```text id="f3wx0j"
stateless where practical
```

y consumirá:

```text id="ntqirj"
ProbeJob
```

Ejemplo:

```json id="pmfy6j"
{
  "sourceId": "src_123",
  "probeLevel": "MANIFEST",
  "reason": "RECENT_FAILURE"
}
```

No necesita que el mensaje contenga URL externa arbitraria.

---

### ch. Resolver reuse

Un probe puede necesitar lógica parecida a Resolver.

Pero cuidado:

```text id="6obw0d"
Health Worker
≠
duplicate entire Resolver
```

Puede invocar una interfaz controlada de resolución cuando sea necesario.

Sin convertir Resolver en health scheduler.

---

### ci. Resolution Health Probe

Flujo posible:

```text id="w5iqf2"
Health Worker
      │
      ▼
Source Resolver
      │
      ▼
ResolutionResult
      │
      ▼
HealthObservation
```

Así probamos:

```text id="4u73qw"
can this Source currently be resolved?
```

---

### cj. Transport Probe

Separadamente:

```text id="2lg0yp"
Playable Representation
       │
       ▼
limited transport validation
       │
       ▼
HealthObservation
```

No necesariamente utiliza una Playback Session pública.

---

### ck. Security Context

Los probes internos tendrán:

```text id="c13h5s"
service identity
```

y permisos mínimos.

No expondremos públicamente:

```text id="e7v3hs"
POST /health/check?url=https://anything.com
```

Eso sería prácticamente una primitive SSRF.

---

### cl. Abuse de User Reports

Controles:

```text id="dxh1a6"
rate limits
session validation
deduplication
comment length limit
input sanitization
moderation
```

Un reporte no ejecuta inmediatamente una request externa síncrona desde la petición pública.

Preferible:

```text id="jx5tkh"
report
  │
  ▼
accepted
  │
  ▼
async verification job
```

---

### cm. API response

Por tanto:

```http id="1esgy9"
POST /v1/source-reports
```

puede responder:

```text id="dhac9h"
202 Accepted
```

semánticamente mejor que afirmar que el diagnóstico ya ocurrió.

Ejemplo:

```json id="0kjybz"
{
  "reportId": "rpt_123",
  "status": "RECEIVED"
}
```

---

### cn. Performance

Los valores originales:

```text id="gn3ekz"
report processing <5 s
100 verifications/sec
```

quedan como hipótesis históricas de capacidad.

Mediremos:

```text id="fsrz6d"
report acceptance latency
probe queue delay
probe execution duration
health aggregation lag
state transition lag
worker throughput
```

---

### co. Queue Delay

Una distinción importante:

```text id="j6t87d"
report accepted in 40 ms
```

pero:

```text id="0s3pdl"
probe executed 3 s later
```

Son métricas diferentes.

No las mezclaremos como “processing time”.

---

### cp. Health Freshness

Otra métrica:

```text id="nv70r2"
now - last meaningful observation
```

Una Source:

```text id="c0a38k"
ACTIVE
```

pero sin observaciones desde hace seis meses tiene menos evidencia que una validada hace diez minutos.

---

### cq. Unknown Health

Esto nos lleva a considerar:

```text id="72ysdk"
UNKNOWN
```

como estado de **evidencia**, aunque no necesariamente como `Source.status`.

Por ejemplo:

```text id="e4fz2o"
Source status = DISCOVERED
Health evidence = UNKNOWN
```

hasta validar.

---

### cr. Testing unitario

Cubrir:

```text id="zmpz1c"
observation normalization
state derivation
hysteresis
report deduplication
probe scheduling
provider aggregation
incident thresholding
```

---

### cs. Integration Tests

Simular:

```text id="0tsg64"
Resolver success/failure
Gateway 404
Gateway 403
Gateway 5xx
timeout
malformed manifest
user report
provider-wide outage
```

---

### ct. Chaos / Fault Simulation

Conservamos la idea original de Chaos Engineering, pero de forma controlada.

Podemos simular:

```text id="x2asw7"
latency
timeouts
HTTP errors
connection reset
intermittent failure
provider outage
```

en entornos propios de prueba.

---

### cu. State Transition Tests

Especialmente:

```text id="r3n1cu"
ACTIVE
 ↓ failures
DEGRADED
 ↓ failures
UNAVAILABLE
 ↓ successes
ACTIVE
```

y comprobar que no exista flapping excesivo.

---

### cv. False Report Test

```text id="muhz8j"
1 malicious report
      │
      ▼
Source remains eligible
      │
      ▼
verification scheduled
```

Conservamos exactamente el buen principio del documento original de no deshabilitar por un único reporte.

---

### cw. Provider Outage Test

```text id="dycwe3"
Provider A
├── Source 1 fails
├── Source 2 fails
├── Source 3 fails
├── ...
└── Source N fails
        │
        ▼
Provider incident detected
        │
        ▼
one grouped alert
```

No N alertas independientes.

---

### cx. MVP

Para MVP necesitamos:

```text id="w16xpy"
User Reports
+
Passive Failure Signals
+
Basic Active Probe Worker
+
Health Observation Store
+
Basic Derived State
+
Orchestrator consumption
```

Eso ya aporta muchísimo.

---

### cy. MVP no necesita

```text id="4jvydx"
complex health score
machine learning
predictive failures
multi-region probes
global probe network
advanced incident correlation
adaptive statistical anomaly detection
```

---

### cz. Primera versión física

```text id="5cy9b8"
                     CORE API
                        │
             ┌──────────┴──────────┐
             │                     │
             ▼                     ▼
      Source Reports        Passive Signals
             │                     │
             └──────────┬──────────┘
                        ▼
                Health Observations
                        │
                        ▼
                   PostgreSQL
                        ▲
                        │
                    Worker
                        ▲
                        │
                      Queue
                        ▲
                        │
                 Probe Scheduler
```

Y:

```text id="4bgw12"
Health Projection
       │
       ▼
Source Registry
       │
       ▼
Playback Orchestrator
```

---

### da. Evolución

Posteriormente:

```text id="nbzcnl"
Multiple Workers
Provider-aware Scheduling
Incident Correlation
Aggregated Time-Series
Advanced Health Policies
Multi-region Observation
```

solo cuando la operación lo requiera.

---

### db. Criterios de aceptación

El MVP del motor estará listo cuando:

1. pueda recibir un reporte de usuario;
2. un reporte no deshabilite directamente una Source;
3. pueda recibir señales del Player/Gateway/Resolver;
4. todas las señales se normalicen como Health Observations;
5. pueda programarse un active probe;
6. los probes tengan timeout y límites;
7. exista protección SSRF;
8. exista concurrency limit global y por Provider;
9. pueda derivarse `ACTIVE`, `DEGRADED` o `UNAVAILABLE`;
10. exista protección básica contra flapping;
11. Orchestrator pueda consultar salud;
12. Health no seleccione Source;
13. Health no ejecute fallback;
14. una Source unavailable no implique automáticamente contenido unavailable;
15. pueda detectarse un patrón de fallo de Provider;
16. reportes duplicados puedan limitarse;
17. observaciones tengan retención definida;
18. métricas eviten cardinalidad por `source_id`;
19. un admin pueda inspeccionar evidencia;
20. una Source recuperada pueda volver a ser elegible;
21. un override administrativo no sea eliminado por un probe automático;
22. Discovery/Ingestion pueda recibir señal de replenishment cuando falte cobertura.

---

### dc. ADRs abiertas

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

### dd. Arquitectura consolidada

```text id="hn5i8j"
                         HEALTH SIGNALS
                              │
          ┌───────────────────┼────────────────────┐
          │                   │                    │
          ▼                   ▼                    ▼
       PLAYER              GATEWAY             RESOLVER
          │                   │                    │
          └────────────┬──────┴───────────┬────────┘
                       │                  │
                       ▼                  ▼
                Passive Signals      User Reports
                       │                  │
                       └─────────┬────────┘
                                 ▼
                       HEALTH OBSERVATIONS
                                 ▲
                                 │
                         ACTIVE PROBES
                                 ▲
                                 │
                      Probe Worker / Queue
                                 ▲
                                 │
                         Probe Scheduler
                                 │
                                 ▼
                         HEALTH AGGREGATOR
                                 │
                  ┌──────────────┴───────────────┐
                  │                              │
                  ▼                              ▼
          SOURCE HEALTH                  PROVIDER HEALTH
                  │                              │
                  ▼                              ▼
           SOURCE REGISTRY                 ALERTING
                  │
                  ▼
       PLAYBACK ORCHESTRATOR
                  │
                  ▼
          SOURCE SELECTION


SOURCE HEALTH
      │
      │ insufficient viable coverage
      ▼
DISCOVERY / INGESTION
      │
      ▼
SOURCE REPLENISHMENT
```

### Reglas maestras del Motor 8

Estas las dejaría explícitas:

> **1. Una observación de fallo no equivale automáticamente a una Source caída.**

> **2. Health observa y deriva estado; Playback Orchestrator decide qué Source utilizar.**

> **3. Source unavailable no significa Content unavailable mientras existan otras Sources viables.**

> **4. Passive playback signals y Active Probes son evidencias complementarias, no sustitutas.**

> **5. Un User Report es evidencia, nunca autoridad suficiente por sí sola para deshabilitar automáticamente una Source.**

> **6. El sistema debe distinguir fallos de Source de incidentes correlacionados a nivel Provider.**

> **7. Health puede solicitar verificación o replenishment; no debe asumir las responsabilidades de Resolver ni Discovery/Ingestion.**

> **8. Cualquier active probe contra recursos externos está sujeto a los mismos principios estrictos de SSRF, egress control, timeouts y límites de recursos que el resto del Data Plane.**

Con esto también desaparece una ambigüedad importante del documento original. Allí el Health Checker podía “reordenar prioridades de reproducción” y posteriormente notificar al Scraper/Ingesta para reparar el catálogo.  Ahora el ciclo queda limpio:

```text id="swnm0h"
OBSERVE
   ↓
AGGREGATE
   ↓
DERIVE HEALTH
   ↓
────────────────────────────────────────
   ↓                    ↓
ORCHESTRATOR         DISCOVERY
selects              replenishes
   ↓                    ↓
PLAYBACK             NEW SOURCE
```

Y esto encaja exactamente con el modelo de múltiples Sources que llevamos construyendo desde el principio.

El siguiente bloque original es el **9. Panel Admin / CMS**. Ahí tenemos otro cambio arquitectónico interesante: el documento actual dice que el Panel Admin tiene “interfaces de control e inspección sobre todos los motores”, envía **comandos directamente a bases de datos**, purga Redis/CDN, siempre lee de la “Master DB”, guarda IP obligatoriamente en audit logs, exige 2FA para moderator/admin, whitelist de IP/VPN y hasta permite activar maintenance mode desde el dashboard.

La corrección clave será:

```text id="a9ib4q"
Admin UI
   │
   ▼
Admin API / Application Commands
   │
   ├── Catalog
   ├── Source Registry
   ├── Health
   ├── Discovery/Ingestion
   ├── Users
   ├── Feature Flags
   └── Operations
```

y **jamás**:

```text id="sccf36"
Admin UI
   │
   ├── UPDATE catalog DB
   ├── UPDATE users DB
   ├── DEL Redis keys
   └── purge infrastructure directly
```

Además vamos a separar **CMS editorial**, **Operations Console**, **Moderation**, **User Administration** y **System Configuration/Audit**, aunque físicamente todos puedan seguir siendo una sola aplicación web administrativa. Ese Motor 9 va a ser bastante importante porque será, literalmente, el **control plane humano** de toda la plataforma.


Vamos con el **Motor 9: Panel Admin / CMS**. Este es de los bloques que más conviene rediseñar porque, como dijiste desde el principio, no estamos haciendo simplemente una página con un CRUD: estamos definiendo cómo se **opera** toda la plataforma.

El original concibe correctamente una interfaz central para administradores/moderadores, con gestión de catálogo, salud, ingesta, usuarios, métricas, configuración y auditoría. También incorpora RBAC, 2FA, audit logs y restricciones adicionales de acceso. El problema está en la frontera: afirma que el Panel Admin produce comandos sobre las bases de datos, purga directamente CDN/Redis y tiene control sobre todos los motores.

Eso lo vamos a reemplazar por un verdadero **Human Control Plane**.
