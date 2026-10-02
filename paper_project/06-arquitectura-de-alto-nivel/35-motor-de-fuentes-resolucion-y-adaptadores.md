## 6.35. Motor de Fuentes, Resolución y Adaptadores

### a. Propósito general

El dominio de Sources es responsable de representar y administrar las distintas ubicaciones o integraciones mediante las cuales una unidad audiovisual del catálogo **puede llegar a ser reproducible**.

Su diseño se divide explícitamente en cuatro conceptos:

```text
Source Registry
      │
      ▼
Source Resolver
      │
      ▼
Adapter Registry
      │
      ▼
Playable Representation
```

Aunque durante el MVP estos componentes puedan residir en el mismo proceso o módulo físico, deberán mantenerse separados conceptualmente.

Cada uno responde a una pregunta distinta:

```text
Source Registry
¿Qué Sources conocemos?

Source Resolver
¿Cómo convierto esta Source en algo reproducible?

Adapter Registry
¿Qué integración sabe resolver este tipo de Source?

Playable Representation
¿Qué resultado reproducible obtuvimos?
```

El dominio no decide qué Source debe utilizar el usuario. Esa responsabilidad pertenece al **Playback Orchestrator**.

Tampoco transmite el contenido audiovisual al cliente. Esa responsabilidad corresponde al **Media Gateway** cuando sea necesaria su intervención.

---

## 2.1. Modelo conceptual

La cadena fundamental será:

```text
Content / Playback Target
          │
          │ 1:N
          ▼
        Source
          │
          │ N:1
          ▼
       Provider
          │
          ▼
       Adapter
          │
          ▼
      Resolution
          │
          ▼
Playable Representation
```

Esta separación es crítica.

No deberán tratarse como sinónimos:

```text
Provider ≠ Source
Source ≠ Adapter
Source ≠ Representation
Adapter ≠ Resolver
```

---

## 2.2. Source

Una **Source** representa una referencia persistente conocida por la plataforma desde la cual potencialmente puede obtenerse una representación audiovisual.

Ejemplo conceptual:

```json
{
  "id": "src_123",
  "playbackTargetId": "episode_456",
  "providerId": "provider_01",
  "locator": "...",
  "language": "es-419",
  "declaredQuality": "1080p",
  "priority": 50,
  "status": "ACTIVE"
}
```

Una Source no implica que el recurso sea reproducible en ese preciso instante.

Por ello:

```text
Source exists
     ≠
Source resolves successfully
```

Puede existir una Source cuya última resolución haya fallado.

---

## 2.3. Provider

Un **Provider** representa un sistema, servicio o tipo de origen con el que la plataforma posee una integración permitida.

Ejemplo conceptual:

```text
Provider
│
├── id
├── name
├── type
├── domains / identifiers
├── enabled
└── operational policy
```

Un Provider puede tener muchas Sources:

```text
Provider A
   │
   ├── Source 1
   ├── Source 2
   ├── Source 3
   └── Source N
```

Esto evita repetir configuración común en cada Source.

---

## 2.4. Adapter

Un **Adapter** encapsula el conocimiento técnico necesario para interactuar con un determinado tipo de Provider o Source.

Contrato conceptual:

```text
Source
   │
   ▼
Adapter
   │
   ▼
ResolutionResult
```

Los detalles específicos de una integración deberán quedar confinados dentro del Adapter.

El resto del sistema no deberá saber:

* cómo se obtiene una representación;
* qué endpoints utiliza el Provider;
* qué formato devuelve;
* cómo se normaliza su respuesta;
* qué parámetros particulares necesita.

Esto mantiene una propiedad muy importante del diseño original: si una integración cambia, deberá poder modificarse su Adapter sin alterar Player, Catalog, Orchestrator o Gateway. El documento original ya proponía Strategy + Factory precisamente con este objetivo.

---

## 2.5. Playable Representation

Una **Playable Representation** es el resultado temporal y normalizado de resolver una Source.

Ejemplo:

```json
{
  "representationId": "rep_789",
  "sourceId": "src_123",
  "protocol": "HLS",
  "resource": "...",
  "expiresAt": "2026-09-25T01:30:00Z",
  "qualities": [
    {
      "height": 1080,
      "bandwidth": 3500000
    },
    {
      "height": 720,
      "bandwidth": 2000000
    }
  ],
  "audioTracks": [],
  "subtitleTracks": []
}
```

La representación puede ser efímera aunque la Source sea persistente.

```text
Source src_123
      │
      ├── Resolution 10:00 → Representation A
      │                       expires 11:00
      │
      ├── Resolution 12:00 → Representation B
      │                       expires 13:00
      │
      └── Resolution 15:00 → failure
```

Esto es precisamente por lo que `resolved_url` no debe almacenarse como si fuera la identidad de la Source.

---

## 2.6. Source Registry

#### a. Responsabilidad

El **Source Registry** será la fuente de verdad operacional sobre las Sources conocidas.

Será responsable de:

* registrar Sources;
* asociarlas a un Playback Target;
* asociarlas a un Provider;
* almacenar idioma;
* almacenar calidad declarada cuando exista;
* mantener prioridad administrativa;
* activar o desactivar Sources;
* almacenar estado operacional agregado;
* conservar timestamps relevantes;
* proporcionar candidatos al Playback Orchestrator.

No resolverá Sources.

No seleccionará la Source ganadora.

No transmitirá medios.

