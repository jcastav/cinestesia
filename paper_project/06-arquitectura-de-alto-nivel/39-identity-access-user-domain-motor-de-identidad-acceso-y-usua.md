## 6.39. Identity, Access & User Domain / Motor de Identidad, Acceso y Usuario

### a. Propósito general

Este dominio administra la identidad y el estado personal persistente de los usuarios de la plataforma.

Conceptualmente se divide en tres subdominios:

```text
USER DOMAIN
│
├── Identity & Access
│   ├── Registration
│   ├── Authentication
│   ├── Sessions
│   └── Authorization
│
├── User Profile & Preferences
│   ├── Profile
│   ├── Avatar
│   └── Preferences
│
└── User Library & Playback History
    ├── Progress
    ├── Watch History
    ├── Favorites
    └── User Lists
```

La separación es **lógica**, no necesariamente física.

Para el MVP:

```text
Core API
   │
   ├── Auth module
   ├── User module
   └── Library module
          │
          ▼
     PostgreSQL
```

Es perfectamente suficiente.

No necesitamos tres microservicios.

---

### b. Principio fundamental

> **Identidad, autorización y datos personales del usuario son dominios relacionados, pero no son la misma responsabilidad.**

Una operación como:

```text
"¿Quién eres?"
```

pertenece a Identity.

```text
"¿Puedes moderar contenido?"
```

pertenece a Authorization.

```text
"¿Qué idioma prefieres?"
```

pertenece a User Preferences.

```text
"¿Por dónde ibas en esta película?"
```

pertenece a Playback History.

---

### c. Identity & Access

Su responsabilidad será:

> **Establecer y verificar la identidad de un usuario, administrar sus sesiones y producir un contexto de autenticación confiable para el resto de la plataforma.**

Incluye:

```text
registration
login
logout
session management
credential management
email verification
password recovery
external identity providers
```

según la fase del producto.

---

### d. Fuera de alcance de Identity

Identity no deberá:

* guardar progreso audiovisual;
* administrar favoritos;
* recomendar contenido;
* firmar Playback Sessions;
* conocer Sources;
* interactuar con Media Gateway;
* decidir anuncios;
* almacenar preferencias de Player;
* administrar lógica editorial.

---

### e. Authentication vs Authorization

Formalizaremos la diferencia:

```text
Authentication
"Who are you?"
```

frente a:

```text
Authorization
"What are you allowed to do?"
```

Ejemplo:

```text
authenticated user
        │
        ▼
user_id = usr_123
        │
        ▼
Authorization
        │
        ├── can watch?
        ├── can report?
        ├── can moderate?
        └── can administer?
```

---

### f. Actor anónimo

La plataforma no requerirá necesariamente cuenta para toda interacción.

Tendremos:

```text
Anonymous Viewer
```

y:

```text
Authenticated User
```

El Player, Catalog y Playback pueden funcionar para ambos cuando la política de producto lo permita.

La autenticación añade principalmente:

```text
cross-device history
favorites
lists
persistent preferences
account features
```

---

### g. User Identity

Entidad conceptual:

```json
{
  "userId": "usr_123",
  "status": "ACTIVE",
  "createdAt": "..."
}
```

La identidad interna no dependerá del email.

El email puede cambiar.

`userId` no.

---

### h. Account Status

En lugar de únicamente:

```text
is_active BOOLEAN
```

podemos pensar conceptualmente en:

```text
PENDING_VERIFICATION
ACTIVE
SUSPENDED
DISABLED
DELETED
```

No todos tienen que implementarse desde el MVP.

Pero evita que un booleano termine significando cinco cosas diferentes.

---

### i. Credentials

Las credenciales serán un concepto separado de la identidad.

Por ejemplo:

```text
User
 │
 ├── Password Credential
 │
 ├── Google Identity
 │
 └── future Passkey
```

Esto permite que una misma cuenta tenga múltiples métodos de autenticación.

---

### j. Password Authentication

Para autenticación local:

```text
email/username
      +
password
      │
      ▼
Credential Verification
      │
      ▼
Session Creation
```

Nunca almacenaremos la contraseña original.

---

### k. Password hashing

El documento original elige correctamente **Argon2id**.

Lo conservamos.

Pero no congelaremos parámetros concretos dentro de la arquitectura.

La configuración deberá ajustarse según:

```text
hardware
deployment resources
expected login concurrency
current security guidance
```

y versionarse.

---

### l. Password hash metadata

Idealmente el formato almacenado debe contener información suficiente para reconocer:

```text
algorithm
version
parameters
salt
hash
```

de modo que posteriormente podamos hacer:

```text
login
  │
  ▼
verify old hash
  │
  ▼
parameters outdated?
  │
 YES
  │
  ▼
rehash with current policy
```

sin obligar a todos los usuarios a cambiar contraseña simultáneamente.

---

### m. Password policy

No fijaremos reglas arbitrarias como:

```text
1 uppercase
1 number
1 symbol
```

como núcleo arquitectónico.

La política deberá favorecer:

```text
sufficient length
breached-password protections when available
rate limiting
secure hashing
```

y evitar restricciones innecesarias.

---

### n. Login identifiers

Podremos permitir:

```text
email
```

y opcionalmente:

```text
username
```

pero internamente ambos se resuelven hacia:

```text
user_id
```

---

### o. Email normalization

Antes de crear o buscar cuentas:

```text
input
 ↓
normalization
 ↓
canonical comparison
```

pero debemos ser cuidadosos con reglas específicas de proveedores.

No asumiremos que todos los emails pueden modificarse agresivamente sin cambiar identidad.

---

### p. Registration flow

```text
User
 │
 ▼
POST /v1/auth/register
 │
 ▼
Validate input
 │
 ▼
Check registration policy
 │
 ▼
Create User
 │
 ▼
Create Credential
 │
 ▼
optional verification
 │
 ▼
Session
```

---

### q. Login flow

```text
POST /v1/auth/login
        │
        ▼
rate-limit / abuse checks
        │
        ▼
resolve account
        │
        ▼
verify credential
        │
     ┌──┴──┐
   fail   success
     │       │
     ▼       ▼
 generic   create
 error     session
              │
              ▼
         Auth Context
```

---

### r. Generic authentication errors

No queremos revelar innecesariamente:

```text
"email exists but password incorrect"
```

frente a:

```text
"email does not exist"
```

Una respuesta pública puede ser:

```text
INVALID_CREDENTIALS
```

mientras observabilidad interna conserva la causa real.

---

### s. Auth Session como entidad

El documento original piensa principalmente en:

```text
JWT + Refresh Token
```

Nosotros elevaremos el concepto a:

```text
AuthSession
```

y luego decidiremos cómo se materializa.

Ejemplo:

```json
{
  "sessionId": "auths_123",
  "userId": "usr_456",
  "createdAt": "...",
  "expiresAt": "...",
  "status": "ACTIVE"
}
```

Esto evita confundir:

```text
token
```

con:

```text
session
```

---

### t. Access Token

Podrá ser:

```text
short-lived JWT
```

si resulta apropiado.

Debe representar únicamente información necesaria.

Ejemplo conceptual:

```json
{
  "sub": "usr_456",
  "sid": "auths_123",
  "iat": 123,
  "exp": 456
}
```

Claims adicionales deberán justificarse.

---

### u. No meter el perfil completo en JWT

Evitar:

```json
{
  "email": "...",
  "username": "...",
  "avatar": "...",
  "preferences": {},
  "favorites": [],
  "role": "...",
  "..."
}
```

Los tokens:

* crecen;
* quedan obsoletos;
* pueden terminar registrados accidentalmente;
* viajan continuamente.

Usaremos claims mínimos.

---

### v. JWT no es obligatorio para siempre

El documento original establece Stateless JWT como arquitectura base.

Nosotros documentaremos:

> **El sistema necesita sesiones autenticadas seguras; JWT es una posible implementación del access token, no una propiedad fundamental del dominio.**

Para una aplicación web monolítica/modular, una sesión opaca server-side también puede ser válida.

La decisión final será ADR.

---

### w. Refresh Token

Si utilizamos access token corto + refresh token:

```text
Access Token
short-lived
     │
     ▼
expires
     │
     ▼
Refresh Token
     │
     ▼
new Access Token
```

El refresh token deberá ser:

```text
high entropy
opaque
revocable
```

y almacenado de forma segura.

---

### x. Refresh token en navegador

Para web:

```text
HttpOnly
Secure
```

son propiedades importantes.

`SameSite` dependerá de la arquitectura real de dominios y flujos OAuth.

El original fija `SameSite=Strict`; lo trataremos como configuración inicial, no universal.

---

### y. Refresh Token Rotation

Preferiremos rotación:

```text
RT1
 │ refresh
 ▼
RT2
```

y:

```text
RT1 becomes invalid
```

Si RT1 aparece otra vez:

```text
possible token reuse
```

y podremos invalidar la familia de sesión según política.

---

### z. Token Family

Conceptualmente:

```text
AuthSession
    │
    ├── RT1 → used
    ├── RT2 → used
    └── RT3 → active
```

Esto proporciona mejores propiedades que un refresh token estático de larga duración.

---

### aa. Logout

Logout será:

```text
revoke AuthSession
```

no simplemente:

```text
delete token from browser
```

Cuando exista estado server-side asociado.

---

### ab. Logout all devices

```text
User
 │
 ▼
revoke all active AuthSessions
```

sin necesidad de administrar manualmente cada access token corto si expiran rápidamente.

---

### ac. Blacklist JWT

El original propone:

```text
jwt:blacklist:{jti}
```

en Redis para revocación inmediata.

No la pondremos como mecanismo obligatorio.

Porque si cada JWT requiere consultar Redis:

```text
stateless JWT
```

ya no es realmente completamente stateless en la ruta de autorización.

Alternativas:

```text
short access-token TTL
+
revocable refresh sessions
```

o:

```text
session-version / session status
```

