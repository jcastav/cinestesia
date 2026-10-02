# 7. MODELO DE DATOS Y PERSISTENCIA

## 7.1. Propósito

El modelo de datos define las entidades persistentes, relaciones, ownership, invariantes y proyecciones necesarias para soportar la plataforma.

No se diseñará como una única colección de tablas compartidas libremente por todos los componentes.

El principio será:

> **Cada dominio es propietario de sus datos y otros dominios interactúan con ellos mediante contratos, servicios, eventos o proyecciones explícitas.**

En el MVP varios dominios podrán compartir físicamente una misma instancia PostgreSQL.

Pero:

```text
same PostgreSQL
≠
shared ownership
```

---

## 7.2. Principios de diseño

El modelo seguirá estas reglas:

```text
1. Canonical data ≠ derived data.

2. Persistent state ≠ ephemeral runtime state.

3. Content ≠ Source.

4. Source ≠ Playable Representation.

5. Source ≠ Provider.

6. AuthSession ≠ PlaybackSession.

7. Health Observation ≠ Source Health State.

8. User Report ≠ Health Observation.

9. Playback Progress ≠ Playback Telemetry.

10. Search Index ≠ Catalog source of truth.

11. Administrative Audit ≠ Application Log.

12. PostgreSQL ≠ universal storage for every runtime datum.
```

---

## 7.3. Tecnología persistente principal

Para la arquitectura inicial:

```text
PostgreSQL
```

será la base de datos transaccional principal.

No necesitamos mantener la ambigüedad original:

```text
PostgreSQL / MongoDB
```

salvo que aparezca posteriormente un caso concreto que justifique otra base.

La mayor parte del dominio posee:

```text
relationships
constraints
transactions
foreign keys
uniqueness requirements
structured querying
```

para los cuales PostgreSQL encaja muy bien.

---

## 7.4. Redis

Redis tendrá una función diferente:

```text
REDIS
│
├── ephemeral sessions where applicable
├── distributed rate limits
├── short-lived resolution cache
├── playback session state where appropriate
├── queues/job coordination where selected
├── short-lived locks/singleflight
└── ephemeral operational state
```

No será nuestra base de datos canónica.

---

## 7.5. Object Storage

Posteriormente podremos necesitar:

```text
Object Storage
```

para:

```text
posters
backdrops
avatars
subtitle files
exports
backups
```

según política.

No para asumir automáticamente almacenamiento de video originario.

---

## 7.6. Search Storage

Motor 7 puede comenzar con:

```text
PostgreSQL FTS + pg_trgm
```

y posteriormente incorporar:

```text
Search Engine
```

como una **proyección reconstruible**.

Nunca será el source of truth del catálogo.

---

## 7.7. Clasificación de datos

Antes de definir tablas, clasificaremos los datos en cuatro grandes categorías:

| Categoría     | Ejemplos                                                   | Persistencia                            |
| ------------- | ---------------------------------------------------------- | --------------------------------------- |
| Canónicos     | MediaItem, Episode, Source, User                           | PostgreSQL                              |
| Operacionales | ResolutionAttempt, HealthObservation, AuditEvent           | PostgreSQL / almacenamiento operacional |
| Derivados     | Search Index, Health Projection, recommendation candidates | reconstruibles                          |
| Efímeros      | PlaybackSession temporal, cache, rate limit counters       | Redis/memoria según caso                |

Esta distinción será fundamental.

---

## 7.8. Bounded Contexts / Ownership

Dividiremos conceptualmente el esquema:

```text
CATALOG
│
├── media_items
├── seasons
├── episodes
└── media_external_ids

SOURCE DOMAIN
│
├── providers
├── sources
└── source_resolution_attempts

HEALTH
│
├── source_health_observations
├── source_health
└── source_reports

IDENTITY
│
├── users
├── user_profiles
├── password_credentials
├── external_identities
├── auth_sessions
└── refresh_tokens

USER LIBRARY
│
├── user_preferences
├── user_library
└── playback_progress

ADS
│
├── ad_providers
├── ad_placements
├── ad_policies
└── ad_sessions

DISCOVERY / INGESTION
│
├── ingestion_jobs
└── discovered_candidates

ADMIN / AUDIT
│
└── audit_events
```

Algunas son MVP; otras V1/evolutivas.

---

## 7.9. Esquemas PostgreSQL

Incluso compartiendo una base física, podemos considerar:

```text
catalog.*
source.*
health.*
identity.*
user_data.*
ads.*
ingestion.*
audit.*
```

como schemas PostgreSQL.

No es obligatorio para el MVP.

Una alternativa perfectamente válida inicialmente:

```text
public.media_items
public.sources
...
```

pero manteniendo ownership lógico en código.

---

## 7.10. Identificadores

Usaremos identificadores internos estables:

```text
UUID
```

o una estrategia equivalente.

Ejemplo:

```text
media_item.id
source.id
user.id
```

Estos identificadores:

> **No dependen de títulos, URLs externas, emails o IDs de proveedores.**

---

## 7.11. IDs externos

Un contenido puede tener:

```text
TMDB ID
IMDb ID
AniList ID
provider-specific ID
```

sin que ninguno sea nuestra PK.

Por eso:

```text
Internal ID
≠
External ID
```

---

## 7.12. Timestamps

Entidades mutables importantes tendrán normalmente:

```text
created_at
updated_at
```

y otras fechas semánticas cuando corresponda:

```text
published_at
last_success_at
expires_at
revoked_at
completed_at
```

No utilizaremos `updated_at` para representar todos los eventos temporales posibles.

---

## 7.13. Soft Delete / Archive

No introduciremos:

```text
deleted_at
```

automáticamente en todas las tablas.

Según dominio utilizaremos:

```text
ARCHIVED
DISABLED
REVOKED
DELETED
```

cuando tengan semántica propia.

Hard delete se reserva para casos apropiados.

---

## 7.14. Optimistic Concurrency

Entidades altamente editables pueden incorporar:

```text
version
```

para prevenir lost updates.

Especialmente:

```text
MediaItem
Source configuration
AdPolicy
System configuration
```

cuando sea necesario.

---

## 7.15. Modelo global de alto nivel

El modelo conceptual pasa de algo parecido al original:

```text
Usuario ─ Historial ─ Episodio ─ Fuente
```

a:

```text
                            CATALOG

                         MediaItem
                         /       \
                        /         \
                    Season      Playback Target
                      │              │
                   Episode ──────────┘
                                   │
                                   │ 1:N
                                   ▼
                                 Source
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
                Provider     ResolutionAttempt   Health
                                                   │
                                                   ▼
                                              SourceReport


                            USERS

                           User
                 ┌──────────┼───────────┐
                 ▼          ▼           ▼
             Credential  AuthSession   Profile
                                        │
                            ┌───────────┴──────────┐
                            ▼                      ▼
                       UserLibrary          PlaybackProgress


                           RUNTIME

                      Playback Target
                            │
                            ▼
                          Source
                            │
                            ▼
                    PlayableRepresentation
                            │
                            ▼
                     PlaybackSession
                            │
                            ▼
                          Player
```

Pero atención:

```text
PlayableRepresentation
```

normalmente **no será una tabla canónica**.

---

## 7.16. Dominio Catalog

### 7.16.1. `media_items`

Entidad raíz del catálogo audiovisual.