---

#### b. Relación con Catalog

La relación será:

```text
CATALOG

MediaItem
   │
   └── Episode
          │
          │ playback_target_id
          ▼

SOURCE REGISTRY

        Source A
        Source B
        Source C
```

El Source Registry podrá referenciar:

```text
media_item_id
```

para contenidos unitarios, o:

```text
episode_id
```

para contenido episódico.

A nivel de dominio, ambos representan un:

```text
PlaybackTarget
```

No será necesario crear obligatoriamente una tabla `playback_targets` durante el MVP si esta abstracción puede mantenerse en la capa de aplicación.

---

## 2.7. Estado de Source

El ciclo de estado básico será:

```text
DISCOVERED
     │
     ▼
   ACTIVE
     │
     ▼
 DEGRADED
     │
     ▼
UNAVAILABLE
```

Pero **no deberá interpretarse como una máquina irreversible y estrictamente lineal**.

Por ejemplo:

```text
UNAVAILABLE
     │
     │ successful health checks
     ▼
   ACTIVE
```

o:

```text
DEGRADED
   │
   ├── recovery ─────► ACTIVE
   │
   └── failures ─────► UNAVAILABLE
```

`DISCOVERED` significa que conocemos la Source pero todavía no existe evidencia suficiente para considerarla operacional.

---

## 2.8. Modelo de datos del Source Registry

Una estructura inicial podría ser:

```text
providers
    │
    │ 1:N
    ▼
sources
    │
    ├── source_health_observations
    └── source_resolution_attempts
```

 `providers`

```text
id
key
name
type
enabled
configuration
created_at
updated_at
```

 `sources`

```text
id
playback_target_type
playback_target_id
provider_id
locator
language
declared_quality
priority
status
enabled
last_resolved_at
last_success_at
last_failure_at
created_at
updated_at
```

El `locator` deberá considerarse información operacional potencialmente sensible y no deberá exponerse innecesariamente al frontend.

---

## 2.9. DDL conceptual

```sql
CREATE TYPE source_status AS ENUM (
    'discovered',
    'active',
    'degraded',
    'unavailable'
);

CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    provider_key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,

    provider_type VARCHAR(100),

    enabled BOOLEAN NOT NULL DEFAULT TRUE,

    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Sources:

```sql
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    playback_target_type VARCHAR(50) NOT NULL,
    playback_target_id UUID NOT NULL,

    provider_id UUID NOT NULL
        REFERENCES providers(id),

    locator TEXT NOT NULL,

    language VARCHAR(35),

    declared_quality VARCHAR(50),

    priority INTEGER NOT NULL DEFAULT 0,

    status source_status
        NOT NULL DEFAULT 'discovered',

    enabled BOOLEAN NOT NULL DEFAULT TRUE,

    last_resolved_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Índices iniciales:

```sql
CREATE INDEX idx_sources_playback_target
ON sources(playback_target_type, playback_target_id);

CREATE INDEX idx_sources_provider
ON sources(provider_id);

CREATE INDEX idx_sources_status_enabled
ON sources(status, enabled);

CREATE INDEX idx_sources_target_priority
ON sources(
    playback_target_type,
    playback_target_id,
    priority DESC
);
```

La integridad referencial del `playback_target_id` polimórfico deberá estudiarse posteriormente. Si se desea integridad FK estricta desde PostgreSQL, podrá evolucionarse hacia un modelo explícito de `playback_targets`.

---

## 2.10. Alta manual de una Source

Flujo:

```text
Admin / Moderator
       │
       ▼
    CMS/API
       │
       ▼
Validate Playback Target
       │
       ▼
Identify Provider
       │
       ▼
Normalize Locator
       │
       ▼
Create Source
       │
       ▼
DISCOVERED
       │
       ▼
Optional validation job
```

La creación de la Source no deberá depender necesariamente de una resolución síncrona exitosa.

Esto permite distinguir:

```text
registro
```

de:

```text
validación operacional
```

---

## 2.11. Ingesta automática de Sources

En fases posteriores:

```text
Discovery
    │
    ▼
Source Candidate
    │
    ▼
Normalization
    │
    ▼
Deduplication
    │
    ▼
Content Matching
    │
    ▼
Source Registry
    │
    ▼
DISCOVERED
```

El sistema deberá impedir que el mismo candidato genere cientos de Sources duplicadas.

Podrán utilizarse:

```text
normalized locator
provider
playback target
external identifier
fingerprint
```

como señales de deduplicación.

---

## 2.12. Source Resolver

#### a. Propósito y responsabilidad única

El **Source Resolver** recibe una Source conocida y trata de obtener una Playable Representation válida.

Su contrato conceptual será:

```text
resolve(Source, ResolutionContext)
        ↓
ResolutionResult
```

No será responsable de:

* descubrir Sources;
* decidir cuál Source utilizar;
* guardar contenidos del catálogo;
* determinar prioridades;
* hacer fallback global;
* crear la experiencia del Player;
* retransmitir video.

---

## 2.13. Resolution Context

El Resolver podrá recibir únicamente el contexto necesario para ejecutar correctamente la integración.

Ejemplo conceptual:

```json
{
  "sourceId": "src_123",
  "capabilities": {
    "hls": true,
    "maxHeight": 1080,
    "codecs": ["h264"]
  },
  "forceRefresh": false
}
```

Deberá aplicarse minimización de datos.

