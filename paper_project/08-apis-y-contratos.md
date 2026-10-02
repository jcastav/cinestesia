# 8. APIs Y CONTRATOS

## 8.1. Propósito de la capa de APIs

La capa de APIs constituye el **contrato formal de integración entre los distintos motores de la plataforma**.

Mientras que la arquitectura define qué responsabilidades posee cada componente, las APIs definen de manera precisa:

* qué componente puede solicitar una operación;
* qué datos puede enviar;
* qué datos puede recibir;
* qué identificadores atraviesan cada frontera;
* qué estados son válidos;
* cómo se representan los errores;
* cómo se controlan autenticación y autorización;
* cómo se versionan los contratos;
* cómo se manejan idempotencia, concurrencia y reintentos;
* cómo se correlacionan las operaciones distribuidas;
* y, especialmente, qué información **no debe atravesar una determinada frontera**.

La API no debe convertirse en una exposición directa de las tablas internas ni de las implementaciones de los motores.

La regla fundamental es:

> **Las APIs exponen capacidades y contratos de dominio; no exponen directamente la estructura interna de la base de datos ni los mecanismos internos utilizados para implementar dichas capacidades.**

Por lo tanto:

```text
Base de datos
      │
      ▼
  Dominio / Aplicación
      │
      ▼
    DTO / API Contract
      │
      ▼
Cliente o Motor consumidor
```

y no:

```text
Base de datos
      │
      ▼
JSON idéntico a las tablas
      │
      ▼
Frontend
```

---

## 8.2. Principio arquitectónico fundamental

La plataforma utilizará una arquitectura de APIs centrada en **recursos y operaciones de dominio**, con especial tratamiento del flujo de reproducción.

El flujo antiguo:

```text
GET /watch/:episode_id
        │
        ▼
    sources[]
        │
        ▼
Player elige servidor
        │
        ▼
stream_url
        │
        ▼
Gateway
```

queda reemplazado por:

```text
POST /playback/sessions
        │
        ▼
Playback Orchestrator
        │
        ├── Catalog
        ├── Source Registry
        ├── Health
        └── Resolver
                │
                ▼
    Playable Representation
                │
                ▼
        PlaybackSession
                │
                ▼
             Player
                │
                ▼
            Gateway
```

La diferencia es fundamental.

El Player ya no recibe una colección de URLs para decidir cuál utilizar.

El Player recibe una **PlaybackSession válida**, creada por el backend, que contiene el contexto necesario para reproducir el contenido mediante el Gateway.

---

## 8.3. Clasificación de APIs

La plataforma distinguirá cuatro grandes categorías de contratos.

| Tipo              | Consumidor principal   | Propósito                                                   |
| ----------------- | ---------------------- | ----------------------------------------------------------- |
| Public API        | Web / clientes futuros | Catálogo, búsqueda, reproducción, progreso, reportes        |
| Authenticated API | Usuarios registrados   | Perfil, biblioteca, progreso, preferencias                  |
| Admin API         | Panel administrativo   | Operaciones editoriales y operativas                        |
| Internal API      | Motores y workers      | Resolución, health checks, ingestión y operaciones internas |

Existe además una quinta frontera especializada:

| Tipo               | Consumidor         | Propósito                                                          |
| ------------------ | ------------------ | ------------------------------------------------------------------ |
| Media Delivery API | Player / navegador | Entrega controlada de manifiestos, segmentos y recursos multimedia |

La Media Delivery API puede compartir infraestructura HTTP con el resto de la plataforma, pero conceptualmente pertenece al **Data Plane**, mientras que las APIs de catálogo, usuarios, administración y orquestación pertenecen principalmente al **Control Plane**.

---

## 8.4. API Gateway / BFF / Core API

En el MVP no es necesario convertir cada motor en un microservicio independiente.

La arquitectura física inicial podrá utilizar:

```text
                    ┌──────────────────────┐
                    │      Web Client      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Edge / Reverse Proxy │
                    └──────────┬───────────┘
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
       ┌────────────────────┐      ┌────────────────────┐
       │ Core API / BFF      │      │ Media Gateway      │
       │                    │      │                    │
       │ Catalog            │      │ Manifest Delivery  │
       │ Search             │      │ Resource Delivery  │
       │ Source Registry    │      │ Streaming          │
       │ Orchestrator       │      │                    │
       │ Users              │      │                    │
       │ Reports            │      │                    │
       │ Admin              │      │                    │
       └─────────┬──────────┘      └────────────────────┘
                 │
                 ▼
       PostgreSQL / Redis / Queue
                 │
                 ▼
       Resolver / Health Workers
```

El Core API funciona como punto de entrada para las operaciones de control y composición.

No significa que todos los módulos deban convertirse en una única clase o módulo monolítico.

Internamente deberán conservarse límites claros:

```text
Core API
 ├── Catalog Application
 ├── Search Application
 ├── Source Registry Application
 ├── Playback Application
 ├── User Application
 ├── Reporting Application
 └── Admin Application
```

Esto permite comenzar con una implementación modular y posteriormente extraer servicios cuando exista una razón operacional real.

---

## 8.5. Convenciones generales

### 8.5.1. Base URL

La API pública utilizará una versión explícita:

```text
https://api.tudominio.com/v1
```

Durante desarrollo podrá utilizarse:

```text
http://localhost:<port>/v1
```

La versión forma parte del contrato público.

---

### 8.5.2. Formato

Por defecto:

```http
Content-Type: application/json
Accept: application/json
```

Las APIs de Media Delivery constituyen una excepción funcional: pueden devolver HLS, segmentos de video, archivos de subtítulos u otros recursos multimedia según el contrato específico.

---

### 8.5.3. Identificadores

Los recursos utilizarán identificadores internos estables.

Ejemplos:

```text
media_...
season_...
episode_...
source_...
provider_...
user_...
ps_...
resource_...
report_...
```

El formato exacto puede ser UUID, ULID u otro esquema interno, pero el cliente no debe depender de la implementación física del identificador.

La API debe tratar los identificadores como valores opacos.

---

## 8.6. Convención de respuestas

Se utilizará una envoltura uniforme cuando aporte valor al contrato.

Respuesta exitosa:

```json
{
  "data": {
    "id": "media_123",
    "title": "Ejemplo"
  },
  "meta": {},
  "requestId": "req_01J..."
}
```

Respuesta con colección:

```json
{
  "data": [
    {
      "id": "media_123",
      "title": "Ejemplo"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  },
  "requestId": "req_01J..."
}
```

No es obligatorio envolver absolutamente todas las respuestas en:

```json
{
  "success": true
}
```

El estado de éxito ya está representado por el código HTTP.

Esto evita duplicar información:

```http
HTTP 200 OK
```

ya expresa que la operación fue exitosa.

El campo `requestId` permite correlacionar la respuesta con logs, traces y operaciones internas.

---

## 8.7. Contrato estándar de errores

Todos los errores de API utilizarán una estructura consistente:

```json
{
  "error": {
    "code": "SOURCE_UNAVAILABLE",
    "message": "The selected source is currently unavailable.",
    "details": {},
    "requestId": "req_01J..."
  }
}
```

### 8.7.1. Propiedades

### `code`

Código estable destinado al software consumidor.

Ejemplos:

```text
MEDIA_NOT_FOUND
SOURCE_NOT_FOUND
SOURCE_UNAVAILABLE
RESOLUTION_FAILED
PLAYBACK_SESSION_EXPIRED
PLAYBACK_SESSION_INVALID
PLAYBACK_RECOVERY_FAILED
INVALID_ARGUMENT
UNAUTHORIZED
FORBIDDEN
RATE_LIMITED
CONFLICT
UPSTREAM_UNAVAILABLE
```

