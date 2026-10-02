## 6.38. Ad Manager / Motor de Monetización Publicitaria

### a. Propósito y responsabilidad única

El **Ad Manager** es el subsistema encargado de coordinar la experiencia publicitaria asociada a la plataforma audiovisual.

Su responsabilidad será:

> **Determinar, preparar, ejecutar y medir oportunidades publicitarias sin acoplar la lógica comercial al Media Player Core ni comprometer la disponibilidad del contenido principal.**

El dominio podrá gestionar progresivamente:

```text id="acx8ae"
Ad Opportunities
Ad Decisioning
Ad Sessions
VAST / VMAP
Ad Playback Coordination
Frequency Capping
Tracking / Measurement
Display Ad Slots
Ad Provider Integrations
```

El principio fundamental será:

> **La publicidad es una capa de monetización alrededor de la experiencia audiovisual; no forma parte del mecanismo fundamental que hace reproducible un contenido.**

---

### b. Arquitectura conceptual

Dividiremos el motor en responsabilidades:

```text id="i7pm7n"
AD MANAGER
│
├── Ad Policy
├── Ad Opportunity Manager
├── Ad Decision Service
├── Provider Adapters
├── VAST / VMAP Processor
├── Ad Session Manager
├── Frequency Cap Manager
├── Ad Playback Coordinator
├── Display Slot Manager
└── Ad Telemetry
```

No significa nueve microservicios.

En MVP podrían vivir prácticamente todos dentro de:

```text id="gprr68"
Core API
+
Web Client
```

La separación es **lógica**.

---

### c. Fuera de alcance

El Ad Manager no deberá:

* seleccionar Sources de contenido;
* resolver Sources;
* controlar el Media Gateway;
* alterar el catálogo;
* administrar autenticación;
* decidir fallback audiovisual;
* almacenar el progreso del contenido principal;
* implementar el Media Player Core;
* procesar pagos a anunciantes;
* convertirse inicialmente en una plataforma DSP/SSP propia;
* ejecutar código arbitrario de anunciantes con privilegios de la aplicación.

---

### d. Relación con el Player

La frontera correcta será:

```text id="i9wj1n"
                 Ad Manager
                     │
                     │ AdPlaybackPlan
                     ▼
Media Player Core ◄────────► Ad Playback Coordinator
```

El Player proporciona primitivas como:

```text id="9kth45"
pauseContent()
resumeContent()
playAdMedia()
enterAdBreak()
exitAdBreak()
```

El Ad Manager decide:

```text id="edg1i8"
si existe anuncio
qué oportunidad aplica
cuándo debe ejecutarse
qué reglas comerciales aplicar
qué eventos medir
```

---

### e. Content Playback vs Ad Playback

Mantendremos dos conceptos separados.

```text id="qz2fx5"
Content Playback
```

y:

```text id="bzm55u"
Ad Playback
```

aunque ambos terminen utilizando `<video>` o infraestructura multimedia.

Esto evita que estados como:

```text id="gzy73b"
AD_LOADING
AD_PLAYING
AD_SKIPPABLE
```

contaminen innecesariamente el Player Core.

---

### f. Ad Opportunity

Introduciremos la entidad conceptual:

```text id="th12w0"
AdOpportunity
```

Representa un lugar donde **podría** mostrarse publicidad.

Ejemplo:

```json id="m73vhe"
{
  "id": "opp_123",
  "placement": "PLAYER_PREROLL",
  "mediaType": "video",
  "playbackTargetId": "episode_456"
}
```

Una oportunidad no garantiza que exista anuncio.

Puede terminar en:

```text id="oyzib5"
FILLED
NO_FILL
SKIPPED_BY_POLICY
TIMEOUT
DISABLED
ERROR
```

---

### g. Placements

En vez de codificar formatos directamente en toda la aplicación, utilizaremos placements.

Ejemplos:

```text id="bqg7wo"
PLAYER_PREROLL
PLAYER_MIDROLL
PLAYER_POSTROLL

WATCH_SIDEBAR
CONTENT_DETAIL_BANNER
HOME_BANNER
```

El MVP puede implementar solamente:

```text id="9n3d0r"
PLAYER_PREROLL
```

y quizá uno o dos slots display.

---

### h. Ad Policy

La política determinará si una oportunidad es elegible.

Conceptualmente:

```text id="vqk1k0"
Ad Opportunity
      +
Feature Flags
      +
Frequency Cap
      +
Placement Rules
      +
Session Context
      │
      ▼
eligible?
```

Esto evita hardcodear:

```text id="wt9j0v"
if prerollsShown === 0
```

en el Player.

---

### i. No fijar “1 anuncio” como arquitectura

El documento original establece máximo un pre-roll por sesión.

Puede seguir siendo una excelente política inicial.

Pero debe representarse como:

```text id="6v6r5e"
configuration
```

no como invariantes del sistema.

Ejemplo:

```json id="js1w67"
{
  "placement": "PLAYER_PREROLL",
  "enabled": true,
  "maxPerPlaybackSession": 1
}
```

---

### j. Skip Offset

Lo mismo ocurre con los cinco segundos del diseño original.

No será:

```text id="38amgq"
skip = always 5 seconds
```

sino:

```text id="ex88u5"
effectiveSkipOffset
```

derivado de:

* configuración;
* creative;
* VAST;
* política;
* Provider.

Por ejemplo:

```json id="2cdu6d"
{
  "skippable": true,
  "skipOffsetSeconds": 5
}
```

---

### k. Ad Decision