No se transmitirá automáticamente:

```text
IP completa del usuario
User-Agent completo
identidad del usuario
cookies del navegador
```

salvo que exista una necesidad técnica legítima y explícitamente diseñada.

El documento original enviaba `User-Agent` e IP del cliente como parte normal del payload de resolución.  En la arquitectura revisada, eso deja de ser el comportamiento por defecto.

---

## 2.14. Contrato del Resolver

Una interfaz interna podría conceptualizarse así:

```text
POST /internal/v1/resolutions
```

Request:

```json
{
  "sourceId": "src_123",
  "forceRefresh": false,
  "capabilities": {
    "protocols": ["HLS", "MP4"],
    "maxHeight": 1080
  }
}
```

Respuesta exitosa:

```json
{
  "data": {
    "resolutionId": "res_789",
    "sourceId": "src_123",
    "representation": {
      "protocol": "HLS",
      "resource": "...",
      "expiresAt": "2026-09-25T01:30:00Z",
      "qualities": [
        {
          "height": 1080,
          "bandwidth": 3500000
        },
        {
          "height": 720,
          "bandwidth": 2000000
        }
      ]
    }
  }
}
```

El recurso interno no deberá exponerse necesariamente al Player.

Posteriormente el Orchestrator decidirá cómo convertir esta representación en una Playback Session.

---

## 2.15. Modelo de errores de resolución

El Resolver deberá utilizar una taxonomía estable independiente de errores particulares de cada Provider.

Ejemplos:

```text
SOURCE_NOT_FOUND
SOURCE_DISABLED
PROVIDER_DISABLED

UNSUPPORTED_SOURCE
UNSUPPORTED_REPRESENTATION

UPSTREAM_TIMEOUT
UPSTREAM_UNAVAILABLE
UPSTREAM_RATE_LIMITED

RESOLUTION_FAILED
INVALID_RESPONSE
INVALID_MANIFEST

ACCESS_NOT_AVAILABLE
TEMPORARILY_UNAVAILABLE

INTERNAL_RESOLVER_ERROR
```

El Adapter podrá conocer un error específico del Provider, pero deberá normalizarlo antes de devolverlo al resto de la plataforma.

Ejemplo:

```text
Provider-specific error
        │
        ▼
      Adapter
        │
        ▼
UPSTREAM_RATE_LIMITED
```

El Orchestrator no deberá contener lógica como:

```text
if provider == X and error == Y...
```

---

## 2.16. Resolution Attempt

Cada intento importante de resolución deberá poder representarse operacionalmente.

```text
ResolutionAttempt
│
├── resolution_id
├── source_id
├── adapter_id
├── started_at
├── completed_at
├── duration_ms
├── outcome
├── normalized_error
└── cache_hit
```

Esto permite calcular posteriormente:

```text
Source Resolution Success Rate
```

por:

* Provider;
* Adapter;
* Source;
* período;
* protocolo.

---

## 2.17. Adapter Registry

El **Adapter Registry** mantiene el inventario de Adapters disponibles.

Ejemplo:

```text
AdapterRegistry
│
├── provider-a → ProviderAAdapter
├── provider-b → ProviderBAdapter
└── provider-c → ProviderCAdapter
```

Contrato conceptual:

```text
interface SourceAdapter {
    canHandle(source): boolean

    resolve(
        source,
        context
    ): ResolutionResult
}
```

La implementación concreta dependerá del lenguaje elegido.

---

## 2.18. Strategy + Factory

Conservaremos expresamente esta decisión del documento original.

```text
                Source
                  │
                  ▼
          Adapter Factory
           /      |      \
          /       |       \
         ▼        ▼        ▼
 Adapter A   Adapter B   Adapter C
         \        |        /
          \       |       /
           ▼      ▼      ▼
          ResolutionResult
```

**Strategy** permite encapsular diferentes estrategias de integración detrás de una interfaz común.

**Factory/Registry** permite seleccionar la implementación adecuada sin contaminar el Resolver con condicionales específicos de cada Provider.

---

## 2.19. Configuración de Adapters

El documento original almacena `domain_patterns`, `rate_limit_rpm`, `requires_headless` y un `config JSONB` que incluso incluye selectores, deobfuscators y proxies.

La versión revisada será más neutral:

```text
source_adapters
│
├── id
├── provider_id
├── version
├── enabled
├── supported_protocols
├── rate_limit_policy
├── configuration
├── created_at
└── updated_at
```

DDL conceptual:

```sql
CREATE TABLE source_adapters (
    id VARCHAR(100) PRIMARY KEY,

    provider_id UUID NOT NULL
        REFERENCES providers(id),

    version VARCHAR(50) NOT NULL,

    enabled BOOLEAN NOT NULL DEFAULT TRUE,

    supported_protocols TEXT[],

    rate_limit_rpm INTEGER,

    configuration JSONB
        NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Los secretos nunca deberán almacenarse directamente dentro de `configuration`.

La tabla deberá contener referencias a secretos administrados externamente cuando sea necesario.

---

## 2.20. Flujo completo de resolución

El flujo oficial será:

```text
Playback Orchestrator
        │
        │ resolve(source_id)
        ▼
Source Resolver
        │
        ▼
Source Registry
        │
        │ Source
        ▼
Adapter Registry
        │
        ▼
Adapter
        │
        ▼
Authorized External Integration
        │
        ▼
Adapter normalization
        │
        ▼
