## 6.36. Media Gateway / Media Delivery Gateway

### a. Propósito y responsabilidad única

El **Media Gateway** es el componente especializado del Data Plane responsable de convertir una **Playable Representation autorizada** en recursos consumibles de forma segura y controlada por una **Playback Session**.

Su responsabilidad principal será:

> **Gestionar la frontera de entrega entre las representaciones audiovisuales resueltas por el backend y el Media Player Core.**

Podrá encargarse, dependiendo del modo de entrega, de:

* validar Playback Sessions;
* autorizar solicitudes de reproducción;
* emitir recursos temporales;
* servir manifests;
* reescribir manifests HLS cuando sea necesario;
* mapear recursos internos a identificadores opacos;
* retransmitir recursos audiovisuales cuando corresponda;
* soportar Range Requests cuando corresponda;
* controlar timeouts y límites;
* aplicar rate limits;
* gestionar expiraciones;
* medir bytes transferidos;
* producir telemetría operacional;
* proteger información de infraestructura interna.

---

### b. Lo que el Gateway NO hace

El Gateway no deberá:

* descubrir contenido;
* buscar Sources;
* decidir qué Source utilizar;
* ejecutar Source Adapters;
* resolver una Source desde cero;
* administrar metadatos del catálogo;
* decidir fallback entre Sources;
* gestionar preferencias del usuario;
* almacenar permanentemente contenido audiovisual;
* transcodificar por defecto;
* convertirse en CDN;
* ejecutar lógica editorial.

Por tanto:

```text
Catalog
   ↓
Source Registry
   ↓
Playback Orchestrator
   ↓
Source Resolver
   ↓
Playable Representation
   ↓
────────────────────────────
        MEDIA GATEWAY
────────────────────────────
   ↓
Playback Session
   ↓
Media Player Core
```

---

### c. Control Plane vs Data Plane

Esta separación queda ahora formalizada.

#### Control Plane

```text
Catalog
Source Registry
Playback Orchestrator
Source Resolver
Health Checker
Discovery / Ingestion
```

Estas operaciones manejan principalmente:

```text
JSON
metadata
decisions
state
control messages
```

#### Data Plane

```text
Media Gateway
       +
Media Player Core
```

Aquí pueden circular:

```text
manifests
segments
MP4 ranges
audio
subtitles
media bytes
```

La diferencia de escala es enorme.

Una solicitud al Orchestrator puede transferir unos pocos KB.

Una sesión de reproducción puede transferir varios GB.

Por ello:

> **Core API y Media Gateway no deben tratarse como si tuvieran el mismo perfil de carga.**

---

### d. Entrada principal

El Gateway no recibirá simplemente una URL externa arbitraria.

Recibirá una estructura creada a partir de una resolución autorizada.

Conceptualmente:

```json
{
  "playbackSessionId": "ps_123",
  "sourceId": "src_456",
  "representationId": "rep_789",
  "protocol": "HLS",
  "resource": "...",
  "expiresAt": "...",
  "deliveryPolicy": {
    "mode": "GATEWAY_MANIFEST",
    "allowRanges": true
  }
}
```

La representación habrá sido obtenida previamente:

```text
Source
   ↓
Resolver
   ↓
Adapter
   ↓
Playable Representation
```

El Gateway no necesita volver a resolverla.

---

### e. Playback Session como frontera de seguridad

La entidad central del Gateway será:

```text
PlaybackSession
```

No:

```text
raw external URL
```

El Player trabaja con una sesión autorizada.

Conceptualmente:

```text
User requests playback
        │
        ▼
Playback Orchestrator
        │
        ▼
select Source
        │
        ▼
resolve Source
        │
        ▼
Playable Representation
        │
        ▼
create Playback Session
        │
        ▼
Media Gateway
        │
        ▼
Player
```

---

### f. Modelo conceptual de Playback Session

```json
{
  "id": "ps_01H...",
  "playbackTargetId": "episode_456",
  "sourceId": "src_123",
  "representationId": "rep_789",

  "delivery": {
    "mode": "GATEWAY_MANIFEST",
    "entrypoint": "/v1/playback/ps_01H/master.m3u8"
  },

  "expiresAt": "2026-09-25T00:30:00Z",

  "capabilities": {
    "seek": true,
    "qualitySelection": true,
    "audioTracks": true,
    "subtitles": true
  }
}
```

El Player no necesita recibir:

```text
origin URL
provider credentials
provider cookies
internal headers
adapter configuration
```

---

### g. Delivery Modes

Esta será una mejora importante respecto al diseño original.

El Gateway soportará conceptualmente diferentes **Delivery Modes**.

```text
DIRECT
GATEWAY_MANIFEST
FULL_PROXY
REDIRECT
```

No necesariamente todos deberán implementarse en el MVP.

---

### h. DIRECT

Cuando la representación pueda entregarse directamente de forma segura, permitida y técnicamente compatible:

```text
Player
   │
   ▼
Authorized media endpoint
```

El Gateway no transporta los bytes audiovisuales.

Ventaja:

```text
Gateway egress ≈ 0
```

para ese stream.

Desventajas potenciales:

* menor control;
* CORS;
* expiración;
* compatibilidad;
* exposición del endpoint;
* restricciones del proveedor.

Por ello DIRECT no será universal.

---

### i. GATEWAY_MANIFEST

El Gateway entrega o reescribe el manifest, pero determinados recursos pueden seguir una ruta diferente cuando sea seguro hacerlo.

```text
Player
   │
   ▼
Gateway Manifest
   │
   ├── resource A → Gateway
   ├── resource B → Gateway
   └── resource C → authorized direct delivery
```

Esta es una generalización más limpia de lo que el documento original denomina **Smart Passthrough**.

---

### j. FULL_PROXY

Todos los recursos necesarios pasan por el Gateway.

```text
Player
   │
   ▼
Gateway
   │
   ▼
Upstream
```

Puede ser necesario cuando:

* la integración requiere mediación;
* existen restricciones de CORS;
* se necesita ocultar infraestructura interna;
* deben mantenerse credenciales fuera del cliente;
* existen políticas específicas de acceso;
* se requiere control adicional.

Pero tiene un costo importante:

```text
User downloads 3 GB
        │
        ▼
Gateway transfers ~3 GB outbound
```

Con miles de usuarios, esta diferencia domina la arquitectura económica.

---

### k. REDIRECT

En determinadas integraciones:

```text
Player
   │
   ▼
Gateway
   │
   ▼
302 / 307
   │
   ▼
Authorized Resource
```

puede ser suficiente.

La política exacta dependerá de la representación y del Provider.

---

### l. Selección del Delivery Mode

No será responsabilidad del Player.

Conceptualmente:

```text
Playable Representation
        +
Provider Policy
        +
Security Policy
        +
Client Capability
        │
        ▼
Delivery Strategy
        │
        ▼
Playback Session
```

El resultado puede ser:

```text
DIRECT
```

o:

```text
GATEWAY_MANIFEST
```

o:

```text
FULL_PROXY
```

---

### m. API pública del Gateway

En vez del diseño original:

```text
/v1/proxy/m3u8?token=...
/v1/proxy/segment?url=<base64-url>
```

propongo recursos ligados a sesión:

```text
GET /v1/playback/{session_id}/manifest
```

y:

```text
GET /v1/playback/{session_id}/resources/{resource_id}
```

Ejemplo:

```text
/v1/playback/ps_123/resources/r_abc
```

No:

```text
/v1/proxy/segment?url=aHR0cHM6Ly...
```

---

### n. Resource ID opaco

Esta es una corrección importante.

El diseño original envía al cliente la URL original codificada en Base64URL.

Pero:

```text
Base64 ≠ encryption
Base64 ≠ authorization
Base64 ≠ security
```

Por ello:

```text
Origin URL
     │
     ▼
Gateway Resource Map
     │
     ▼
opaque resource_id
     │
     ▼
Player
```

Ejemplo:

```text
r_7f32a9
```

Redis podrá mantener:

```text
gateway:resource:{session_id}:{resource_id}
```

con:

```json
{
  "origin": "...",
  "type": "segment",
  "expiresAt": "...",
  "policy": {}
}
```

---

### o. Reescritura de HLS

Supongamos que el Resolver obtiene:

```text
master.m3u8
```

que referencia:

```text
720/index.m3u8
1080/index.m3u8
```

y estos contienen segmentos.

El Gateway podrá transformar:

```text
https://origin.example/720/index.m3u8
```

en:

```text
/v1/playback/ps_123/resources/r_001
```

y:

```text
segment001.ts
```

en:

```text
/v1/playback/ps_123/resources/r_002
```

El Player solo ve recursos autorizados de la sesión.

---

### p. Parsing estructural de manifests

El manifest no deberá tratarse simplemente como:

```text
string.replace(...)
```

Se utilizará un parser consciente de HLS.

Deberá reconocer, según corresponda:

* master playlists;
* media playlists;
* variant streams;
* audio tracks;
* subtitle tracks;
* initialization maps;
* encryption-key references;
* byte ranges;
* relative URLs;
* absolute URLs;
* discontinuities.

Esto es importante porque una playlist HLS es más que una lista de `.ts`.

---

### q. Resolución de URLs relativas

Ejemplo:

```text
origin:

https://media.example/path/master.m3u8
```

contiene:

```text
../video/720.m3u8
```

El Gateway deberá resolver correctamente:

```text
base URI
+
relative URI
```

antes de crear el recurso interno.

---

### r. SSRF en Media Gateway

El Gateway tendrá controles SSRF igual de estrictos —o más— que el Resolver.

Nunca deberá existir:

```text
GET /proxy?url=<arbitrary-user-url>
```

donde el cliente decide libremente qué URL consulta el servidor.

Ese patrón convierte el Gateway en un proxy SSRF potencial.

La ruta correcta es:

```text
Player
   │
resource_id
   ▼
Gateway
   │
session resource map
   ▼
validated origin
```

---

### s. Validación de cada recurso

Incluso una URL obtenida desde un manifest previamente aceptado deberá pasar controles.

```text
Manifest
   │
   ▼
Referenced URL
   │
   ▼
Parse
   │
   ▼
Scheme validation
   │
   ▼
DNS/IP validation
   │
   ▼
Policy validation
   │
   ▼
Resource registration
```