Una oportunidad elegible se transforma en una decisión.

```text id="1br6qt"
AdOpportunity
      │
      ▼
Ad Decision Service
      │
      ├── no eligible provider
      │       ↓
      │     NO_FILL
      │
      └── provider selected
              ↓
           AdDecision
```

---

### l. AdDecision

Conceptualmente:

```json id="f79o0j"
{
  "decisionId": "ad_dec_123",
  "opportunityId": "opp_456",
  "placement": "PLAYER_PREROLL",
  "provider": "provider_01",
  "format": "VAST",
  "expiresAt": "..."
}
```

Esto es una decisión del backend.

No significa todavía que se haya producido una impresión.

---

### m. Ad Session

Cuando comienza la ejecución:

```text id="gvew71"
AdDecision
    │
    ▼
AdSession
```

Ejemplo:

```json id="h6mq10"
{
  "adSessionId": "ads_123",
  "decisionId": "ad_dec_123",
  "placement": "PLAYER_PREROLL",
  "state": "READY",
  "expiresAt": "..."
}
```

Esto nos permite correlacionar:

```text id="4otqvf"
decision
load
start
quartiles
skip
complete
error
```

sin utilizar la Playback Session principal como entidad publicitaria.

---

### n. Estados de Ad Session

```text id="8ky5ks"
CREATED
   │
   ▼
LOADING
   │
   ├──► NO_FILL
   ├──► FAILED
   │
   ▼
READY
   │
   ▼
PLAYING
   │
   ├──► SKIPPED
   ├──► FAILED
   │
   ▼
COMPLETED
```

También:

```text id="bb7w8q"
EXPIRED
```

si nunca se ejecuta.

---

### o. VAST

Conservaremos VAST como contrato importante del sistema.

El documento original ya contempla elementos como:

```text id="qvk0qi"
Impression
MediaFile
TrackingEvents
VideoClicks
skipoffset
```

y eventos:

```text id="2ab58o"
start
firstQuartile
midpoint
thirdQuartile
complete
skip
```

Pero no expondremos XML VAST directamente al resto de la aplicación como modelo interno.

---

### p. Normalización VAST

Flujo:

```text id="uzn4q9"
VAST XML
   │
   ▼
VAST Parser
   │
   ▼
validation
   │
   ▼
normalized AdCreative
```

Ejemplo conceptual:

```json id="1rg5wi"
{
  "creativeId": "cr_123",

  "durationSeconds": 15,

  "media": [
    {
      "url": "...",
      "mimeType": "video/mp4",
      "width": 1280,
      "height": 720
    }
  ],

  "skip": {
    "enabled": true,
    "offsetSeconds": 5
  },

  "tracking": {
    "impression": [],
    "start": [],
    "firstQuartile": [],
    "midpoint": [],
    "thirdQuartile": [],
    "complete": [],
    "skip": []
  }
}
```

El Player consume este contrato normalizado.

No necesita entender el XML.

---

### q. VAST Wrappers

El documento original establece máximo dos niveles.

Conservaremos el principio de profundidad limitada, pero el número será configuración.

```text id="wwc0ue"
VAST
 │
 ▼
Wrapper
 │
 ▼
Wrapper
 │
 ▼
Inline
```

Controles:

```text id="xkbjlh"
maxWrapperDepth
totalDeadline
visited URLs
maxDocumentBytes
```

---

### r. Detección de loops

No basta con profundidad.

Ejemplo:

```text id="35qnyq"
A → B → C → A
```

Deberemos mantener:

```text id="s41mqz"
visited set
```

y abortar ciclos.

---

### s. Timeout total

Tampoco aplicaremos únicamente timeout individual por request.

Queremos:

```text id="qz9e7s"
total ad resolution deadline
```

porque:

```text id="hfhfui"
Wrapper A = 1 s
Wrapper B = 1 s
Wrapper C = 1 s
```

podría producir una espera excesiva aunque cada request individual sea válido.

---

### t. Fail-open

Este principio del documento original se conserva completamente:

> **Un fallo publicitario no debe impedir el acceso al contenido principal.**

Flujo:

```text id="cj26kk"
Ad request
    │
    ├── success ──► Ad playback ──► Content
    │
    ├── no-fill ──────────────────► Content
    │
    ├── timeout ──────────────────► Content
    │
    └── error ────────────────────► Content
```

Esto será una de las invariantes del subsistema.

---

### u. Ad Timeout

Los `1.500 ms` originales pasarán de ser una verdad arquitectónica a una hipótesis inicial de UX.

Mediremos:

```text id="x1bt84"
ad_decision_latency
ad_provider_latency
vast_resolution_latency
```

y estableceremos posteriormente un budget validado.

La regla permanente sí será:

```text id="3xlqai"
Ad latency must have a hard upper bound.
```

---

### v. Ad Playback Coordinator

Será la capa que conecta Ad Manager con Media Player Core.

Flujo pre-roll:

```text id="3xuxh6"
Playback intent
     │
     ▼
Ad Opportunity
     │
     ▼
Ad Decision
     │
     ├── NO_FILL ───────────────┐
     │                          │
     ▼                          │
Ad Session                      │
     │                          │
     ▼                          │
Ad Playback                     │
     │                          │
     ▼                          │
completed / skipped / failed    │
     │                          │
     └──────────────┬───────────┘
                    ▼
             Content Playback
```

---

### w. El Player no solicita directamente a cualquier ad-network

En una arquitectura madura preferiremos:

```text id="0o93ab"
Player
   │
   ▼
our Ad API
   │
   ▼
Ad Provider Integration
```

frente a:

```text id="ndh1wa"
Player
 ├── Provider A
 ├── Provider B
 └── Provider C
```

cuando técnicamente y contractualmente sea apropiado.

Esto nos permite controlar:

* configuración;
* timeouts;
* observabilidad;
* privacidad;
* provider switching;
* feature flags.

No implica que absolutamente todo el tráfico publicitario deba proxificarse.

---

### x. Provider Adapter

Al igual que Source Resolution, el Ad Manager podrá utilizar adaptadores:

```text id="u34j5f"
AdProvider
   │
   ▼
ProviderAdapter
```

Contrato conceptual:

```text id="st1fqi"
requestAd(context)
      ↓
AdProviderResult
```

Resultados:

```text id="r6e03w"
FILLED
NO_FILL
TIMEOUT
ERROR
```

---

### y. Provider-neutral domain

No construiremos el dominio alrededor de nombres concretos de redes.

El documento original menciona proveedores específicos.

Arquitectónicamente serán:

```text id="gl1sv4"
Provider A
Provider B
Provider C
```

detrás de interfaces.

Así una integración puede eliminarse sin reescribir Player o dominio.

---

### z. Frequency Capping

El documento original utiliza:

```text id="0f18au"
SessionStorage
```

para guardar último pre-roll y cantidad mostrada.

Lo conservaremos como mecanismo útil para usuarios anónimos, pero no como autoridad universal.

Podremos tener:

```text id="rhfivn"
Anonymous
   ↓
client-side frequency state
```

y:

```text id="bz4ypj"
Authenticated
   ↓
server-side frequency state
```

cuando sea necesario.

---

### aa. Frequency Cap Key

Conceptualmente:

```text id="wcv7up"
ad:frequency:{viewer_scope}:{placement}
```

con:

```text id="ug5zqr"
count
last_impression_at
window_start
```

El identificador del viewer deberá respetar las políticas de privacidad aplicables.

---

### ab. Frequency Policy

Ejemplo:

```json id="cs3ef9"
{
  "placement": "PLAYER_PREROLL",

  "limits": {
    "maxPerPlaybackSession": 1,
    "maxPerWindow": 3,
    "windowSeconds": 3600
  }
}
```

Son ejemplos de estructura, no valores comerciales definitivos.

---

### ac. Qué cuenta para frequency cap

Debemos definirlo.

No necesariamente:

```text id="m2v8wg"
ad requested
```

porque puede terminar en timeout.

Normalmente interesará distinguir:

```text id="gzavsn"
REQUESTED
FILLED
IMPRESSION
STARTED
COMPLETED
```

La política podrá consumir el cap al producirse:

```text id="8ux5bc"
IMPRESSION
```

o en otro evento explícitamente elegido.

---

### ad. Tracking

Los eventos VAST se transformarán en eventos internos.

```text id="hplvzo"
VAST impression
      ↓
AD_IMPRESSION

VAST start
      ↓
AD_STARTED

firstQuartile
      ↓
AD_FIRST_QUARTILE
```

etc.

Esto desacopla Analytics del estándar externo.

---

### ae. Eventos internos

Baseline:

```text id="ktmtrf"
AD_OPPORTUNITY_CREATED
AD_REQUESTED
AD_FILLED
AD_NO_FILL

AD_LOADED
AD_IMPRESSION
AD_STARTED

AD_FIRST_QUARTILE
AD_MIDPOINT
AD_THIRD_QUARTILE

AD_SKIPPED
AD_COMPLETED
AD_CLICKED
AD_FAILED
```

---

### af. Tracking Beacon Dispatcher

Los beacons no deberían dispararse accidentalmente varias veces por re-render de React.

Necesitamos:

```text id="pwx1ao"
AdSession
   │
   ▼
Tracking State
```

por ejemplo:

```text id="kfw89v"
impression_sent = true
start_sent = true
q1_sent = true
```

o un mecanismo equivalente.

---

### ag. Semántica at-most-once local

Dentro de una Ad Session intentaremos que cada evento lógico se procese una sola vez:

```text id="51xzvt"
AD_IMPRESSION
```

no:

```text id="b4zd9v"
AD_IMPRESSION × 4
```

por cuatro callbacks equivalentes.

Esto no significa que HTTP pueda garantizar exactly-once hacia sistemas externos.

---

### ah. Retry de tracking

Un beacon fallido puede reintentarse de manera limitada cuando sea apropiado.

Pero:

```text id="76bx9p"
tracking retry
```

nunca deberá retrasar:

```text id="dy0g1i"
content playback
```

Los dos caminos están desacoplados.

---

### ai. Telemetría comercial vs QoE

Separaremos:

### Ad Business Metrics

```text id="o4ovb5"
requests
fill
impressions
starts
completions
skips
clicks
```

### Ad QoE

```text id="1i2hse"
ad load latency
ad failure rate
content start delay caused by ads
ad-related abandonment
```

Esta segunda familia es importantísima porque monetización que destruye reproducción puede resultar contraproducente.

---

### aj. Ad-related Abandonment Rate

Conceptualmente:

```text id="pzty0l"
sessions abandoned during/after ad
─────────────────────────────────
sessions where ad was presented
```

La definición exacta de ventana temporal deberá decidirse posteriormente.

---

### ak. No-Fill Rate

Conservaremos la métrica original:

```text id="zflc88"
No-Fill Rate
```

pero la definiremos claramente:

```text id="p09pjj"
eligible ad requests returning NO_FILL
──────────────────────────────────────
eligible ad requests
```

No mezclaremos:

```text id="1g6d38"
NO_FILL
```

con:

```text id="9kefkp"
TIMEOUT
ERROR
BLOCKED
```

porque representan problemas diferentes.

---

### al. Fill Rate

```text id="9m15n8"
Fill Rate
=
FILLED
───────
eligible requests
```

según definición analítica acordada.

---

### am. Completion Rate

```text id="w1vmc7"
completed ads
─────────────
started ads
```

---

### an. Skip Rate

```text id="4p0ehb"
skipped ads
───────────
skippable started ads
```

Esto evita contar anuncios no skippable en el denominador incorrecto.

---

### ao. Revenue Metrics

Si los Providers entregan información económica válida, posteriormente podremos incorporar:

```text id="66ik0d"
estimated revenue
eCPM
revenue per playback session
```

Pero debemos distinguir:

```text id="1t7pbp"
estimated
```

de:

```text id="h8ddsp"
settled/final revenue
```

La plataforma no deberá inventar ingresos basándose únicamente en impresiones.

---

### ap. Display Ads

Los banners no pertenecen realmente al Player.

Arquitectura:

```text id="g78zm1"
Page Layout
   │
   ▼
Ad Slot
   │
   ▼
Display Ad Renderer
```

Ejemplo:

```text id="0f2k5x"
WATCH_SIDEBAR
```

o:

```text id="xtckoj"
CONTENT_DETAIL_BANNER
```

---

### aq. Ad Slot

Contrato conceptual:

```json id="nspab2"
{
  "slotId": "slot_watch_sidebar",
  "placement": "WATCH_SIDEBAR",
  "allowedFormats": [
    "IMAGE",
    "IFRAME"
  ],
  "dimensions": [
    {
      "width": 300,
      "height": 250
    }
  ]
}
```

---

### ar. No almacenar HTML/JS arbitrario como modelo principal

El esquema original contiene:

```sql id="pdmmd3"
html_code TEXT
```

para banners.

Esto es demasiado poderoso como primitive principal.

Preferiremos configuraciones estructuradas:

```json id="u3yfgz"
{
  "creativeType": "IMAGE",
  "assetUrl": "...",
  "clickUrl": "...",
  "altText": "..."
}
```

o:

```json id="wrfqxk"
{
  "creativeType": "PROVIDER_IFRAME",
  "providerId": "provider_01",
  "placementId": "..."
}
```

---

### as. JavaScript publicitario

Si una integración legítima requiere JavaScript de tercero, no deberá ejecutarse como si fuera código de primera parte.

Se utilizará aislamiento explícito.

```text id="mgoyj1"
Third-party creative
       │
       ▼
sandbox boundary
       │
       ▼
restricted capabilities
```

---

### at. iframe sandbox

Aquí también corregiremos un detalle del original.

El documento propone:

```html id="8f6wvd"
sandbox="allow-scripts allow-same-origin allow-popups"
```

No utilizaremos automáticamente esa combinación.

Especialmente:

```text id="b1q4lc"
allow-scripts
+
allow-same-origin
```

puede debilitar el aislamiento en determinados escenarios.

La política sandbox deberá utilizar **el mínimo conjunto de capabilities requerido** por cada integración.

---

### au. Navegación

Los creatives no deberán poder:

```text id="j2pnfd"
top-level redirect
```

arbitrariamente.

Los clicks legítimos se manejarán mediante una política explícita.

Cuando se abra una nueva pestaña:

```text id="t54jka"
noopener
noreferrer
```

cuando corresponda.

---

### av. Sanitización

No basaremos la seguridad únicamente en:

```text id="z2e1xw"
"sanitize arbitrary JS"
```

porque sanitizar JavaScript general de forma segura es un problema muy diferente a sanitizar markup limitado.

Preferencia:

```text id="11g5qz"
structured creative
>
sandboxed provider integration
>
arbitrary first-party HTML/JS
```

---

### aw. CSP

La Content Security Policy deberá considerar explícitamente los proveedores publicitarios permitidos.

Idealmente:

```text id="0uz37n"
script-src
frame-src
img-src
media-src
connect-src
```

con allowlists controladas.

La incorporación de un nuevo Provider puede requerir una revisión de CSP.

---

### ax. VAST XML Security

El parser deberá protegerse contra XML malicioso.

Controles:

```text id="st0qct"
maximum document size
wrapper depth
external entity restrictions
parsing timeout
URL validation
```

No debemos tratar XML externo como confiable.

---

### ay. SSRF en Ad Server Gateway

Si el backend recupera VAST/VMAP:

```text id="p1q5af"
Ad Provider URL
      │
      ▼
our server
```

entonces aparece otra superficie SSRF.

Aplicaremos principios similares al Resolver/Gateway:

```text id="jodj3i"
allowed provider configuration
URL validation
redirect validation
private network blocking
DNS protections
timeouts
response size limits
```

---

### az. Click URLs

Los destinos de click también son datos externos.

No debemos permitir esquemas como:

```text id="c5oz4a"
javascript:
data:
file:
```

para navegación.

Baseline:

```text id="w03ywm"
https:
```

y cualquier excepción deberá justificarse.

---

### ba. Tracking URLs

Lo mismo:

```text id="8e8ov4"
tracking URL
```

no significa:

```text id="ysl5fp"
trusted URL
```

Si el backend las ejecuta, deberán validarse.

---

### bb. Privacy Context

