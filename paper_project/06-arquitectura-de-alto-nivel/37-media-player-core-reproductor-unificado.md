## 6.37. Media Player Core / Reproductor Unificado

### a. Propósito y responsabilidad única

El **Media Player Core** es el subsistema cliente responsable de ejecutar y controlar la experiencia de reproducción audiovisual a partir de una **Playback Session previamente construida y autorizada por el backend**.

Su responsabilidad central será:

> **Convertir una Playback Session normalizada en una experiencia de reproducción estable, observable, accesible y consistente, independientemente de la Source, Provider o Adapter que exista detrás de ella.**

El Player deberá saber reproducir.

No deberá saber cómo funciona la infraestructura de Sources.

```text
PlaybackSession
      │
      ▼
MEDIA PLAYER CORE
      │
      ▼
Browser Media APIs
      │
      ▼
Audio / Video
```

---

### b. Principio fundamental

La regla más importante será:

> **El Player reproduce Playback Sessions, no Sources.**

Por tanto, el Player no deberá necesitar conocer:

```text
provider
adapter
source priority
source locator
origin URL
resolution strategy
health score
```

El backend puede conocer todo eso.

El Player no.

Esto nos permite tener:

```text
Provider A
Provider B
Provider C
     │
     ▼
PlaybackSession
     │
     ▼
same Player
```

sin introducir lógica específica por Provider en frontend.

---

### c. Fuera de alcance

El Media Player Core no será responsable de:

* descubrir Sources;
* resolver Sources;
* seleccionar la mejor Source;
* calcular health scores;
* ejecutar fallback entre Sources por decisión propia;
* firmar URLs;
* conocer credenciales de Provider;
* administrar el catálogo;
* implementar lógica de negocio de publicidad;
* persistir directamente datos de usuario en PostgreSQL;
* decidir políticas de monetización.

Sí podrá **detectar**, **reportar** y **solicitar recuperación** ante errores.

La distinción será:

```text
Player detects failure
        │
        ▼
Backend decides recovery
```

---

### d. Arquitectura interna

En lugar de pensar el Player como un único componente React grande, lo dividiremos conceptualmente:

```text
MEDIA PLAYER CORE
│
├── Session Controller
├── Playback Engine
├── Capability Detector
├── State Machine
├── Track Controller
├── Quality Controller
├── Subtitle Controller
├── Buffer Controller
├── Recovery Controller
├── Progress Controller
├── Telemetry Collector
└── Player UI
```

No significa que cada uno deba convertirse en paquete independiente desde el MVP.

Son responsabilidades lógicas.

---

### e. Session Controller

Será el punto de entrada del Player.

Responsabilidades:

```text
receive PlaybackSession
validate basic contract
initialize playback
monitor expiration
request renewal/recovery
replace session
dispose old session
```

Flujo:

```text
Playback API
     │
     ▼
PlaybackSession
     │
     ▼
Session Controller
     │
     ▼
Playback Engine
```

---

### f. Playback Engine

Abstraerá las diferencias entre mecanismos reales de reproducción.

Conceptualmente:

```text
Playback Engine
│
├── Native HTMLMediaElement
├── HLS Engine
└── future engines
```

Una implementación web inicial podrá utilizar:

```text
HTMLVideoElement
+
Hls.js cuando sea necesario
```

y una librería de UI/player como Vidstack si sigue siendo conveniente.

Pero el contrato de dominio no deberá depender directamente de Hls.js.

---

### g. Capability Detector

El Player deberá determinar qué puede hacer realmente el dispositivo.

Ejemplo:

```json
{
  "protocols": {
    "hlsNative": true,
    "hlsMse": false,
    "progressiveMp4": true
  },
  "features": {
    "pictureInPicture": true,
    "fullscreen": true,
    "mediaSession": true
  }
}
```

Este resultado alimentará el **Capability Model** que definimos anteriormente.

---

### h. Capability Model cliente → backend

Antes de crear determinadas Playback Sessions, el cliente podrá informar capacidades normalizadas:

```json
{
  "platform": "web",
  "protocols": ["HLS", "MP4"],
  "maxResolution": {
    "width": 1920,
    "height": 1080
  },
  "codecs": ["h264", "aac"],
  "features": {
    "nativeHls": true,
    "mse": false
  }
}
```

No necesitamos enviar:

```text
Chrome 153.0.8234.193 on Windows...
```

si lo único que el backend necesita saber es:

```text
HLS supported?
codec supported?
maximum useful resolution?
```

Esto reduce acoplamiento.

---

### i. Playback Session Contract

El Player recibirá algo conceptualmente similar a:

```json
{
  "playbackSessionId": "ps_123",

  "media": {
    "id": "episode_456",
    "title": "Episode 4",
    "posterUrl": "..."
  },

  "playback": {
    "entrypoint": "/v1/playback/ps_123/manifest",
    "protocol": "HLS",
    "expiresAt": "2026-09-27T04:30:00Z"
  },

  "capabilities": {
    "seek": true,
    "qualitySelection": true,
    "audioSelection": true,
    "subtitleSelection": true
  },

  "tracks": {
    "audio": [],
    "subtitles": []
  },

  "resume": {
    "positionSeconds": 452
  }
}
```

Obsérvese qué desapareció respecto al contrato original:

```text
sources[]
serverName
priority
streamUrl per Source
```

El contrato original sí entregaba esas estructuras directamente al componente.

---

### j. Estado interno del Player

El Player deberá tener una máquina de estados explícita.

Baseline:

```text
IDLE
  │
  ▼
INITIALIZING
  │
  ▼
LOADING
  │
  ▼
READY
  │
  ├────► PLAYING
  │        │
  │        ├────► PAUSED
  │        │
  │        └────► BUFFERING
  │                    │
  │                    └────► PLAYING
  │
  ├────► ENDED
  │
  └────► ERROR
```

Pero también necesitaremos estados operacionales de recuperación:

```text
PLAYING
   │
   ▼
RECOVERING
   │
   ├── recovered ───► PLAYING
   │
   └── failed ──────► ERROR
```

---

### k. Separar estado de reproducción y estado de sesión

Una mejora importante será no mezclar ambos.

### Playback state

```text
PLAYING
PAUSED
BUFFERING
ENDED
```

### Session state

```text
VALID
EXPIRING
RENEWING
RECOVERING
EXPIRED
FAILED
```

Así podríamos tener:

```text
PlaybackState = BUFFERING
SessionState  = VALID
```

o:

```text
PlaybackState = PAUSED
SessionState  = RENEWING
```

sin inventar una máquina gigantesca de combinaciones.

---

### l. Flujo de inicialización

```text
User clicks Play
      │
      ▼
Playback API
      │
      ▼
PlaybackSession
      │
      ▼
Session Controller
      │
      ▼
Capability validation
      │
      ▼
Playback Engine selection
      │
      ▼
Attach media resource
      │
      ▼
Metadata loaded
      │
      ▼
Restore position
      │
      ▼
READY
      │
      ▼
PLAYING
```

---

### m. Native HLS vs Hls.js

El documento original reconoce correctamente que Safari/iOS puede utilizar HLS nativo y propone cambiar automáticamente al `<video>` nativo.

Conservaremos la idea, pero no basándonos simplemente en:

```text
if Safari
```

sino en detección de capacidades.

Conceptualmente:

```text
Can browser play HLS natively?
       │
   ┌───┴────┐
  YES       NO
   │         │
   ▼         ▼
Native    Is MSE/Hls.js
video     available?
               │
          ┌────┴────┐
         YES        NO
          │          │
          ▼          ▼
       Hls.js     Unsupported
```

Capability detection es más robusto que user-agent sniffing.

---

### n. Calidad adaptativa

Para HLS con ABR, el Player podrá permitir:

```text
AUTO
1080p
720p
480p
...
```

Pero debemos distinguir:

```text
quality level
```

de:

```text
Source
```

Cambiar:

```text
1080p → 720p
```

dentro de una misma representación no equivale a:

```text
Source A → Source B
```

La primera operación pertenece al Player.

La segunda pertenece al Orchestrator.

---

### o. ABR automático

Cuando se utilice reproducción adaptativa:

```text
network conditions
+
buffer state
+
estimated bandwidth
+
available variants
        │
        ▼
ABR algorithm
        │
        ▼
selected rendition
```

El usuario podrá elegir:

```text
Auto
```

o forzar una calidad si el engine lo soporta.

---

### p. Quality Preference vs Effective Quality

No deberán confundirse.

Ejemplo:

```text
User preference:
1080p

Available:
720p maximum
```

Entonces:

```text
preferredQuality = 1080p
effectiveQuality = 720p
```

La preferencia se conserva para sesiones futuras.

---

### q. Audio Tracks

El Player podrá exponer:

```text
Español Latino
Español
English
日本語
...
```

pero internamente utilizaremos identificadores normalizados:

```json
{
  "id": "audio_es_419",
  "language": "es-419",
  "label": "Español Latino",
  "default": true
}
```

No basaremos la lógica exclusivamente en strings como:

```text
latino
castellano
japones
ingles
```

como hace el contrato original.

Usaremos códigos de idioma estándar cuando corresponda.

---

### r. Cambio de audio

Cuando sea una pista alternativa dentro de la misma representación:

```text
PLAYING
   │
   ▼
select audio track
   │
   ▼
engine switches track
   │
   ▼
PLAYING
```

No debería requerir una nueva Source.

---

### s. Idioma que requiere otra Source