Playable Representation
        │
        ▼
Resolution Cache
        │
        ▼
Playback Orchestrator
```

Obsérvese una diferencia fundamental respecto del documento original:

**Media Gateway deja de ser quien inicia la resolución.**

El original establece al Gateway como consumidor principal del Extractor.

La nueva dependencia será:

```text
Orchestrator
     │
     ▼
Resolver
     │
     ▼
Representation
     │
     ▼
Gateway
```

y no:

```text
Gateway
   ↓
Extractor
```

Esto mantiene al Gateway dentro del Data Plane y al Resolver dentro del Control Plane.

---

## 2.21. Caché de resoluciones

Aquí sí conservamos una de las buenas ideas del diseño original.

Una representación temporal puede almacenarse en Redis:

```text
resolution:source:{source_id}
```

o, si diferentes capabilities pueden producir representaciones diferentes:

```text
resolution:{source_id}:{capability_hash}
```

Valor conceptual:

```json
{
  "resolutionId": "res_123",
  "representation": {},
  "resolvedAt": "...",
  "expiresAt": "..."
}
```

El TTL deberá derivarse de la vigencia real del resultado cuando esta sea conocida.

Por ejemplo:

```text
upstream expiration
       │
       ▼
safety margin
       │
       ▼
Redis TTL
```

No deberá asumirse siempre un margen fijo.

---

## 2.22. Freshness Window

Además de expiración absoluta, podrá existir un margen de seguridad:

```text
expiresAt = 15:00
safetyWindow = 5 min

usableUntil = 14:55
```

De esta manera evitamos entregar al Player una representación que expirará segundos después de comenzar la reproducción.

---

## 2.23. Request Coalescing / Singleflight

También conservaremos esta idea del documento original.

Si llegan simultáneamente:

```text
resolve(src_123)
resolve(src_123)
resolve(src_123)
resolve(src_123)
```

no necesariamente deben producir cuatro solicitudes externas.

Conceptualmente:

```text
Request A ─────┐
Request B ─────┤
Request C ─────┼──► Resolution in flight
Request D ─────┘           │
                           ▼
                        Result
                      /  /  \  \
                     A  B    C  D
```

Debe aplicarse únicamente a resoluciones equivalentes.

Por ello, la clave podrá considerar:

```text
source_id
+
capability_hash
+
resolution mode
```

cuando corresponda.

---

## 2.24. Política de reintentos

El documento original prescribe siempre hasta tres reintentos y después escalamiento mediante infraestructura alternativa.

La nueva política será **dependiente del error**.

#### Reintentables

Por ejemplo:

```text
network reset
temporary timeout
selected 5xx
temporary service unavailable
```

#### No reintentables

Por ejemplo:

```text
invalid source
unsupported source
malformed response
access unavailable
provider disabled
```

Regla:

```text
retry only if
error is transient
AND
retry budget remains
AND
request deadline permits
```

Los reintentos deberán utilizar:

```text
bounded retries
+
backoff
+
jitter
```

para evitar retry storms.

---

## 2.25. Deadline total

Además del timeout individual, cada resolución deberá tener un presupuesto total.

Ejemplo conceptual:

```text
Resolution Deadline
       5 s
        │
        ├── attempt 1
        ├── backoff
        └── attempt 2
```

No:

```text
5 s
+ 5 s
+ 5 s
+ ...
```

indefinidamente.

El Playback Orchestrator necesita saber rápidamente si debe intentar otra Source.

---

## 2.26. Circuit Breaker

No es obligatorio en el primer MVP, pero la arquitectura deberá permitir incorporarlo.

Si un Provider presenta:

```text
failure rate muy alto
```

durante una ventana determinada:

```text
CLOSED
   │
   ▼
 OPEN
   │
   ▼
HALF_OPEN
   │
   ├── success → CLOSED
   └── failure → OPEN
```

Esto evita bombardear una integración claramente degradada.

Será una optimización de resiliencia basada en evidencia operacional.

---

## 2.27. Concurrencia por Provider

Los límites de concurrencia no deberán ser necesariamente globales.

Podrá existir:

```text
Provider A
max concurrent resolutions = X

Provider B
max concurrent resolutions = Y
```

según:

* capacidad;
* políticas del servicio;
* rate limits;
* costo;
* comportamiento observado.

Esto puede implementarse mediante semáforos distribuidos o locales dependiendo de la topología.

---

## 2.28. Seguridad: SSRF

Este es uno de los requisitos más importantes del motor.

El Resolver procesa referencias externas; por tanto, una Source manipulada no deberá poder hacer que la infraestructura consulte arbitrariamente recursos internos.

Flujo obligatorio:

```text
Source locator
      │
      ▼
URL Parser
      │
      ▼
Scheme Policy
      │
      ▼
Hostname Policy
      │
      ▼
DNS Resolution
      │
      ▼
IP Classification
      │
      ├── private? ──────► BLOCK
      ├── loopback? ─────► BLOCK
      ├── link-local? ────► BLOCK
      ├── reserved? ──────► BLOCK
      └── allowed
              │
              ▼
         HTTP Request
```

Por defecto deberán bloquearse destinos internos no autorizados.

---

## 2.29. Redirect Validation

Una URL inicialmente válida puede redirigir a una dirección peligrosa.

Por tanto:

```text
Request
  │
  ▼
302 Location
  │
  ▼
VALIDATE AGAIN
  │
  ▼