para operaciones donde la revocación inmediata sea indispensable.

Será una decisión explícita.

---

### ad. Firma de tokens

Si usamos JWT y múltiples componentes verifican tokens independientemente, firma asimétrica puede ser conveniente:

```text
Auth
 │ private key
 ▼
JWT

Services
 │ public key
 ▼
verification
```

El original propone RS256 o EdDSA.

No fijaremos algoritmo definitivo hasta ADR.

---

### ae. Key Rotation

Si existen JWT firmados:

```text
kid
```

permitirá identificar la clave.

Conceptualmente:

```text
Key A active
Key B previous
```

durante una ventana de rotación.

No hardcodearemos una única clave eterna.

---

### af. Auth Context

Después de verificar autenticación, el resto del backend debería recibir algo parecido a:

```json
{
  "authenticated": true,
  "userId": "usr_123",
  "sessionId": "auths_456"
}
```

Authorization puede enriquecerlo posteriormente.

---

### ag. Authorization / RBAC

El original utiliza:

```text
user
moderator
admin
```

Lo conservaremos inicialmente.

Pero conceptualmente:

```text
Role
  │
  ▼
Permissions
```

es preferible a dispersar:

```text
if role === "admin"
```

por toda la aplicación.

---

### ah. Permissions

Ejemplos:

```text
catalog.read
catalog.write

sources.read
sources.write

reports.moderate

users.manage

admin.access
```

No necesariamente implementaremos una tabla compleja desde el MVP.

Puede existir un mapping en código:

```text
user
  → basic permissions

moderator
  → moderation permissions

admin
  → administrative permissions
```

---

### ai. Authorization rule

La regla será:

> **El frontend puede ocultar acciones, pero el backend siempre aplica la autorización real.**

Ocultar:

```text
Delete button
```

no es seguridad.

---

### aj. Privilege changes

Si un administrador cambia:

```text
moderator → user
```

debemos decidir cuándo deja de ser válido un token emitido anteriormente con privilegios antiguos.

Eso refuerza la idea de no meter demasiado estado mutable dentro del JWT.

Será parte de la ADR de autorización/session invalidation.

---

### ak. OAuth / Social Login

El original contempla Google y Discord.

Los trataremos como:

```text
External Identity Providers
```

no como lógica especial incrustada en `users`.

Modelo:

```text
User
 │
 ├── Local Credential
 ├── External Identity A
 └── External Identity B
```

---

### al. External Identity

Conceptualmente:

```text
user_id
provider
provider_subject
```

El identificador estable del proveedor debe ser el `subject` correspondiente, no confiar únicamente en un email recibido.

---

### am. Account linking

Problema futuro:

```text
local account:
user@example.com

OAuth login:
user@example.com
```

¿son automáticamente la misma persona?

No asumiremos que sí.

Necesitaremos una política explícita de:

```text
account linking
```

para evitar account takeover.

---

### an. Passkeys / WebAuthn

Conservamos la ADR original, pero la elevamos:

```text
Passkeys
```

son un método de autenticación adicional, no un reemplazo estructural del User Domain.

Arquitectura:

```text
User
 │
 ├── Password Credential
 ├── External Identity
 └── Passkey Credential
```

---

### ao. MFA

No será requisito MVP.

Pero la arquitectura deberá permitir:

```text
TOTP
WebAuthn/passkey
recovery codes
```

si posteriormente cuentas privilegiadas lo requieren.

Especialmente:

```text
admin
moderator
```

pueden tener una política de autenticación más estricta.

---

### ap. User Profile

Ahora separamos Profile de Identity.

Profile contendrá datos como:

```text
username
display name
avatar
bio
```

si el producto los necesita.

No todo dato de perfil debe terminar en:

```text
users
```

para siempre.

---

### aq. Public Profile vs Private Account Data

Distinguiremos:

```text
Public Profile
```

de:

```text
Private Account
```

Ejemplo:

```text
username
avatar
```

pueden ser públicos.

```text
email
active sessions
security settings
```

no.

---

### ar. API de perfil

Conceptualmente:

```http
GET /v1/me
PATCH /v1/me/profile
PATCH /v1/me/preferences
```

`GET /v1/me` devuelve únicamente información autorizada del usuario actual.

---

### as. User Preferences

Tendremos un espacio para preferencias sincronizables:

```text
preferred language
subtitle preference
content display preferences
player preferences
```

pero debemos diferenciar:

```text
device-local preference
```

de:

```text
account preference
```

---

### at. Local vs Account Preferences

Ejemplo:

```text
volume = 35%
```

puede tener sentido como:

```text
device-local
```

mientras:

```text
preferred audio language = es-419
```

puede ser:

```text
account-level
```

No sincronizaremos todo indiscriminadamente.

---

### au. User Library

Este subdominio gestionará:

```text
favorites
watchlist
custom lists
watch history
```

sin mezclarlos con autenticación.

---

### av. Bookmarks

El original tiene:

```text
watching
completed
plan_to_watch
dropped
favorites
```

y los asocia a `anime_id`.