El Ad Manager deberá recibir únicamente el contexto necesario.

No construiremos un objeto gigante con:

```text id="c7vw9j"
full user profile
watch history
email
IP
every preference
```

si una decisión solo necesita:

```text id="9e7x1d"
placement
content classification
session context
device class
consent state
```

Principio:

> **Data minimization también aplica a monetización.**

---

### bc. Consent

La arquitectura deberá dejar espacio para:

```text id="1wuwlr"
consent state
```

cuando resulte necesario.

Ejemplo conceptual:

```json id="b63bqr"
{
  "personalizedAdsAllowed": false,
  "measurementAllowed": true
}
```

La política exacta dependerá del despliegue, jurisdicción y proveedores.

No la hardcodearemos en el motor.

---

### bd. Ad Configuration

Reemplazaremos el modelo excesivamente simple:

```text id="aoh56z"
ad_configurations
```

por una estructura conceptual más clara.

Podríamos tener:

```text id="c2yzwj"
ad_providers
ad_placements
ad_policies
```

y posteriormente:

```text id="uh4elr"
ad_campaigns
```

solo si realmente administramos campañas propias.

---

### be. `ad_providers`

Conceptualmente:

```sql id="ovdpfk"
CREATE TABLE ad_providers (
    id UUID PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    provider_type VARCHAR(32) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    priority INT NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
```

Secretos/API keys no se almacenarán en configuración pública de la tabla.

---

### bf. `ad_placements`

```sql id="u2z5gn"
CREATE TABLE ad_placements (
    id UUID PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    format VARCHAR(32) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
```

Ejemplos:

```text id="n6jzmt"
PLAYER_PREROLL
WATCH_SIDEBAR
```

---

### bg. `ad_policies`

Conceptualmente:

```sql id="a7y4pz"
CREATE TABLE ad_policies (
    id UUID PRIMARY KEY,
    placement_id UUID NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    configuration JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
```

El JSON podría contener:

```text id="t4ynrx"
frequency cap
skip rules
timeouts
provider ordering
```

siempre validado contra schema.

---

### bh. Configuración versionada

Los cambios comerciales pueden afectar muchas sesiones.

Conviene poder identificar:

```text id="8fytqh"
policy_version
```

en una Ad Session.

Así:

```text id="fs4pv1"
AdSession ads_123
used policy v17
```

y podemos reconstruir posteriormente por qué ocurrió una decisión.

---

### bi. Redis

Redis podrá almacenar:

```text id="8rhf5m"
ad:session:{id}
ad:frequency:{scope}:{placement}
ad:provider:health:{provider}
```

con TTL adecuado.

No será necesariamente la fuente permanente de reporting comercial.

---

### bj. Ad Session TTL

Las sesiones publicitarias serán cortas.

No tiene sentido mantener:

```text id="86uvk9"
READY ad session
```

durante horas.

El TTL se alineará con:

```text id="h0qixx"
decision validity
+
reasonable playback window
```

---

### bk. Provider Health

Los Providers externos pueden fallar.

Mantendremos señales como:

```text id="jyj1zp"
success rate
timeout rate
no-fill rate
latency
```

pero debemos distinguir:

```text id="hms9m9"
NO_FILL
```

de:

```text id="eyxnbh"
provider failure
```

No-fill no implica necesariamente que el proveedor esté caído.

---

### bl. Provider Circuit Breaker

Posteriormente:

```text id="2srtgx"
Provider
   │
high technical failure rate
   ▼
temporary circuit open
```

para evitar enviar continuamente solicitudes a una integración técnicamente degradada.

No necesariamente forma parte del MVP.

---

### bm. Provider Selection

En MVP puede ser simplemente:

```text id="syvflv"
priority
```

Posteriormente:

```text id="jz84kb"
policy
+
health
+
placement
+
fill history
+
commercial data
```

podrían influir.

No construiremos un exchange publicitario completo antes de necesitarlo.

---

### bn. Server-side auction

La ADR original propone subastas server-side entre tres redes y seleccionar el mayor eCPM.

La mantendremos como posibilidad futura, pero no como destino inevitable.

Primero:

```text id="v6w8ff"
single provider
```

o:

```text id="0k9k15"
simple waterfall
```

pueden ser suficientes.

Después, con datos reales:

```text id="o1lrfm"
auction?
```

---

### bo. Waterfall

Ejemplo futuro:

```text id="v8grko"
Provider A
   │
 NO_FILL
   ▼
Provider B
   │
 NO_FILL
   ▼
Provider C
```

Debe tener:

```text id="ctzc72"
global deadline
```

para que monetización no incremente indefinidamente el tiempo de inicio.

---

### bp. Parallel bidding

Otro modelo futuro:

```text id="1b4l4q"
       ┌── Provider A
request├── Provider B
       └── Provider C
              │
              ▼
           decision
```

Aumenta complejidad:

* latencia;
* costo;
* privacidad;
* reporting;
* comparabilidad de bids;
* contratos.

No MVP.

---

### bq. Observabilidad

Métricas operacionales:

```text id="v57m89"
ads_requests_total
ads_fill_total
ads_no_fill_total
ads_errors_total

ads_decision_duration_seconds
ads_provider_duration_seconds

ads_sessions_created_total
ads_sessions_active

ads_impressions_total
ads_started_total
ads_completed_total
ads_skipped_total
```

---

### br. QoE publicitaria

```text id="v5o2bm"
ads_content_start_delay_seconds
ads_playback_error_total
ads_abandonment_total
ads_timeout_total
```