Sin embargo, puede ocurrir:

```text
Source A → audio es-419
Source B → audio ja-JP
```

En ese caso el Player no puede simplemente seleccionar un track inexistente.

Flujo:

```text
User requests Japanese
       │
       ▼
Player determines unavailable
       │
       ▼
Playback API
       │
       ▼
Orchestrator
       │
       ▼
select compatible Source
       │
       ▼
new PlaybackSession
       │
       ▼
Player swaps session
```

manteniendo, cuando sea posible:

```text
currentTime
```

Esta distinción es importantísima.

---

### t. Subtitle Controller

Responsabilidades:

```text
discover tracks from session
enable/disable
select language
render
style
synchronize
report parsing errors
```

Formatos iniciales:

```text
WebVTT
```

Podrán añadirse otros posteriormente.

---

### u. Subtítulos internos vs externos

Una pista puede estar:

```text
embedded/referenced by HLS
```

o ser:

```text
external WebVTT
```

El Player deberá normalizar ambos a una experiencia similar.

---

### v. Estilos de subtítulos

Conservaremos la idea original de preferencias:

```json
{
  "fontScale": 1,
  "textColor": "#FFFFFF",
  "backgroundOpacity": 0.75
}
```

Pero estos valores pertenecen a:

```text
Player Preferences
```

no a la Playback Session.

---

### w. Progress Controller

El Player deberá calcular y reportar progreso.

Conceptualmente:

```text
currentTime
duration
playbackTargetId
updatedAt
```

No enviaremos una solicitud backend en cada `timeupdate`.

Podrá utilizarse:

```text
debounce / interval
+
significant events
```

Por ejemplo:

```text
every N seconds while playing
pause
seek
visibility change
before unload when feasible
ended
```

El intervalo exacto será medido posteriormente.

---

### x. Usuario anónimo

Conservaremos la persistencia local del documento original.

Conceptualmente:

```text
localStorage / IndexedDB
       │
       ▼
anonymous playback history
```

Ejemplo:

```json
{
  "episode_456": {
    "positionSeconds": 450,
    "durationSeconds": 1500,
    "updatedAt": "..."
  }
}
```

---

### y. Usuario registrado

```text
Player
   │
   ▼
Progress API
   │
   ▼
User / History domain
```

El Player no escribe directamente en la base de datos.

---

### z. Reconciliación local/remota

Si un usuario veía contenido anónimamente y después inicia sesión, tendremos una decisión posterior:

```text
local progress
      +
remote progress
      │
      ▼
reconciliation policy
```

No necesitamos resolverla para el MVP.

Será una ADR.

---

### aa. Preferencias

El Player podrá almacenar:

```text
preferred audio language
preferred subtitle language
subtitles enabled
preferred quality
volume
muted
playback speed
subtitle styling
```

El documento original ya contiene una estructura `player_preferences_v1`; la idea se conserva.

---

### ab. Preference Versioning

Conviene mantener:

```text
player_preferences_v1
```

y posteriormente:

```text
player_preferences_v2
```

o incluir:

```json
{
  "version": 2
}
```

para poder migrar estructuras sin romper configuraciones antiguas.

---

### ac. Buffer Controller

El documento original fija un máximo de 30 segundos de buffer para ahorrar ancho de banda.

No lo convertiremos en regla universal.

El buffer dependerá de:

```text
network
device
protocol
live/VOD
memory
data-saving preference
player engine
```

Podremos definir perfiles:

```text
NORMAL
DATA_SAVER
LOW_LATENCY
```

cuando exista evidencia para ello.

---

### ad. Buffer Health

Una métrica útil será:

```text
bufferAheadSeconds
```

Conceptualmente:

```text
currentTime = 100 s
bufferedUntil = 125 s

bufferAhead = 25 s
```

Esta señal ayuda a:

* ABR;
* diagnóstico;
* detectar riesgo de rebuffer;
* telemetría QoE.

---

### ae. Seeking

Flujo:

```text
User seeks
   │
   ▼
SEEKING
   │
   ▼
Media engine requests target range/segment
   │
   ▼
SEEKED
   │
   ▼
PLAYING / PAUSED
```

La posición de progreso deberá actualizarse correctamente después de un seek significativo.

---

### af. Playback Rate

Podremos soportar:

```text
0.5x
0.75x
1x
1.25x
1.5x
2x
```

si el dispositivo lo permite.

No es requisito indispensable para demostrar el MVP, pero pertenece naturalmente al Player.

---

### ag. Fullscreen

El Player UI gestionará:

```text
enter fullscreen
exit fullscreen
```

mediante las APIs disponibles en la plataforma.

La ausencia de Fullscreen API no debe impedir reproducción.

---

### ah. Picture-in-Picture

Conservaremos `player_enable_pip_mode` como feature flag posible.

Flujo:

```text
Capability Detector
       │
       ▼
PiP supported?
   │         │
 YES        NO
   │         │
 show       hide
 control    control
```

No se debe mostrar un control inútil cuando el dispositivo no soporta la función.

---

### ai. Media Session

En clientes compatibles podremos integrar Media Session API para:

```text
play
pause
seek
metadata
hardware/media controls
```

Será mejora V1, no dependencia del MVP.

---

### aj. Keyboard Controller

Atajos posibles:

```text
Space / K → play/pause
← / →     → seek
↑ / ↓     → volume
M         → mute
F         → fullscreen
C         → subtitles
```

Siempre evitando interferir con campos de formulario y tecnologías asistivas.

---

### ak. Accesibilidad

El documento original ya contempla axe-core, navegación mediante TAB, contraste y `aria-label`.

Lo elevaremos a requisito transversal.

El Player deberá considerar:

* navegación completa por teclado;
* foco visible;
* nombres accesibles;
* roles apropiados;
* contraste;
* estados anunciables;
* captions;
* controles con área táctil adecuada;
* reduced motion cuando corresponda.

---

### al. Player UI ≠ Player Core

Otra separación útil:

```text
┌───────────────────────┐
│       PLAYER UI       │
│ buttons / timeline    │
│ menus / overlays      │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│     PLAYER CORE       │
│ state / engine / QoE  │
└───────────┬───────────┘
            │
            ▼
      Media Engine
```

Así podemos cambiar el aspecto visual sin reescribir la lógica de reproducción.

---

### am. Eventos del Player

Revisaremos el contrato original hacia eventos más neutrales.

```text
PLAYER_INITIALIZED
PLAYBACK_READY

PLAY_REQUESTED
PLAY_STARTED
PAUSED
ENDED

SEEK_STARTED
SEEK_COMPLETED

BUFFERING_STARTED
BUFFERING_ENDED

QUALITY_CHANGED
AUDIO_TRACK_CHANGED
SUBTITLE_TRACK_CHANGED

SESSION_EXPIRING
SESSION_RECOVERY_REQUESTED
SESSION_REPLACED

PLAYBACK_ERROR
```

---

### an. Event Envelope

Ejemplo:

```json
{
  "event": "PLAYBACK_ERROR",
  "playbackSessionId": "ps_123",
  "timestamp": "...",
  "payload": {
    "category": "NETWORK",
    "fatal": true,
    "recoverable": true
  }
}
```

El frontend no deberá incluir información sensible de Source en telemetría pública.

---

### ao. Taxonomía de errores

Separaremos:

```text
NETWORK
MEDIA
DECODE
MANIFEST
SESSION
CAPABILITY
UNKNOWN
```

y además:

```text
fatal
recoverable
```

Ejemplo:

```json
{
  "category": "NETWORK",
  "code": "RESOURCE_TIMEOUT",
  "fatal": false,
  "recoverable": true
}
```

---

### ap. Recuperación local

No todo error necesita cambiar Source.

Por ejemplo:

```text
single segment transient failure
```

podría solucionarse con:

```text
bounded retry
```

El Player/engine podrá realizar recuperación local limitada.

---

### aq. Recuperación de sesión

Si el error supera la capacidad local:

```text
Player
   │
   ▼
Recovery Controller
   │
   ▼
Playback API
```

Payload conceptual:

```json
{
  "playbackSessionId": "ps_123",
  "positionSeconds": 452.12,
  "error": {
    "category": "NETWORK",
    "code": "MANIFEST_UNAVAILABLE"
  }
}
```

---

### ar. Backend-controlled fallback

Entonces:

```text
Recovery request
      │
      ▼
Playback Orchestrator
      │
      ├── current Source unhealthy?
      ├── representation expired?
      ├── alternative representation?
      └── alternative Source?
                │
                ▼
         new PlaybackSession
```

El Player no decide cuál.

---

### as. Session Swap

El Player deberá soportar:

```text
Session A
   │
   X
failure
   │
   ▼
Session B
```

preservando, cuando sea seguro:

```text
position
play/pause state
volume
subtitle preference
audio preference
playback rate
```

---

### at. Position Mapping

No siempre podremos asumir:

```text
452.12 s in Source A
=
452.12 s in Source B
```

porque diferentes Sources podrían tener:

* intros diferentes;
* cortes;
* créditos;
* ediciones distintas.

Para el MVP asumiremos equivalencia temporal razonable entre Sources del mismo Playback Target.

Pero deberá quedar documentada como una suposición.

Más adelante podrían existir:

```text
timeline offsets
```

o metadata de sincronización.

---

### au. Fallback UX

La recuperación no debería producir inmediatamente:

```text
ERROR
```

si el sistema todavía puede recuperarse.

Experiencia:

```text
PLAYING
   │
   ▼
problem detected
   │
   ▼
RECOVERING
   │
   ├── success → PLAYING
   └── exhausted → ERROR
```

La UI puede mostrar brevemente:

```text
"Recuperando reproducción…"
```

sin exponer detalles técnicos.

---

### av. Manual Source Switching

Aquí aparece una distinción interesante.

Queremos conservar que el usuario pueda cambiar manualmente de Source, porque es una característica explícita del producto.

Pero el Player no necesita recibir todas las URLs.

La UI puede solicitar:

```text
GET playback alternatives
```

y recibir opciones normalizadas:

```json
[
  {
    "id": "option_1",
    "label": "Español · 1080p",
    "language": "es-419",
    "quality": "1080p"
  },
  {
    "id": "option_2",
    "label": "Español · 720p",
    "language": "es-419",
    "quality": "720p"
  }
]
```

No:

```json
{
  "provider": "...",
  "streamUrl": "...",
  "priority": 93
}
```

---

### aw. Manual switch flow

```text
User opens "Sources"
       │
       ▼
normalized alternatives
       │
       ▼
select option B
       │
       ▼
Playback API
       │
       ▼
Orchestrator
       │
       ▼
Source B
       │
       ▼
Resolver
       │
       ▼
PlaybackSession B
       │
       ▼
Player session swap
```

Así mantenemos la función sin romper las fronteras arquitectónicas.

---

### ax. Telemetría QoE

El Player es el punto más importante para medir experiencia real.

Métricas principales:

```text
Playback Start Attempts
Playback Success Rate
Time To First Frame
Rebuffer Ratio
Rebuffer Count
Fatal Playback Error Rate
Session Recovery Success Rate
```

---

### ay. Time To First Frame

Definiremos:

```text
TTFF
=
first rendered video frame
-
user playback intent
```

Pero también necesitaremos descomponerlo:

```text
Playback intent
      │
      ├── API/session creation
      ├── source resolution
      ├── gateway/manifest
      ├── media initialization
      ├── buffering
      └── first frame
```

Esto permite saber **por qué** un TTFF es malo.

---

### az. No mezclar anuncios con TTFF base

El documento original establece TTFF `<1.8s` incluyendo el pre-roll publicitario.

Conviene separar:

```text
Content TTFF
```

de:

```text
Ad delay
```

porque son fenómenos diferentes.

Podremos medir:

```text
playback_intent_to_content_frame
ad_load_time
ad_playback_duration
post_ad_content_start_delay
```

---

### ba. Rebuffer Ratio

Definición:

```text
total rebuffer duration
────────────────────────
effective playback duration
```

Además:

```text
rebuffer_count
```

porque:

```text
1 × 10 seconds
```

y:

```text
10 × 1 second
```

pueden sumar lo mismo pero sentirse distinto.

---

### bb. Playback Success Rate

Deberemos definir qué significa "success".

No necesariamente:

```text
video reached credits
```

porque muchos usuarios abandonan voluntariamente.

Una definición operacional más útil podrá considerar:

```text
playback successfully started
AND
no immediate fatal technical failure
```

La definición final será una decisión analítica posterior.

---

### bc. Source Failover Success Rate

Nueva métrica:

```text
Automatic Failover Success Rate
=
successful recoveries using alternative source
──────────────────────────────────────────────
eligible source-failure recoveries
```

Aunque la decisión de fallback ocurra en backend, el Player confirma si la recuperación terminó realmente en reproducción.

---

### bd. Telemetry batching

No enviaremos cada evento individual necesariamente.

Podrá utilizarse:

```text
client event buffer
       │
       ▼
batch
       │
       ▼
Telemetry API
```

para reducir overhead.

Eventos críticos pueden enviarse inmediatamente.

---

### be. Sampling

No toda telemetría de alta frecuencia necesita conservarse al 100%.

Por ejemplo:

```text
timeupdate every 250 ms
```

no debe convertirse en millones de eventos backend.

Se deberán agregar o muestrear datos.

---

### bf. Debug Mode

Conservaremos la idea original de logs de desarrollo, pero sin imprimir tokens ni URLs sensibles.

Correcto:

```text
[Player] Session initialized ps_123
[Player] Engine: HLS_MSE
[Player] Buffering started
[Player] Recovery requested
```

Evitar:

```text
Attached Stream:
https://...?token=SECRET
```

como hacía conceptualmente el ejemplo original.

---

### bg. Seguridad — realidad del navegador

Aquí corregiremos otra premisa del original.

El documento afirma que tokens en headers y deshabilitar clic derecho ayudan a impedir la extracción del stream.

Desactivar:

```text
contextmenu
```

puede ser una decisión de UX, pero **no es un mecanismo de seguridad**.

Si el navegador puede reproducir los bytes, un usuario con control de su dispositivo puede observar tráfico y memoria mediante herramientas suficientemente avanzadas.