Como ya generalizamos el catálogo, no utilizaremos `anime_id`.

Usaremos:

```text
media_item_id
```

para colecciones a nivel de obra.

---

### aw. Favorites vs Status Lists

Conviene distinguir conceptualmente:

```text
favorite = boolean/relation
```

de:

```text
watching status
```

porque un contenido puede ser simultáneamente:

```text
COMPLETED
+
FAVORITE
```

El enum original hace que ambas ideas compitan por una sola columna `folder`.

Mejor:

```text
Library Entry
│
├── status = COMPLETED
└── favorite = true
```

o relaciones separadas.

---

### ax. User Library Entry

Modelo conceptual:

```json
{
  "userId": "usr_123",
  "mediaItemId": "media_456",
  "status": "WATCHING",
  "favorite": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

Estados:

```text
PLANNED
WATCHING
COMPLETED
DROPPED
```

según producto.

---

### ay. Custom Lists

Posteriormente:

```text
"My favorite sci-fi"
"Watch with friends"
"2026 movies"
```

podrían representarse mediante:

```text
user_lists
user_list_items
```

No MVP.

---

### az. Playback History

Este dominio registra:

> **Qué Playback Target vio el usuario y hasta dónde llegó.**

No:

```text
qué Source utilizó
```

Eso pertenece a observabilidad/playback.

---

### ba. Playback Target en History

Como nuestro dominio audiovisual admite:

```text
movie
episode
short
concert
...
```

`watch_history` no debe depender exclusivamente de:

```text
episode_id
```

como ocurre actualmente.

Conceptualmente:

```text
playback_target_type
playback_target_id
```

o una abstracción equivalente.

---

### bb. Modelo conceptual de progreso

```json
{
  "playbackTarget": {
    "type": "EPISODE",
    "id": "ep_456"
  },

  "positionSeconds": 645,
  "durationSeconds": 1420,

  "completed": false,

  "updatedAt": "..."
}
```

---

### bc. Progress ≠ History Event Log

Otra distinción importante.

```text
Playback Progress
```

es:

```text
latest resumable state
```

mientras:

```text
Playback Events
```

son telemetría histórica.

No necesitamos guardar cada:

```text
645
650
655
660
```

como filas de historial de usuario.

La tabla operacional puede conservar simplemente el checkpoint actual.

---

### bd. Progress API

En lugar del original:

```http
POST /v1/history/progress
```

con `episode_id`, podemos generalizar:

```http
PUT /v1/me/playback-progress/{targetType}/{targetId}
```

o:

```http
POST /v1/me/playback-progress
```

Contrato conceptual:

```json
{
  "playbackTargetType": "EPISODE",
  "playbackTargetId": "ep_456",
  "positionSeconds": 645,
  "durationSeconds": 1420,
  "completed": false,
  "clientUpdatedAt": "..."
}
```

El endpoint exacto queda para diseño API.

---

### be. Upsert

Progress es naturalmente:

```text
upsert
```

por:

```text
(user_id, playback_target)
```

No necesitamos crear una nueva fila por cada checkpoint.

---

### bf. Idempotencia

Si llegan dos veces:

```text
position = 645
```

el resultado debería seguir siendo coherente.

Por tanto, la sincronización debe ser naturalmente idempotente cuando sea posible.

---

### bg. El progreso NO es estrictamente monotónico

Cuidado con implementar:

```text
new_position = max(old_position, incoming_position)
```

porque el usuario puede:

```text
seek backwards
```

o:

```text
restart content
```

Necesitaremos una política de reconciliación basada en:

```text
updatedAt
playback session
completion state
```

y no simplemente el mayor número.

---

### bh. Completion

`completed` no debería depender exclusivamente del cliente diciendo:

```text
completed = true
```

Podemos derivarlo mediante una política:

```text
position / duration >= threshold
```

más eventos de reproducción.

El threshold exacto será configurable.

---

### bi. Resume

Al crear Playback Session:

```text
Playback Orchestrator
       │
       ├── playback setup
       │
       └── optional resume context
```

o el frontend puede consultar User History por separado.

No debemos hacer que Source Resolver dependa de History.

---

### bj. Anonymous Progress

Como definimos en Player:

```text
Anonymous
   │
   ▼
local persistence
```

Al iniciar sesión podremos posteriormente ofrecer reconciliación.

---

### bk. Cross-device

Para autenticados:

```text
Device A
   │
   ▼
Progress API
   │
   ▼
PostgreSQL
   │
   ▼
Device B
```

Ese es el valor real del historial server-side.

---

### bl. Write-behind Redis

El original propone:

```text
Player
 ↓
Redis
 ↓ every 60s
Worker
 ↓
PostgreSQL
```

Esto es válido a gran escala, pero añade:

```text
eventual consistency
worker failure modes
data-loss window
reconciliation
Redis durability requirements
```

Para un MVP no necesitamos asumir que PostgreSQL no puede manejar checkpoints razonablemente espaciados.

---

### bm. Estrategia MVP para progreso

Preferiría:

```text
Player
  │
  │ checkpoint every reasonable interval
  ▼