### `message`

Descripción legible para humanos.

No debe utilizarse como identificador lógico por parte del frontend.

### `details`

Información adicional estructurada cuando sea necesaria.

No debe contener:

* credenciales;
* cookies;
* tokens;
* URLs privadas del origen;
* secretos;
* trazas internas;
* información sensible del proveedor.

### `requestId`

Identificador utilizado para rastrear la operación.

---

## 8.8. Semántica HTTP

La API seguirá la semántica HTTP convencional.

| Código | Significado                                                  |
| ------ | ------------------------------------------------------------ |
| `200`  | Operación exitosa                                            |
| `201`  | Recurso creado                                               |
| `202`  | Operación aceptada para procesamiento asíncrono              |
| `204`  | Operación exitosa sin cuerpo                                 |
| `400`  | Petición malformada                                          |
| `401`  | Falta autenticación válida                                   |
| `403`  | Autenticado pero sin autorización                            |
| `404`  | Recurso inexistente                                          |
| `409`  | Conflicto de estado o concurrencia                           |
| `422`  | Datos válidos sintácticamente pero inválidos semánticamente  |
| `429`  | Rate limit excedido                                          |
| `500`  | Error interno                                                |
| `502`  | Dependencia externa produjo respuesta inválida/no utilizable |
| `503`  | Servicio temporalmente no disponible                         |
| `504`  | Timeout de dependencia                                       |

La API no debe utilizar siempre `500` ante cualquier problema externo.

Por ejemplo:

```text
Resolver → proveedor externo no responde
```

no significa necesariamente:

```text
Core API → 500 Internal Server Error
```

Dependiendo del contexto puede convertirse en:

```text
SOURCE_UNAVAILABLE
UPSTREAM_UNAVAILABLE
RESOLUTION_FAILED
```

---

## 8.9. Autenticación y autorización

Las APIs distinguirán tres situaciones:

### Público/anónimo

Puede acceder a operaciones que la política de la plataforma permita sin autenticación:

```text
GET /v1/catalog/...
GET /v1/media/...
GET /v1/search/...
POST /v1/playback/sessions
```

El hecho de que una operación sea pública no significa que carezca de controles de abuso.

---

### Usuario autenticado

Utiliza el contexto de identidad para:

```text
GET /v1/me
PATCH /v1/me
GET /v1/me/library
POST /v1/playback/progress
```

La API resolverá el `user_id` desde el contexto de autenticación.

El cliente no podrá declarar arbitrariamente:

```json
{
  "user_id": "otro_usuario"
}
```

para modificar recursos de otra cuenta.

---

### Administrador

Las operaciones administrativas utilizan autorización basada en permisos:

```text
Authorization: Bearer <access-token>
```

o el mecanismo de sesión HTTP correspondiente.

El concepto fundamental es:

```text
Authentication
    =
¿Quién eres?

Authorization
    =
¿Qué puedes hacer?
```

---

## 8.10. Autenticación interna

Las APIs internas no deben confiar únicamente en que una ruta sea “privada”.

Cuando un componente llama a otro deberá existir una forma de autenticación/autorización de servicio apropiada para el despliegue.

Ejemplo conceptual:

```text
Core API
   │
   │ authenticated service request
   ▼
Resolver
```

El Resolver no debe aceptar llamadas arbitrarias desde Internet.

Los secretos de integración nunca forman parte del JSON de una API pública.

---

## 8.11. Contratos de dominio

Los DTO principales de la plataforma son:

```text
MediaItem
SearchResult
SourceSummary
PlaybackSession
PlayableRepresentation
PlaybackRecoveryRequest
SourceSwitchRequest
PlaybackProgress
SourceReport
SourceHealth
User
UserProfile
AdminOperation
AuditEvent
```

Cada motor es propietario semántico de sus contratos.

| Contrato                 | Propietario           |
| ------------------------ | --------------------- |
| `MediaItem`              | Catalog               |
| `SearchResult`           | Search                |
| `SourceSummary`          | Source Registry       |
| `PlaybackSession`        | Playback Orchestrator |
| `PlayableRepresentation` | Resolver              |
| `PlaybackProgress`       | User                  |
| `SourceReport`           | Health/Reporting      |
| `SourceHealth`           | Health                |
| `UserProfile`            | User                  |
| `AdminOperation`         | Admin                 |
| `AuditEvent`             | Admin/Operations      |

Un DTO puede combinar información de varios dominios cuando una API de aplicación lo necesite, pero eso no transfiere la propiedad del dato.

---

## 8.12. Catalog API

El Catalog API expone información canónica del contenido.

### 8.12.1. Contenido destacado

```http
GET /v1/catalog/featured
```

Puede devolver:

```json
{
  "data": {
    "sections": [
      {
        "id": "featured",
        "title": "Destacados",
        "items": [
          {
            "id": "media_123",
            "slug": "ejemplo",
            "title": "Ejemplo",
            "posterUrl": "...",
            "backdropUrl": "...",
            "type": "movie",
            "releaseYear": 2026
          }
        ]
      }
    ]
  },
  "requestId": "req_..."
}
```

El contrato no contiene:

```text
source
streamUrl
providerCredentials
gatewayToken
resolutionAttempt
```

---

## 8.13. Media Detail API

```http
GET /v1/media/{mediaId}
```

Devuelve el `MediaItem` y la información editorial correspondiente.

Ejemplo:

```json
{
  "data": {
    "id": "media_123",
    "slug": "ejemplo",
    "title": "Ejemplo",
    "originalTitle": "Example",
    "type": "series",
    "synopsis": "...",
    "posterUrl": "...",
    "backdropUrl": "...",
    "releaseYear": 2026,
    "genres": ["Drama", "Sci-Fi"],
    "status": "published",
    "seasons": [
      {
        "id": "season_01",
        "number": 1,
        "title": "Temporada 1",
        "episodesCount": 10
      }
    ]
  }
}
```

---

## 8.14. Episodes / Playback Targets

Para una serie:

```http
GET /v1/media/{mediaId}/seasons/{seasonNumber}
```

devuelve los episodios correspondientes.

Ejemplo:

```json
{
  "data": {
    "season": {
      "id": "season_01",
      "number": 1
    },
    "episodes": [
      {
        "id": "episode_01",
        "number": 1,
        "title": "Episodio 1",
        "thumbnailUrl": "...",
        "durationSeconds": 1500,
        "airDate": "2026-01-01"
      }
    ]
  }
}
```

El episodio constituye uno de los posibles **Playback Targets**.

La API no necesita introducir una entidad física `playback_targets` para representar este concepto.

---

## 8.15. Search API

La búsqueda pertenece al motor Search.

```http
GET /v1/search?q={query}
```

Parámetros opcionales:

```text
q
type
genre
year
language
page
limit
sort
```

Ejemplo:

```http
GET /v1/search?q=example&type=series&page=1&limit=20
```

Respuesta:

```json
{
  "data": {
    "items": [
      {
        "id": "media_123",
        "title": "Example",
        "type": "series",
        "posterUrl": "...",
        "releaseYear": 2026
      }
    ]
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

La respuesta de búsqueda no contiene información de reproducción.

---

## 8.16. Source API

La consulta de fuentes puede existir como operación separada cuando la interfaz necesite mostrar las alternativas disponibles:

```http
GET /v1/media/{mediaId}/sources
```

o para un Playback Target concreto:

```http
GET /v1/playback-targets/{targetId}/sources
```

La respuesta debe utilizar información normalizada:

```json
{
  "data": {
    "sources": [
      {
        "id": "source_01",
        "label": "Servidor A",
        "language": "es",
        "quality": "1080p",
        "protocols": ["HLS"],
        "availability": "active"
      },
      {
        "id": "source_02",
        "label": "Servidor B",
        "language": "es",
        "quality": "720p",
        "protocols": ["HLS"],
        "availability": "degraded"
      }
    ]
  }
}
```

No se incluyen:

```text
originUrl
streamUrl
cookies
provider credentials
signed upstream URLs
adapter configuration
internal health evidence
```

La existencia de este endpoint no implica que el Player sea responsable de seleccionar arbitrariamente una fuente.

La selección final para reproducción continúa perteneciendo al Playback Orchestrator.

---

## 8.17. Playback API — Contrato crítico

La creación de una reproducción comienza con:

```http
POST /v1/playback/sessions
```

Request conceptual:

```json
{
  "playbackTargetId": "episode_01",
  "preferences": {
    "language": "es",
    "subtitleLanguage": "es",
    "quality": "auto"
  },
  "capabilities": {
    "protocols": ["HLS", "MP4"],
    "videoCodecs": ["avc1", "vp9"],
    "audioCodecs": ["aac", "opus"],
    "nativeHls": true,
    "mse": true
  },
  "positionSeconds": 123.4
}
```

El backend recibe una **intención de reproducción**, no una URL externa.

---

## 8.18. Proceso de creación de PlaybackSession

El endpoint anterior desencadena:

```text
Client
  │
  ▼
Playback API
  │
  ▼
Playback Orchestrator
  │
  ├── Playback Target validation
  │
  ├── Source Registry
  │
  ├── Source Health
  │
  ├── capability matching
  │
  ├── source selection
  │
  ▼
Resolver
  │
  ├── Adapter Registry
  └── Authorized External Integration
  │
  ▼
Playable Representation
  │
  ▼
PlaybackSession
  │
  ▼
Client
```

La API no debe devolver el resultado de una consulta directa a `sources`.

Devuelve el resultado de una **decisión de reproducción**.

---

## 8.19. PlaybackSession DTO

Contrato conceptual:

```json
{
  "data": {
    "playbackSessionId": "ps_123",
    "media": {
      "id": "media_456",
      "title": "Ejemplo"
    },
    "playback": {
      "entrypoint": "/v1/playback/ps_123/manifest",
      "protocol": "HLS",
      "expiresAt": "2026-10-01T02:30:00Z"
    },
    "selectedSource": {
      "id": "source_01",
      "label": "Servidor A",
      "language": "es",
      "quality": "1080p"
    },
    "alternatives": [
      {
        "id": "source_02",
        "label": "Servidor B",
        "language": "es",
        "quality": "720p"
      }
    ],
    "tracks": {
      "audio": [
        {
          "id": "audio_es",
          "language": "es",
          "label": "Español"
        }
      ],
      "subtitles": [
        {
          "id": "sub_es",
          "language": "es",
          "label": "Español"
        }
      ]
    },
    "resume": {
      "positionSeconds": 123.4
    }
  }
}
```

### Información deliberadamente ausente

La respuesta **no** contiene:

```text
stream_url
origin_url
provider_cookie
provider_token
adapter_secret
raw_segment_url
```

Esto constituye una frontera de seguridad y de arquitectura.

---

## 8.20. Endpoint de consulta de PlaybackSession

```http
GET /v1/playback/sessions/{sessionId}
```

Permite consultar el estado lógico de una sesión cuando sea necesario.

No debe devolver credenciales ni URLs internas adicionales.

Puede responder:

```json
{
  "data": {
    "playbackSessionId": "ps_123",
    "status": "ACTIVE",
    "expiresAt": "2026-10-01T02:30:00Z"
  }
}
```

Estados conceptuales:

```text
CREATED
ACTIVE
EXPIRED
REVOKED
FAILED
```

---

## 8.21. Playback Recovery

Cuando el Player detecta un fallo recuperable que requiere cambiar de fuente, no decide cuál será la nueva fuente.

Envía:

```http
POST /v1/playback/sessions/{sessionId}/recover
```

Request:

```json
{
  "positionSeconds": 421.7,
  "reason": {
    "code": "MEDIA_NETWORK_ERROR",
    "recoverable": true
  },
  "capabilities": {
    "protocols": ["HLS", "MP4"],
    "videoCodecs": ["avc1"],
    "nativeHls": true
  }
}
```

El Orchestrator puede entonces:

```text
Current Source
      │
      ▼
Failure evidence
      │
      ▼
Exclude / penalize failed source
      │
      ▼
Select alternative
      │
      ▼
Resolver
      │
      ▼
New Playable Representation
      │
      ▼
New PlaybackSession
```

Respuesta:

```json
{
  "data": {
    "playbackSessionId": "ps_124",
    "playback": {
      "entrypoint": "/v1/playback/ps_124/manifest",
      "protocol": "HLS",
      "expiresAt": "2026-10-01T02:32:00Z"
    },
    "resume": {
      "positionSeconds": 421.7
    },
    "selectedSource": {
      "id": "source_02",
      "label": "Servidor B",
      "quality": "720p"
    }
  }
}
```

El Player reemplaza la sesión conservando, cuando sea técnicamente posible:

```text
currentTime
play/pause state
volume
playback rate
subtitle preference
audio preference
```

---

## 8.22. Source Switching

El usuario también puede seleccionar manualmente una alternativa.

```http
POST /v1/playback/sessions/{sessionId}/switch-source
```

Request:

```json
{
  "sourceId": "source_02",
  "positionSeconds": 421.7
}
```

El backend valida:

1. que la sesión sea válida;
2. que el Source pertenezca al Playback Target;
3. que la fuente pueda utilizarse bajo la política vigente;
4. que sea compatible con las capacidades declaradas;
5. que pueda resolverse;
6. que pueda convertirse en una nueva Playable Representation.

El cliente nunca envía:

```json
{
  "streamUrl": "https://..."
}
```

La selección manual sigue pasando por el mismo límite arquitectónico que la automática.

---

## 8.23. Diferencia entre Quality Switch y Source Switch

Estos conceptos no deben confundirse.

### Quality Switch

```text
1080p → 720p
```

dentro de una representación HLS compatible.

Es responsabilidad del Player / Playback Engine cuando el manifiesto ofrece múltiples rendiciones.

### Source Switch

```text
Source A → Source B
```

implica una nueva decisión de backend.

Es responsabilidad del Playback Orchestrator.

Por tanto:

```text
Quality selection
      ↓
Player

Source selection
      ↓
Orchestrator
```

---

## 8.24. Media Gateway API

El Gateway ya no aceptará URLs arbitrarias.

El modelo antiguo:

```http
GET /v1/proxy/segment?url={encoded_segment_url}
```

queda eliminado.

Ese diseño convierte un parámetro controlado por el cliente en una instrucción de red y rompe la frontera de seguridad del Gateway.

El nuevo modelo utiliza recursos opacos asociados a una PlaybackSession.

---

## 8.25. Manifest Delivery

```http
GET /v1/playback/{sessionId}/manifest
```

El Gateway:

1. valida la PlaybackSession;
2. valida autorización;
3. determina el recurso autorizado;
4. obtiene o utiliza la Playable Representation correspondiente;
5. reescribe el manifiesto cuando sea necesario;
6. valida referencias externas;
7. devuelve el manifiesto al Player.

El cliente no proporciona la URL del origen.

---

## 8.26. Media Resource Delivery

Las referencias internas del manifiesto pueden utilizar identificadores opacos:

```http
GET /v1/playback/{sessionId}/resources/{resourceId}
```

Ejemplo conceptual:

```text
manifest
   │
   ├── resource_abc
   ├── resource_def
   ├── resource_ghi
   └── resource_jkl