Por tanto, nuestra seguridad no dependerá de ocultar botones.

---

### bh. Protección real

La protección efectiva será:

```text
short-lived sessions
+
authorization
+
opaque resource identifiers
+
limited token scope
+
Gateway validation
+
rate limiting
+
origin protection
+
secret isolation
```

Si en algún escenario futuro existe DRM real, será otro subsistema.

---

### bi. Tokens

El Player puede poseer un token temporal de Playback Session.

Nunca:

```text
provider API key
provider cookies
origin credentials
Gateway signing key
```

---

### bj. CSP

La aplicación web deberá utilizar una Content Security Policy apropiada para reducir riesgos de XSS y exfiltración.

Especialmente relevante si posteriormente existen:

```text
ads
analytics
third-party scripts
```

El Player no puede proteger sus tokens si cualquier script arbitrario de la página puede leerlos.

---

### bk. Autoplay

El Player deberá respetar políticas del navegador.

Generalmente:

```text
autoplay with sound
```

puede ser bloqueado.

El Player deberá manejar:

```text
NotAllowedError
```

sin tratarlo como fallo de Source.

Podrá iniciar:

```text
muted autoplay
```

cuando la UX lo requiera y la plataforma lo permita.

---

### bl. Visibility

Cuando la pestaña queda oculta:

```text
document visibility
```

podrá utilizarse para:

* telemetría;
* persistencia de progreso;
* optimización;
* comportamiento de reproducción según producto.

No asumiremos automáticamente que debe pausarse.

---

### bm. Network Changes

El navegador puede pasar:

```text
Wi-Fi → cellular
```

o perder conectividad temporalmente.

El Player deberá distinguir, cuando sea posible:

```text
temporary connectivity failure
```

de:

```text
Source permanently failed
```

antes de solicitar fallback.

---

### bn. Offline

Offline playback no forma parte del MVP.

El Player deberá manejar:

```text
network unavailable
```

con un estado de error/recuperación apropiado.

Descarga offline requeriría otro diseño de:

* almacenamiento;
* licencias;
* expiración;
* seguridad;
* sincronización.

---

### bo. Publicidad

El Player podrá ofrecer **puntos de integración** para Ad Manager.

Pero:

```text
Player Core
≠
Ad Manager
```

El Player expone:

```text
pause content
play ad media
resume content
ad break lifecycle hooks
```

mientras el Ad Manager decide:

```text
whether ad exists
which ad
tracking
frequency cap
VAST/VMAP
```

Esto prepara muy bien el Motor 5.

---

### bp. Ad Playback State

Podrá existir una capa superior:

```text
CONTENT
   │
   ▼
AD_BREAK
   │
   ▼
CONTENT
```

sin contaminar la máquina de reproducción base.

Una alternativa es que el Ad Manager coordine dos sesiones de media separadas.

La decisión queda abierta.

---

### bq. Rendimiento

El documento original fija:

```text
component load <120 ms
TTFF <1.8 s
JS memory <80 MB
CPU <15%
```

como objetivos.

Al igual que con los motores anteriores, no los eliminaremos, pero los clasificaremos como hipótesis iniciales.

| Métrica            | MVP                     | V1                |
| ------------------ | ----------------------- | ----------------- |
| Player bundle/load | medir                   | budget validado   |
| TTFF               | medir por etapa         | SLO               |
| Rebuffer Ratio     | medir                   | SLO/QoE target    |
| JS heap            | profile                 | budget            |
| CPU                | profile por dispositivo | target segmentado |
| Fatal error rate   | medir                   | SLO               |
| Recovery success   | medir                   | target            |

Especialmente CPU y memoria varían enormemente entre dispositivos.

---

### br. Performance Marks

Podremos utilizar:

```text
performance.mark()
```

para etapas:

```text
playback_intent
session_received
engine_initialized
manifest_loaded
media_ready
first_frame
```

y después:

```text
performance.measure()
```

para construir el waterfall real.

---

### bs. Lazy Loading

El reproductor puede cargarse dinámicamente cuando realmente sea necesario.

```text
Content Detail Page
      │
      ▼
user enters watch view
      │
      ▼
load Player bundle
```

Esto evita penalizar páginas donde no se reproduce contenido.

---

### bt. Cleanup

Al desmontar el Player deberá liberar:

```text
HLS engine
event listeners
timers
AbortControllers
object URLs
telemetry buffers
media references
```

Esto es especialmente importante en navegación SPA.

---

### bu. Testing unitario

Cubrir:

* state transitions;
* preference handling;
* error normalization;
* progress calculation;
* track selection;
* recovery logic;
* session replacement;
* capability mapping.

---

### bv. Engine Contract Tests

Si tenemos:

```text
NativeHlsEngine
HlsJsEngine
ProgressiveEngine
```

todos deberán cumplir una interfaz común.

Por ejemplo:

```text
load()
play()
pause()
seek()
setVolume()
selectQuality()
selectAudioTrack()
selectSubtitle()
destroy()
```

y emitir eventos normalizados.

---

### bw. E2E

Conservaremos Playwright del diseño original.

Casos:

```text
open content
start playback
pause
resume
seek
change quality
change audio
enable subtitles
fullscreen
session failure
automatic recovery
manual source switch
resume position
```

---

### bx. Cross-browser matrix

Como mínimo:

```text
Chromium
Firefox
Safari/WebKit
mobile viewport
```

Cuando el proyecto evolucione:

```text
real iOS
real Android
TV browsers
```

porque emulación no sustituye completamente dispositivos reales.

---

### by. Accessibility Tests

Automáticos:

```text
axe-core
```

más pruebas manuales de:

```text
keyboard-only navigation
screen reader semantics
focus order
captions
fullscreen focus
menus
```

---

### bz. QoE Synthetic Tests

Podemos simular:

```text
fast network
slow network
high latency
packet loss approximation
offline transition
upstream 404
upstream 503
session expiry
```

y verificar la máquina de recuperación.

---

### ca. Riesgo — Player conoce demasiado

Si volvemos a introducir:

```text
provider
adapter
origin
source priority
```

en frontend, perderemos la separación lograda.

Mitigación:

> PlaybackSession será el contrato estable del Player.

---

### cb. Riesgo — Recovery loop

Ejemplo:

```text
Session A fails
     ↓
recover
     ↓
Session B fails
     ↓
recover
     ↓
Session A
     ↓
...
```

Debe existir:

```text
recovery budget
```

por intento de reproducción.

El Orchestrator llevará principalmente ese control, pero el Player también deberá evitar solicitudes infinitas.

---

### cc. Riesgo — Event storm

Un engine puede producir cientos de errores derivados de una misma falla.

Necesitamos:

```text
deduplication
debounce
error aggregation
```

antes de inundar Telemetry/Recovery APIs.

---

### cd. Riesgo — Progress spam

Igualmente:

```text
timeupdate
```

no debe generar una escritura backend continua.

Mitigación:

```text
local state
+
periodic checkpoint
+
important lifecycle events
```

---

### ce. Riesgo — Session swap visible

Cambiar Source podría provocar:

```text
black frame
spinner
audio reset
position jump
```

Mediremos:

```text
recovery_duration
```

y diseñaremos la UI para conservar el contexto.

---

### cf. Riesgo — Browser incompatibility

Mitigación:

```text
Capability Detection
       │
       ▼
Engine Selection
```

en vez de listas rígidas de navegadores.

---

### cg. Riesgo — Memory leak

Especialmente después de:

```text
episode 1
→ episode 2
→ episode 3
→ episode 4
```

sin recargar la SPA.

Se deberán ejecutar pruebas repetidas de:

```text
mount
play
destroy
mount
play
destroy
```

y observar heap.

---

### ch. MVP físico

No necesitamos diez paquetes separados.

Una estructura razonable:

```text
/player
│
├── core/
│   ├── PlayerController
│   ├── PlayerState
│   └── PlayerEvents
│
├── engines/
│   ├── NativeMediaEngine
│   └── HlsMediaEngine
│
├── controllers/
│   ├── ProgressController
│   ├── RecoveryController
│   └── PreferencesController
│
├── telemetry/
│
└── ui/
```

Si se utiliza React:

```text
<PlayerProvider>
    <VideoSurface />
    <PlayerControls />
    <QualityMenu />
    <AudioMenu />
    <SubtitleMenu />
</PlayerProvider>
```

sin meter toda la lógica en un solo componente.

---

### ci. MVP funcional

Para el primer vertical slice necesitamos:

```text
PlaybackSession
      ↓
Player loads HLS
      ↓
first frame
      ↓
play/pause
      ↓
seek
      ↓
volume
      ↓
quality
      ↓
subtitles
      ↓
progress persistence
      ↓
telemetry
```

y además el diferenciador arquitectónico:

```text
Session A fails
      ↓
Player requests recovery
      ↓
Orchestrator selects Source B
      ↓
Session B
      ↓
Player resumes near same position
```

Eso demostraría el sistema completo.

---

### cj. Criterios de aceptación del MVP

El Player estará listo cuando:

* pueda consumir una Playback Session sin conocer el Provider;
* reproduzca HLS en navegadores compatibles;
* seleccione engine mediante capabilities;
* pueda reproducir/pausar;
* permita seek;
* controle volumen y mute;
* maneje calidad automática/manual cuando exista;
* muestre audio/subtítulos disponibles;
* persista preferencias básicas;
* persista progreso anónimo;
* sincronice progreso registrado mediante API cuando corresponda;
* mida TTFF;
* mida buffering;
* normalice errores;
* diferencie errores recuperables y fatales;
* solicite recuperación cuando corresponda;
* acepte una Playback Session de reemplazo;
* preserve posición razonablemente durante fallback;
* permita cambio manual de Source mediante el backend;
* destruya correctamente recursos al desmontarse;
* sea navegable mediante teclado.

---

### ck. Feature flags

Podemos conservar y reorganizar los originales:

```text
player_auto_recovery_enabled
player_manual_source_switch_enabled
player_pip_enabled
player_quality_selection_enabled
player_subtitles_enabled
player_telemetry_enabled
```

Y dejamos publicidad fuera:

```text
ads_video_enabled
```

pertenece al Ad Manager, aunque afecte visualmente al Player.

---

### cl. ADRs abiertas

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

---

### cm. Arquitectura consolidada del Player

```text
                         PLAYBACK API
                              │
                              ▼
                       PlaybackSession
                              │
                              ▼
              ┌───────────────────────────┐
              │     MEDIA PLAYER CORE     │
              │                           │
              │  Session Controller       │
              │  State Machine            │
              │  Capability Detector      │
              │  Playback Engine          │
              │  Track Controller         │
              │  Quality Controller       │
              │  Subtitle Controller      │
              │  Buffer Controller        │
              │  Progress Controller      │
              │  Recovery Controller      │
              │  Telemetry Collector      │
              └─────────────┬─────────────┘
                            │
               ┌────────────┼────────────┐
               │            │            │
               ▼            ▼            ▼
          Native HLS     Hls.js      Progressive
               │            │            │
               └────────────┼────────────┘
                            ▼
                    HTMLMediaElement
                            │
                            ▼
                       AUDIO / VIDEO


                  ┌───────────────────┐
                  │     PLAYER UI     │
                  │                   │
                  │ Controls          │
                  │ Timeline          │
                  │ Quality           │
                  │ Audio             │
                  │ Subtitles         │
                  │ Fullscreen / PiP  │
                  └─────────┬─────────┘
                            │
                            ▼
                    Media Player Core


          TELEMETRY API ◄──── Player Events

          PROGRESS API  ◄──── Checkpoints

          PLAYBACK API  ◄──── Recovery Requests
                            │
                            ▼
                    Playback Orchestrator
```

Y con esto podemos establecer las cuatro reglas maestras del reproductor:

> **1. El Player reproduce Playback Sessions; no resuelve Sources.**

> **2. El Player puede recuperarse localmente de fallos técnicos menores, pero no decide qué Source alternativa utilizar.**

> **3. Cambiar calidad dentro de una representación y cambiar de Source son operaciones arquitectónicamente diferentes.**

> **4. La UI del Player, el Player Core y el Media Engine son capas diferentes aunque durante el MVP residan en el mismo frontend.**

Esto también nos permite corregir elegantemente el `Automated Fallback Engine` del documento original: **no desaparece el fallback automático como función del producto**; simplemente movemos la **decisión** al Playback Orchestrator. El Player sigue siendo quien detecta el fallo, preserva `currentTime`, solicita recuperación, recibe la nueva sesión y continúa reproduciendo.

Con estos cuatro motores ya tenemos una cadena de reproducción bastante madura:

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
ADAPTER REGISTRY
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
MEDIA PLAYER CORE
   │
   ▼
PLAYBACK EXPERIENCE
```

El siguiente bloque del documento es el **5. Gestor de Anuncios (Ad Manager)**. Ahí también conviene intervenir con cuidado: el original fija VAST/VMAP, redes concretas, máximo un preroll, salto exactamente a los cinco segundos, `SessionStorage` como frequency cap y hasta HTML publicitario configurable en PostgreSQL.

La revisión debería conservar **VAST/VMAP + frequency capping + tracking + fail-open para no bloquear el contenido**, pero separar claramente **Ad Decisioning, Ad Session, Ad Playback y Ad Telemetry**, y especialmente evitar que HTML/JS publicitario arbitrario almacenado en base de datos termine ejecutándose con privilegios de la aplicación.


Perfecto. Continuemos con el **Motor 5: Gestor de Anuncios (Ad Manager)**.

Aquí haría una revisión importante, aunque no porque la idea original esté mal. El documento ya plantea VAST 4.x/VMAP, tracking de impresión y cuartiles, frequency capping, timeouts para que un fallo publicitario no bloquee el contenido, aislamiento mediante `iframe`, feature flags y un posible Ad Server Gateway futuro.

Lo que debemos evitar es convertir el Player en un reproductor lleno de lógica comercial o permitir que HTML/JavaScript arbitrario almacenado en PostgreSQL se convierta en código confiable de nuestra aplicación.