Core API
  │
  ▼
PostgreSQL UPSERT
```

con:

```text
debouncing/throttling client-side
```

Primero medimos.

---

### bn. Evolución por escala

Solo cuando aparezca presión real:

```text
Player
  │
  ▼
Progress API
  │
  ▼
Redis / Queue
  │
  ▼
Async Worker
  │
  ▼
PostgreSQL
```

Podemos introducir write-behind.

Así la complejidad aparece cuando existe una razón.

---

### bo. Modelo PostgreSQL — usuarios

Conceptualmente:

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
```

---

### bp. Profiles

```sql
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    avatar_url TEXT,
    updated_at TIMESTAMPTZ NOT NULL
);
```

Separación conceptual:

```text
User identity
≠
Profile
```

---

### bq. Password credentials

```sql
CREATE TABLE password_credentials (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    email_normalized VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_changed_at TIMESTAMPTZ NOT NULL
);
```

El esquema exacto dependerá de si permitimos múltiples emails/credentials.

---

### br. External identities

```sql
CREATE TABLE external_identities (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    provider VARCHAR(64) NOT NULL,
    provider_subject VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,

    UNIQUE(provider, provider_subject)
);
```

---

### bs. Auth sessions

```sql
CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);
```

---

### bt. Refresh token records

Si usamos rotación:

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES auth_sessions(id),
    token_hash TEXT NOT NULL,
    family_id UUID NOT NULL,
    used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);
```

Solo guardaremos:

```text
hash(token)
```

no el refresh token en claro.

---

### bu. ¿IP y User-Agent?

El esquema original guarda ambos en cada refresh token y los logs incluyen `client_ip`.

No los convertiremos en requisitos permanentes.

Pueden ser útiles para:

```text
security telemetry
session display
abuse detection
```

pero implican datos adicionales.

Aplicaremos:

```text
data minimization
retention policy
```

y, cuando sea suficiente:

```text
coarse device metadata
```

en lugar de almacenar indefinidamente valores completos.

---

### bv. User Preferences

```sql
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    preferences JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
```

Si usamos JSONB deberá existir:

```text
schema validation
version
```

No será un cajón sin contrato.

---

### bw. Playback Progress

Conceptualmente:

```sql
CREATE TABLE playback_progress (
    user_id UUID NOT NULL REFERENCES users(id),
    playback_target_type VARCHAR(32) NOT NULL,
    playback_target_id UUID NOT NULL,
    position_seconds DOUBLE PRECISION NOT NULL,
    duration_seconds DOUBLE PRECISION,
    completed BOOLEAN NOT NULL DEFAULT false,
    last_watched_at TIMESTAMPTZ NOT NULL,

    PRIMARY KEY (
        user_id,
        playback_target_type,
        playback_target_id
    )
);
```

Como en Source Registry, la integridad polimórfica de `playback_target_id` deberá resolverse mediante ADR si mantenemos este modelo.

---

### bx. User Library

```sql
CREATE TABLE user_library (
    user_id UUID NOT NULL REFERENCES users(id),
    media_item_id UUID NOT NULL,
    status VARCHAR(32),
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,

    PRIMARY KEY (user_id, media_item_id)
);
```

Así eliminamos el acoplamiento estructural a anime.

---

### by. Índices

Ejemplos:

```text
playback_progress(user_id, last_watched_at DESC)

user_library(user_id, status)

auth_sessions(user_id, status)

external_identities(provider, provider_subject)
```

Los índices definitivos se decidirán a partir de consultas reales.

---

### bz. Caching

No necesitamos cachear automáticamente todo Profile durante una hora como fija el original.

Primero:

```text
PostgreSQL
```

puede servir perfectamente.

Redis se utilizará donde aporte:

```text
rate limiting
ephemeral security state
temporary session state
high-value cache
```

y no como reflejo automático de todas las tablas.

---

### ca. Session Cache

Si necesitamos validación rápida:

```text
auth:session:{session_id}
```

puede contener estado mínimo.

Pero debemos definir comportamiento ante:

```text
Redis unavailable
```

No queremos que una caída de Redis necesariamente desconecte a toda la plataforma si el diseño puede degradar de forma segura.

---

### cb. Rate Limiting

Endpoints sensibles:

```text
/register
/login
/password-reset
/refresh
```

deben tener controles específicos.

Pero evitaremos una regla rígida universal como:

```text
5 attempts/IP/minute
```

del documento original.

El límite dependerá de:

```text
endpoint
account
network
observed abuse
deployment
```

---

### cc. Credential Stuffing

Defensas:

```text
rate limiting
account-aware throttling
generic errors
breached credential detection where feasible
security monitoring
optional challenge escalation
```

---

### cd. CAPTCHA / Turnstile

El documento original activa reCAPTCHA/Turnstile después del segundo intento fallido.

No fijaremos ese comportamiento.

Puede existir:

```text
risk-based challenge
```

pero será una defensa adaptativa, no una dependencia obligatoria de login.

---

### ce. Password Reset

Aunque el original no lo desarrolla, un sistema de contraseña necesita este flujo.

```text
request reset
      │
      ▼