Esto es importante porque un manifest externo podría contener referencias a:

```text
localhost
127.0.0.1
169.254.x.x
RFC1918/private networks
internal hostnames
```

---

### t. Redirects

Cada redirect deberá volver a validarse:

```text
Allowed URL
   │
   ▼
302
   │
   ▼
Location
   │
   ▼
SSRF validation again
```

Con:

```text
max_redirects
```

limitado.

---

### u. Esquemas permitidos

Baseline:

```text
https
http       [solo si la política lo permite]
```

No deberán aceptarse automáticamente:

```text
file:
ftp:
data:
gopher:
javascript:
```

ni otros esquemas no previstos.

---

### v. Playback Token

La sesión deberá estar protegida mediante credenciales temporales.

Podrán utilizarse:

```text
opaque session token
```

o:

```text
signed token
```

según el diseño definitivo.

Un token firmado deberá incluir como mínimo información equivalente a:

```text
session_id
issued_at
expires_at
scope
key_id
```

---

### w. Rotación de claves

Si se utiliza HMAC:

```text
Key K1
   ↓
sign tokens
```

eventualmente deberá poder sustituirse por:

```text
Key K2
```

sin invalidar inmediatamente todos los tokens existentes.

Para ello:

```text
token
│
├── kid = K2
└── signature
```

El Gateway puede mantener temporalmente:

```text
K1 → verify only
K2 → sign + verify
```

hasta completar la rotación.

---

### x. Scope del token

Una credencial no deberá ser una llave universal del Gateway.

Podrá limitarse a:

```text
session
resource class
expiry
```

Conceptualmente:

```text
scope:
playback:ps_123
```

No:

```text
scope:
gateway:everything
```

---

### y. IP locking

El documento original almacena la IP del cliente y después propone `gateway_enforce_ip_lock`, junto con subnet locking `/24` para tolerar cambios móviles.

No utilizaremos el IP locking estricto como baseline.

Las redes:

* móviles;
* corporativas;
* CGNAT;
* IPv6;
* VPN;
* Wi-Fi/cellular handoff

pueden cambiar durante una reproducción legítima.

Por tanto, la autorización primaria será:

```text
short-lived session
+
token
+
expiry
+
rate limits
```

El contexto de red podrá utilizarse como **señal de riesgo**, no necesariamente como requisito rígido.

---

### z. User-Agent binding

Por la misma razón, tampoco vincularemos rígidamente una sesión a un hash de User-Agent salvo que exista una necesidad demostrada.

El Player debe poder sobrevivir a variaciones legítimas del entorno cliente.

---

### aa. Redis

El Gateway podrá utilizar Redis para estado efímero.

Ejemplo:

```text
gateway:session:{session_id}
```

Campos:

```text
playback_target_id
source_id
representation_id
delivery_mode
expires_at
created_at
```

No es necesario almacenar directamente:

```text
client_ip
full_user_agent
```

como parte obligatoria.

---

### ab. Resource Map

Ejemplo:

```text
gateway:resources:{session_id}
```

Conceptualmente:

```json
{
  "r_001": {
    "kind": "manifest",
    "origin": "...",
    "expiresAt": "..."
  },
  "r_002": {
    "kind": "segment",
    "origin": "...",
    "expiresAt": "..."
  }
}
```

Podrá implementarse mediante:

* Redis Hash;
* claves individuales;
* token autocontenido cifrado;
* estructura híbrida.

La implementación definitiva se decidirá posteriormente.

---

### ac. TTL

El documento original fija 30 minutos para `gateway:session:{session_id}`.

La versión revisada no utilizará 30 minutos universalmente.

Debe cumplirse aproximadamente:

```text
session TTL
≤
usable lifetime of representation
```

salvo que exista renovación.

Por ejemplo:

```text
Representation expires: 01:00
Safety margin:           00:05

Session usable until:
00:55
```

---

### ad. Renovación de sesión

Aquí aparece una necesidad que el documento original no desarrolla suficientemente.

¿Qué ocurre si una película dura:

```text
2 h 30 min
```

pero la representación expira en:

```text
45 min?
```

Necesitamos eventualmente:

```text
PlaybackSession
      │
      ▼
approaching expiration
      │
      ▼
renew
      │
      ▼
Orchestrator
      │
      ▼
Resolver
      │
      ▼
new Representation
      │
      ▼
update / replace session
```

Idealmente preservando:

```text
current playback position
```

---

### ae. Session State

Una máquina conceptual:

```text
CREATED
   │
   ▼
ACTIVE
   │
   ├────► EXPIRED
   │
   ├────► REVOKED
   │
   └────► FAILED
```

Opcionalmente:

```text
ACTIVE
  │
  ▼
RENEWING
  │
  ▼
ACTIVE
```

si implementamos renovación transparente.

---

### af. Streaming Passthrough

Cuando el Gateway transporte bytes:

```text
Upstream Socket
      │
      ▼
Gateway
      │
      ▼
Client Socket
```

deberá utilizar streaming.

No:

```text
download entire segment
      ↓
store in RAM
      ↓
send entire segment
```