Estas métricas deben correlacionarse con:

```text id="1w1qvi"
PlaybackSession
```

sin convertir IDs únicos en labels de alta cardinalidad.

---

### bs. Métricas por Provider

Podemos utilizar labels de baja cardinalidad:

```text id="3k8wl3"
provider
placement
format
result
```

Ejemplo:

```text id="jrrw7m"
ads_requests_total{
  provider="provider_a",
  placement="preroll",
  result="filled"
}
```

---

### bt. Logs

Ejemplo:

```json id="g6bssg"
{
  "service": "ad-manager",
  "event": "ad_decision_completed",
  "placement": "PLAYER_PREROLL",
  "provider": "provider_a",
  "result": "FILLED",
  "durationMs": 240
}
```

No:

```text id="l01fb7"
full VAST URL with tracking identifiers
```

por defecto.

El ejemplo original sí registra la `vast_url` completa en browser telemetry; evitaremos eso como práctica estándar.

---

### bu. Tracing

Una reproducción podría verse así:

```text id="qqtsfn"
Playback Intent
│
├── Ad Opportunity
│    ├── Policy Evaluation
│    ├── Provider Request
│    ├── VAST Resolution
│    └── Ad Playback
│
└── Content Playback
```

Esto permitirá identificar si un inicio lento fue provocado por:

```text id="uc1q19"
ads
```

o por:

```text id="ixzdfk"
source resolution / gateway / player
```

---

### bv. Alertas

Ejemplos conceptuales:

```text id="28jv1k"
AdProviderTechnicalFailureRateHigh
AdDecisionLatencyHigh
AdNoFillRateUnexpected
AdPlaybackFailureRateHigh
AdContentStartDelayHigh
```

Los thresholds se establecerán después de medir baseline.

---

### bw. AdBlockers

Conservamos el comportamiento original:

```text id="h6g2ds"
Ad blocked
   │
   ▼
graceful failure
   │
   ▼
content
```

El Player no deberá quedar:

```text id="3f5tgg"
LOADING AD...
```

indefinidamente.

---

### bx. AdBlocker no es Player Error

Importante:

```text id="doygo1"
ad blocked
```

no debe producir:

```text id="z7xkyb"
PLAYBACK_ERROR
```

del contenido.

Son dominios distintos.

Podrá registrarse:

```text id="ccmh1a"
AD_UNAVAILABLE
```

y continuar.

---

### by. Idempotencia

La creación de una Ad Opportunity podrá utilizar:

```text id="v1c2q6"
opportunityId
```

y la creación de sesión:

```text id="47txje"
decisionId
```

para evitar duplicados provocados por retries del frontend.

Ejemplo:

```text id="9pwby7"
POST /ad/opportunities
Idempotency-Key: ...
```

si se considera necesario.

---

### bz. API conceptual

### Solicitar oportunidad/decisión

```http id="44iwzo"
POST /v1/ads/decisions
```

Request:

```json id="5av2mo"
{
  "placement": "PLAYER_PREROLL",
  "playbackSessionId": "ps_123"
}
```

Response filled:

```json id="1c7ezq"
{
  "result": "FILLED",
  "adSessionId": "ads_456",
  "creative": {
    "type": "VIDEO",
    "durationSeconds": 15,
    "skippable": true,
    "skipOffsetSeconds": 5
  }
}
```

O:

```json id="8uhx0w"
{
  "result": "NO_FILL"
}
```

El contrato real se refinará al implementar.

---

### ca. API de eventos

Podrá existir:

```http id="mlsjmw"
POST /v1/ads/sessions/{id}/events
```

para eventos propios.

Ejemplo:

```json id="rdd6ab"
{
  "event": "AD_STARTED",
  "occurredAt": "..."
}
```

Pero no enviaremos `timeupdate` continuo.

---

### cb. Eventos de cuartiles

El Player/Ad Playback Coordinator calculará:

```text id="kfgbbi"
25%
50%
75%
100%
```

según timeline del creative.

Cada milestone deberá dispararse una vez.

---

### cc. Click Handling

Flujo:

```text id="p38gvu"
User click
   │
   ▼
AD_CLICKED
   │
   ├── tracking
   │
   └── validated destination
             │
             ▼
        new browsing context
```

No se permitirá navegación automática equivalente a un click sin interacción cuando la política no lo autorice.

---

### cd. Playback Interaction

Mientras se reproduce un anuncio lineal:

```text id="y16npd"
Content state preserved
        │
        ▼
Ad playback
        │
        ▼
Content restored
```

Conservaremos:

```text id="yrjcb5"
content currentTime
volume
mute
fullscreen state where feasible
```

---

### ce. Volume

La experiencia publicitaria no deberá ignorar de forma arbitraria la preferencia de volumen del usuario.

Por defecto:

```text id="r9dr8s"
ad volume
≈
content/player volume
```

salvo requerimiento específico.

---

### cf. Ad failure during playback

```text id="s0zqfl"
AD_PLAYING
   │
   X
media error
   │
   ▼
AD_FAILED
   │
   ▼
CONTENT
```

No:

```text id="4w07eh"
AD_FAILED
   ↓
fatal page error
```

---

### cg. Feature flags

Reorganizamos los originales:

```text id="p4gb19"
ads_enabled
ads_preroll_enabled
ads_display_enabled
ads_provider_{provider}_enabled
ads_tracking_enabled
```

Configuración dinámica:

```text id="eyhm9h"
ads_preroll_skip_policy
ads_frequency_policy
ads_provider_order
ads_decision_timeout
```