generic response
      │
      ▼
short-lived one-time token
      │
      ▼
new password
      │
      ▼
invalidate token
```

Opcionalmente:

```text
revoke existing sessions
```

según política.

---

### cf. Email Verification

Similar:

```text
verification token
```

debe ser:

```text
random
single-purpose
short-lived
one-time
```

No reutilizaremos tokens de autenticación normales.

---

### cg. CSRF

Si usamos cookies para acciones autenticadas, debemos analizar CSRF de forma explícita.

No basta con decir:

```text
SameSite = secure forever
```

Podremos combinar:

```text
SameSite
Origin checks
CSRF token
```

según arquitectura.

---

### ch. XSS y tokens

Una razón para preferir refresh token en:

```text
HttpOnly cookie
```

es que JavaScript no pueda leerlo directamente.

Evitar:

```text
localStorage.refreshToken
```

para credenciales de larga duración.

---

### ci. Session Fixation

Después de eventos sensibles como:

```text
successful login
privilege elevation
password reset
```

deberemos renovar identificadores de sesión cuando corresponda.

---

### cj. User Enumeration

Aplicará a:

```text
login
register
password reset
```

con decisiones conscientes sobre qué información revelar.

---

### ck. Security Events

Podremos registrar:

```text
LOGIN_SUCCEEDED
LOGIN_FAILED
SESSION_CREATED
SESSION_REFRESHED
SESSION_REVOKED
PASSWORD_CHANGED
PASSWORD_RESET
ROLE_CHANGED
```

No guardaremos secretos ni passwords en logs.

---

### cl. Audit Events

Especialmente para administración:

```text
Admin X changed User Y role
Moderator X suspended User Y
```

deberán producir audit trail separado de logs operacionales normales.

---

### cm. Observabilidad Auth

Métricas:

```text
auth_login_attempts_total
auth_login_success_total
auth_login_failure_total

auth_session_created_total
auth_session_refresh_total
auth_session_revoked_total

auth_refresh_reuse_detected_total
```

---

### cn. User Domain Metrics

Separadas:

```text
playback_progress_updates_total
user_library_mutations_total
user_profile_updates_total
```

Así no llamamos:

```text
auth metric
```

a todo lo que haga un usuario.

---

### co. Active Sessions

El original propone `auth_active_sessions_count`.

Debemos definir qué significa:

```text
non-expired AuthSessions?
```

no necesariamente:

```text
users currently online
```

Son métricas distintas.

---

### cp. Online User

Si algún día necesitamos presencia:

```text
online now
```

eso requerirá señales temporales diferentes.

No inferiremos presencia directamente de refresh tokens activos.

---

### cq. Privacy

Datos como:

```text
email
IP
session information
watch history
favorites
```

requieren políticas de:

```text
access control
retention
deletion
export
minimization
```

La arquitectura debe permitir borrar o anonimizar datos cuando corresponda.

---

### cr. Account Deletion

Flujo conceptual:

```text
Delete Account Request
       │
       ▼
authorization/re-authentication
       │
       ▼
revoke sessions
       │
       ▼
delete/anonymize user data
       │
       ▼
audit minimal necessary event
```

No será necesariamente eliminación física instantánea de cada log técnico, porque existirán políticas de retención diferenciadas.

---

### cs. Dependency Rule

Otros motores no deberán consultar directamente tablas internas del User Domain.

Incorrecto:

```text
Recommendation Engine
       │
       ▼
SELECT * FROM watch_history
```

Preferible:

```text
Recommendation Engine
       │
       ▼
User Interaction API / Events
```

o una proyección analítica autorizada.

---

### ct. Relación con Player

```text
Media Player Core
      │
      ├── GET resume state
      │
      └── PUT progress checkpoint
             │
             ▼
        User Library
```

El Player no necesita conocer:

```text
password
role
refresh token
```

---

### cu. Relación con Playback Orchestrator

El Orchestrator podrá recibir:

```text
Auth Context
```

si alguna política de playback depende de autenticación.

Pero no deberá depender de:

```text
password credentials
```

ni tablas de Auth.

---

### cv. Relación con Recommendations

Más adelante:

```text
Playback History
Favorites
Library
      │
      ▼
Recommendation Signals
```

pero aplicaremos:

```text
data minimization
```

y separación entre:

```text
operational user data
```

y:

```text
analytics/recommendation features
```

---

### cw. Eventos de dominio

Ejemplos:

```text
identity.user.created
identity.session.created
identity.session.revoked

user.profile.updated
user.preferences.updated