```

El Gateway resuelve internamente:

```text
resource_id
     ↓
authorized session context
     ↓
server-side representation
     ↓
upstream resource
```

El cliente nunca controla directamente el destino de red.

---

## 8.27. Contrato HLS

Cuando la representación utiliza HLS, el Gateway debe poder procesar estructuralmente los elementos necesarios del manifiesto.

Entre otros:

```text
Master Playlist
Media Playlist
Variant Streams
Audio Groups
Subtitle Groups
EXT-X-MAP
EXT-X-KEY
Relative URIs
Absolute URIs
Byte Ranges
Discontinuities
```

Toda URL descubierta durante el procesamiento debe pasar por las políticas de validación correspondientes.

Esto es especialmente importante porque un manifiesto externo no debe considerarse contenido confiable.

---

## 8.28. Streaming y Range Requests

Para recursos compatibles con reproducción progresiva:

```http
Range: bytes=...
```

el Gateway deberá respetar, cuando corresponda:

```text
206 Partial Content
Content-Range
Content-Length
Accept-Ranges
```

La API no debe asumir que todos los recursos son HLS.

El contrato de entrega debe poder distinguir:

```text
HLS
MP4 / progressive
otros recursos multimedia compatibles
```

---

## 8.29. Playback Progress API

El progreso pertenece al dominio User / Playback History.

El contrato conceptual será:

```http
PATCH /v1/playback/progress
```

Request:

```json
{
  "playbackTargetId": "episode_01",
  "positionSeconds": 645,
  "durationSeconds": 1420,
  "completed": false
}
```

Para usuarios autenticados, el `userId` procede del contexto de autenticación.

No debe confiarse en un `user_id` proporcionado arbitrariamente por el cliente.

La API representa el estado resumible de reproducción, no cada evento de telemetría.

Por tanto:

```text
Playback Progress
    =
último checkpoint significativo
```

mientras:

```text
play
pause
buffer
seeking
timeupdate
```

pertenecen a la telemetría del Player.

---

## 8.30. Progreso anónimo

Los usuarios anónimos pueden conservar progreso localmente.

Una implementación posible:

```text
Player
   │
   ▼
Local Storage / IndexedDB
```

Al autenticarse, el cliente puede solicitar una operación de reconciliación.

La política exacta:

```text
local wins
server wins
latest timestamp wins
manual confirmation
```

queda como decisión de producto/ADR y no debe codificarse implícitamente en el contrato básico.

---

## 8.31. Source Reports API

Los reportes de fuentes pertenecen al dominio Health / Reporting.

```http
POST /v1/source-reports
```

Request:

```json
{
  "sourceId": "source_02",
  "category": "DOES_NOT_START",
  "playbackSessionId": "ps_123",
  "context": {
    "positionSeconds": 0
  }
}
```

Categorías:

```text
DOES_NOT_START
STOPS_REPEATEDLY
WRONG_CONTENT
WRONG_AUDIO
WRONG_SUBTITLES
QUALITY_PROBLEM
OUT_OF_SYNC
OTHER
```

La API devuelve:

```http
202 Accepted
```

cuando el reporte ha sido recibido para procesamiento.

El reporte no ejecuta una resolución arbitraria de la URL enviada por el usuario.

El usuario proporciona un `sourceId`, no una URL externa.

---

## 8.32. Health API

Para administración y observabilidad:

```http
GET /v1/sources/{sourceId}/health
```

Respuesta conceptual:

```json
{
  "data": {
    "sourceId": "source_02",
    "state": "DEGRADED",
    "confidence": 0.82,
    "lastSuccessAt": "2026-10-01T01:40:00Z",
    "lastFailureAt": "2026-10-01T01:55:00Z",
    "recentSuccessRate": 0.76
  }
}
```

Esta API expone una **proyección de salud**, no todas las observaciones internas.

---

## 8.33. Auth API

Los contratos del motor de identidad se mantienen separados de los contratos de reproducción.

Ejemplos:

```http
POST /v1/auth/register
POST /v1/auth/login
POST /v1/auth/refresh
POST /v1/auth/logout
POST /v1/auth/logout-all
GET  /v1/me
PATCH /v1/me
```

Una respuesta de autenticación puede incluir:

```json
{
  "data": {
    "user": {
      "id": "user_123",
      "username": "usuario",
      "role": "user"
    },
    "session": {
      "expiresAt": "2026-10-01T03:00:00Z"
    }
  }
}
```

Los contratos públicos nunca exponen:

```text
password_hash
refresh_token_hash
internal security metadata
provider secrets
```

---

## 8.34. User Library API

Ejemplos:

```http
GET /v1/me/library
POST /v1/me/library
DELETE /v1/me/library/{mediaId}
```

El dominio utiliza `mediaId`, no identificadores específicos de un antiguo catálogo especializado.

La biblioteca puede contener:

```text
favorites
watchlist
watching
completed
```

según las capacidades implementadas.

---

## 8.35. Admin API

Las operaciones administrativas están bajo:

```text
/v1/admin/...
```

Ejemplos:

```http
PATCH /v1/admin/media/{mediaId}

POST /v1/admin/sources

PATCH /v1/admin/sources/{sourceId}

POST /v1/admin/sources/{sourceId}/disable

POST /v1/admin/ingestion/candidates/{candidateId}/approve

POST /v1/admin/users/{userId}/suspend

GET /v1/admin/audit-events

PATCH /v1/admin/config/{key}

POST /v1/admin/operations/{operationType}
```

El Admin API actúa como fachada de comandos administrativos.

No debe convertirse en un mecanismo para que la interfaz administrativa acceda directamente a:

```text
PostgreSQL
Redis
Gateway internals
Resolver secrets
```

---

## 8.36. Operaciones administrativas asíncronas

Algunas operaciones pueden tardar más que una solicitud HTTP normal.

En ese caso:

```http
POST /v1/admin/operations/{operationType}
```

puede devolver:

```http
202 Accepted
```

con:

```json
{
  "data": {
    "operationId": "op_123",
    "status": "PENDING"
  }
}
```

Estados:

```text
PENDING
RUNNING
SUCCEEDED
FAILED
CANCELLED
```

Consulta:

```http
GET /v1/admin/operations/{operationId}
```

Esto evita bloquear una petición HTTP durante procesos como:

```text
reindexación
ingestión masiva
health check amplio
reconciliación
operaciones de mantenimiento
```

---

## 8.37. Internal Resolver API

El Playback Orchestrator se comunica con el Resolver mediante un contrato interno.

```http
POST /internal/v1/resolutions
```

Request conceptual:

```json
{
  "sourceId": "source_01",
  "playbackTargetId": "episode_01",
  "context": {
    "capabilities": {
      "protocols": ["HLS", "MP4"],
      "videoCodecs": ["avc1"]
    },
    "preferredLanguage": "es"
  }
}
```

El Resolver responde:

```json
{
  "data": {
    "status": "RESOLVED",
    "representation": {
      "protocol": "HLS",
      "expiresAt": "2026-10-01T02:30:00Z"
    }
  }
}
```

El contrato no necesita revelar al Orchestrator información interna del adapter que no sea necesaria para continuar.

---

## 8.38. Resolution Errors

El Resolver utilizará errores normalizados.

Ejemplos:

```text
SOURCE_NOT_FOUND
ACCESS_NOT_AVAILABLE
UNSUPPORTED_SOURCE
UPSTREAM_TIMEOUT
UPSTREAM_INVALID_RESPONSE
INVALID_PLAYABLE_REPRESENTATION
RESOLUTION_TIMEOUT
ADAPTER_ERROR
```

Especialmente importante:

```text
ACCESS_NOT_AVAILABLE
```

significa que la representación no pudo obtenerse mediante el mecanismo autorizado disponible.

No significa que el sistema deba intentar mecanismos arbitrarios para evadir controles de acceso.

El Orchestrator puede simplemente continuar con otra Source compatible.

---

## 8.39. Health Worker API

Los workers de Health no deben recibir URLs arbitrarias desde Internet.

El flujo conceptual es:

```text
Scheduler
    │
    ▼