sino:

```text
read chunk
   ↓
write chunk
   ↓
read chunk
   ↓
write chunk
```

---

### ag. Backpressure

Aquí añadimos un concepto importante que falta en el bloque original.

Supongamos:

```text
Upstream = 100 Mbps
Client   = 5 Mbps
```

El Gateway no puede seguir leyendo ilimitadamente a 100 Mbps.

Debe aplicar:

```text
backpressure
```

para evitar acumulación de memoria.

Conceptualmente:

```text
Upstream
   │
   ▼
bounded buffer
   │
   ▼
Client
```

Cuando el cliente no puede consumir:

```text
pause / slow upstream read
```

según las primitivas del runtime.

---

### ah. Cancelación

Si el usuario:

```text
cierra pestaña
cambia de Source
salta a otro episodio
cancela reproducción
```

el Gateway deberá abortar la solicitud upstream correspondiente.

No queremos:

```text
Client disconnected
        │
        X
Gateway continues downloading 200 MB
```

Debe propagarse:

```text
client disconnect
       ↓
AbortSignal / cancellation
       ↓
upstream request cancelled
```

---

### ai. Timeouts

Separaremos:

```text
connect timeout
headers timeout
idle timeout
total request policy
```

Una conexión que deja de transferir bytes no deberá quedar ocupando recursos indefinidamente.

---

### aj. Range Requests

Para MP4/progressive delivery será importante soportar:

```http
Range: bytes=1000000-2000000
```

El Gateway deberá, cuando el upstream lo permita:

```text
Client Range
    │
    ▼
validate
    │
    ▼
forward Range
    │
    ▼
Upstream 206
    │
    ▼
Gateway 206
```

preservando correctamente:

```text
Content-Range
Accept-Ranges
Content-Length
Content-Type
```

cuando corresponda.

Esto es esencial para:

* seek;
* reproducción parcial;
* evitar descargas completas innecesarias.

---

### ak. Range abuse

Range Requests también pueden utilizarse abusivamente.

Por ello se podrán limitar:

* rangos absurdamente fragmentados;
* multi-range no necesario;
* rangos fuera de límites;
* frecuencia excesiva.

---

### al. Headers

El Gateway utilizará una **allowlist**.

No deberá reenviar indiscriminadamente todos los headers del usuario al upstream ni todos los headers del upstream al usuario.

Conceptualmente:

```text
CLIENT
  │
  ▼
Header Sanitizer
  │
  ▼
UPSTREAM
```

y:

```text
UPSTREAM
  │
  ▼
Response Header Policy
  │
  ▼
CLIENT
```

---

### am. Headers sensibles

Nunca deberán filtrarse accidentalmente:

```text
Authorization interno
provider cookies
API keys
internal tracing secrets
infrastructure headers
```

---

### an. CORS

La política CORS deberá ser explícita.

En producción:

```text
allowed origins
```

deberán corresponder a clientes autorizados.

No necesariamente:

```text
*
```

cuando existan credenciales o sesiones.

Pero tampoco debemos hardcodear eternamente:

```text
https://tudominio.com
```

en código.

La configuración deberá ser ambiental.

---

### ao. Caché de manifests

Por defecto, manifests ligados a una Playback Session deberán tratarse como contenido efímero.

Ejemplo:

```http
Cache-Control: private, no-store
```

o políticas equivalentes según el diseño.

Un manifest completamente público e independiente de sesión podría tener otra política, pero deberá decidirse explícitamente.

---

### ap. Caché de segmentos

El documento original propone cachear públicamente segmentos durante 24 horas y afirma que esto puede reducir hasta 80% de las solicitudes repetidas.

No mantendremos esa cifra como garantía.

El cache de segmentos solo podrá habilitarse si:

1. está permitido;
2. el recurso es estable;
3. no contiene personalización;
4. no depende de credenciales específicas;
5. su identidad puede normalizarse de forma segura;
6. la política del origen lo permite;
7. no existe riesgo de cache poisoning.

---

### aq. Cache Key

Nunca deberá utilizarse ingenuamente:

```text
full upstream URL
```

como única definición semántica.

Las URLs pueden contener:

```text
token
expires
signature
session
tracking parameters
```

Dos URLs diferentes pueden representar el mismo segmento.

O, peor:

dos URLs aparentemente similares pueden representar contenido distinto.

Por ello la normalización del cache key será específica de la integración.

---

### ar. Cache Poisoning

Antes de guardar un recurso:

```text
request
   ↓
validated upstream
   ↓
validate status
   ↓
validate content type
   ↓
validate expected resource class
   ↓
cache
```

Una respuesta HTML de error:

```html
403 Forbidden
```

no debe cachearse accidentalmente como:

```text
segment.ts
```

---

### as. Singleflight de segmentos

Podría existir:

```text
100 users
    │
    ▼
same segment
```

En vez de:

```text
100 upstream requests
```

podríamos ejecutar:

```text
1 upstream request
       │
       ├── client 1
       ├── client 2
       └── ...
```

Pero esta optimización **no será baseline del MVP**.

Hacer fan-out de un stream vivo introduce:

* clientes lentos;
* buffers;
* cancelaciones;
* memory pressure;
* coordinación;
* límites de concurrencia.

Si se implementa, deberá estar acotado.

---

### at. Bandwidth Accounting

El Gateway deberá medir como mínimo:

```text
bytes received from upstream
bytes sent to clients
```

Métricas:

```text
gateway_upstream_bytes_total
gateway_egress_bytes_total
```

Esto es crítico.

No basta con medir solicitudes.

---

### au. Modelo de costo

Una aproximación básica:

```text
egress bytes
≈
average bitrate
×
viewing seconds
÷
8
×
viewers
```

Por ejemplo, con un bitrate promedio de:

```text
3 Mbps
```

cada hora de reproducción consume aproximadamente:

```text
3 × 3600 / 8
≈ 1.35 GB
```

de datos audiovisuales.

Por eso:

```text
100 viewers
×
4 hours/day
×
3 Mbps
```

representan aproximadamente:

```text
540 GB/day
```

y:

```text
≈16.2 TB/month
```

si todo atraviesa el Gateway.

Esto explica por qué el Delivery Mode es una decisión arquitectónica de primer nivel.

---

### av. Concurrencia

No debemos confundir:

```text
requests per second
```

con:

```text
concurrent streams
```

El Gateway puede tener relativamente pocos RPS pero miles de conexiones de larga duración.

Debemos medir:

```text
gateway_active_connections
gateway_active_sessions
gateway_requests_total
gateway_connection_duration
```

---

### aw. Métricas principales

### Sesiones

```text
gateway_sessions_created_total
gateway_sessions_active
gateway_sessions_expired_total
gateway_sessions_revoked_total
```

### HTTP

```text
gateway_requests_total
gateway_request_duration_seconds
gateway_upstream_errors_total
```

### Media

```text
gateway_manifest_requests_total
gateway_segment_requests_total
gateway_range_requests_total
```

### Red

```text
gateway_upstream_bytes_total
gateway_egress_bytes_total
gateway_active_connections
```

### Latencia

```text
gateway_upstream_ttfb_seconds
gateway_client_ttfb_seconds
```

---

### ax. QoE

El Gateway también contribuye a métricas de experiencia.

Podrá correlacionarse con:

```text
playback_session_id
```

para estudiar:

```text
TTFF
rebuffer events
segment failures
source failures
```

Pero la métrica completa de QoE requiere también telemetría del Player.

---

### ay. Labels de métricas

Usar:

```text
delivery_mode
protocol
status_class
resource_type
provider
```

cuando la cardinalidad sea razonable.

Evitar:

```text
user_id
session_id
full_url
IP
```

como labels de Prometheus.

---

### az. Logs estructurados

Ejemplo:

```json
{
  "level": "info",
  "service": "media-gateway",
  "requestId": "req_123",
  "playbackSessionId": "ps_456",
  "resourceType": "segment",
  "deliveryMode": "FULL_PROXY",
  "upstreamStatus": 200,
  "bytesSent": 2048576,
  "durationMs": 112
}
```

---

### ba. Privacidad en logs

El documento original registra `client_ip` directamente en el ejemplo del Gateway.

No deberá convertirse en requisito.

Cuando una IP sea necesaria para seguridad operacional, se aplicarán:

* minimización;
* acceso restringido;
* retención limitada;
* posible pseudonimización.

---

### bb. Modelo de errores

Errores internos normalizados:

```text
SESSION_NOT_FOUND
SESSION_EXPIRED
SESSION_REVOKED

RESOURCE_NOT_FOUND
RESOURCE_EXPIRED

UPSTREAM_TIMEOUT
UPSTREAM_UNAVAILABLE
UPSTREAM_RANGE_UNSUPPORTED

INVALID_MANIFEST
UNSUPPORTED_MEDIA

RATE_LIMITED

GATEWAY_INTERNAL_ERROR
```

El Player no necesita conocer detalles sensibles del upstream.

---

### bc. Respuesta de error

Ejemplo:

```json
{
  "error": {
    "code": "SESSION_EXPIRED",
    "recoverable": true
  }
}
```

El Player puede entonces solicitar recuperación mediante el backend.

---

### bd. Gateway no ejecuta fallback

Supongamos:

```text
Source A
   ↓
Gateway
   ↓
502
```

El Gateway no deberá decidir:

```text
"voy a probar Source B"
```

Su responsabilidad será:

```text
report failure
        +
return normalized failure
```

Después:

```text
Player
   ↓
Playback Orchestrator
   ↓
Source B
```

La selección sigue centralizada.

---

### be. Flujo de recuperación

```text
Player
   │
   ▼
segment/manifest failure
   │
   ▼
Gateway
   │
   ▼
normalized failure
   │
   ▼
Player / Playback API
   │
   ▼
Orchestrator
   │
   ▼
alternative Source
   │
   ▼
Resolver
   │
   ▼
new Representation
   │
   ▼
new/updated Playback Session
   │
   ▼
Player resumes
```

El Player intentará conservar:

```text
currentTime
```

cuando la semántica del contenido lo permita.

---

### bf. Rate Limiting

El Gateway podrá aplicar límites en distintas dimensiones:

```text
session
token
IP / network signal
account
resource
global
```

No existe necesariamente un único límite universal.

Ejemplo:

```text
manifest requests
```

y:

```text
segment requests
```

tienen perfiles completamente diferentes.

---

### bg. Anti-abuso

Se deberán detectar comportamientos como:

```text
token reuse at impossible scale
mass parallel downloads
resource enumeration
abnormal range patterns
session creation abuse
```

Pero las medidas deberán evitar castigar innecesariamente conexiones legítimas.

---

### bh. Revocación

Una sesión podrá revocarse:

```text
gateway:revoked:{session_id}
```

o mediante estado de sesión.

Casos:

* abuso;
* Source invalidada;
* sesión sustituida;
* usuario cierra sesión en determinados contextos;
* acción administrativa.

No será necesario mantener una blacklist global de cada token si el diseño de sesión permite invalidar el identificador raíz.

---

### bi. Availability

El Gateway debe degradarse de forma controlada.

Si Redis falla, deberemos definir explícitamente:

```text
fail closed
```

o:

```text
limited degraded mode
```

según el tipo de sesión.

Para tokens autocontenidos podría existir cierta capacidad de verificación sin Redis.

Para sesiones dependientes de state store:

```text
Redis unavailable
       ↓
session validation unavailable
```

El ADR correspondiente decidirá el comportamiento.

---

### bj. Horizontal Scaling

Las instancias del Gateway deberían ser lo más stateless posible:

```text
             ┌── Gateway 1
Load Balancer├── Gateway 2
             ├── Gateway 3
             └── Gateway N
                    │
                    ▼
                  Redis
```

Una sesión no debería depender de regresar siempre al mismo proceso.

---

### bk. Sticky Sessions

No deberán ser requisito por defecto.

Si una optimización futura —por ejemplo stream coalescing local— se beneficia de afinidad, podrá evaluarse independientemente.

---

### bl. Connection Pooling upstream

El Gateway deberá reutilizar conexiones cuando resulte posible mediante:

```text
HTTP keep-alive
connection pooling
HTTP/2
```

según compatibilidad.

Esto puede reducir:

* handshake;
* latencia;
* CPU;
* sockets.

Pero será una optimización medida, no una garantía universal.

---

### bm. HTTP/2 y HTTP/3

No son requisitos del MVP.

Podrán evaluarse posteriormente en:

```text
Client ↔ CDN/Gateway
```

y:

```text
Gateway ↔ Upstream
```

cuando exista soporte.

---

### bn. Runtime

No fijaremos todavía:

```text
Node.js
Go
Rust
```

como arquitectura obligatoria.

Para MVP, Node.js puede ser perfectamente válido si:

* streaming correcto;
* backpressure;
* cancellation;
* límites;
* observabilidad;
* load testing

demuestran capacidad suficiente.

---

### bo. Reescritura a Go/Rust

El documento original plantea reescribir el Gateway en Go/Rust en Fase 3 y afirma un objetivo inferior a 50 MB por cada 10.000 conexiones.

Eso no deberá ser una decisión anticipada.

Nueva regla:

> **No se reescribe un componente crítico únicamente porque otro lenguaje sea teóricamente más eficiente.**

Secuencia:

```text
implement
   ↓
profile
   ↓
load test
   ↓
identify bottleneck
   ↓
optimize
   ↓
re-evaluate
```

Solo entonces:

```text
rewrite?
```

---

### bp. Performance Budget

Los valores originales:

```text
manifest TTFB <30 ms
segment TTFB <60 ms
~800 Mbps/server
5,000 concurrent connections
1 vCPU / 512 MB
```

se conservarán como referencias históricas del diseño, no como SLO demostrados.

Nueva matriz:

| Métrica                    | MVP            | V1                  |
| -------------------------- | -------------- | ------------------- |
| Manifest TTFB              | medir baseline | SLO validado        |
| Segment TTFB               | medir baseline | SLO validado        |
| Active connections         | stress test    | capacity target     |
| Egress throughput          | medir          | capacity target     |
| Memory/connection          | profile        | optimization target |
| Error rate                 | medir          | SLO                 |
| Upstream latency           | medir          | alert threshold     |
| Session validation latency | medir          | SLO                 |

---

### bq. Capacity Planning

El load test deberá responder:

```text
¿Cuántas sesiones?
¿Cuántas conexiones?
¿Cuántos Mbps?
¿Cuánta RAM?
¿Cuánta CPU?
¿Cuántos file descriptors?
¿Cuántos sockets?
¿Cuál es el p95?
¿Cuándo aparece degradación?
```

No simplemente:

```text
¿aguanta 2.000 usuarios virtuales?
```

---

### br. Testing unitario

Cubrir:

* token validation;
* expiry;
* resource mapping;
* manifest parsing;
* URI resolution;
* SSRF policies;
* Range parsing;
* header allowlists;
* CORS;
* error normalization.

---

### bs. Integration Testing

Pipeline:

```text
Test HLS Origin
      │
      ▼
Gateway
      │
      ▼
Test Client
```

Casos:

```text
master playlist
variant playlist
relative URI
audio track
subtitle track
segment
redirect
range
expired session
upstream timeout
```

---

### bt. Security Testing

Especialmente:

```text
SSRF
redirect SSRF
DNS rebinding
token tampering
expired tokens
resource enumeration
header injection
CRLF injection
oversized manifests
malformed manifests
range abuse
cache poisoning
```

---

### bu. Streaming Stress Test

La prueba deberá reproducir tráfico realista:

```text
N sessions
   │
   ├── manifest
   ├── segments
   ├── seek
   ├── disconnect
   ├── reconnect
   └── source failure
```

Medir:

```text
RAM
CPU
event-loop delay
open sockets
egress
TTFB
errors
GC
```

si el runtime utilizado tiene esos conceptos.

---

### bv. Soak Test

Además del stress test necesitamos pruebas largas.

Ejemplo conceptual:

```text
moderate concurrency
       ×
several hours
```

para encontrar:

* memory leaks;
* socket leaks;
* Redis connection leaks;
* timers abandonados;
* acumulación de state;
* crecimiento de buffers.

---

### bw. Chaos / Failure Tests

Simular:

```text
Redis unavailable
upstream stalls
upstream 503
DNS timeout
Gateway instance killed
network reset
representation expires
```

La pregunta no es solo:

> ¿Funciona cuando todo funciona?

sino:

> **¿Cómo falla cuando algo deja de funcionar?**

---

### bx. Riesgo — Costos de egress

Este sigue siendo el riesgo principal identificado por el documento original.

Mitigaciones:

```text
delivery modes
+
direct delivery where appropriate
+
CDN where justified
+
bandwidth metrics
+
cost monitoring
+
session limits
```

---

### by. Riesgo — Memory amplification

Causa:

```text
slow clients
+
large buffers
+
many connections
```

Mitigación:

```text
streaming
backpressure
bounded buffers
timeouts
cancellation
load shedding
```

---

### bz. Riesgo — File descriptor exhaustion

Miles de conexiones implican:

```text
client sockets
+
upstream sockets
+
Redis connections
+
other descriptors
```

Se deberá monitorizar:

```text
open file descriptors
socket counts
connection pools
```

y configurar correctamente el sistema operativo cuando la escala lo requiera.

---

### ca. Riesgo — Upstream collapse

Si un Provider se degrada:

```text
Gateway requests
      │
      ▼
timeouts
      │
      ▼
more retries
      │
      ▼
more load
```

Mitigación:

* bounded retries;
* deadlines;
* circuit signals;
* Orchestrator fallback;
* Health Checker;
* load shedding.

---

### cb. Riesgo — Session explosion

Un atacante podría crear miles de sesiones sin reproducir.

Mitigaciones:

```text
session creation rate limit
short TTL
lazy resource creation
per-user/account limits
anonymous limits
garbage collection
```

---

### cc. Riesgo — Manifest explosion

Un manifest malicioso podría referenciar cantidades absurdas de recursos.

Aplicar:

```text
max manifest bytes
max entries
max nesting
max variants
max redirects
```

Los valores se determinarán mediante pruebas.

---

### cd. Riesgo — Cache poisoning

Mitigaciones:

```text
validated origin
normalized cache key
expected status
expected content type
bounded size
no caching authenticated/personalized resources by default
```

---

### ce. Riesgo — Token leakage

Los tokens pueden aparecer en:

* browser history;
* logs;
* analytics;
* Referer;
* screenshots;
* monitoring.

Por ello:

```text
short TTL
minimal scope
no secrets inside token payload
redacted logging
Referrer-Policy
```

cuando corresponda.

---

### cf. MVP del Media Gateway

Para el MVP no necesitamos implementar todo lo anterior.

#### Obligatorio

```text
Playback Session validation
        +
HLS manifest endpoint
        +
opaque resource IDs
        +
safe manifest rewriting
        +
segment passthrough
        +
streaming/backpressure
        +
timeouts
        +
cancellation
        +
SSRF protection
        +
Range support where required
        +
basic rate limiting
        +
bandwidth metrics
        +
structured logs
```

---

### cg. Fuera del MVP

Podrán esperar:

```text
multi-region Gateway
HTTP/3 optimization
advanced CDN integration
segment singleflight
distributed stream fan-out
complex cache normalization
automatic session renewal
adaptive delivery policies
edge compute
Go/Rust rewrite
```

---

### ch. Topología física del MVP

```text
                         INTERNET
                            │
                            ▼
                    CDN / Reverse Proxy
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
          Web App                       Core API
                                           │
                                           ▼
                                  Playback Orchestrator
                                           │
                                           ▼
                                      Resolver
                                           │
                                           ▼
                              Playable Representation
                                           │
                                           ▼
                                  Playback Session
                                           │
                                           ▼
                              ┌─────────────────────┐
                              │    MEDIA GATEWAY    │
                              └──────────┬──────────┘
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                              ▼                     ▼
                         Redis/session        Media Origin
                              │
                              │
                              └──────────┐
                                         ▼
                                    Media Player
```

---

### ci. Criterios de aceptación del MVP

El Gateway podrá considerarse funcional cuando:

1. recibe una Playback Session válida;
2. rechaza una sesión inexistente;
3. rechaza una sesión expirada;
4. entrega un manifest autorizado;
5. transforma referencias internas en Resource IDs opacos;
6. el Player puede solicitar dichos recursos;
7. ninguna URL arbitraria proporcionada por el cliente puede convertirse directamente en una solicitud upstream;
8. los redirects son revalidados;
9. las redes privadas/internas quedan bloqueadas;
10. los segmentos se transmiten sin cargarlos completos en RAM;
11. una desconexión del cliente cancela la solicitud upstream;
12. los timeouts liberan recursos;
13. se registran bytes transferidos;
14. los errores upstream se normalizan;
15. el Gateway no selecciona una Source alternativa;
16. una falla puede propagarse al sistema de recuperación;
17. secretos internos no llegan al navegador;
18. puede soportarse seek mediante Range cuando el recurso lo requiera.

---

### cj. Feature flags

Baseline:

```text
gateway_enabled

gateway_full_proxy_enabled

gateway_direct_delivery_enabled

gateway_manifest_rewrite_enabled

gateway_segment_cache_enabled

gateway_strict_session_validation_enabled
```

Opciones futuras:

```text
gateway_session_renewal_enabled

gateway_segment_coalescing_enabled

gateway_advanced_delivery_policy_enabled
```

---

### ck. ADRs abiertas

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

### cl. Arquitectura consolidada del Media Gateway

```text
                 PLAYBACK ORCHESTRATOR
                           │
                           │
                           ▼
                  PLAYABLE REPRESENTATION
                           │
                           ▼
                   DELIVERY STRATEGY
                           │
              ┌────────────┼─────────────┐
              │            │             │
              ▼            ▼             ▼
           DIRECT    GATEWAY_MANIFEST FULL_PROXY
              │            │             │
              └────────────┼─────────────┘
                           ▼
                  PLAYBACK SESSION
                           │
                           ▼
               ┌──────────────────────┐
               │     MEDIA GATEWAY    │
               │                      │
               │ Session Validator    │
               │ Token Validator      │
               │ Manifest Parser      │
               │ Manifest Rewriter    │
               │ Resource Registry    │
               │ SSRF Guard           │
               │ Range Handler        │
               │ Header Policy        │
               │ Rate Limiter         │
               │ Stream Transport     │
               │ Telemetry            │
               └───────────┬──────────┘
                           │
                    ┌──────┴───────┐
                    │              │
                    ▼              ▼
                  Redis         Upstream
                    │              │
                    └──────┬───────┘
                           ▼
                    MEDIA PLAYER CORE
```

### Regla arquitectónica final del Gateway

Quiero que quede explícitamente escrita en el documento porque nos servirá para evitar muchísimo acoplamiento más adelante:

> **El Media Gateway no conoce cómo se descubrió una Source, no sabe cómo fue resuelta y no decide si es la mejor Source. Recibe una Playable Representation previamente autorizada y aplica una estrategia de entrega para una Playback Session concreta.**

Y su segunda regla:

> **Ningún dato proporcionado directamente por el cliente debe convertirse por sí solo en una URL arbitraria que el Gateway consulte en la red.**

Y la tercera:

> **Proxyar video es una capacidad del Gateway, no la definición del Gateway.**

Eso último cambia muchísimo la arquitectura económica. El diseño original ya detectaba el problema de egress y proponía Smart Passthrough, pero ahora elevamos esa idea a una abstracción formal de **Delivery Strategy**.

Con esto quedan bastante bien encadenados nuestros primeros tres dominios técnicos:

```text
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
   ▼
???
```

Ese `???` es justamente el siguiente bloque del documento: **4. Reproductor Unificado Customizado**.

Y ahí tenemos otra corrección estructural bastante importante: el original le entrega al Player un `sources[]` que contiene `serverName`, `streamUrl` y `priority`, y hace que **el propio Player ejecute el fallback automático entre servidores**. También mezcla Player Core, UI, persistencia, publicidad, Health Reporting y lógica de selección de Source.

En nuestra arquitectura eso debe convertirse en un verdadero **Media Player Core** que solo entiende `PlaybackSession`, `tracks`, `capabilities`, `quality`, estado y eventos de reproducción. Cuando una Source falla, el Player **detecta y reporta**; el Orchestrator es quien decide la siguiente Source. Ese será el siguiente motor y es uno de los más importantes de todo el proyecto.


Sí. Continuemos con el **Motor 4: Reproductor Unificado Customizado**, que en la arquitectura revisada conviene elevar formalmente a **Media Player Core**.

El original tiene una base bastante buena: HLS/MP4, calidad, audio, subtítulos, progreso, telemetría, accesibilidad, PiP, persistencia local y consideración especial para HLS nativo en Safari/iOS. El problema principal es de fronteras: entrega al Player un `sources[]` con `serverName`, `streamUrl` y `priority`, y después hace que el propio navegador decida el fallback hacia otra Source. También mezcla reproducción, publicidad, salud y persistencia dentro del mismo contrato.

Nuestra revisión debe conservar toda la riqueza del reproductor, pero convertirlo en un consumidor limpio de `PlaybackSession`.