library.item.updated
playback.progress.updated
playback.content.completed
```

Estos eventos describen hechos.

No órdenes.

---

### cx. No Kafka todavía

Los eventos no implican:

```text
Kafka cluster
```

en MVP.

Podemos usar:

```text
application events
outbox
queue
```

cuando haga falta.

La semántica del evento es más importante inicialmente que el broker.

---

### cy. Transactional Outbox

Si posteriormente necesitamos garantizar:

```text
database mutation
+
domain event
```

podemos introducir:

```text
Transactional Outbox
```

para evitar:

```text
DB updated
but event lost
```

No es requisito para login básico.

---

### cz. Presupuesto de rendimiento

Los objetivos originales:

```text
JWT verification p50 <2 ms
login p95 <300 ms
history sync p95 <40 ms
10,000 JWT verifications/s/node
```

quedarán registrados como **hipótesis históricas de capacidad**, no SLO oficiales.

Separaremos budgets:

| Operación         | Qué medir                |
| ----------------- | ------------------------ |
| Login             | p50/p95/p99 + error rate |
| Password verify   | duración + CPU/memoria   |
| Session refresh   | p50/p95                  |
| Auth verification | p50/p95                  |
| Progress update   | p50/p95                  |
| Library mutation  | p50/p95                  |
| `/me`             | p50/p95                  |

Los targets se fijarán después del baseline.

---

### da. Argon2 y capacidad

Aquí sí existe una tensión importante:

```text
strong password hashing
       ↕
login throughput
```

No optimizaremos Argon2 para ganar benchmarks sacrificando seguridad.

Las pruebas de carga deberán comprobar:

```text
memory pressure
CPU pressure
event-loop/thread-pool saturation
login latency
```

bajo concurrencia.

---

### db. Testing de Identity

Necesitamos:

```text
registration
login success
login failure
refresh
rotation
reuse detection
logout
logout-all
expired session
disabled account
password reset
external identity
authorization
```

---

### dc. Security Tests

Además de scanners automatizados:

```text
JWT tampering
expired tokens
wrong audience/issuer
algorithm confusion
refresh reuse
CSRF
credential stuffing controls
session fixation
IDOR/BOLA
privilege escalation
```

si esas tecnologías aplican.

OWASP ZAP puede complementar, pero no sustituye pruebas específicas del dominio.

---

### dd. Authorization Tests

Ejemplo:

```text
USER
  cannot access admin operation

MODERATOR
  can moderate reports
  cannot manage system secrets

ADMIN
  authorized administrative operations
```

Cada endpoint sensible debe tener pruebas negativas.

---

### de. Progress Tests

Casos:

```text
normal update
duplicate update
seek backwards
completion
resume
two devices
out-of-order requests
network retry
```

Muy importante:

```text
out-of-order progress
```

porque una request antigua puede llegar después de una nueva.

---

### df. Concurrency

Ejemplo:

```text
Device A → position 1000
Device B → position 300
```

Necesitamos una política.

No hay una única respuesta correcta.

Puede ser:

```text
latest meaningful activity wins
```

con timestamps confiables del servidor y contexto de sesión.

Será ADR.

---

### dg. Feature flags

Reorganizamos:

```text
auth_registration_enabled
auth_password_login_enabled
auth_external_login_enabled
auth_passkeys_enabled

user_profiles_enabled
user_preferences_sync_enabled

library_enabled
playback_history_enabled
```

Configuraciones de seguridad como:

```text
access token TTL
refresh TTL
Argon2 parameters
rate limits
```

son configuración operacional, no necesariamente feature flags.

---

### dh. MVP

El MVP necesita:

```text
anonymous playback
```

por lo que Auth no debe bloquear el vertical slice principal.

Para cuentas, MVP razonable:

```text
registration
password login
logout
basic AuthSession
basic RBAC
profile
favorites/library
playback progress
resume
```

---

### di. No MVP

Podemos posponer:

```text
Google/Discord login
Passkeys
MFA
custom lists
complex permission editor
advanced session/device management
distributed write-behind history
behavioral risk engine
```

---

### dj. Criterios de aceptación

Este dominio estará listo para el MVP cuando:

1. un usuario pueda registrarse;
2. la contraseña nunca se almacene en claro;
3. pueda iniciar sesión;
4. pueda cerrar sesión;
5. una sesión expirada/revocada sea rechazada;
6. endpoints autenticados reciban un Auth Context consistente;
7. RBAC se aplique server-side;
8. un usuario no pueda acceder a recursos privados de otro mediante cambio de ID;
9. pueda consultar/editar su perfil básico;
10. pueda añadir/quitar contenido de su biblioteca;
11. pueda marcar favoritos independientemente del estado de visualización;
12. el Player pueda guardar progreso;
13. el progreso pueda recuperarse desde otro dispositivo;
14. los checkpoints duplicados no corrompan estado;
15. existan límites contra abuso en endpoints de autenticación;
16. secretos/tokens/passwords no aparezcan en logs;
17. el sistema pueda revocar sesiones;
18. Auth no tenga dependencia del Media Gateway ni Source Resolver.

---

### dk. ADRs abiertas

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

### dl. Arquitectura consolidada

```text
                           CLIENT
                              │
               ┌──────────────┼──────────────┐
               │              │              │
               ▼              ▼              ▼
             Auth           Profile        Library
               │              │              │
               ▼              ▼              ▼
      ┌────────────────────────────────────────────┐
      │                CORE API                    │
      │                                            │
      │  ┌──────────────────────────────────────┐  │
      │  │       IDENTITY & ACCESS              │  │
      │  │                                      │  │
      │  │ Registration                         │  │
      │  │ Authentication                       │  │
      │  │ Credentials                          │  │
      │  │ Auth Sessions                        │  │
      │  │ Authorization / RBAC                 │  │
      │  └──────────────────────────────────────┘  │
      │                                            │
      │  ┌──────────────────────────────────────┐  │
      │  │       PROFILE & PREFERENCES          │  │
      │  │                                      │  │
      │  │ Profile                              │  │
      │  │ Avatar                               │  │
      │  │ Account Preferences                  │  │
      │  └──────────────────────────────────────┘  │
      │                                            │
      │  ┌──────────────────────────────────────┐  │
      │  │       USER LIBRARY                   │  │
      │  │                                      │  │
      │  │ Favorites                            │  │
      │  │ Watch Status                         │  │
      │  │ Playback Progress                    │  │
      │  │ Watch History                        │  │
      │  └──────────────────────────────────────┘  │
      └──────────────────────┬─────────────────────┘
                             │
                             ▼
                        PostgreSQL
                             │
                   ┌─────────┴─────────┐
                   ▼                   ▼
                 Redis          Async Workers
              when justified      when justified