Next Request
```

Cada redirect deberá atravesar nuevamente la política SSRF.

Además deberá existir un límite de redirecciones.

---

## 2.30. DNS Rebinding

La validación no deberá confiar únicamente en el hostname textual.

Un dominio podría resolver inicialmente a una IP pública y posteriormente a una dirección interna.

Por ello, el cliente HTTP controlado deberá considerar protección frente a:

```text
DNS rebinding
```

y validar los destinos efectivos de conexión.

---

## 2.31. Límites de respuesta

Una integración externa no deberá poder consumir recursos ilimitados.

Cada operación deberá poseer límites de:

```text
timeout
response bytes
redirect count
header size
body size
concurrency
```

Un documento HTML o manifest inesperadamente gigantesco deberá abortarse.

---

## 2.32. Ejecución de contenido externo

El documento original propone evaluar JavaScript externo desofuscado en `isolated-vm` o WASM para evitar RCE.

La regla revisada será más estricta:

> **El proceso principal del Resolver nunca deberá ejecutar código arbitrario recibido desde una Source externa.**

Si una integración autorizada requiriese procesamiento activo, deberá implementarse mediante mecanismos específicamente diseñados y aislados para esa integración, con:

* sandbox;
* límites de CPU;
* límites de memoria;
* timeout;
* filesystem restringido;
* egress restringido;
* proceso descartable.

Nunca:

```text
eval(untrustedExternalCode)
```

dentro del proceso principal.

---

## 2.33. Gestión de secretos

Los Adapters podrán requerir credenciales para integraciones autorizadas.

Estas deberán obtenerse mediante:

```text
Secret Manager
      │
      ▼
Adapter runtime
```

y no almacenarse:

* en Git;
* en logs;
* en payloads del Player;
* en `sources`;
* en JSON de configuración sin cifrado apropiado.

---

## 2.34. Observabilidad

El motor deberá distinguir claramente entre **Source health** y **Resolver health**.

Una Source puede estar perfectamente disponible mientras nuestro Adapter está roto.

Y un Adapter puede funcionar mientras una Source concreta ha desaparecido.

Por ello:

```text
source availability
        ≠
adapter reliability
```

---

## 2.35. Métricas del Resolver

Métricas fundamentales:

```text
source_resolution_requests_total
source_resolution_success_total
source_resolution_failures_total
source_resolution_duration_seconds
source_resolution_cache_hits_total
source_resolution_cache_misses_total
```

Etiquetas de baja cardinalidad apropiadas:

```text
provider
adapter
outcome
protocol
```

Evitar:

```text
source_id
user_id
full_url
```

como labels de Prometheus debido a cardinalidad potencialmente enorme.

---

## 2.36. Métricas de Adapter

```text
adapter_resolution_requests_total
adapter_resolution_failures_total
adapter_resolution_duration_seconds
adapter_rate_limit_events_total
adapter_circuit_state
```

Esto permitirá responder:

> ¿Está fallando una Source o todo el Adapter?

---

## 2.37. Logs estructurados

Ejemplo:

```json
{
  "level": "info",
  "service": "source-resolver",
  "requestId": "req_123",
  "resolutionId": "res_456",
  "sourceId": "src_789",
  "provider": "provider_a",
  "adapter": "provider_a_v3",
  "outcome": "success",
  "cacheHit": false,
  "durationMs": 342
}
```

No deberán registrarse:

```text
cookies
authorization headers
secret tokens
full credentials
sensitive query parameters
```

Las URLs operacionales deberán redactarse cuando puedan contener tokens.

---

## 2.38. Tracing

El trace completo podrá ser:

```text
Playback Request
      │
      ▼
Orchestrator
      │
      ▼
Resolver
      │
      ├── Redis cache
      │
      └── Adapter
             │
             ▼
         Provider
             │
             ▼
       Normalization
             │
             ▼
      Representation
```

El `resolution_id` deberá permitir correlacionar logs y métricas de una operación.

---

## 2.39. Alertas

Las alertas deberán derivarse de comportamiento observado.

Ejemplos:

```text
AdapterFailureRateHigh
ResolutionLatencyHigh
ProviderRateLimited
ResolutionCacheError
ResolverErrorRateHigh
```

No fijaremos todavía como contrato permanente:

```text
>30% durante exactamente 5 minutos
```

aunque esa cifra del documento original puede conservarse como **umbral inicial a validar operacionalmente**, no como verdad arquitectónica.

---

## 2.40. Relación con Health Checker

El Health Checker podrá utilizar el Resolver como una señal, pero no serán el mismo componente.

```text
Health Checker
      │
      ▼
Controlled Resolution Probe
      │
      ▼
Resolution Result
      │
      ▼
Health Observation
      │
      ▼
Source Registry
```

Sin embargo, deberá evitarse que los health checks produzcan una carga externa comparable a tráfico real.

Se podrán utilizar:

* sampling;
* intervalos adaptativos;
* backoff;
* prioridades;
* probes ligeros cuando estén disponibles.

---

## 2.41. Relación con Playback Orchestrator

El Orchestrator es el consumidor principal del Resolver.

```text
Orchestrator
     │
     ├── Source A
     │      │
     │      ▼
     │   Resolver ─── success
     │
     └── create Playback Session
```

Si falla:

```text
Orchestrator
     │
     ├── Source A
     │      └── resolution failed
     │
     ├── record evidence
     │
     └── Source B
            │
            ▼
         Resolver