Health Job
    │
    ▼
sourceId
    │
    ▼
Source Registry
    │
    ▼
controlled probe
    │
    ▼
HealthObservation
```

La URL utilizada durante la comprobación procede del registro interno y atraviesa las mismas políticas de seguridad que cualquier integración externa.

---

## 8.40. Discovery / Ingestion API

La ingestión puede utilizar comandos internos como:

```http
POST /internal/v1/ingestion/candidates
```

Ejemplo:

```json
{
  "candidate": {
    "externalReference": "...",
    "title": "Ejemplo",
    "sourceReference": "..."
  }
}
```

El sistema normaliza el candidato antes de modificar el catálogo.

El flujo es:

```text
Discovery
   ↓
Candidate
   ↓
Normalization
   ↓
Deduplication
   ↓
Catalog / Source Registry
```

La URL externa no se convierte automáticamente en un `MediaItem`.

---

## 8.41. Eventos de dominio

Las APIs síncronas representan principalmente:

```text
Commands / Queries
```

Los eventos representan:

```text
Facts
```

Ejemplo:

```text
catalog.media.updated
```

significa:

> El contenido fue actualizado.

No significa:

> Actualiza tu contenido.

---

## 8.42. Envelope de eventos

Formato conceptual:

```json
{
  "eventId": "evt_123",
  "eventType": "catalog.media.updated",
  "occurredAt": "2026-10-01T01:20:00Z",
  "producer": "catalog",
  "version": 1,
  "payload": {
    "mediaId": "media_123",
    "changedFields": [
      "title",
      "genres"
    ]
  }
}
```

Los consumidores deben tolerar eventos duplicados.

Por ello:

```text
at-least-once delivery
```

requiere consumidores idempotentes.

No se debe asumir que:

```text
evento recibido una sola vez
```

---

## 8.43. Eventos relevantes

Entre los eventos posibles:

```text
catalog.media.created
catalog.media.updated
catalog.media.published

source.created
source.updated
source.disabled

source.health.changed

playback.session.created
playback.session.failed
playback.session.recovered

resolution.succeeded
resolution.failed

report.created
report.resolved

user.created
user.suspended
```

No todos deben implementarse en el MVP.

La lista representa el vocabulario de integración evolutivo de la plataforma.

---

## 8.44. Commands vs Events

Debe mantenerse la diferencia:

```text
COMMAND
"Resuelve esta Source"

EVENT
"Esta Source fue resuelta"
```

```text
COMMAND
"Deshabilita esta Source"

EVENT
"La Source fue deshabilitada"
```

```text
COMMAND
"Crea una PlaybackSession"

EVENT
"Una PlaybackSession fue creada"
```

Esto evita que los eventos se conviertan accidentalmente en RPC disfrazado.

---

## 8.45. Idempotencia

Las operaciones que pueden producir efectos secundarios importantes deben soportar idempotencia cuando corresponda.

Header:

```http
Idempotency-Key: <unique-key>
```

Aplicable principalmente a:

```text
creación de recursos
operaciones administrativas
ingestión
comandos que puedan reintentarse
```

La semántica debe ser:

```text
misma clave
+
misma operación
=
mismo resultado lógico
```

Una clave no debe reutilizarse con un payload incompatible.

---

## 8.46. Playback Session e idempotencia

La creación de una PlaybackSession requiere un tratamiento particular.

Una repetición accidental de:

```http
POST /v1/playback/sessions
```

no necesariamente debe crear indefinidamente sesiones nuevas.

Puede utilizar:

```http
Idempotency-Key
```

o una semántica de reutilización controlada cuando:

```text
same user/session
same playback target
same capability context
same short time window
```

La decisión exacta se documentará en un ADR.

No se debe forzar una única estrategia antes de medir el comportamiento real.

---

## 8.47. Concurrencia y conflictos

Los recursos administrativos podrán utilizar versionado optimista.

Ejemplo:

```json
{
  "version": 7,
  "title": "Nuevo título"
}
```

Si otro administrador modificó el recurso y ahora la versión es `8`:

```http
409 Conflict
```

con:

```json
{
  "error": {
    "code": "RESOURCE_VERSION_CONFLICT",
    "message": "The resource was modified by another operation.",
    "details": {
      "currentVersion": 8
    }
  }
}
```

Esto evita sobrescrituras silenciosas.

---

## 8.48. Paginación

Las colecciones grandes utilizarán paginación.

Inicialmente puede utilizarse:

```text
page
limit
```

Ejemplo:

```http
GET /v1/search?q=example&page=2&limit=20
```

Para colecciones de gran escala podrá evolucionarse posteriormente hacia cursor pagination:

```text
cursor
limit
```

La API debe evitar respuestas potencialmente ilimitadas.

---

## 8.49. Filtros y ordenamiento

Los filtros deben estar explícitamente definidos por cada recurso.

Ejemplo:

```text
GET /v1/admin/sources?
    state=degraded
    &provider=provider_01
    &page=1
    &limit=20
```

No se permitirá un sistema genérico que transforme cualquier parámetro HTTP en una expresión SQL.

El servidor debe utilizar un conjunto explícito de campos permitidos.

---

## 8.50. Correlation IDs y trazabilidad

Cada petición recibirá un identificador de correlación.

Puede utilizarse:

```http
X-Request-Id: req_123
```

y, cuando exista infraestructura de tracing distribuido:

```http
traceparent: ...
```

El identificador debe propagarse cuando una operación cruza motores:

```text
Client
  │
  ▼
Core API
  │ requestId
  ▼
Orchestrator
  │ correlationId
  ▼
Resolver
  │
  ▼
Adapter
```

Esto permite reconstruir:

```text
Request
 → Session creation
 → Source selection
 → ResolutionAttempt
 → Gateway request
 → Playback failure
```

sin registrar secretos ni URLs sensibles.

---

## 8.51. Contrato de observabilidad

Los servicios deberán registrar, cuando corresponda:

```text
requestId
traceId
operation
resourceId
status
duration
errorCode
```

No deberán registrar indiscriminadamente:

```text
access tokens
refresh tokens
cookies
passwords
provider credentials
signed URLs
raw origin URLs
```

Los identificadores de Source y Session pueden utilizarse siempre que no revelen información sensible.

---

## 8.52. Timeouts

Cada frontera externa debe tener un timeout explícito.

Ejemplo conceptual:

```text
Client → Core API
Core API → Resolver
Resolver → Adapter
Adapter → External Provider
Gateway → Upstream
```

No debe existir una cadena donde:

```text
A espera indefinidamente a B
B espera indefinidamente a C
C espera indefinidamente a D
```

Los timeouts deben componerse dentro de un **deadline global**.

Ejemplo conceptual:

```text
Playback request deadline
        │
        ├── orchestration
        ├── source evaluation
        └── resolution