```

Y externamente:

```text
Media Player Core
       │
       ├──── progress ─────► User Library
       │
       ◄──── resume ────────┘


Recommendation Engine
       │
       ◄──── authorized interaction signals


Admin / Moderator
       │
       ▼
Authorization / RBAC
```

### Reglas maestras del Motor 6

Dejaría estas seis en el documento:

> **1. User, Credential, AuthSession y Token son conceptos diferentes.**

> **2. Authentication demuestra identidad; Authorization determina permisos.**

> **3. Playback History y Favorites pertenecen al dominio del usuario, no al dominio de autenticación.**

> **4. JWT es una decisión de implementación posible, no una propiedad fundamental de la arquitectura.**

> **5. El progreso representa estado reanudable del Playback Target; no es un log de cada segundo reproducido.**

> **6. La primera implementación debe favorecer simplicidad y consistencia; Redis write-behind se introduce cuando la carga real lo justifique.**

Con esto además eliminamos dos restos importantes de la orientación original hacia anime: `watch_history.episode_id` deja de ser la única posibilidad y `bookmarks.anime_id` pasa a trabajar sobre nuestro modelo audiovisual general. También dejamos de obligarnos prematuramente a **JWT + blacklist Redis + write-behind cada 60 s**, aunque las tres técnicas siguen disponibles si las métricas o requisitos reales las justifican.

Y hay una consecuencia arquitectónica muy buena: ahora ya podemos dibujar **dos tipos completamente diferentes de sesión** sin confundirlas:

```text
AUTH SESSION
"¿Quién es este usuario?"
       │
       │
       X   son independientes
       │
       ▼
PLAYBACK SESSION
"¿Qué está autorizado y preparado
para reproducirse ahora?"
```

Un usuario puede tener una `AuthSession` de semanas/días de duración lógica y crear muchas `PlaybackSessions` cortas. Un visitante anónimo incluso puede tener **PlaybackSession sin AuthSession**, si la política de acceso lo permite.

El siguiente bloque original es el **7. Buscador y Motor de Recomendaciones**, y ahí sí tenemos otra separación importante que hacer: **Search y Recommendations no deberían ser el mismo motor**. El original combina full-text/fuzzy search, filtros, Meilisearch/Typesense/Elasticsearch, Redis, fallback PostgreSQL, tendencias, “porque viste X”, collaborative filtering y futura búsqueda vectorial/embeddings en una sola unidad.

Ese siguiente bloque nos permitirá definir por separado **Search & Discovery**, **Recommendation Engine**, **Ranking**, la proyección del Catalog hacia índices y, muy importante para tu arquitectura evolutiva, decidir si realmente necesitamos Meilisearch/Typesense/Elasticsearch desde el MVP o si podemos empezar con **PostgreSQL FTS + `pg_trgm`** y extraer el Search Engine cuando los datos y la carga lo justifiquen.


Vamos con el **Motor 7**. Aquí sí haría una corrección estructural fuerte: el documento original llama al bloque **“Buscador y Motor de Recomendaciones”** y concentra búsqueda textual/fuzzy, filtros y facetas, indexación en Meilisearch/Typesense/Elasticsearch, caché Redis, fallback a PostgreSQL, tendencias, personalización, collaborative filtering y una futura búsqueda vectorial con embeddings. También fija objetivos como `<20 ms`, Top-3 Precision >95 % y una reindexación nocturna completa como mecanismo de reconciliación.

Funcionalmente todo eso tiene sentido. Arquitectónicamente, sin embargo, **Search y Recommendations resuelven problemas distintos**. Vamos a conservarlos dentro de un gran dominio de Discovery, pero con fronteras claras.