```sql
CREATE TABLE media_items (
    id UUID PRIMARY KEY,

    slug VARCHAR(255) NOT NULL UNIQUE,

    media_type VARCHAR(32) NOT NULL,

    canonical_title VARCHAR(500) NOT NULL,
    synopsis TEXT,

    release_year SMALLINT,

    publication_status VARCHAR(32) NOT NULL,
    production_status VARCHAR(32),

    poster_url TEXT,
    backdrop_url TEXT,

    version INTEGER NOT NULL DEFAULT 1,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Este DDL es conceptual y podrá refinarse durante implementación.

---

## 7.17. `media_type`

No utilizaremos:

```text
pelicula
serie
anime
```

como categorías estructurales equivalentes, como hace el modelo original.

Preferimos:

```text
MOVIE
SERIES
DOCUMENTARY
SHORT
CONCERT
CLIP
SPECIAL
OTHER
```

Anime puede representarse mediante:

```text
taxonomy
genre
origin
collection
tag/classification
```

según ADR.

---

## 7.18. Publication vs Production

Separaremos:

```text
publication_status
```

de:

```text
production_status
```

Porque:

```text
DRAFT
```

significa:

> nuestra plataforma todavía no lo publica.

Mientras:

```text
ENDED
```

puede significar:

> la producción original terminó.

Son dimensiones diferentes.

---

## 7.19. Publication Status

Baseline:

```text
DRAFT
PUBLISHED
ARCHIVED
```

---

## 7.20. Production Status

Opcionalmente:

```text
UPCOMING
ONGOING
ENDED
UNKNOWN
```

dependiendo del tipo de contenido.

---

## 7.21. `seasons`

```sql
CREATE TABLE seasons (
    id UUID PRIMARY KEY,

    media_item_id UUID NOT NULL
        REFERENCES media_items(id),

    season_number INTEGER NOT NULL,

    title VARCHAR(500),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(media_item_id, season_number)
);
```

---

## 7.22. `episodes`

```sql
CREATE TABLE episodes (
    id UUID PRIMARY KEY,

    media_item_id UUID NOT NULL
        REFERENCES media_items(id),

    season_id UUID
        REFERENCES seasons(id),

    episode_number INTEGER,

    title VARCHAR(500),

    synopsis TEXT,

    thumbnail_url TEXT,

    duration_seconds INTEGER,

    publication_status VARCHAR(32) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 7.23. Películas no son episodios artificiales

El modelo original permite relacionar películas directamente con `Episodio` mediante `contenido_id` y `temporada_id` opcional.

No necesitamos crear:

```text
Movie
  └── Episode 1
```

solo para reutilizar `Source`.

Usaremos el concepto:

```text
Playback Target
```

---

## 7.24. Playback Target

`PlaybackTarget` significa:

> La unidad lógica que el usuario intenta reproducir.

Puede ser:

```text
MOVIE → media_item_id

SERIES → episode_id
```

Inicialmente puede ser un **concepto de dominio**, no una tabla.

---

## 7.25. Persistencia polimórfica

Una Source podría utilizar:

```text
media_item_id
episode_id
```

con una constraint:

```text
exactly one is not null
```

Ejemplo conceptual:

```sql
CHECK (
    (media_item_id IS NOT NULL AND episode_id IS NULL)
 OR (media_item_id IS NULL AND episode_id IS NOT NULL)
)
```

---

## 7.26. Alternativa futura: `media_units`

Otra posibilidad sería crear:

```text
media_units
```

como abstracción persistente común para:

```text
movie
episode
clip
```

Pero ya decidimos que **no necesitamos esa complejidad obligatoriamente en MVP**.

Se deja como ADR.

---

## 7.27. External IDs

```sql
CREATE TABLE media_external_ids (
    id UUID PRIMARY KEY,

    media_item_id UUID NOT NULL
        REFERENCES media_items(id),

    namespace VARCHAR(64) NOT NULL,
    external_id VARCHAR(255) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(namespace, external_id)
);
```

Ejemplo:

```text
namespace = "tmdb"
external_id = "550"
```

---

## 7.28. Alternate / localized titles

Posteriormente podríamos incorporar:

```text
media_titles
```

con:

```text
media_item_id
language
script
title_type
value
```

para:

```text
canonical
localized
original
alternate
romaji
```

Esto será especialmente útil para Search.

No es obligatorio en el primer MVP.

---

## 7.29. Genres y Taxonomy

El original almacena:

```text
generos = ['Acción', 'Sci-Fi']
```

como array de strings.

Eso es válido para prototipo, pero para un catálogo serio preferimos:

```text
genres
media_genres
```

---

## 7.30. Genre Model

```text
Genre
  │
  │ N:M
  ▼
MediaItem
```

Conceptualmente:

```sql
genres (
    id,
    slug,
    name
)

media_genres (
    media_item_id,
    genre_id
)
```

Esto evita variantes:

```text
Sci-Fi
SciFi
Science Fiction
Ciencia ficción
```

como géneros distintos accidentalmente.

---

## 7.31. Localization

El nombre visible de un género:

```text
Action
Acción
Ação
```

es distinto de su identidad canónica.

Posteriormente podremos añadir:

```text
genre_translations
```

si el producto lo requiere.

---

## 7.32. Artwork

En MVP:

```text
poster_url
backdrop_url
```

pueden permanecer en `media_items`.

Si posteriormente existen:

```text
multiple posters
languages
resolutions
artwork types
```

podemos extraer:

```text
media_assets
```

No adelantaremos esa normalización sin necesidad.

---

## 7.33. Dominio Source Registry

Ahora viene una de las diferencias más grandes frente al modelo original.

Original:

```text
Fuente
├── servidor_nombre
├── idioma
├── tipo_enlace
├── url_original
├── url_procesada
├── estado
└── prioridad
```

Nuestro modelo será distinto.

---

## 7.34. `providers`

```sql
CREATE TABLE providers (
    id UUID PRIMARY KEY,

    key VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,

    enabled BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Provider representa:

> El sistema externo o familia de origen asociada a una Source.

---

## 7.35. Provider ≠ Adapter

Un Provider puede tener:

```text
Provider A
```

y nuestro software:

```text
Adapter A v1
Adapter A v2
```

La identidad externa no debe depender de la implementación interna.

---

## 7.36. Adapter no necesita tabla obligatoria

`Adapter` puede ser inicialmente:

```text
code/configuration
```

registrado por:

```text
Adapter Registry
```

No todo concepto de dominio necesita una tabla.

Posteriormente podría existir metadata persistente de adapters si necesitamos:

```text
versions
rollouts
configuration
deployment state
```

---

## 7.37. `sources`

Conceptualmente:

```sql
CREATE TABLE sources (
    id UUID PRIMARY KEY,

    provider_id UUID NOT NULL
        REFERENCES providers(id),

    media_item_id UUID
        REFERENCES media_items(id),

    episode_id UUID
        REFERENCES episodes(id),

    source_reference TEXT NOT NULL,

    language_code VARCHAR(32),

    source_type VARCHAR(32),

    lifecycle_status VARCHAR(32) NOT NULL,

    operational_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    discovered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (
        (media_item_id IS NOT NULL AND episode_id IS NULL)
        OR
        (media_item_id IS NULL AND episode_id IS NOT NULL)
    )
);
```

`source_reference` es conceptual: puede ser URL o identificador permitido por el Provider/Adapter.

---

## 7.38. No `url_procesada`

Eliminamos:

```text
url_procesada
```

del Source.

¿Por qué?

Porque:

```text
processed/proxy URL
```

es runtime/session-specific.

Pertenece a:

```text
Playable Representation
+
Playback Session
+
Gateway
```

no a la Source canónica.

---

## 7.39. Source Reference

Tampoco asumiremos que toda Source siempre sea:

```text
raw URL
```

Podría ser:

```text
provider content identifier
provider resource reference
authorized external locator
```

según integración.

Por eso el dominio usa:

```text
SourceReference
```

aunque la primera implementación pueda almacenar una URL.

---

## 7.40. Source State

Conservamos:

```text
DISCOVERED
ACTIVE
DEGRADED
UNAVAILABLE
```

pero recordemos la discusión del Motor 8:

```text
health-derived state
```

y:

```text
administrative eligibility
```

no necesariamente son exactamente la misma dimensión.

---

## 7.41. Operational Eligibility

Por eso puede ser útil:

```text
operational_enabled
```

o una entidad/estado equivalente.

Ejemplo:

```text
Health = ACTIVE
Operational = DISABLED
```

→ Orchestrator no debe utilizarla.

---

## 7.42. Priority

El original guarda:

```text
prioridad INTEGER
```

directamente en Source.

Puede existir:

```text
manual preference / base priority
```

como señal administrativa.

Pero no debe representar:

```text
final playback order
```

porque Orchestrator calcula selección dinámicamente.

Si la mantenemos, sería algo como:

```text
base_priority
```

y solo una señal más.

---

## 7.43. Source Language

Preferiremos códigos normalizados:

```text
es-419
es-ES
ja
en
```

cuando sea apropiado.

No acoplaremos lógica interna a strings:

```text
latino
castellano
japones
ingles
```

aunque la UI pueda mostrar esos labels.

---

## 7.44. Source Type

Puede expresar:

```text
HLS
MP4
EMBED
OTHER
```

si describe realmente la Source conocida.

Pero la representación final puede diferir después de resolver.

Por tanto:

```text
source_type
≠
guaranteed resolved protocol
```

---

## 7.45. Resolution Attempt

```sql
CREATE TABLE source_resolution_attempts (
    id UUID PRIMARY KEY,

    source_id UUID NOT NULL
        REFERENCES sources(id),

    outcome VARCHAR(32) NOT NULL,
    error_code VARCHAR(64),

    adapter_key VARCHAR(100),

    duration_ms INTEGER,

    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ
);
```

Esta tabla es operacional.

No representa el estado canónico de Source.

---

## 7.46. No guardar Playable Representation indefinidamente

Un:

```text
PlayableRepresentation
```

puede contener:

```text
manifest URL
temporary token
required headers
expiry
```

y puede durar minutos.

No debe terminar convertido accidentalmente en:

```text
sources.url_processed
```

permanente.

---

## 7.47. Resolution Cache

Representaciones temporales pueden vivir en:

```text
Redis
```

con:

```text
TTL <= upstream expiry
```

y safety margin.

Ejemplo conceptual:

```text
resolution:{source_id}:{capability_hash}
```

La key exacta vendrá después.

---

## 7.48. Secrets

Headers/credentials sensibles requeridos por una integración:

```text
Authorization
Cookie
provider API secret
```

no deben persistirse dentro de:

```text
sources.metadata JSONB
```

como solución fácil.

Pertenecen a Secret Management.

---

## 7.49. Health Domain

Originalmente existe:

```text
source_health_checks
user_reports
```

como vimos en Motor 8.

Nuestro modelo distingue tres cosas.

---

## 7.50. Health Observation

```sql
CREATE TABLE source_health_observations (
    id UUID PRIMARY KEY,

    source_id UUID NOT NULL
        REFERENCES sources(id),

    origin VARCHAR(32) NOT NULL,
    signal VARCHAR(64) NOT NULL,
    outcome VARCHAR(32) NOT NULL,

    attribution VARCHAR(32),

    error_code VARCHAR(64),
    http_status_code INTEGER,
    latency_ms INTEGER,

    observed_at TIMESTAMPTZ NOT NULL
);
```

---

## 7.51. Attribution

Conceptualmente:

```text
SOURCE
PROVIDER
ADAPTER
RESOLVER
GATEWAY
CLIENT_CAPABILITY
CLIENT_NETWORK
UNKNOWN
```

Esto evita marcar Source como caída cuando el problema era nuestro Gateway.

---

## 7.52. Health Projection

```sql
CREATE TABLE source_health (
    source_id UUID PRIMARY KEY
        REFERENCES sources(id),

    state VARCHAR(32) NOT NULL,

    recent_success_rate DOUBLE PRECISION,

    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    last_probe_at TIMESTAMPTZ,

    confidence VARCHAR(32),

    updated_at TIMESTAMPTZ NOT NULL
);
```

Esto es una **proyección derivada**.

Puede reconstruirse desde evidencia hasta donde permita la retención.

---

## 7.53. Reports

```sql
CREATE TABLE source_reports (
    id UUID PRIMARY KEY,

    source_id UUID NOT NULL
        REFERENCES sources(id),

    user_id UUID,

    playback_session_id UUID,

    category VARCHAR(64) NOT NULL,
    comment TEXT,

    status VARCHAR(32) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
```

FK exacta de `user_id` dependerá de estrategia de separación de schemas/domains.

---

## 7.54. Report State

Baseline:

```text
RECEIVED
TRIAGED
VERIFIED
REJECTED
RESOLVED
```

MVP puede simplificarlo.

---

## 7.55. Report ≠ Health Observation

Un reporte puede generar:

```text
HealthObservation
```

pero conserva además:

```text
comment
moderation state
reporter
resolution
```

por lo que ambas entidades permanecen separadas.

---

## 7.56. Identity Domain

Ahora reconstruimos completamente el antiguo:

```text
Usuario
├── email
├── password_hash
├── rol
└── preferencias JSONB
```

---

## 7.57. `users`

`users` representa identidad de cuenta, no credencial.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,

    account_status VARCHAR(32) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 7.58. Email

Podemos mantener un email principal en `users` para MVP o separarlo.

Pero conceptualmente:

```text
User
≠
email
```

porque email puede cambiar.

Una posible primera implementación:

```text
primary_email
email_verified_at
```

es perfectamente razonable.

No necesitamos sobrenormalizar desde el día uno.

---

## 7.59. `user_profiles`

```sql
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY
        REFERENCES users(id),

    display_name VARCHAR(255),
    avatar_url TEXT,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Profile:

```text
≠
Identity
```

---

## 7.60. Password Credential

```sql
CREATE TABLE password_credentials (
    user_id UUID PRIMARY KEY
        REFERENCES users(id),

    password_hash TEXT NOT NULL,

    hash_version VARCHAR(32),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Así:

```text
User
```

puede existir con:

```text
password
external identity
passkey
```

sin mezclar todos los métodos.

---

## 7.61. External Identities

```sql
CREATE TABLE external_identities (
    id UUID PRIMARY KEY,

    user_id UUID NOT NULL
        REFERENCES users(id),

    provider VARCHAR(64) NOT NULL,
    provider_subject VARCHAR(255) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(provider, provider_subject)
);
```

Para futuras integraciones OAuth/OIDC.

---

## 7.62. Auth Sessions

```sql
CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY,

    user_id UUID NOT NULL
        REFERENCES users(id),

    status VARCHAR(32) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);
```

La sesión es la entidad de seguridad.

El token es un mecanismo de representación/autorización de esa sesión.

---

## 7.63. Refresh Tokens

Si utilizamos refresh token:

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,

    session_id UUID NOT NULL
        REFERENCES auth_sessions(id),

    token_hash TEXT NOT NULL,

    family_id UUID NOT NULL,

    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL
);
```

Nunca almacenamos el refresh token plaintext.

---

## 7.64. Roles

En MVP podemos utilizar:

```text
USER
MODERATOR
ADMIN
```

pero la autorización conceptual será:

```text
Role → Permissions
```

---

## 7.65. Role Persistence

Una implementación inicial podría tener:

```text
user_roles
```

```sql
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id),
    role_key VARCHAR(64) NOT NULL,

    PRIMARY KEY(user_id, role_key)
);
```

No necesitamos construir un permission editor dinámico completo.

---

## 7.66. Preferences

El original almacena preferencias como JSONB dentro de Usuario.

Separaremos:

```text
account-synced preferences
```

de:

```text
device-local preferences
```

---

## 7.67. `user_preferences`

Conceptualmente:

```sql
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY
        REFERENCES users(id),

    preferred_audio_language VARCHAR(32),
    preferred_subtitle_language VARCHAR(32),

    subtitles_enabled BOOLEAN,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Preferencias puramente visuales pueden permanecer localmente en el dispositivo.

---

## 7.68. User Library

El modelo original usa `Favorito`, y en el Motor 6 original también existía un bookmark que mezclaba estados de seguimiento y favoritos.

Lo reemplazamos conceptualmente por:

```text
UserLibraryEntry
```

---

## 7.69. `user_library`

```sql
CREATE TABLE user_library (
    user_id UUID NOT NULL
        REFERENCES users(id),

    media_item_id UUID NOT NULL
        REFERENCES media_items(id),

    watch_status VARCHAR(32),

    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY(user_id, media_item_id)
);
```

Esto permite:

```text
COMPLETED
+
favorite = true
```

simultáneamente.

---

## 7.70. Custom Lists

Posteriormente:

```text
user_lists
user_list_items
```

para listas arbitrarias.

No MVP.

---

## 7.71. Playback Progress

El original tiene:

```text
usuario_id
episodio_id
tiempo_segundos
completado
```

Eso no sirve directamente para películas.

Usaremos Playback Target.

---

## 7.72. `playback_progress`

Conceptualmente:

```sql
CREATE TABLE playback_progress (
    id UUID PRIMARY KEY,

    user_id UUID NOT NULL
        REFERENCES users(id),

    media_item_id UUID,
    episode_id UUID,

    position_seconds INTEGER NOT NULL,
    duration_seconds INTEGER,

    completed BOOLEAN NOT NULL DEFAULT FALSE,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (
        (media_item_id IS NOT NULL AND episode_id IS NULL)
        OR
        (media_item_id IS NULL AND episode_id IS NOT NULL)
    )
);
```

---

## 7.73. Unique Progress

Necesitamos garantizar:

```text
one current progress snapshot
per user
per Playback Target
```

mediante constraints/índices apropiados.

La implementación exacta dependerá de la representación elegida para Playback Target.

---

## 7.74. Progress is Snapshot

No guardaremos:

```text
second 1
second 2
second 3
...
```

como historial principal.

Guardamos:

```text
latest resumable state
```

---

## 7.75. Playback Analytics

Eventos como:

```text
play
pause
buffer
seek
quartile
fatal error
```

pertenecen a:

```text
telemetry/analytics
```

no a `playback_progress`.

---

## 7.76. Completion

`completed` puede derivarse mediante política.

Ejemplo:

```text
position >= completion threshold
```

No confiaremos ciegamente en:

```json
{"completed": true}
```

enviado por cliente.

---

## 7.77. Anonymous Progress

No requiere PostgreSQL inicialmente.

Puede vivir en:

```text
browser local storage
```

como ya definimos en Player.

Tras login podría existir:

```text
merge
```

si posteriormente lo implementamos.

---

## 7.78. PlaybackSession Domain

Aquí aparece una entidad que el modelo original no representaba.

```text
PlaybackSession
```

es la autorización/contexto temporal de reproducción.

---

## 7.79. PlaybackSession persistence

No asumiremos que necesita tabla PostgreSQL permanente.

En MVP puede vivir en:

```text
Redis
```

con TTL.

Ejemplo conceptual:

```text
playback_session:{id}
```

---

## 7.80. PlaybackSession State

Puede contener:

```text
id
playback_target
selected_source_id
representation reference
delivery mode
created_at
expires_at
status
```

pero nunca:

```text
password
provider credential
```

---

## 7.81. PlaybackSession Lifecycle

```text
CREATED
ACTIVE
EXPIRED
REVOKED
FAILED
```

y opcional:

```text
RENEWING
```

---

## 7.82. Session TTL

TTL:

```text
<= representation validity
```

según política.

No guardaremos sesiones expiradas indefinidamente en Redis.

---

## 7.83. Session History

Si necesitamos analytics:

```text
playback_session_started
playback_session_recovered
playback_session_failed
```

pueden emitirse a telemetría.

Eso no obliga a convertir todas las PlaybackSessions en filas históricas permanentes.

---

## 7.84. Subtitles

El modelo original tiene una tabla:

```text
Subtitulo
├── episodio_id
├── idioma
├── label
└── archivo_vtt_url
```

Necesitamos distinguir dos casos.

---

## 7.85. Canonical Subtitle Asset

Si nosotros gestionamos un subtítulo independiente del Source:

```text
SubtitleTrack
```

sí puede ser persistente.

Ejemplo:

```text
subtitle_tracks
```

relacionado con Playback Target.

---

## 7.86. Source-provided Subtitle

Si aparece solamente al resolver:

```text
Source
  ↓
Playable Representation
  ↓
embedded subtitle track
```

no necesita tabla permanente.

Player lo recibe como track de la sesión.

---

## 7.87. `subtitle_tracks`

Si lo necesitamos:

```sql
CREATE TABLE subtitle_tracks (
    id UUID PRIMARY KEY,

    media_item_id UUID,
    episode_id UUID,

    language_code VARCHAR(32) NOT NULL,
    label VARCHAR(255),

    asset_url TEXT NOT NULL,

    format VARCHAR(32) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

con la misma regla de Playback Target.

---

## 7.88. Audio Tracks

No crearemos necesariamente:

```text
audio_tracks
```

persistentes.

Muchas pistas de audio son propiedades de una Playable Representation.

Si posteriormente administramos pistas canónicas propias, podremos modelarlas.

---

## 7.89. Discovery / Ingestion Domain

Este dominio tampoco existía realmente en el modelo original.

Necesitamos representar:

```text
candidate
job
result
```

sin contaminar Catalog.

---

## 7.90. Discovered Candidate

Conceptualmente:

```sql
CREATE TABLE discovered_candidates (
    id UUID PRIMARY KEY,

    discovery_source VARCHAR(100) NOT NULL,

    external_reference TEXT NOT NULL,

    candidate_type VARCHAR(32) NOT NULL,

    status VARCHAR(32) NOT NULL,

    discovered_at TIMESTAMPTZ NOT NULL,

    metadata JSONB
);
```

---

## 7.91. Candidate ≠ Catalog Item

Una cosa descubierta externamente:

```text
candidate
```

no se convierte automáticamente en:

```text
MediaItem
```

Debe atravesar:

```text
normalization
deduplication
validation
association
```

---

## 7.92. Candidate State

Ejemplo:

```text
DISCOVERED
NORMALIZED
MATCHED
ACCEPTED
REJECTED
FAILED
```

Los estados definitivos dependerán del pipeline.

---

## 7.93. Ingestion Job

```sql
CREATE TABLE ingestion_jobs (
    id UUID PRIMARY KEY,

    job_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,

    attempts INTEGER NOT NULL DEFAULT 0,

    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    error_code VARCHAR(64),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 7.94. Queue ≠ Job Database

Una queue puede contener:

```text
execute ingestion job 123
```

mientras PostgreSQL conserva el estado durable del job.

No tienen por qué ser la misma cosa.

---

## 7.95. Idempotency

Los jobs deben tener claves/idempotency semantics cuando puedan repetirse.

Especialmente:

```text
same external candidate
same Source
same catalog update
```

para evitar duplicados.

---

## 7.96. Ads Domain

El original tiene:

```text
Anuncio
├── tipo
├── nombre
├── vast_url / codigo_html
└── activo
```

Ya vimos que es insuficiente y que `codigo_html` arbitrario no será primitive principal.

---

## 7.97. Ad Provider

```text
ad_providers
```

representa la integración publicitaria.

Campos conceptuales:

```text
id
key
display_name
enabled
configuration reference
```

Los secretos no se almacenan como configuración pública.

---

## 7.98. Ad Placement

```text
ad_placements
```

Ejemplos:

```text
PLAYER_PREROLL
WATCH_SIDEBAR
HOME_BANNER
```

---

## 7.99. Ad Policy

```text
ad_policies
```

puede definir:

```text
placement
enabled
provider
priority
frequency cap
skip policy
```

con configuración validada.

---

## 7.100. Ad Session

`AdSession` puede ser efímera o tener persistencia operacional limitada.

No necesariamente necesita almacenamiento permanente por cada impresión.

Eventos publicitarios de alto volumen deberían ir a analytics/telemetry.

---

## 7.101. Ads Analytics

No queremos que:

```text
every quartile event
```

sea una transacción pesada en la base principal.

Podemos:

```text
batch
queue
aggregate
```

posteriormente.

---

## 7.102. Search Projection

Si usamos PostgreSQL inicialmente:

```text
search_vector
```

puede formar parte de una proyección/índice.

Si migramos a motor dedicado:

```text
media_search_index
```

es externo y reconstruible.

---

## 7.103. Search nunca posee MediaItem

Si el índice desaparece:

```text
Catalog survives.
```

Podemos reconstruir Search desde Catalog.

Esta propiedad debe mantenerse.

---

## 7.104. Recommendations

No necesitamos una tabla:

```text
recommendations
```

desde el primer día.

MVP puede calcular:

```text
popular
recent
similar by metadata
```

con datos existentes.

---

## 7.105. Recommendation Data

Más adelante podrían existir:

```text
content_embeddings
recommendation_candidates
interaction_aggregates
```

como proyecciones derivadas.

No son parte del núcleo transaccional MVP.

---

## 7.106. Audit Domain

Como definimos en Motor 9:

```sql
CREATE TABLE audit_events (
    id UUID PRIMARY KEY,

    actor_type VARCHAR(32) NOT NULL,
    actor_id UUID,

    action VARCHAR(100) NOT NULL,

    target_type VARCHAR(100),
    target_id VARCHAR(255),

    outcome VARCHAR(32) NOT NULL,

    metadata JSONB,

    occurred_at TIMESTAMPTZ NOT NULL
);
```

---

## 7.107. Audit metadata

Nunca debe incluir accidentalmente:

```text
password
password hash
refresh token
signing key
provider credential
authorization header
```

---

## 7.108. Audit Retention

Puede ser distinta de:

```text
application logs
```

y de:

```text
health observations
```

Cada categoría tendrá política propia.

---

## 7.109. Security Data

No crearemos automáticamente una enorme tabla:

```text
security_events
```

en PostgreSQL para cada request.

Muchos eventos pertenecen al pipeline de logs/observabilidad.

Persistiremos únicamente lo que necesite:

```text
durable operational state
investigation
audit
security workflow
```

---

## 7.110. Rate-limit Counters

Por ejemplo:

```text
rate_limit counters
```

son efímeros.

Van a:

```text
memory / Redis
```

no PostgreSQL.

---

## 7.111. Block Entries

Si posteriormente necesitamos restricciones persistentes:

```text
access_restrictions
```

será más general que el `ip_blocklist` original.

Podrá representar:

```text
account
network
session
resource
```

según política.

No MVP necesariamente.

---

## 7.112. Provider Health

Podemos derivarlo sin tabla inicial.

Por ejemplo:

```text
source_health_observations
        │
        ▼
aggregate by provider
```

Si el coste aumenta:

```text
provider_health
```

puede convertirse en una proyección materializada.

---

## 7.113. Content Availability Projection

Igualmente:

```text
Playback Target
      │
      ├── ACTIVE Source
      ├── DEGRADED Source
      └── UNAVAILABLE Source
```

puede producir:

```text
playback_target_availability
```

como proyección futura.

No forma parte de la identidad del Catalog.

---

## 7.114. Source Coverage

Conceptualmente podemos consultar:

```text
active source count
degraded source count
total source count
```

por Playback Target.

Esto alimenta:

```text
Admin
Discovery/Ingestion
Operations
```

---

## 7.115. Foreign Keys

Dentro del monolito modular/MVP, las FK son útiles para integridad.

Ejemplo:

```text
episode.season_id → seasons.id
source.episode_id → episodes.id
```

No renunciaremos a integridad referencial solo porque la arquitectura lógica tenga módulos.

---

## 7.116. Cross-domain FK

Aquí hay una decisión interesante.

Por ejemplo:

```text
source_reports.user_id
```

cruza:

```text
Health
→
Identity
```

En un monolito modular puede existir FK física.

Pero no debemos diseñar código que dependa de:

```text
JOIN every domain everywhere
```

porque dificultaría separación futura.

---

## 7.117. Regla práctica MVP

Usaría:

> **Foreign keys donde aporten integridad dentro de PostgreSQL, pero ownership y acceso permanecen definidos por módulo.**

No simularemos microservicios dentro de una sola base eliminando todas las FK.

---

## 7.118. Cascade Deletes

Mucho cuidado con:

```text
ON DELETE CASCADE
```

No lo aplicaremos indiscriminadamente.

Ejemplo:

```text
delete user
```

no debería borrar silenciosamente:

```text
audit evidence
```

sin considerar política de privacidad/retención.

---

## 7.119. Deletion Semantics

Cada dominio definirá:

```text
delete
archive
anonymize
revoke
retain
```

según significado.

---

## 7.120. User Deletion

Podría requerir:

```text
disable account
revoke sessions
delete/anonymize profile
delete preferences
delete/anonymize history
retain required security/audit evidence
```

según política aplicable.

No será:

```sql
DELETE FROM users;
```

y esperar que cascades resuelvan todo.

---

## 7.121. Source Deletion

Normalmente preferiremos:

```text
disable/archive
```

para preservar:

```text
resolution attempts
health history
reports
audit
```

---

## 7.122. Media Deletion

Igualmente:

```text
ARCHIVED
```

puede ser preferible a hard delete.

Especialmente si existen:

```text
history
reports
audit
```

referenciándolo.

---

## 7.123. Indexing Strategy

Los índices se diseñarán desde patrones de consulta reales.

No:

```text
index every column
```

---

## 7.124. Catalog indexes

Probables:

```text
media_items.slug UNIQUE
media_items(publication_status)
seasons(media_item_id, season_number)
episodes(season_id, episode_number)
```

Search textual tendrá índices específicos.

---

## 7.125. Source indexes

Probables:

```text
sources(media_item_id)
sources(episode_id)
sources(provider_id)
sources(lifecycle_status)
```

y combinaciones según Orchestrator.

---

## 7.126. Health indexes

```text
source_health_observations(source_id, observed_at DESC)
source_reports(source_id, status)
```

y posiblemente:

```text
source_reports(status, created_at)
```

para Admin.

---

## 7.127. User indexes

```text
external_identities(provider, provider_subject)
auth_sessions(user_id, status)
playback_progress(user_id, ...)
user_library(user_id, ...)
```

según query patterns.

---

## 7.128. Partial Indexes

PostgreSQL permite cosas útiles:

```sql
WHERE status = 'ACTIVE'
```

pero solo los añadiremos cuando los queries reales los justifiquen.

---

## 7.129. JSONB

Usaremos JSONB para:

```text
variable metadata
provider-specific noncritical data
audit metadata
candidate raw metadata
```

pero no para evitar modelar campos esenciales.

---

## 7.130. Regla JSONB

Si necesitamos consultar constantemente:

```text
metadata->>'language'
```

para decisiones críticas, probablemente:

```text
language
```

merece columna propia.

---

## 7.131. Enums

PostgreSQL enum vs:

```text
VARCHAR + CHECK
```

queda como decisión de implementación.

Enums DB ofrecen integridad pero migraciones más rígidas.

Para estados evolutivos puede convenir:

```text
VARCHAR + CHECK/application validation
```

según caso.

---

## 7.132. Monetary Data

Si posteriormente manejamos:

```text
revenue
payments
```

nunca usaremos floating point para dinero.

Pero monetización financiera real no forma parte del MVP actual.

---

## 7.133. Durations

Usaremos unidades explícitas:

```text
duration_seconds
position_seconds
latency_ms
```

No:

```text
duration = 5000
```

sin saber unidad.

---

## 7.134. Language Codes

Preferiremos estándares como:

```text
BCP 47
```

cuando sea adecuado:

```text
es
es-ES
es-419
en
ja
```

---

## 7.135. Time

Persistiremos timestamps:

```text
TIMESTAMPTZ
```

y normalmente trabajaremos internamente en UTC.

La presentación convierte a zona local.

---

## 7.136. Slugs

`slug`:

```text
≠
primary key
```

Puede cambiar por SEO/editorial.

Las relaciones internas usan ID.

---

## 7.137. Uniqueness de slug

Podemos comenzar:

```text
UNIQUE(slug)
```

y posteriormente considerar:

```text
redirect history
localized slugs
```

si cambian títulos.

---

## 7.138. URLs

No todas las URLs tienen la misma semántica.

Diferenciamos:

```text
public asset URL
external source reference
temporary representation URL
Gateway resource URL
signed URL
```

No deben almacenarse indistintamente en columnas llamadas:

```text
url
```

sin contexto.

---

## 7.139. Temporary URLs

Especialmente:

```text
signed upstream URL
```

con expiry no debe persistirse como dato canónico.

---

## 7.140. PII

Datos potencialmente personales:

```text
email
IP
security/session metadata
watch history
favorites
reports
```

tendrán:

```text
purpose
access control
retention
```

definidos.

---

## 7.141. IP Storage

No introduciremos:

```text
ip_address NOT NULL
```

en cada entidad operacional.

Solo donde exista propósito de seguridad/abuso.

Y con retención apropiada.

---

## 7.142. Data Minimization

Regla:

> Si un dato no es necesario para cumplir una función definida, no se persiste “por si acaso”.

Especialmente:

```text
raw IP
full UA
fingerprints
raw external URLs
provider tokens
```

---

## 7.143. Data Retention Classes

Podemos clasificar:

```text
R1 — Canonical / long-lived
R2 — User-controlled
R3 — Operational bounded
R4 — Security/Audit
R5 — Ephemeral
```

Ejemplo:

```text
MediaItem → R1
PlaybackProgress → R2
ResolutionAttempt → R3
AuditEvent → R4
PlaybackSession Redis → R5
```

Los tiempos concretos se decidirán posteriormente.

---

## 7.144. Backup Scope

Backups principales:

```text
PostgreSQL
```

y assets propios necesarios.

No necesitamos respaldar:

```text
Redis cache
```

como si fuera source of truth.

---

## 7.145. Redis Loss

Una propiedad deseable:

```text
Redis disappears
```

→ perdemos:

```text
cache
temporary sessions
rate counters
queue state depending implementation
```

pero no:

```text
Catalog
Users
Sources
canonical progress
```

---

## 7.146. Queue Durability

Si una queue transporta jobs críticos:

```text
job durable state
```

puede estar en PostgreSQL.

Así un restart no implica olvidar qué trabajo existía.

---

## 7.147. Transaction Boundaries

Ejemplo Catalog:

```text
Create MediaItem
+
initial metadata
+
external IDs
```

puede requerir una transacción.

---

## 7.148. Source Creation

```text
Create Source
+
associate Playback Target
```

debe ser atómico respecto a sus invariantes.

Pero:

```text
create Source
+
resolve external provider
```

no debe mantener una transacción SQL abierta durante una llamada de red.

---

## 7.149. External I/O inside DB transaction

Regla:

> Evitar mantener transacciones de base de datos abiertas mientras esperamos servicios externos.

Flujo:

```text
persist state
commit
   │
   ▼
async/external operation
   │
   ▼
persist result
```

cuando corresponda.

---

## 7.150. Outbox Pattern

Cuando necesitemos garantizar:

```text
DB mutation
+
event publication
```

podremos introducir:

```text
transactional outbox
```

---

## 7.151. Outbox no MVP universal

No implementaremos outbox para absolutamente todo desde el día uno.

Lo incorporaremos donde la pérdida de eventos tenga impacto real.

---

## 7.152. Idempotency Keys

Operaciones externas/reintentables pueden utilizar:

```text
idempotency_key
```

para:

```text
ingestion
admin bulk actions
event consumption
```

según necesidad.

---

## 7.153. Event Consumer Idempotency

Si:

```text
media.updated
```

llega dos veces a Search:

```text
Search Projection
```

debe poder procesarlo sin crear dos documentos.

---

## 7.154. Schema Migrations

Todo cambio de esquema:

```text
version-controlled migration
```

No:

```text
manually edit production database
```

como workflow normal.

---

## 7.155. Migration Strategy

Cuando exista producción:

```text
expand
migrate
contract
```

puede ser preferible para cambios incompatibles.

Ejemplo:

```text
add new column
deploy code supporting both
backfill
switch reads
remove old column later
```

---

## 7.156. Seed Data

Podremos tener seeds para:

```text
roles
genres
initial admin setup
development catalog
```

pero:

```text
production secrets
```

nunca en seeds del repositorio.

---

## 7.157. Development Fixtures

Separaremos:

```text
test fixtures
```

de:

```text
production seed
```

para no contaminar producción con datos ficticios.

---

## 7.158. Data Ownership Matrix

Esta tabla es importante:

| Entidad                   | Owner                      | Persistencia principal        | Naturaleza             |
| ------------------------- | -------------------------- | ----------------------------- | ---------------------- |
| MediaItem                 | Catalog                    | PostgreSQL                    | Canónica               |
| Season                    | Catalog                    | PostgreSQL                    | Canónica               |
| Episode                   | Catalog                    | PostgreSQL                    | Canónica               |
| Provider                  | Source Registry            | PostgreSQL                    | Canónica               |
| Source                    | Source Registry            | PostgreSQL                    | Canónica               |
| ResolutionAttempt         | Resolver                   | PostgreSQL/operacional        | Operacional            |
| PlayableRepresentation    | Resolver                   | Redis/memoria                 | Efímera                |
| SourceHealthObservation   | Health                     | PostgreSQL                    | Operacional            |
| SourceHealth              | Health/Registry projection | PostgreSQL/cache              | Derivada               |
| SourceReport              | Health/Reports             | PostgreSQL                    | Operacional            |
| User                      | Identity                   | PostgreSQL                    | Canónica               |
| Credential                | Identity                   | PostgreSQL                    | Secreta                |
| AuthSession               | Identity                   | PostgreSQL/Redis según diseño | Operacional            |
| UserProfile               | User Domain                | PostgreSQL                    | Canónica               |
| UserPreference            | User Domain                | PostgreSQL                    | Canónica               |
| UserLibraryEntry          | User Domain                | PostgreSQL                    | Canónica               |
| PlaybackProgress          | User Domain                | PostgreSQL                    | Canónica               |
| PlaybackSession           | Playback                   | Redis                         | Efímera                |
| SearchIndex               | Search                     | PostgreSQL/Search Engine      | Derivada               |
| Recommendation Candidates | Recommendations            | variable                      | Derivada               |
| DiscoveredCandidate       | Discovery                  | PostgreSQL                    | Operacional            |
| IngestionJob              | Ingestion                  | PostgreSQL + Queue            | Operacional            |
| AdPolicy                  | Ads                        | PostgreSQL                    | Canónica/configuración |
| AdSession                 | Ads                        | Redis/operacional             | Efímera                |
| AuditEvent                | Audit                      | PostgreSQL/log sink           | Auditoría              |
| Rate Limit Counter        | Security                   | Redis/memoria                 | Efímera                |

---

## 7.159. Dependencias entre datos

La dirección lógica principal:

```text
Catalog
   │
   ▼
Source Registry
   │
   ├────────► Health
   │
   └────────► Playback
                 │
                 ▼
             User Progress

Identity
   │
   ├────────► User Domain
   └────────► Admin/Auth Context

Catalog
   │
   ├────────► Search Projection
   └────────► Recommendations

Discovery
   │
   ▼
Catalog / Source Registry
```

---

## 7.160. Lo que NO persistimos como dato canónico

Muy importante:

```text
final source ranking
temporary stream URL
Gateway URL
HLS segment URL
signed playback token
current Player buffer
current ABR quality
raw Search result score
temporary recommendation ranking
every media segment request
```

Estos son runtime/derived data.

---

## 7.161. ERD lógico simplificado

```text
┌───────────────────── CATALOG ─────────────────────┐

        MEDIA_ITEM
           │ 1
           │
           ├─────────────── N SEASON
           │                    │
           │                    │ 1
           │                    ▼
           │                  N EPISODE
           │
           └─────────────── PLAYBACK TARGET
                                │
                                │ 1:N
                                ▼
┌────────────────── SOURCE REGISTRY ────────────────┐

                              SOURCE
                             /      \
                            /        \
                           ▼          ▼
                     PROVIDER      RESOLUTION
                                    ATTEMPT

                           │
                           ▼
┌────────────────────── HEALTH ─────────────────────┐

                   HEALTH OBSERVATION
                           │
                           ▼
                    HEALTH PROJECTION

SOURCE ◄──────────────── SOURCE REPORT
                           ▲
                           │
                          USER


┌──────────────────── IDENTITY ─────────────────────┐

                         USER
               ┌──────────┼───────────┐
               ▼          ▼           ▼
          CREDENTIAL  AUTH SESSION  EXTERNAL IDENTITY
                                    

┌────────────────── USER DOMAIN ────────────────────┐

                         USER
               ┌──────────┼──────────┐
               ▼          ▼          ▼
            PROFILE   PREFERENCES  LIBRARY
                                      │
                                      ▼
                               PLAYBACK PROGRESS


┌──────────────────── PLAYBACK ─────────────────────┐

PLAYBACK TARGET
       │
       ▼
    SOURCE
       │
       ▼
PLAYABLE REPRESENTATION      [EPHEMERAL]
       │
       ▼
PLAYBACK SESSION             [EPHEMERAL]
       │
       ▼
    PLAYER
```

---

## 7.162. ERD conceptual ampliado

Podemos visualizar todo así:

```text
                                      ┌───────────────┐
                                      │   Provider    │
                                      └───────┬───────┘
                                              │ 1
                                              │
                                              │ N
┌──────────────┐      ┌──────────────┐      ┌▼─────────────┐
│  MediaItem   │──────│PlaybackTarget│──────│    Source    │
└──────┬───────┘      └──────────────┘      └──────┬───────┘
       │                                            │
       │                                            ├─────────────┐
       │                                            │             │
       │                                      ┌─────▼──────┐ ┌────▼──────────┐
       │                                      │ Resolution │ │ Health        │
       │                                      │ Attempts   │ │ Observations  │
       │                                      └────────────┘ └────┬──────────┘
       │                                                          │
       │                                                     ┌────▼─────┐
       │                                                     │ Health   │
       │                                                     │ Snapshot │
       │                                                     └──────────┘
       │
       ├───────────────┐
       │               │
       ▼               ▼
    Season          Movie Target
       │
       ▼
    Episode
       │
       └────────── Episode Target


                ┌────────────────┐
                │      User      │
                └───────┬────────┘
                        │
       ┌────────────────┼──────────────────────┐
       │                │                      │
       ▼                ▼                      ▼
 Credential        AuthSession             UserProfile
                                                │
                              ┌─────────────────┼──────────────┐
                              ▼                 ▼              ▼
                         Preferences       UserLibrary    PlaybackProgress
```

`PlaybackTarget` en estos diagramas sigue siendo **conceptual** hasta que decidamos si merece tabla.

---

## 7.163. Invariantes críticas

Documentaría formalmente las siguientes.

### INV-DATA-01

Una `Source` pertenece a exactamente un Playback Target.

### INV-DATA-02

Una `PlayableRepresentation` siempre deriva de una Source, pero no altera su identidad.

### INV-DATA-03

Una `PlaybackSession` referencia una Source seleccionada, pero su expiración no elimina la Source.

### INV-DATA-04

Una película no necesita un Episode artificial para poder tener Sources.

### INV-DATA-05

Una Source no almacena permanentemente la URL procesada del Gateway.

### INV-DATA-06

Un `HealthObservation` no modifica por sí solo la disponibilidad de Source.

### INV-DATA-07

Un `UserReport` no deshabilita directamente una Source.

### INV-DATA-08

Una `AuthSession` nunca se utiliza como sustituto de `PlaybackSession`.

### INV-DATA-09

Un `PlaybackProgress` pertenece al usuario y Playback Target, no a Source.

Esto es muy importante:

```text
User changes Source
```

pero:

```text
progress remains
```

### INV-DATA-10

Search Index puede reconstruirse desde Catalog.

### INV-DATA-11

Una pérdida de Redis no elimina datos canónicos.

### INV-DATA-12

Credentials/secrets nunca se incluyen en DTOs públicos ordinarios.

### INV-DATA-13

Un administrative disable tiene precedencia sobre recuperación automática de Health.

### INV-DATA-14

El borrado de una Source no debe destruir silenciosamente evidencia necesaria de auditoría.

### INV-DATA-15

Los IDs externos no sustituyen IDs internos.

---

## 7.164. Consistencia

No toda la plataforma necesita:

```text
strong consistency everywhere
```

Distinguimos.

### Strong / transactional consistency

Importante para:

```text
credentials
role changes
Source creation
Catalog mutations
user progress upsert
administrative actions
```

### Eventual consistency

Aceptable para:

```text
Search Index
Recommendations
Health aggregates
analytics
dashboards
```

---

## 7.165. Ejemplo de consistencia

Admin cambia:

```text
Blade Runner
→ publication_status = PUBLISHED
```

La fila Catalog cambia transaccionalmente.

Después:

```text
Search Index
```

puede tardar:

```text
small bounded interval
```

en reflejarlo.

Eso es eventual consistency intencional.

---

## 7.166. Availability vs Consistency

No sacrificaremos disponibilidad del playback porque:

```text
recommendation projection
```

esté retrasada.

Cada dato tendrá requisitos de consistencia según su función.

---

## 7.167. Data Access Rule

Una regla que vale la pena dejar explícita:

> **Ser propietario de la misma base física no autoriza a un módulo a modificar tablas pertenecientes a otro dominio.**

Ejemplo:

```text
Health Worker
```

no debería ejecutar:

```sql
UPDATE sources
SET operational_enabled = false;
```

saltándose Source Registry.

---

## 7.168. Repositories

Dentro del monolito modular:

```text
CatalogRepository
SourceRepository
UserRepository
HealthObservationRepository
```

pueden encapsular acceso.

No para crear abstracciones ceremoniales, sino para mantener ownership.

---

## 7.169. Reporting Queries

Admin necesitará consultas que crucen dominios.

Eso no invalida ownership.

Podemos tener:

```text
read-only reporting queries
admin projections
materialized views
```

sin permitir mutaciones cross-domain arbitrarias.

---

## 7.170. Materialized Views

Posteriormente pueden ayudar para:

```text
provider health dashboard
catalog coverage
popular content
admin statistics
```

si medir demuestra necesidad.

No son requisito MVP.

---

## 7.171. Database Partitioning

Tablas de alto crecimiento:

```text
health observations
resolution attempts
audit events
analytics
```

podrían requerir partitioning por tiempo posteriormente.

No lo implementaría inicialmente sin volumen.

---

## 7.172. High-volume Telemetry

Eventos de:

```text
Player
Gateway segments
Ads
Search analytics
```

pueden crecer órdenes de magnitud más rápido que Catalog.

No debemos obligarlos a compartir indefinidamente el mismo patrón de almacenamiento.

---

## 7.173. OLTP vs Analytics

PostgreSQL principal será:

```text
OLTP
```

No debemos convertirlo accidentalmente en warehouse de cada click y segmento.

Posteriormente:

```text
analytics store / warehouse
```

puede recibir eventos agregados.

---

## 7.174. MVP Database

Para la primera vertical slice, reduciría el esquema físico obligatorio a:

```text
media_items
seasons
episodes

providers
sources
source_resolution_attempts

source_health_observations
source_health
source_reports

users
password_credentials
auth_sessions
user_roles

user_preferences
user_library
playback_progress

audit_events
```

y, según el alcance exacto:

```text
subtitle_tracks
ingestion_jobs
discovered_candidates
```

---

## 7.175. Redis MVP

Redis puede manejar:

```text
resolution cache
playback sessions
rate limits
short-lived locks
```

y queue si elegimos una implementación basada en Redis.

No hace falta usarlo para:

```text
every profile
every catalog read
```

desde el primer día.

---

## 7.176. Lo que dejamos fuera del MVP

No necesitamos todavía:

```text
media_units abstraction
custom user lists
full recommendation feature store
vector embeddings
complex ad analytics warehouse
provider incident tables
multi-region session replication
database sharding
event sourcing
CQRS database split
separate DB per service
time-series database
graph database
```

---

## 7.177. Criterios de aceptación del modelo

Consideraremos esta sección correctamente implementada cuando:

1. películas puedan tener Sources sin Episode ficticio;
2. series puedan organizarse en Season/Episode;
3. un Playback Target pueda tener múltiples Sources;
4. Source y Provider tengan identidades distintas;
5. una Source no almacene Gateway URL como dato canónico;
6. las representaciones temporales expiren independientemente de Source;
7. ResolutionAttempt pueda auditarse;
8. Health Observation y Health Projection estén separados;
9. User Report esté separado de Health Observation;
10. una Source pueda recuperarse de `UNAVAILABLE`;
11. manual disable no sea sobrescrito automáticamente;
12. User y Credential estén separados;
13. AuthSession pueda revocarse;
14. refresh tokens, si existen, se almacenen hasheados;
15. Profile esté separado de Credential;
16. PlaybackProgress funcione para películas y episodios;
17. cambiar Source no reinicie conceptualmente el progreso;
18. Search pueda reconstruirse desde Catalog;
19. Redis no sea source of truth del catálogo;
20. PlaybackSession sea temporal;
21. audit log no almacene secretos;
22. external IDs no sean PK internas;
23. Discovery Candidate no se convierta automáticamente en Catalog Item;
24. operaciones reintentables importantes soporten idempotencia;
25. los módulos respeten ownership aun compartiendo PostgreSQL;
26. telemetría de alta frecuencia no se confunda con estado transaccional;
27. deletion/retention tengan semántica por dominio;
28. índices respondan a queries reales;
29. migraciones sean versionadas;
30. el modelo pueda evolucionar sin obligarnos a separar microservicios prematuramente.

---

## 7.178. ADRs abiertas del modelo de datos

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

## 7.179. Arquitectura de persistencia consolidada

```text
                         APPLICATION
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
       ▼                      ▼                      ▼
    CATALOG               SOURCES                IDENTITY
       │                      │                      │
       │                      ├──── HEALTH           ├──── USER DATA
       │                      │
       └──────────┬───────────┴───────────┬──────────┘
                  │                       │
                  ▼                       ▼
             POSTGRESQL               POSTGRESQL
             CANONICAL                OPERATIONAL
               DATA                      DATA
                  │                       │
                  └──────────┬────────────┘
                             │
                             ▼
                    DURABLE SOURCE OF TRUTH


                         RUNTIME DATA
                              │
                              ▼
                            REDIS
                              │
             ┌────────────────┼─────────────────┐
             │                │                 │
             ▼                ▼                 ▼
        PlaybackSession   Resolution Cache   Rate Limits
             │
             └──────────── ephemeral ───────────┘


                      REBUILDABLE DATA
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
             Search       Health        Recommendations
             Index       Projection       Projection


                      HIGH-VOLUME DATA
                              │
                              ▼
                   TELEMETRY / ANALYTICS
                              │
                              ▼
                  specialized storage later
```

## Reglas maestras de la Sección 7

Estas sí las pondría al final porque resumen toda la filosofía:

> **1. PostgreSQL contiene estado durable; Redis contiene principalmente estado efímero y aceleradores operacionales.**

> **2. Compartir una base física no significa compartir ownership de datos.**

> **3. Content, Playback Target, Source, Playable Representation y PlaybackSession son conceptos diferentes y tienen ciclos de vida diferentes.**

> **4. Ninguna URL temporal de reproducción debe convertirse accidentalmente en dato canónico de Source.**

> **5. User, Credential, AuthSession y PlaybackSession son entidades independientes.**

> **6. PlaybackProgress pertenece al usuario y al contenido reproducible, no al servidor externo utilizado para verlo.**

> **7. HealthObservation es evidencia; SourceHealth es una proyección derivada.**

> **8. Search, Recommendations y otros índices derivados deben poder reconstruirse desde sus fuentes canónicas.**

> **9. Los datos efímeros deben poder desaparecer sin destruir el estado esencial de la plataforma.**

> **10. No toda entidad conceptual necesita una tabla, y no toda tabla necesita convertirse en un servicio.**

> **11. Los datos de alto volumen —telemetría, segmentos, eventos del Player, publicidad— no deben convertir la base OLTP principal en un almacén indiscriminado de eventos.**

> **12. El esquema debe preservar integridad hoy sin impedir una evolución arquitectónica mañana.**

Y aquí hay una consecuencia bastante grande: acabamos de obtener el **primer modelo coherente de extremo a extremo** de la plataforma.

Antes teníamos esencialmente:

```text
Contenido
   ↓
Episodio
   ↓
Fuente
   ↓
URL procesada
```

Ahora tenemos:

```text
MediaItem
    │
    ▼
Playback Target
    │
    ▼
Source Registry
    │
    ├── Source A
    ├── Source B
    └── Source C
          │
          ▼
       Resolver
          │
          ▼
Playable Representation
          │
          ▼
PlaybackSession
          │
          ▼
Gateway
          │
          ▼
Player
```

y paralelamente:

```text
Source
  │
  ├── ResolutionAttempt
  ├── HealthObservation
  ├── HealthProjection
  └── SourceReport
```

mientras:

```text
User
  │
  ├── Credential
  ├── AuthSession
  ├── Profile
  ├── Preferences
  ├── Library
  └── PlaybackProgress
```

Eso resuelve muchas contradicciones que estaban escondidas en el documento original.

---

## Y ahora hay una decisión importante sobre cómo continuar

La siguiente sección original es **8. APIs Y CONTRATOS**, y ahí el documento todavía expone el diseño antiguo de forma muy clara: `GET /v1/watch/:episode_id` devuelve al Player un array `sources[]` con `server`, `stream_url` y tipo; el Gateway acepta `/proxy/m3u8?token=...` y, todavía más importante, `/proxy/segment?url={encoded_segment_url}`; además Progress recibe directamente `episode_id` y Reports recibe `fuente_id`.

Eso contradice varias de las fronteras que acabamos de establecer.

Así que en la siguiente revisión vamos a hacer algo especialmente útil: **definir los contratos que realmente unen toda la arquitectura**.

El flujo crítico dejará de ser:

```text
GET /watch/:episode
        │
        ▼
sources[]
        │
        ▼
Player chooses source
        │
        ▼
/proxy?url=...
```

y pasará a ser:

```text
POST /playback/sessions
          │
          ▼
 Playback Orchestrator
          │
          ▼
   Source Selection
          │
          ▼
       Resolver
          │
          ▼
 PlaybackSession DTO
          │
          ▼
        Player
          │
          ▼
        Gateway
```

Ahí podremos definir, por primera vez de manera formal, los contratos de **Catalog API, Search API, Playback API, Playback Recovery, Source Switching, Gateway, Progress, Reports, Auth, Admin e internal APIs**, junto con errores, paginación, idempotencia, versionado, correlation IDs y qué datos **jamás deben cruzar cada frontera**.

Ese bloque nos va a servir casi como el **contrato constitucional entre todos los motores que acabamos de diseñar**.