```

---

## 8.53. Reintentos

No todas las operaciones son reintentables.

### Reintentables con precaución

```text
GET
health probes
determinadas operaciones de resolución
```

### Requieren idempotencia

```text
POST con efectos secundarios
administrative commands
ingestion commands
```

Los reintentos deben considerar:

```text
timeout
error type
attempt count
total deadline
backoff
jitter
```

No se utilizará una política universal de “tres reintentos” para todos los servicios.

---

## 8.54. Contrato de caché

La caché no forma parte necesariamente del contrato público.

El cliente debe poder utilizar:

```text
GET /v1/media/...
```

sin conocer si la respuesta procede de:

```text
PostgreSQL
Redis
memory cache
CDN
```

La implementación puede cambiar sin romper el contrato.

Lo mismo aplica al Playback Orchestrator y Resolver.

---

## 8.55. ETags y caching HTTP

Para recursos adecuados pueden utilizarse:

```http
ETag
If-None-Match
Cache-Control
Last-Modified
```

especialmente para:

```text
MediaItem
Search results
static catalog metadata
```

Las PlaybackSessions y recursos ligados a autorización deberán utilizar políticas mucho más restrictivas.

---

## 8.56. Seguridad de los contratos

Las APIs deberán aplicar como mínimo:

```text
Input validation
Output validation
Authentication
Authorization
Rate limiting
Payload size limits
CORS policy
CSRF protection when cookie-based authentication applies
SSRF protection for server-side external access
Secret isolation
Audit logging for privileged operations
```

Las validaciones deberán realizarse en la frontera, incluso si posteriormente existe validación adicional dentro del dominio.

---

## 8.57. SSRF y contratos de red

Un principio especialmente importante:

> **Ninguna API pública debe aceptar una URL arbitraria como instrucción para que el backend realice una petición HTTP.**

Por ello queda explícitamente prohibido como contrato general:

```http
GET /proxy?url=https://...
```

o:

```json
{
  "url": "https://arbitrary-host.example/..."
}
```

para que el servidor simplemente haga fetch.

Las URLs externas utilizadas por:

```text
Resolver
Gateway
Health Checker
Ingestion
```

deben proceder de un contexto controlado y pasar por las políticas SSRF correspondientes.

Estas políticas incluyen, según el componente:

```text
allowed schemes
DNS validation
private/reserved IP blocking
redirect validation
timeouts
response size limits
egress restrictions
```

---

## 8.58. Qué información nunca debe cruzar las APIs públicas

La siguiente información queda fuera de los contratos públicos:

| Dato                                   | Motivo                                  |
| -------------------------------------- | --------------------------------------- |
| Provider credentials                   | Secreto de integración                  |
| Adapter secrets                        | Secreto operativo                       |
| Raw origin URLs                        | Reduce exposición y superficie de abuso |
| Provider cookies                       | Credenciales                            |
| Refresh token hashes                   | Seguridad                               |
| Password hashes                        | Seguridad                               |
| Internal IPs                           | Topología interna                       |
| Raw upstream errors                    | Puede filtrar información sensible      |
| Internal database IDs when unnecessary | Encapsulamiento                         |
| Internal health observations           | Separación de responsabilidades         |
| Arbitrary external URLs                | SSRF / abuso de red                     |

El cliente recibe **referencias y capacidades**, no detalles internos de implementación.

---

## 8.59. Contrato entre Player y Backend

El Player conoce:

```text
PlaybackSession
Playback entrypoint
selectedSource metadata
alternatives
tracks
resume state
session expiry
```

El Player no conoce:

```text
Adapter
Provider credentials
Resolver implementation
raw origin
Health algorithm
Source selection algorithm
Gateway upstream URL
```

Por tanto:

```text
PLAYER
  │
  │ PlaybackSession
  ▼
BACKEND
```

en lugar de:

```text
PLAYER
  │
  ├── Source A URL
  ├── Source B URL
  ├── Provider cookies
  └── Proxy instructions
```

---

## 8.60. Contrato entre Orchestrator y Resolver

El Orchestrator dice:

```text
"Necesito una representación reproducible de Source X
para Playback Target Y bajo estas capacidades."
```

El Resolver responde:

```text
"Esta Source pudo / no pudo resolverse y esta es
la Playable Representation normalizada."
```

El Resolver no decide:

```text
qué fuente es mejor
qué fuente debe utilizar el usuario
cuándo hacer fallback
qué fuente mostrar primero
```

Esas decisiones pertenecen al Orchestrator.

---

## 8.61. Contrato entre Orchestrator y Gateway

El Orchestrator crea el contexto de reproducción.

El Gateway recibe:

```text
PlaybackSession
resource context
authorization context
```

No recibe:

```text
arbitrary URL
source ranking request
catalog query
```

Por tanto:

```text
Orchestrator
      │
      ▼
PlaybackSession
      │
      ▼
Gateway
```

El Gateway transporta.

No decide qué reproducir.

---

## 8.62. Contrato entre Catalog y Source Registry

Catalog responde:

```text
¿Qué contenido existe?
```

Source Registry responde:

```text
¿Qué Sources están asociadas con ese Playback Target?
```

Por tanto:

```text
Catalog
  │
  └── MediaItem / Episode
             │
             ▼
       Source Registry
             │
             ├── Source A
             ├── Source B
             └── Source C
```

Una Source puede desaparecer sin modificar la identidad canónica del `MediaItem`.

Un `MediaItem` puede existir sin ninguna Source reproducible.

---

## 8.63. Contrato entre Health y Orchestrator

Health produce:

```text
evidence
projection
confidence
state
```

Orchestrator produce:

```text
playback decision
```

Por tanto:

```text
Health
   │
   │ evidence / projection
   ▼
Orchestrator
   │
   │ decision
   ▼
PlaybackSession
```

Health no debe devolver una instrucción del tipo:

```text
"Use Source B"
```

como responsabilidad primaria.

Puede proporcionar información que el Orchestrator utilice para decidir.

---

## 8.64. Contrato entre Player y Health

El Player puede generar evidencia:

```text
SOURCE_FAILED
MANIFEST_ERROR
BUFFERING
PLAYBACK_ERROR
```

pero no escribe directamente una verdad absoluta como:

```text
source.status = DEAD
```

El evento pasa por el contrato de reporting/health:

```text
Player
  ↓
Source Report / Playback Observation
  ↓
Health
  ↓
Projection
```

---

## 8.65. Contrato entre Ads y Playback

El Ad Manager mantiene separado:

```text
Ad Playback
```

de:

```text
Content Playback
```

Una configuración publicitaria puede viajar como parte del contexto de reproducción o mediante un contrato específico, pero nunca debe convertirse en una dependencia que haga que:

```text
ad failure
      ↓
content unavailable
```

La regla es:

```text
Ad error
   ↓
skip / fallback ad / continue
   ↓