```

El **Resolver no selecciona Source B**.

Eso es importante.

El fallback entre Sources pertenece al Orchestrator.

---

## 2.42. Relación con Media Gateway

Una vez obtenida la representación:

```text
Resolver
   │
   ▼
Playable Representation
   │
   ▼
Playback Orchestrator
   │
   ▼
Media Gateway
```

El Gateway recibirá únicamente la información necesaria para habilitar el modo de entrega correspondiente.

De esta manera:

```text
Resolver = integration plane
Gateway  = media/data plane
```

---

## 2.43. Relación con Discovery/Ingestion

Discovery puede encontrar candidatos.

No debe convertir directamente cada URL descubierta en una resolución activa.

```text
Discovery
    │
    ▼
Candidate
    │
    ▼
Ingestion
    │
    ▼
Normalize / Match / Deduplicate
    │
    ▼
Source Registry
    │
    ▼
Resolver
```

Esto evita que información externa no validada entre directamente en el camino crítico de reproducción.

---

## 2.44. Persistencia de intentos

La tabla original `extraction_logs` es útil, pero la generalizaremos a `source_resolution_attempts`.

```sql
CREATE TYPE resolution_outcome AS ENUM (
    'success',
    'failure',
    'timeout',
    'rate_limited',
    'unavailable',
    'invalid_response',
    'unsupported'
);

CREATE TABLE source_resolution_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    source_id UUID NOT NULL
        REFERENCES sources(id)
        ON DELETE CASCADE,

    adapter_id VARCHAR(100)
        REFERENCES source_adapters(id),

    outcome resolution_outcome NOT NULL,

    duration_ms INTEGER,

    error_code VARCHAR(100),

    cache_hit BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Índices:

```sql
CREATE INDEX idx_resolution_attempt_source_time
ON source_resolution_attempts(
    source_id,
    created_at DESC
);

CREATE INDEX idx_resolution_attempt_adapter_outcome
ON source_resolution_attempts(
    adapter_id,
    outcome,
    created_at DESC
);
```

---

## 2.45. Retención de logs operacionales

No es necesario conservar eternamente cada resolución.

La política podrá ser:

```text
recent detailed data
        │
        ▼
aggregated historical metrics
        │
        ▼
expiration
```

Por ejemplo, los intentos detallados pueden tener retención limitada mientras las métricas agregadas sobreviven más tiempo.

La duración exacta deberá establecerse posteriormente según:

* volumen;
* utilidad;
* privacidad;
* costo;
* troubleshooting.

---

## 2.46. Feature flags

El diseño original utiliza flags por Adapter y para distintos mecanismos de resolución.

Conservaremos la idea, pero con semántica más general:

```text
resolver_enabled
resolver_cache_enabled

adapter_{provider}_enabled

resolver_circuit_breaker_enabled
resolver_background_refresh_enabled
```

Los flags específicos de mecanismos no requeridos por la arquitectura no forman parte del baseline.

---

## 2.47. Testing — Unit

Cada Adapter deberá poder probarse aisladamente con fixtures controlados.

```text
fixture
   │
   ▼
Adapter
   │
   ▼
expected normalized representation
```

Casos:

```text
valid response
malformed response
missing fields
expired resource
timeout
rate limit
unsupported representation
```

Esto conserva la excelente idea de fixtures/mocks que ya estaba en el documento.

---

## 2.48. Contract Tests

Todo Adapter deberá satisfacer el mismo contrato.

Ejemplo conceptual:

```text
Adapter Contract Suite
        │
        ├── returns normalized protocol
        ├── validates expiry
        ├── never leaks secrets
        ├── produces normalized errors
        └── respects cancellation/deadline
```

De esta forma, añadir `Adapter D` no requiere inventar una nueva semántica.

---

## 2.49. Integration Tests

Para integraciones autorizadas y estables podrán existir pruebas controladas:

```text
Test Source
     │
     ▼
Real Adapter
     │
     ▼
Provider Test Resource
     │
     ▼
Resolution
```

Estas pruebas deberán ejecutarse con frecuencia razonable y respetando las condiciones del proveedor.

Una caída del test externo deberá clasificarse separadamente de un fallo de CI interno.

---

## 2.50. Resilience Tests

El Resolver deberá probar escenarios como:

```text
slow upstream
connection reset
invalid DNS
redirect loop
oversized response
malformed manifest
expired representation
Redis unavailable
Adapter exception
```

También deberá comprobarse que una falla de Adapter no derribe el proceso completo.

---

## 2.51. Security Tests

Especialmente:

```text
SSRF
redirect-to-private-IP
DNS rebinding scenarios
oversized payload
malformed URL
dangerous schemes
secret leakage
log injection
```

Este motor tiene una superficie de ataque considerablemente mayor que Catalog y deberá tratarse como componente de alto riesgo.

---

## 2.52. Performance Budget

El documento original establece:

| Modalidad |       p50 |       p95 |
| --------- | --------: | --------: |
| HTTP      |   <250 ms |   <800 ms |
| Headless  | <2.500 ms | <5.000 ms |

además de `500 RPS` y `20 RPS` respectivamente, con presupuestos concretos de CPU/RAM.

No eliminaremos esa ambición, pero la reclasificaremos.

Para la arquitectura revisada:

| Métrica                 | MVP               | V1                    |
| ----------------------- | ----------------- | --------------------- |
| Resolution latency p50  | medir baseline    | SLO validado          |
| Resolution latency p95  | medir baseline    | SLO validado          |
| Resolution success rate | medir por Adapter | objetivo por Provider |
| Cache hit ratio         | medir             | optimizar             |
| Concurrent resolutions  | load test         | capacity target       |
| CPU / resolution        | medir             | capacity planning     |
| Memory / worker         | medir             | capacity planning     |

Una cifra específica solo se convierte en SLO después de disponer de evidencia.

---

## 2.53. Métrica crítica: Resolution Success Rate

Definimos formalmente:

```text
Source Resolution Success Rate
=
successful resolutions
────────────────────────
eligible resolution attempts
```

Debe poder calcularse:

```text
global
per provider
per adapter
per source class
per time window
```

Una tasa global puede ocultar que un Adapter concreto está completamente roto.

---

## 2.54. Riesgo — Provider cambia integración

**Problema:**

Una integración externa cambia su contrato.

**Impacto:**

```text
Adapter A
   ↓
resolution failures
```

**Mitigación:**

* Adapter aislado;
* contract tests;
* health signals;
* alertas;
* feature flag;
* Source alternatives;
* fallback mediante Orchestrator.

El cambio no deberá requerir modificar Catalog, Player o Gateway.

---

## 2.55. Riesgo — Source Poisoning

Una Source podría contener una referencia maliciosa.

Mitigaciones:

```text
normalization
+
SSRF policy
+
scheme allowlist
+
redirect validation
+
egress restrictions
+
response limits
```

La validación sintáctica de URL que proponía el documento original es necesaria, pero por sí sola no es suficiente.

---

## 2.56. Riesgo — Retry Storm

Si un Provider cae y existen miles de sesiones:

```text
1000 requests
     ×
3 retries
     =
3000 upstream attempts
```

puede empeorar el incidente.

Mitigaciones:

```text
retry budget
circuit breaker
backoff + jitter
singleflight
concurrency limits
cached failure signals
```

---

## 2.57. Riesgo — Cache Stampede

Una representación muy utilizada expira simultáneamente para muchos usuarios.

```text
representation expires
         │
         ▼
1000 resolve requests
```

Mitigación:

```text
singleflight
+
refresh-ahead
+
TTL safety window
```

El **refresh-ahead** podrá actualizar una representación antes de su expiración cuando exista tráfico suficiente que lo justifique.

---

## 2.58. Riesgo — Representación expira durante playback

No basta con que una representación sea válida al iniciar.

El sistema deberá conocer:

```text
expiresAt
```

cuando sea posible.

Si:

```text
expected playback duration
>
remaining representation lifetime
```

el Orchestrator/Gateway podrá necesitar estrategias posteriores de renovación de sesión.

Esto se desarrollará con mayor profundidad en Media Gateway y Playback Session.

---

## 2.59. Riesgo — Adapter defectuoso

Un bug puede producir una representación sintácticamente válida pero incorrecta.

Mitigación:

```text
Adapter
   ↓
Normalization
   ↓
Representation Validation
   ↓
Resolver
```

El Resolver deberá validar invariantes antes de aceptar el resultado.

Ejemplos:

* protocolo soportado;
* URL/resource válido;
* expiración coherente;
* esquema permitido;
* tracks válidos;
* tamaños razonables.

---

## 2.60. MVP físico

Para el MVP **no necesitamos un microservicio por cada concepto**.

Topología:

```text
Core API
│
├── Source Registry module
│
└── Playback Orchestrator
        │
        ▼
Resolver Worker / Service
        │
        ├── Adapter A
        ├── Adapter B
        └── Adapter C

PostgreSQL
Redis
```

El Source Registry puede residir dentro de Core API.

El Resolver sí tiene razones para poseer una frontera de proceso relativamente temprana:

* realiza I/O externo;
* tiene timeouts distintos;
* presenta mayor superficie de seguridad;
* puede consumir más recursos;
* puede necesitar concurrencia independiente;
* un Adapter defectuoso no debería derribar Core API.

Aun así, esto no obliga a desplegarlo desde el primer día en otra máquina.

Puede ser:

```text
Docker Compose

core-api
resolver-worker
postgres
redis
media-gateway
web
```

---

## 2.61. MVP funcional

Para demostrar este motor necesitamos únicamente:

```text
1. Registrar Provider A.

2. Registrar Source A para Episode 1.

3. Registrar Source B para Episode 1.

4. Resolver Source A mediante Adapter A.

5. Normalizar el resultado.

6. Cachear temporalmente la representación.

7. Registrar ResolutionAttempt.

8. Simular fallo de Source A.

9. Permitir que Orchestrator solicite Source B.

10. Resolver Source B correctamente.
```

Con eso ya demostramos la propiedad fundamental:

```text
Episode
   │
   ├── Source A ── X
   │
   └── Source B ── ✓
```

sin modificar Catalog ni Player.

---

## 2.62. Criterios de aceptación

El dominio podrá considerarse funcional para el MVP cuando:

* un Playback Target pueda tener al menos dos Sources;
* cada Source tenga identidad independiente;
* una Source pueda habilitarse/deshabilitarse;
* pueda conocerse su estado;
* un Provider pueda tener un Adapter;
* el Resolver pueda seleccionar el Adapter correspondiente;
* el Adapter pueda producir una Playable Representation normalizada;
* la representación pueda expirar;
* una resolución pueda cachearse;
* resoluciones concurrentes equivalentes puedan coalescerse cuando corresponda;
* los fallos tengan errores normalizados;
* cada intento pueda observarse;
* un fallo de una Source no afecte la identidad del contenido;
* un fallo de un Adapter no derribe Catalog;
* Orchestrator pueda intentar otra Source;
* las referencias externas estén protegidas por controles SSRF;
* secretos y recursos internos no lleguen al Player.

---

## 2.63. Decisiones explícitamente descartadas del baseline

No forman parte del requisito base del motor:

```text
resolución automática de CAPTCHA
OCR para CAPTCHA
evasión de Cloudflare
rotación de identidad para eludir bloqueos
proxies residenciales como mecanismo obligatorio
```

Si una Source requiere mecanismos de acceso no disponibles mediante la integración permitida:

```text
Source
   │
   ▼
ACCESS_NOT_AVAILABLE
```

y el Orchestrator podrá probar otra Source.

Esto simplifica enormemente el sistema y, sobre todo, mantiene limpia la frontera de responsabilidad del Resolver.

---

## 2.64. ADRs abiertas

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

---

## 2.65. Arquitectura consolidada del motor

Finalmente, todo este dominio puede visualizarse así:

```text
                         CATALOG
                            │
                     Playback Target
                            │
                            ▼
                 ┌────────────────────┐
                 │  SOURCE REGISTRY   │
                 │                    │
                 │ Source A           │
                 │ Source B           │
                 │ Source C           │
                 └─────────┬──────────┘
                           │
                           │ candidates
                           ▼
                 PLAYBACK ORCHESTRATOR
                           │
                           │ selected source
                           ▼
                 ┌────────────────────┐
                 │  SOURCE RESOLVER   │
                 └─────────┬──────────┘
                           │
                     cache lookup
                      ┌────┴────┐
                      │         │
                    HIT        MISS
                      │         │
                      │         ▼
                      │   ADAPTER REGISTRY
                      │         │
                      │         ▼
                      │      Adapter
                      │         │
                      │         ▼
                      │    External
                      │   Integration
                      │         │
                      │         ▼
                      │    Normalize
                      │         │
                      └────┬────┘
                           ▼
                  PLAYABLE REPRESENTATION
                           │
                  ┌────────┴────────┐
                  │                 │
                  ▼                 ▼
           Resolution Cache    ResolutionAttempt
                  │
                  ▼
          PLAYBACK ORCHESTRATOR
                  │
                  ▼
             MEDIA GATEWAY
                  │
                  ▼
           PLAYBACK SESSION
                  │
                  ▼
          MEDIA PLAYER CORE


     HEALTH CHECKER
           │
           └────────► Source Registry

     DISCOVERY / INGESTION
           │
           └────────► Source Registry
```

Esta es una mejora bastante profunda sobre el motor original: **no estamos quitándole potencia; estamos separando su potencia en conceptos que pueden evolucionar independientemente**.

Y además acabamos de resolver una ambigüedad que recorría varias páginas del documento original: antes el **Media Gateway llamaba al Extractor**, el Extractor hacía parte del failover, Health Checker también lo llamaba y el Player recibía prácticamente URLs ya ligadas a servidores.  Ahora el flujo tiene un único sentido inequívoco:

```text
Catalog
   ↓
Source Registry
   ↓
Playback Orchestrator
   ↓
Source Resolver
   ↓
Adapter
   ↓
Playable Representation
   ↓
Media Gateway
   ↓
Playback Session
   ↓
Media Player Core
```

**El siguiente es el Motor 3: Media Gateway / Proxy de Medios**, y ahí sí tenemos otra cirugía importante. El original actualmente presupone que todo HLS pasa por el proxy, expone la URL original del segmento codificada en Base64 en `/v1/proxy/segment`, guarda IP + hash de User-Agent en la sesión, propone cachear públicamente segmentos por 24 horas, promete hasta 5.000 conexiones por pod y ~800 Mbps por servidor, y después intenta aliviar costos mediante “Smart Passthrough”.

Ese motor lo podemos dejar **muchísimo más sólido** si lo diseñamos alrededor de `PlaybackSession + opaque resource IDs + delivery modes + manifest rewriting seguro + SSRF + Range Requests + streaming/backpressure + bandwidth accounting + token/key rotation + failure model`, sin asumir que proxyar todos los bytes sea siempre la respuesta.


Perfecto. Ahora sí entramos al **Motor 3: Media Gateway / Proxy de Medios**. Aquí conviene ser especialmente meticulosos porque este componente puede convertirse en el mayor consumidor de **ancho de banda, conexiones y costo de infraestructura** de toda la plataforma.

El bloque original ya define varias bases valiosas: sesiones efímeras en Redis, tokens temporales, reescritura HLS, streaming sin almacenamiento local, métricas de ancho de banda, protección anti-hotlinking y reconocimiento explícito del riesgo económico de retransmitir todo el video. También propone un “Smart Passthrough” para evitar proxy innecesario.

Vamos a conservar esas ideas, pero cambiando una premisa fundamental:

> **Media Gateway no significa necesariamente “proxy por donde deben pasar todos los bytes”.**

Es una **capa de entrega y control de reproducción** capaz de elegir diferentes modalidades de delivery según la representación obtenida y las políticas de la plataforma.

---