No todo debe ser boolean feature flag.

---

### ch. Emergency Kill Switch

Debe existir:

```text id="j24ebn"
ads_enabled = false
```

capaz de deshabilitar rápidamente publicidad ante:

* Provider comprometido;
* redirecciones maliciosas;
* degradación severa;
* incidentes de privacidad;
* errores generalizados.

El contenido debe continuar funcionando.

---

### ci. Testing unitario

Cubrir:

```text id="9hmqze"
policy evaluation
frequency cap
VAST parsing
wrapper resolution
loop detection
skip calculation
quartile calculation
event deduplication
provider normalization
```

---

### cj. Fixtures VAST

Conservaremos la idea del documento original de probar XML sintético.

Fixtures:

```text id="z7x42j"
valid inline
valid wrapper
multiple wrappers
wrapper loop
malformed XML
missing MediaFile
unsupported MIME
invalid duration
invalid skipoffset
oversized XML
timeout
no-fill
```

---

### ck. Integration Tests

```text id="xqk21h"
Mock Ad Provider
      │
      ▼
Ad Manager
      │
      ▼
Player
```

Verificar:

```text id="v5llc7"
FILLED → ad → content
NO_FILL → content
TIMEOUT → content
ERROR → content
```

Esta última propiedad debe ser especialmente protegida.

---

### cl. E2E

Con Playwright:

```text id="6oq6fl"
open content
      ↓
request playback
      ↓
preroll opportunity
      ↓
ad displayed
      ↓
skip becomes available
      ↓
skip
      ↓
content starts
```

Y:

```text id="z3yk7e"
ad provider blocked
      ↓
content still starts
```

---

### cm. Security Tests

Cubrir:

```text id="8lsbmk"
malicious VAST XML
wrapper loop
redirect to private network
javascript click URL
oversized creative metadata
malicious iframe
CSP violations
tracking URL abuse
sandbox escape assumptions
```

---

### cn. Performance Tests

Mediremos:

```text id="vxcygg"
Ad Decision p50/p95/p99
Provider latency
VAST parse duration
Wrapper resolution duration
Content start delay
```

No necesitamos demostrar miles de reproducciones publicitarias simultáneas antes de tener carga real, pero sí evitar regresiones.

---

### co. Riesgo — publicidad bloquea contenido

Mitigación:

```text id="fl56r8"
hard deadline
+
fail-open
+
isolated state
```

---

### cp. Riesgo — Provider comprometido

Mitigación:

```text id="4v2c4e"
kill switch
sandbox
CSP
provider allowlist
URL validation
monitoring
```

---

### cq. Riesgo — tracking duplicado

Mitigación:

```text id="k4szut"
AdSession
+
event deduplication
+
state machine
```

---

### cr. Riesgo — frequency cap inconsistente

Un usuario anónimo puede:

```text id="9zxexg"
clear storage
switch browser
```

Por tanto, el frequency cap local es:

```text id="d5k5nh"
best effort
```

No una garantía absoluta.

Para usuarios autenticados puede existir enforcement server-side más consistente.

---

### cs. Riesgo — ad latency destroys QoE

Mitigación:

```text id="qmeahh"
hard deadline
+
provider health
+
content start delay metric
+
Ad-related Abandonment Rate
```

No optimizaremos exclusivamente:

```text id="5c7aj7"
revenue per impression
```

ignorando:

```text id="lsq9pm"
Playback Success
```

---

### ct. Riesgo — demasiados terceros

Cada SDK publicitario puede aumentar:

```text id="lnc57j"
JS bundle
CPU
network requests
tracking surface
security exposure
privacy complexity
```

Por tanto, añadir Provider:

```text id="2hnmbt"
≠
just add script
```

Debe ser una decisión arquitectónica.

---

### cu. MVP

Aquí sería bastante conservador.

El **MVP técnico de la plataforma puede funcionar perfectamente sin publicidad**.

Recordemos que el MVP debe probar la tesis central:

```text id="dj48mu"
Content
→ Sources
→ Resolution
→ Gateway
→ Player
→ Recovery
```

No:

```text id="jchzyx"
¿podemos monetizar ya?
```

Por eso clasificaremos este motor:

```text id="pd9bj5"
MVP: optional / disabled by default
V1: supported
```

---

### cv. Primera implementación publicitaria

Cuando se active, comenzaría con:

```text id="p64ycv"
one placement
      +
one provider integration
      +
VAST linear preroll
      +
fail-open
      +
basic frequency cap
      +
tracking
```

No:

```text id="7r10p5"
3 ad networks
+
auction
+
VMAP
+
midroll
+
banners
+
header bidding
```

desde el primer día.

---

### cw. V1

Después:

```text id="iq5rlj"
multiple providers
display slots
VMAP
more advanced frequency caps
provider health
centralized reporting
```

si existe necesidad.

---

### cx. Posterior

Solo con escala real:

```text id="d4aym4"
server-side auction
advanced yield optimization
campaign management
forecasting
revenue attribution
```

---

### cy. Criterios de aceptación

El primer Ad Manager será aceptable cuando:

1. la publicidad pueda activarse/desactivarse sin modificar Player Core;
2. una oportunidad pueda resultar `FILLED`, `NO_FILL`, `TIMEOUT` o `ERROR`;
3. `NO_FILL`, timeout o error no impidan reproducir contenido;
4. VAST se normalice antes de llegar a Player;
5. exista límite de wrappers;
6. se detecten ciclos;
7. exista deadline global;
8. el creative pueda reproducirse;
9. `skipOffset` sea configurable/derivable;
10. impression/start/quartiles/complete/skip se emitan una sola vez lógicamente;
11. el frequency cap funcione;
12. los Providers puedan deshabilitarse;
13. exista kill switch global;
14. ningún secreto del Provider llegue al frontend;
15. URLs procesadas server-side estén sujetas a controles de seguridad;
16. publicidad de tercero esté aislada;
17. un AdBlocker no produzca fallo fatal del contenido;
18. pueda medirse el retraso añadido al inicio del contenido.

---

### cz. ADRs abiertas

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

---

### da. Arquitectura consolidada

```text id="2ve2u6"
                     PLAYBACK INTENT
                           │
                           ▼
                 ┌───────────────────┐
                 │    AD MANAGER     │
                 └─────────┬─────────┘
                           │
                  Ad Opportunity
                           │
                           ▼
                    ┌────────────┐
                    │ Ad Policy  │
                    └─────┬──────┘
                          │
                 ┌────────┴────────┐
                 │                 │
            NOT ELIGIBLE        ELIGIBLE
                 │                 │
                 │                 ▼
                 │         Ad Decision Service
                 │                 │
                 │         ┌───────┴───────┐
                 │         │               │
                 │      NO_FILL          FILLED
                 │         │               │
                 │         │               ▼
                 │         │          Ad Session
                 │         │               │
                 │         │               ▼
                 │         │        VAST Normalizer
                 │         │               │
                 │         │               ▼
                 │         │      Ad Playback Coordinator
                 │         │               │
                 │         │        ┌──────┴──────┐
                 │         │        │             │
                 │         │     COMPLETE       FAIL
                 │         │        │             │
                 └─────────┴────────┴──────┬──────┘
                                           ▼
                                   MEDIA PLAYER CORE
                                           │
                                           ▼
                                   CONTENT PLAYBACK
```

Y alrededor:

```text id="0vc4px"
                  AD PROVIDERS
                       ▲
                       │
                 Provider Adapters
                       ▲
                       │
                    Ad Manager
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    Frequency Cap   Telemetry   Feature Flags
```

### Reglas maestras del Motor 5

Dejaría estas cinco explícitamente en el documento:

> **1. Ningún fallo publicitario debe convertir un contenido reproducible en contenido no reproducible.**

> **2. Media Player Core reproduce; Ad Manager decide y coordina publicidad.**

> **3. VAST/VMAP son protocolos de integración, no el modelo de dominio interno de la plataforma.**

> **4. Código publicitario de terceros se considera no confiable y debe ejecutarse bajo aislamiento explícito.**

> **5. Monetización debe medirse conjuntamente con su impacto sobre QoE, especialmente Content Start Delay y Ad-related Abandonment.**

Con esto corregimos además una cuestión estructural importante del documento original: `player_vast_ads_enabled` deja de pertenecer conceptualmente al Player y pasa al dominio de Ads; el Player solo expone las capacidades necesarias para coordinar un ad break. Del mismo modo, `html_code TEXT` deja de ser nuestra primitive publicitaria preferida y pasamos a **creatives estructurados + integraciones aisladas**.

Nuestro pipeline completo empieza entonces a verse así:

```text id="ctqv5d"
                    DISCOVERY / INGESTION
                            │
                            ▼
                         CATALOG
                            │
                            ▼
                     SOURCE REGISTRY
                            │
                            ▼
                  PLAYBACK ORCHESTRATOR
                            │
                            ▼
                     SOURCE RESOLVER
                            │
                            ▼
                         ADAPTER
                            │
                            ▼
                PLAYABLE REPRESENTATION
                            │
                            ▼
                     MEDIA GATEWAY
                            │
                            ▼
                    PLAYBACK SESSION
                            │
                ┌───────────┴────────────┐
                │                        │
                ▼                        ▼
           AD MANAGER             MEDIA PLAYER CORE
                │                        ▲
                └── Ad coordination ─────┘
                                         │
                                         ▼
                                PLAYBACK EXPERIENCE
```

El siguiente bloque original es el **6. Motor de Usuarios y Autenticación**. Ahí hay bastante que revisar: actualmente mezcla **Identity/Auth, perfiles, RBAC, refresh tokens, historial, bookmarks y preferencias** dentro del mismo motor; fija JWT stateless + blacklist Redis; almacena `user_agent` e `ip_address` en `refresh_tokens`; usa `episode_id`/`anime_id` aunque ya generalizamos el catálogo; y propone un write-behind Redis→PostgreSQL cada 60 segundos para progreso.

Ese siguiente bloque conviene dividirlo conceptualmente en al menos **Identity & Access**, **User Profile/Preferences** y **User Library/Playback History**, aunque durante el MVP puedan seguir viviendo dentro del mismo Core API y la misma PostgreSQL.


Sííí jajaja. Vamos con el **Motor 6**, y este necesita una revisión bastante profunda porque en el documento original realmente hay **varios dominios diferentes metidos bajo “Usuarios y Autenticación”**.

El original agrupa registro/login, JWT, refresh tokens, OAuth, RBAC, perfil, preferencias, historial de reproducción, favoritos y listas. Además propone blacklist de JWT en Redis, write-behind del progreso cada 60 segundos, `user_agent` e IP asociados al refresh token y límites concretos de rendimiento/seguridad.

La idea funcional se conserva, pero vamos a separar responsabilidades sin caer en microservicios prematuros.