Content Playback
```

---

## 8.66. Contratos de eventos del Player

Los eventos internos del Player se normalizan antes de convertirse en telemetría:

```text
PLAYER_READY
PLAY_STARTED
PLAY_PAUSED
SEEK_STARTED
SEEK_COMPLETED
BUFFERING_STARTED
BUFFERING_ENDED
QUALITY_CHANGED
AUDIO_CHANGED
SUBTITLE_CHANGED
PLAYBACK_ERROR
SOURCE_FAILURE
SESSION_EXPIRED
PLAYBACK_RECOVERED
PLAYBACK_ENDED
```

Los eventos de alta frecuencia como `timeupdate` no deben enviarse individualmente al backend como API requests.

Deben agregarse o muestrearse.

---

## 8.67. Contrato de Playback Error

El Player utilizará códigos normalizados:

```text
NETWORK_ERROR
MANIFEST_ERROR
MEDIA_ERROR
DECODE_ERROR
SESSION_ERROR
CAPABILITY_ERROR
TIMEOUT
UNKNOWN_ERROR
```

Cada error tendrá una clasificación:

```text
recoverable
fatal
```

Ejemplo:

```json
{
  "code": "MANIFEST_ERROR",
  "recoverable": true,
  "positionSeconds": 421.7
}
```

El backend decide si corresponde realizar recovery a otra Source.

---

## 8.68. Compatibilidad de versiones

La plataforma utilizará:

```text
/v1
```

como versión mayor.

Cambios compatibles incluyen:

```text
añadir campos opcionales
añadir nuevos códigos de eventos
añadir nuevos filtros compatibles
añadir recursos
```

Cambios potencialmente incompatibles incluyen:

```text
eliminar campos
cambiar significado de un campo
cambiar tipos
cambiar semántica de estados
cambiar comportamiento fundamental
```

Estos requieren nueva versión mayor o una estrategia explícita de compatibilidad.

---

## 8.69. Deprecación

Cuando una API sea reemplazada:

```text
/v1/old-endpoint
```

no debe eliminarse inmediatamente.

Debe existir:

```text
documentación de deprecación
fecha de retiro
migración
telemetría de uso
```

Ejemplo:

```http
Deprecation: true
Sunset: <date>
```

cuando la infraestructura lo permita.

---

## 8.70. Contrato antiguo vs contrato nuevo

La transformación principal queda resumida así:

| Aspecto                | Diseño anterior          | Diseño objetivo                      |
| ---------------------- | ------------------------ | ------------------------------------ |
| Inicio de reproducción | `GET /watch/:episode_id` | `POST /playback/sessions`            |
| Selección de Source    | Player                   | Playback Orchestrator                |
| URL de stream          | Expuesta                 | No expuesta                          |
| Source                 | DTO con URL              | Referencia lógica                    |
| Resolución             | Implícita                | Resolver explícito                   |
| Gateway                | Proxy genérico           | Media Delivery controlado            |
| Segment URL            | Parámetro externo        | `resourceId` opaco                   |
| Fallback               | Player                   | Orchestrator                         |
| Progress               | `episode_id` directo     | Playback Target                      |
| Reports                | `fuente_id` + motivo     | `sourceId` + contexto normalizado    |
| Health                 | implícito                | dominio explícito                    |
| Ads                    | mezclados con playback   | dominio separado                     |
| Admin                  | endpoints básicos        | Admin Application / Commands         |
| Errores                | `success/error` genérico | códigos semánticos                   |
| Trazabilidad           | limitada                 | requestId / traceId                  |
| Idempotencia           | parcial                  | contrato explícito                   |
| Seguridad de URL       | proxy recibe URL         | Gateway recibe referencia autorizada |

---

## 8.71. Flujo completo de reproducción mediante APIs

El flujo oficial del sistema queda:

```text
┌───────────────┐
│ Web / Player  │
└───────┬───────┘
        │
        │ POST /v1/playback/sessions
        ▼
┌───────────────────────┐
│ Playback Application  │
└──────────┬────────────┘
           ▼
┌───────────────────────┐
│ Playback Orchestrator │
└──────────┬────────────┘
           │
     ┌─────┼───────────────┐
     ▼     ▼               ▼
 Catalog Source Registry  Health
             │
             ▼
          Source
             │
             ▼
          Resolver
             │
             ▼
       Adapter Registry
             │
             ▼
 Authorized External
 Integration
             │
             ▼
 Playable Representation
             │
             ▼
      PlaybackSession
             │
             ▼
          Player
             │
             │ GET /playback/{id}/manifest
             ▼
      Media Gateway
             │
             ▼
      Media Resources
```

---

## 8.72. Flujo de fallback

```text
Player
   │
   │ playback error
   ▼
POST /playback/sessions/{id}/recover
   │
   ▼
Playback Orchestrator
   │
   ├── Health evidence
   ├── current source exclusion
   ├── alternative evaluation
   │
   ▼
Source B
   │
   ▼
Resolver
   │
   ▼
Playable Representation
   │
   ▼
PlaybackSession B
   │
   ▼
Player
```

El Player no necesita saber:

```text
por qué Source B fue elegida
qué adapter resolvió Source B
qué URL externa utilizó
```

Solo necesita una sesión reproducible válida.

---

## 8.73. Flujo de Source Switch manual

```text
User
  │
  │ selecciona Source B
  ▼
Player
  │
  │ POST /switch-source
  ▼
Orchestrator
  │
  ├── validate Source B
  ├── resolve Source B
  └── create new session
  │
  ▼
PlaybackSession B
  │
  ▼
Player
```

Esto garantiza que el cambio manual y el fallback automático compartan la misma infraestructura.

---

## 8.74. Flujo de progreso

```text
Player
   │
   │ local checkpoint
   ▼
Progress Controller
   │
   ├── anonymous → local persistence
   │
   └── authenticated
            │
            ▼
PATCH /v1/playback/progress
            │
            ▼
       User Domain
            │
            ▼
      PostgreSQL
```

El progreso no necesita conocer:

```text
Source
Provider
Resolver
Gateway
Adapter
```

---

## 8.75. Flujo de reporte

```text
Player
   │
   │ source failure / user report
   ▼
POST /v1/source-reports
   │
   ▼
Health / Reporting
   │
   ▼
HealthObservation
   │
   ▼
SourceHealth projection
   │
   ▼
Playback Orchestrator
```

Así se forma un ciclo de retroalimentación:

```text
Playback
   ↓
Observation
   ↓
Health
   ↓
Orchestration
   ↓
Better source selection
   ↓
Playback
```

---

## 8.76. Contrato de permisos

Las operaciones deberán clasificarse por capacidad.

Ejemplo conceptual:

```text
catalog.read
catalog.write

sources.read
sources.write
sources.disable

health.read
reports.create
reports.manage

playback.create
playback.recover
playback.switch

users.read
users.manage

admin.audit.read
admin.config.write
admin.operations.execute
```

Un rol es una agrupación de permisos.

Por ejemplo:

```text
user
moderator
admin
```

pero el código de autorización debe comprobar permisos/capacidades, no dispersar condiciones como:

```text
if role == "admin"
```

por toda la aplicación.

---

## 8.77. API Contract Testing

Cada contrato crítico debe contar con pruebas que validen:

```text
schema
required fields
types
allowed enum values
HTTP status
error codes
authorization
backward compatibility
```

Para los contratos entre motores se recomienda utilizar:

```text
Contract Tests
Schema Validation
Integration Tests
End-to-End Tests
```

El objetivo es detectar una ruptura como:

```text
Resolver cambia PlayableRepresentation
        ↓
Gateway interpreta mal el contrato
        ↓
Playback falla
```

antes de desplegarla.

---

## 8.78. OpenAPI

La API pública deberá documentarse mediante un esquema OpenAPI versionado.

Conceptualmente:

```text
openapi/
 ├── public.yaml
 ├── admin.yaml
 └── internal.yaml
```

o mediante una especificación consolidada con separación lógica.

OpenAPI será la fuente contractual para:

```text
endpoint definitions
schemas
parameters
responses
authentication
errors
```

El código puede generar clientes o validadores a partir del contrato cuando resulte útil.

---

## 8.79. Esquemas reutilizables

Los siguientes esquemas deberán existir como componentes reutilizables:

```text
MediaItem
Episode
SearchResult
SourceSummary
PlaybackSession
PlaybackAlternative
PlaybackTrack
PlaybackProgress
SourceReport
SourceHealth
User
UserProfile
Error
PaginationMeta
AdminOperation
AuditEvent
```

Esto evita definir una versión ligeramente distinta del mismo concepto en cada endpoint.

---

## 8.80. Feature Flags relacionados con APIs

Los feature flags deberán controlar comportamiento evolutivo sin modificar el contrato fundamental.

Ejemplos:

```text
playback_manual_source_switch_enabled
playback_recovery_enabled
playback_capability_model_enabled
search_advanced_filters_enabled
recommendations_enabled
ads_enabled
admin_bulk_operations_enabled
```

Los flags no deben utilizarse para ocultar permanentemente inconsistencias de contrato.

Una API debe tener un comportamiento contractual claramente documentado.

---

## 8.81. Límites del MVP

Para el MVP se consideran obligatorios:

```text
GET /v1/catalog/featured
GET /v1/media/{mediaId}
GET /v1/media/{mediaId}/seasons/{seasonNumber}

GET /v1/search

POST /v1/playback/sessions
GET /v1/playback/sessions/{sessionId}
POST /v1/playback/sessions/{sessionId}/recover
POST /v1/playback/sessions/{sessionId}/switch-source

GET /v1/playback/{sessionId}/manifest
GET /v1/playback/{sessionId}/resources/{resourceId}

PATCH /v1/playback/progress
POST /v1/source-reports

POST /v1/auth/register
POST /v1/auth/login
POST /v1/auth/logout

Admin APIs esenciales

Internal Resolver API
Health Worker contracts
```

No es necesario implementar toda la superficie conceptual desde el primer commit.

Lo importante es que las interfaces se diseñen desde el principio alrededor del modelo correcto.

---

## 8.82. APIs que quedan para evolución

Podrán incorporarse posteriormente:

```text
social authentication
passkeys
MFA
advanced recommendation API
personalized feeds
collections API
advanced analytics API
multi-device session management
native mobile APIs
TV-specific capability APIs
live playback APIs
DRM license APIs
advanced ad decision APIs
multi-region routing APIs
```

Estas extensiones no deben contaminar el contrato básico del MVP.

---

## 8.83. Criterios de aceptación de la capa API

La capa de APIs se considerará correctamente diseñada cuando:

1. Un cliente pueda obtener contenido sin conocer la estructura de PostgreSQL.

2. Un cliente pueda buscar contenido sin conocer el índice utilizado.

3. Un cliente pueda iniciar reproducción mediante un `Playback Target`.

4. El Player reciba una `PlaybackSession`, no URLs arbitrarias de Sources.

5. El Orchestrator sea responsable de la selección de Source.

6. El Resolver sea responsable de convertir una Source en una Playable Representation.

7. El Gateway no acepte una URL arbitraria como parámetro de proxy.

8. El Gateway pueda entregar un manifiesto mediante una PlaybackSession válida.

9. Los recursos multimedia puedan identificarse mediante referencias opacas.

10. El Player pueda solicitar recuperación de reproducción.

11. El Player pueda solicitar cambio manual de Source.

12. El backend pueda devolver una nueva PlaybackSession después de un fallback.

13. El progreso pueda persistirse utilizando un Playback Target.

14. Los reportes utilicen `sourceId` y categorías normalizadas.

15. Los errores posean códigos estables.

16. Las peticiones puedan correlacionarse mediante `requestId`/tracing.

17. Las operaciones sensibles posean autenticación y autorización apropiadas.

18. Los contratos no expongan secretos, credenciales ni URLs internas innecesarias.

19. Las operaciones con efectos secundarios puedan utilizar idempotencia cuando corresponda.

20. Los eventos sean tratados como hechos y puedan procesarse de forma idempotente.

21. Los contratos estén documentados mediante OpenAPI o mecanismo equivalente.

22. Los cambios incompatibles de contrato requieran una estrategia explícita de versionado.

---

## 8.84. ADRs relacionados

Esta sección requiere como mínimo los siguientes Architecture Decision Records:

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

---

## 8.85. Reglas maestras de la capa de APIs

La arquitectura deberá conservar las siguientes reglas:

### Regla 1

**Una API representa una capacidad de dominio, no una tabla.**

### Regla 2

**El Player reproduce PlaybackSessions; no administra Sources.**

### Regla 3

**El Orchestrator decide qué Source utilizar.**

### Regla 4

**El Resolver transforma Sources en Playable Representations.**

### Regla 5

**El Gateway transporta recursos autorizados; no decide qué contenido reproducir.**

### Regla 6

**Ninguna API pública acepta una URL arbitraria como instrucción de proxy.**

### Regla 7

**Las URLs de origen, credenciales y secretos permanecen del lado servidor.**

### Regla 8

**Catalog identifica contenido; Source Registry identifica fuentes.**

### Regla 9

**Health proporciona evidencia y estado; Orchestrator toma decisiones de reproducción.**

### Regla 10

**Playback Progress pertenece al dominio de usuario/interacción, no al catálogo.**

### Regla 11

**Los reportes identifican Sources mediante referencias internas, no mediante URLs arbitrarias.**

### Regla 12

**Los eventos representan hechos; las APIs síncronas representan consultas y comandos.**

### Regla 13

**Los consumidores deben tolerar duplicación de eventos y reintentos cuando el transporte lo requiera.**

### Regla 14

**Los errores deben tener códigos estables y no filtrar detalles internos.**

### Regla 15

**Los contratos deben poder evolucionar sin acoplar al cliente a la implementación interna.**

### Regla 16

**Toda operación externa debe respetar autenticación, autorización, límites y políticas de seguridad apropiadas.**

---

## 8.86. Contrato constitucional de la plataforma

Con esta sección queda formalizada la frontera entre los motores principales:

```text
                         ┌──────────────────┐
                         │      CLIENT      │
                         │  Web / Player    │
                         └────────┬─────────┘
                                  │
                    Public / Authenticated API
                                  │
                                  ▼
                    ┌────────────────────────┐
                    │       CORE API         │
                    │                        │
                    │ Catalog                │
                    │ Search                 │
                    │ User                   │
                    │ Playback               │
                    │ Source Registry        │
                    │ Reports                │
                    │ Admin                  │
                    └───────────┬────────────┘
                                │
                ┌───────────────┼────────────────┐
                │               │                │
                ▼               ▼                ▼
           Orchestrator      Resolver          Health
                │               │                │
                │               ▼                │
                │          Adapter Registry      │
                │               │                │
                │               ▼                │
                │       External Integration     │
                │                                │
                ▼                                │
        PlaybackSession ◄────────────────────────┘
                │
                ▼
        ┌─────────────────┐
        │  MEDIA GATEWAY  │
        └────────┬────────┘
                 │
                 ▼
             MEDIA DATA
                 │
                 ▼
              PLAYER
```

El principio final es:

> **Las APIs son la frontera que permite que los motores evolucionen independientemente sin perder coherencia global.**

El Catalog puede cambiar su almacenamiento.

El Search puede cambiar de PostgreSQL a un motor especializado.

El Resolver puede incorporar nuevos adapters.

Health puede cambiar su algoritmo de agregación.

El Gateway puede evolucionar su estrategia de entrega.

El Player puede cambiar de engine.

Y, mientras los contratos permanezcan estables, **ninguno de esos cambios debería obligar a rediseñar todo el sistema**.

Ese es precisamente el propósito de esta sección.

