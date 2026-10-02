## 6.34. Motor de Catálogo

#### a. Propósito y responsabilidad única

El **Motor de Catálogo** es el dominio responsable de representar,
almacenar, estructurar y recuperar la identidad y los metadatos
descriptivos de los contenidos audiovisuales disponibles en la
plataforma.

Actúa como la **Fuente Única de Verdad (Single Source of Truth)** para
la identidad canónica del contenido y su estructura editorial.

Su responsabilidad comprende principalmente:

- identidad del contenido;

- títulos y títulos alternativos;

- descripción y sinopsis;

- clasificación del contenido;

- estructura de temporadas y episodios cuando corresponda;

- duración;

- fechas de publicación o estreno;

- géneros y taxonomías;

- imágenes y referencias a assets;

- información editorial;

- estado de publicación;

- relaciones estructurales entre contenidos;

- identificadores externos de metadatos;

- atributos necesarios para búsqueda, navegación y presentación.

El Motor de Catálogo responde fundamentalmente a la pregunta:

**¿Qué contenido existe en la plataforma y cómo está estructurado?**

No responde a:

**¿Dónde se reproduce?**

ni a:

**¿Qué Source debe utilizarse para reproducirlo?**

Estas responsabilidades pertenecen respectivamente al Source Registry,
Playback Orchestrator, Source Resolver y Media Gateway.

**Responsabilidad única**

Mantener una representación canónica, consistente y consultable del
catálogo audiovisual independientemente de las Sources mediante las
cuales pueda reproducirse cada contenido.

**Fuera de su alcance**

El Motor de Catálogo **no será responsable de**:

- almacenar o resolver URLs de reproducción;

- conocer detalles internos de Providers/Hosts;

- ejecutar Adapters;

- determinar qué Source es mejor;

- comprobar la salud operativa de Sources;

- crear Playback Sessions;

- transportar manifests o segmentos audiovisuales;

- administrar credenciales de Providers;

- ejecutar lógica específica del Media Player Core;

- gestionar la entrega de video.

Por tanto:

Catalog

   │

   └── conoce el contenido

Source Registry

   │

   └── conoce dónde puede encontrarse

Playback Orchestrator

   │

   └── decide qué Source utilizar

Source Resolver

   │

   └── obtiene una representación reproducible

Media Gateway

   │

   └── habilita su entrega

Media Player Core

   │

   └── la reproduce

#### b. Modelo conceptual del contenido

La entidad raíz del catálogo será:

MediaItem

MediaItem representa una obra o unidad audiovisual identificable dentro
del catálogo.

La arquitectura no deberá asumir que todo contenido pertenece
exclusivamente al modelo tradicional:

Película

Serie

Anime

En particular, **anime no debe modelarse como una estructura audiovisual
distinta de una serie o película**.

"Anime" describe principalmente una clasificación editorial, cultural o
taxonómica; no una estructura de reproducción fundamentalmente
diferente.

Por tanto, el modelo deberá permitir representar de forma extensible
contenidos como:

MOVIE

SERIES

DOCUMENTARY

SHORT

CONCERT

CLIP

SPECIAL

LIVE_EVENT        \[futuro\]

OTHER

La lista exacta podrá evolucionar mediante migraciones o mediante una
taxonomía configurable.

Un contenido podrá además poseer clasificaciones independientes:

MediaItem

│

├── type = SERIES

├── genres = \[\...\]

├── tags = \[\...\]

├── origin_country = \[\...\]

├── original_language = \[\...\]

└── classifications = \[\...\]

De esta manera, por ejemplo, una serie de animación japonesa no necesita
convertirse en un tipo estructural especial únicamente por ser anime.

#### c. Jerarquía estructural

El catálogo deberá soportar tanto contenidos simples como contenidos
episódicos.

Modelo conceptual:

MediaItem

│

├── MOVIE

│

│    └── unidad reproducible: MediaItem

│

├── SHORT

│

│    └── unidad reproducible: MediaItem

│

├── DOCUMENTARY

│

│    └── puede ser unitario o episódico

│

└── SERIES

     │

     ├── Season 1

     │     ├── Episode 1

     │     ├── Episode 2

     │     └── Episode N

     │

     └── Season N

Esto introduce un concepto importante:

**Playback Target**

El catálogo deberá permitir identificar qué entidad representa una
**unidad potencialmente reproducible**.

Por ejemplo:

Película

MediaItem → Playback Target

Serie

MediaItem

   ↓

Season

   ↓

Episode → Playback Target

El catálogo identifica dicha unidad.

No almacena su mecanismo concreto de reproducción.

#### d. Identidad canónica

Cada contenido deberá poseer una identidad interna independiente de los
proveedores externos.

Ejemplo:

media_id = 6a61\...

Esta identidad será la referencia primaria utilizada por los demás
dominios.

Los identificadores procedentes de sistemas externos deberán almacenarse
como referencias adicionales y nunca sustituir la identidad interna.

Modelo conceptual:

MediaItem

│

├── internal_id

│

├── canonical_slug

│

└── External IDs

├── provider_A → 12345

├── provider_B → tt123456

└── provider_C → 98765

Esto permite cambiar de proveedor de metadatos sin modificar la
identidad interna del catálogo.

**e. Entradas**

El Motor de Catálogo podrá recibir información desde cuatro caminos
principales.

**1. Panel administrativo**

Creación y edición manual:

CMS

↓

Catalog API

↓

Catalog

Ejemplos:

- crear contenido;

- editar título;

- modificar sinopsis;

- asignar géneros;

- crear temporadas;

- crear episodios;

- modificar imágenes;

- cambiar estado editorial.

**2. Motor de Ingesta**

Discovery

↓

Ingestion

↓

Normalization

↓

Catalog

La información externa deberá normalizarse antes de convertirse en
información canónica.

**3. Procesos de enriquecimiento**

Podrán incorporar:

- títulos alternativos;

- traducciones;

- imágenes;

- reparto;

- créditos;

- clasificaciones;

- metadatos adicionales.

**4. Operaciones internas**

Otros módulos podrán consultar la existencia e identidad de una unidad
de contenido mediante contratos internos.

**f. Salidas**

El Motor de Catálogo producirá principalmente:

**Respuestas de lectura**

MediaItem

Season

Episode

Genre

Collection

Catalog summaries

**Eventos de dominio**

Ejemplos:

catalog.media.created

catalog.media.updated

catalog.media.published

catalog.media.archived

catalog.season.created

catalog.season.updated

catalog.episode.created

catalog.episode.updated

catalog.episode.published

Estos eventos podrán ser consumidos por:

- búsqueda;

- caché;

- recomendaciones futuras;

- indexación;

- analytics;

- Discovery/Ingestion;

- otros módulos que mantengan proyecciones derivadas.

**g. Interfaces y contratos**

**1. Lectura de catálogo**

**GET /v1/catalog/featured**

Obtiene una representación resumida de contenidos destacados.

Ejemplo conceptual:

{

\"data\": {

\"hero\": \[

{

\"id\": \"media_123\",

\"slug\": \"example-title\",

\"title\": \"Example Title\",

\"type\": \"SERIES\",

\"releaseYear\": 2025,

\"poster\": \"\...\",

\"genres\": \[\"Drama\", \"Science Fiction\"\]

}

\],

\"sections\": \[\]

},

\"meta\": {

\"cached\": true

}

}

El endpoint no deberá incluir información operacional de Sources ni URLs
de reproducción.

**2. Detalle de contenido**

**GET /v1/media/:slug**

Obtiene la representación canónica de un MediaItem.

Ejemplo:

{

\"data\": {

\"id\": \"media_123\",

\"slug\": \"example-title\",

\"title\": \"Example Title\",

\"originalTitle\": \"Example Original Title\",

\"type\": \"SERIES\",

\"synopsis\": \"\...\",

\"releaseYear\": 2025,

\"runtimeSeconds\": null,

\"status\": \"PUBLISHED\",

\"genres\": \[

\"Drama\",

\"Science Fiction\"

\],

\"images\": {

\"poster\": \"\...\",

\"backdrop\": \"\...\"

},

\"structure\": {

\"seasonCount\": 2,

\"episodeCount\": 18

}

}

}

Obsérvese que tampoco devuelve:

source_url

resolved_url

manifest_url

provider_headers

playback_token

Esos datos no pertenecen al contrato del catálogo.

**3. Temporadas**

**GET /v1/media/:slug/seasons**

Devuelve las temporadas conocidas.

**GET /v1/media/:slug/seasons/:seasonNumber**

Devuelve una temporada y sus episodios.

Ejemplo:

{

\"data\": {

\"id\": \"season_123\",

\"seasonNumber\": 1,

\"title\": \"Season 1\",

\"episodes\": \[

{

\"id\": \"episode_001\",

\"episodeNumber\": 1,

\"title\": \"Episode 1\",

\"durationSeconds\": 2800,

\"thumbnail\": \"\...\",

\"releaseDate\": \"2025-01-01\"

}

\]

}

}

**h. Contrato con Source Registry**

El catálogo y las Sources deberán relacionarse mediante IDs estables,
pero conservar ownership separado.

Conceptualmente:

Catalog

MediaItem

│

└── Episode

│

│ ID

▼

Source Registry

Playback Target

│

├── Source A

├── Source B

└── Source C

El catálogo **no deberá contener columnas como**:

mixdrop_url

streamtape_url

server_1

server_2

stream_url

en media_items o episodes.

Las relaciones con Sources pertenecen al Source Registry.

Esto permite que un contenido tenga:

0 Sources

1 Source

10 Sources

100 Sources

sin alterar su modelo editorial.

**i. Modelo de datos**

PostgreSQL será la fuente de verdad primaria del catálogo.

Modelo lógico inicial:

media_items

│

├──────── media_titles

│

├──────── media_genres

│

├──────── media_external_ids

│

├──────── media_assets

│

│

└──\< seasons

│

└──\< episodes

**media_items**

Campos fundamentales:

id

slug

title

original_title

type

synopsis

release_date

release_year

runtime_seconds

publication_status

metadata

created_at

updated_at

**seasons**

id

media_item_id

season_number

title

synopsis

release_date

created_at

updated_at

**episodes**

id

media_item_id

season_id

episode_number

title

synopsis

duration_seconds

release_date

thumbnail_url

publication_status

created_at

updated_at

**media_external_ids**

id

media_item_id

provider

external_id

external_url

created_at

updated_at

Restricción conceptual:

UNIQUE(provider, external_id)

Esto será especialmente importante para deduplicación durante la
ingesta.

**j. DDL base**

El DDL siguiente representa una **base inicial**, no el esquema
definitivo de toda la plataforma:

CREATE TYPE media_type AS ENUM (

\'movie\',

\'series\',

\'documentary\',

\'short\',

\'concert\',

\'clip\',

\'special\',

\'other\'

);

CREATE TYPE publication_status AS ENUM (

\'draft\',

\'published\',

\'archived\'

);

CREATE TABLE media_items (

id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

slug VARCHAR(255) NOT NULL UNIQUE,

title VARCHAR(255) NOT NULL,

original_title VARCHAR(255),

type media_type NOT NULL,

synopsis TEXT,

release_date DATE,

release_year SMALLINT,

runtime_seconds INTEGER,

publication_status publication_status

NOT NULL DEFAULT \'draft\',

metadata JSONB NOT NULL DEFAULT \'{}\'::jsonb,

created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

CHECK (

release_year IS NULL

OR release_year \>= 1888

),

CHECK (

runtime_seconds IS NULL

OR runtime_seconds \>= 0

)

);

Temporadas:

CREATE TABLE seasons (

id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

media_item_id UUID NOT NULL

REFERENCES media_items(id)

ON DELETE CASCADE,

season_number INTEGER NOT NULL,

title VARCHAR(255),

synopsis TEXT,

release_date DATE,

created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

CHECK (season_number \>= 0),

UNIQUE (

media_item_id,

season_number

)

);

Episodios:

CREATE TABLE episodes (

id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

media_item_id UUID NOT NULL

REFERENCES media_items(id)

ON DELETE CASCADE,

season_id UUID

REFERENCES seasons(id)

ON DELETE CASCADE,

episode_number INTEGER NOT NULL,

title VARCHAR(255) NOT NULL,

synopsis TEXT,

thumbnail_url TEXT,

duration_seconds INTEGER,

release_date DATE,

publication_status publication_status

NOT NULL DEFAULT \'draft\',

created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

CHECK (episode_number \>= 0),

CHECK (

duration_seconds IS NULL

OR duration_seconds \>= 0

),

UNIQUE (

season_id,

episode_number

)

);

Identificadores externos:

CREATE TABLE media_external_ids (

id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

media_item_id UUID NOT NULL

REFERENCES media_items(id)

ON DELETE CASCADE,

provider VARCHAR(100) NOT NULL,

external_id VARCHAR(255) NOT NULL,

external_url TEXT,

created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

UNIQUE (

provider,

external_id

)

);

**k. Índices iniciales**

Los índices deberán responder a patrones reales de consulta.

Baseline inicial:

CREATE INDEX idx_media_items_type

ON media_items(type);

CREATE INDEX idx_media_items_publication_status

ON media_items(publication_status);

CREATE INDEX idx_media_items_release_year

ON media_items(release_year DESC);

CREATE INDEX idx_seasons_media

ON seasons(media_item_id, season_number);

CREATE INDEX idx_episodes_season

ON episodes(season_id, episode_number);

CREATE INDEX idx_external_ids_media

ON media_external_ids(media_item_id);

CREATE INDEX idx_media_metadata_gin

ON media_items USING GIN(metadata);

No deberán añadirse índices indiscriminadamente.

Cada índice adicional introduce costo en:

- almacenamiento;

- INSERT;

- UPDATE;

- mantenimiento;

- vacuum;

- migraciones.

Por ello, índices especializados deberán justificarse mediante patrones
de consulta y mediciones.

**l. Estado editorial**

El documento original mezcla estados como:

en_emision

finalizado

estreno

cancelado

con el estado de publicación de la entidad.

Estos conceptos deberán separarse.

Por ejemplo:

publication_status

├── DRAFT

├── PUBLISHED

└── ARCHIVED

describe el estado **dentro de nuestra plataforma**.

Mientras:

production_status

├── UPCOMING

├── RELEASING

├── COMPLETED

├── CANCELLED

└── UNKNOWN

describe el estado de la obra.

Son dimensiones diferentes.

Una serie puede ser:

production_status = COMPLETED

pero:

publication_status = DRAFT

porque todavía no se ha publicado en nuestro catálogo.

**m. Flujo de lectura**

Camino principal:

Client

│

▼

CDN / BFF

│

▼

Catalog API

│

├── Cache Hit ───────────► Response

│

└── Cache Miss

│

▼

PostgreSQL

│

▼

Serialization

│

▼

Cache

│

▼

Response

La introducción de caché deberá responder a mediciones reales.

Durante desarrollo o etapas tempranas podrá utilizarse inicialmente:

PostgreSQL

\+

HTTP caching

y posteriormente:

Redis

cuando la carga, latencia o patrón de consultas lo justifique.

**n. Estrategia de caché**

La arquitectura objetivo podrá soportar:

**L0 --- Browser / HTTP Cache**

Para recursos apropiados.

**L1 --- CDN / Edge**

Especialmente útil para:

- fichas públicas;

- home;

- imágenes;

- contenido altamente solicitado.

**L2 --- Application / Redis**

Para objetos de catálogo reutilizados frecuentemente.

**L3 --- PostgreSQL**

Fuente de verdad.

Conceptualmente:

Browser

↓

CDN

↓

Redis

↓

PostgreSQL

No todas las consultas deberán atravesar necesariamente todas las capas.

**o. Invalidación de caché**

Una modificación deberá invalidar únicamente las proyecciones afectadas.

Ejemplo:

Admin updates MediaItem

│

▼

PostgreSQL

│

▼

catalog.media.updated

│

┌────┴──────────┐

▼ ▼

Redis invalidate Search update

│

▼

CDN invalidate / revalidate

La invalidación mediante eventos se mantiene como objetivo
arquitectónico.

Para el MVP, una estrategia más simple basada en TTL + invalidación
explícita podrá ser suficiente.

**p. Idempotencia**

Las operaciones administrativas susceptibles de repetición podrán
admitir una clave de idempotencia:

Idempotency-Key

Ejemplo:

POST /v1/admin/media

Idempotency-Key: \<uuid\>

El backend deberá garantizar que una repetición válida de la misma
operación no cree accidentalmente contenidos duplicados.

Esto será especialmente importante en:

- ingesta;

- importaciones;

- jobs;

- reintentos de red;

- procesos automatizados.

La duración exacta de retención de la clave deberá definirse según el
tipo de operación; no se fija universalmente en 24 horas.

**q. Concurrencia y consistencia**

Las mutaciones deberán protegerse contra actualizaciones perdidas.

Podrá utilizarse:

updated_at

o posteriormente:

version

para implementar **Optimistic Concurrency Control**.

Ejemplo conceptual:

Admin A reads version 7

Admin B reads version 7

Admin A

↓

update → version 8

Admin B

↓

tries update version 7

↓

409 Conflict

Esto será particularmente importante cuando existan administradores,
moderadores e ingesta automatizada modificando simultáneamente una
ficha.

**r. Eventos de dominio**

Formato conceptual:

{

\"eventId\": \"evt_123\",

\"eventType\": \"catalog.media.updated\",

\"occurredAt\": \"2026-09-24T15:00:00Z\",

\"aggregateId\": \"media_123\",

\"aggregateType\": \"MediaItem\",

\"version\": 8,

\"payload\": {

\"changedFields\": \[

\"synopsis\",

\"genres\"

\]

}

}

El evento deberá representar **un hecho ocurrido**, no una instrucción.

Por ello es preferible:

catalog.media.updated

a incluir dentro del evento:

action = CACHE_INVALIDATE

como hace el diseño original.

Los consumidores decidirán qué hacer con el hecho.

Por ejemplo:

catalog.media.updated

│

├── Cache → invalidate

├── Search → reindex

└── Analytics → record

Esto reduce el acoplamiento.

**s. Dependencias**

**Upstream**

**Discovery / Ingestion**

Puede proporcionar candidatos y actualizaciones normalizadas.

Discovery

↓

Ingestion

↓

Catalog

**Downstream**

**Search**

Consume datos del catálogo para construir un índice optimizado.

**Recommendations**

En fases posteriores podrá consumir metadatos del catálogo.

**Source Registry**

Referencia IDs canónicos de MediaItem o Episode para asociar Sources.

**Playback Orchestrator**

Puede validar la existencia y condición editorial del Playback Target.

**Dependencia eliminada**

El documento original establece:

Media Gateway / Proxy consulta la existencia del episode_id al
emitir/validar firmas de reproducción.

Esto deberá eliminarse.

La dependencia correcta será:

Player

↓

Playback Orchestrator

↓

Catalog / Source Registry

↓

Resolver

↓

Playback Session

↓

Gateway

El Gateway recibe una sesión ya autorizada.

No necesita convertirse en cliente del Catálogo para decidir si un
episodio existe.

**t. Observabilidad**

El Motor de Catálogo deberá emitir métricas sobre cuatro dimensiones.

**Tráfico**

catalog_requests_total

**Latencia**

catalog_request_duration_seconds

preferiblemente mediante histogramas que permitan calcular:

p50

p95

p99

**Caché**

catalog_cache_requests_total

catalog_cache_hits_total

catalog_cache_misses_total

**Base de datos**

catalog_db_query_duration_seconds

catalog_db_pool_active_connections

catalog_db_pool_waiting_requests

Además:

catalog_mutations_total

catalog_mutation_failures_total

catalog_ingestion_conflicts_total

**u. Logging**

Los logs deberán ser estructurados.

Ejemplo:

{

\"level\": \"info\",

\"timestamp\": \"\...\",

\"service\": \"catalog\",

\"requestId\": \"req_123\",

\"operation\": \"media.get\",

\"mediaId\": \"media_456\",

\"cache\": \"hit\",

\"durationMs\": 8

}

No deberán registrarse indiscriminadamente:

- tokens;

- cookies;

- credenciales;

- secretos;

- datos personales innecesarios.

**v. Tracing**

Cuando exista observabilidad distribuida, una consulta podrá
visualizarse conceptualmente como:

HTTP Request

│

├── BFF

│ │

│ └── Catalog

│ │

│ ├── Redis

│ └── PostgreSQL

│

└── Response

OpenTelemetry será una opción tecnológica válida, pero su despliegue
completo no constituye requisito para que el MVP pueda existir.

**w. Seguridad específica**

Las operaciones de lectura pública y las mutaciones administrativas
deberán tener políticas diferentes.

**Lecturas públicas**

Aplicar según corresponda:

- validación de parámetros;

- límites de tamaño;

- rate limiting;

- protección frente a consultas abusivas;

- paginación.

**Mutaciones**

Requerir:

Authentication

\+

Authorization

\+

Validation

\+

Audit

Los permisos deberán gestionarse mediante RBAC.

Ejemplo:

ADMIN

├── create

├── update

├── archive

└── manage structural metadata

MODERATOR

├── update selected metadata

└── correct catalog information

Las capacidades exactas se definirán mediante permisos, no únicamente
mediante comprobaciones dispersas de nombres de rol.

**x. Auditoría**

Las mutaciones administrativas relevantes deberán poder reconstruirse.

Modelo conceptual:

audit_log

│

├── actor_id

├── action

├── entity_type

├── entity_id

├── previous_version

├── resulting_version

├── timestamp

└── request_id

No es necesario almacenar copias completas de todos los objetos si una
estrategia de cambios estructurados resulta suficiente.

**y. Presupuesto de rendimiento**

Los valores originales:

p50 cache hit \< 5 ms

p95 cache miss \< 45 ms

p99 \< 120 ms

3.500 RPS / pod

0.5 vCPU

512 MB RAM

se conservarán únicamente como **hipótesis iniciales del documento
histórico**, no como garantías de arquitectura, ya que el documento no
proporciona benchmarks que demuestren esos valores.

Para la versión revisada:

  ----------------------------------------------------
  **Métrica**   **MVP**      **V1**
  ------------- ------------ -------------------------
  API latency   Medir        SLO por definir con
  p50           baseline     evidencia

  API latency   Medir        SLO por definir
  p95           baseline     

  API latency   Observar     SLO por definir
  p99                        

  Cache hit     Medir        Objetivo según workload
  ratio                      

  Throughput    Load test    Capacity target validado

  Error rate    Medir        SLO por definir

  DB latency    Medir        Alertas basadas en
                             baseline
  \----------------------------------------------------

La secuencia correcta será:

Implementar

↓

Instrumentar

↓

Benchmark

↓

Obtener baseline

↓

Definir SLO

↓

Load test

↓

Capacity planning

y no:

inventar 3.500 RPS

↓

convertirlo en requisito

**z. Testing**

El Motor de Catálogo deberá cubrir varias capas.

**Unit tests**

Principalmente:

- validaciones;

- reglas de dominio;

- normalización;

- slugs;

- estados;

- serialización;

- deduplicación;

- permisos.

No se fija un porcentaje universal de cobertura como sustituto de
calidad.

**Integration tests**

Deberán probar:

Catalog

↕

PostgreSQL

y, cuando corresponda:

Catalog

↕

Redis

Testcontainers es una opción adecuada si el stack seleccionado lo
permite.

**Contract tests**

Deberán garantizar que los contratos públicos no cambien
accidentalmente.

**Migration tests**

Especialmente importantes porque el catálogo será persistente.

**Load tests**

Deberán comenzar con escenarios realistas y crecer progresivamente.

En lugar de declarar desde el inicio una prueba obligatoria de 10.000
VUs, se definirá:

Baseline

↓

Expected Load

↓

Peak Load

↓

Stress

↓

Break Point

La cifra deberá surgir del capacity planning.

**aa. Riesgos y mitigaciones**

**Riesgo 1 --- Duplicación de contenidos**

**Causa:** múltiples procesos de ingesta detectan la misma obra.

**Mitigación:**

external IDs

\+

normalized titles

\+

deduplication

\+

unique constraints

\+

manual conflict resolution

**Riesgo 2 --- Cache Stampede**

**Causa:** expiración simultánea de contenido muy solicitado.

**Mitigaciones posibles:**

TTL jitter

Stale-While-Revalidate

request coalescing

locking selectivo

Singleflight podrá utilizarse donde resulte apropiado, pero no será
obligatorio para toda lectura.

**Riesgo 3 --- Divergencia entre catálogo e índice de búsqueda**

**Mitigación:**

domain events

\+

retry

\+

dead-letter handling

\+

periodic reconciliation

**Riesgo 4 --- Sobreutilización de JSONB**

metadata JSONB proporciona flexibilidad, pero no deberá convertirse en
un contenedor indiscriminado de información que realmente necesita:

- constraints;

- joins;

- índices específicos;

- integridad referencial.

Los campos con importancia estructural deberán promoverse
progresivamente a columnas o tablas normalizadas.

**Riesgo 5 --- Acoplamiento con proveedores externos**

Los identificadores externos deberán aislarse mediante:

media_external_ids

para impedir que la identidad interna dependa de un proveedor.

**Riesgo 6 --- Eliminación accidental**

Para contenido editorial importante podrá preferirse:

ARCHIVED

frente a eliminación física inmediata.

Las políticas exactas de hard delete deberán definirse según integridad,
privacidad y necesidades operativas.

**ab. Feature flags**

Se conservará el concepto de feature flags, pero solo cuando permitan
una transición operativa real.

Ejemplos:

catalog_redis_cache_enabled

catalog_search_projection_enabled

catalog_extended_metadata_enabled

No deberá crearse una feature flag para cada pequeña decisión de
implementación.

Cada flag introduce estado operacional adicional y deberá tener:

owner

purpose

default

creation_date

removal_condition

para evitar flags permanentes abandonadas.

**ac. MVP del Motor de Catálogo**

El MVP no necesita implementar toda esta arquitectura inmediatamente.

Su slice mínimo será:

PostgreSQL

media_items

seasons

episodes

genres / relaciones mínimas

external IDs básicos

más:

GET catalog

GET media detail

GET seasons

GET episodes

POST admin/media

PATCH admin/media

POST admin/season

POST admin/episode

y:

validation

RBAC básico

structured logging

basic metrics

El MVP **no necesita inicialmente**:

Elasticsearch

Meilisearch obligatorio

PostgreSQL replicas

PgBouncer obligatorio

GraphQL

multi-region

10.000 VUs

microservicio independiente

Redis L1 + L2 + CDN invalidation sofisticada

Redis podrá introducirse cuando el vertical slice o las mediciones lo
justifiquen.

**ad. Criterios de aceptación del Motor de Catálogo**

El motor podrá considerarse funcional para el MVP cuando sea posible
completar este flujo:

Administrador

│

▼

crea MediaItem

│

▼

crea Season

│

▼

crea Episode

│

▼

publica contenido

│

▼

Usuario consulta catálogo

│

▼

abre detalle

│

▼

consulta temporada

│

▼

selecciona episodio

│

▼

episode_id

│

▼

Playback Orchestrator

A partir de ese punto, termina la responsabilidad del Motor de Catálogo
y comienza el dominio de reproducción.

El criterio arquitectónico fundamental será:

**El catálogo debe poder existir y funcionar correctamente aunque no
exista ninguna Source reproducible asociada al contenido.**

Y, recíprocamente:

**Añadir, eliminar, degradar o sustituir una Source no debe requerir
modificar la identidad canónica del contenido.**

**ae. Decisiones abiertas / deuda técnica diferida**

Quedan deliberadamente abiertas:

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

**Resultado de esta intervención**

Con este cambio, el Catálogo deja de ser simplemente **"la base donde
guardamos películas, series, anime y episodios"** y se convierte en un
verdadero **bounded context de contenido audiovisual**.

Y hay una consecuencia arquitectónica muy importante:

ANTES

Episode

│

├── servidor 1

├── servidor 2

└── servidor 3

AHORA

CATALOG

│

Episode

│

episode_id

│

▼

SOURCE REGISTRY

┌─────┼─────┐

▼ ▼ ▼

Source Source Source

│

▼

PLAYBACK ORCHESTRATOR

│

▼

\...

Ese desacoplamiento es precisamente lo que necesitamos para que después
puedas tener **una, diez o cincuenta Sources**, cambiar proveedores,
introducir Discovery automático, medir salud, hacer fallback y
evolucionar el Resolver **sin contaminar el modelo canónico del
contenido**.

El siguiente bloque, **2. Motor de Fuentes y Adaptadores**, va a
requerir una intervención todavía mayor. En el original actualmente
concentra Source Registry + Resolver + Adapter Registry + parte del
Health Checker y, además, define explícitamente resolución de JavaScript
ofuscado, bypass de cookies/tokens/CAPTCHA, proxies residenciales y
workers headless. Ahí tendremos que hacer una separación quirúrgica:
**Source Registry → Source Resolver → Adapter Registry → Playable
Representation**, conservar lo bueno del Strategy + Factory, caché de
resoluciones, observabilidad y failover, y sacar responsabilidades que
ya pertenecen al Orchestrator, Health Checker o Gateway.

Sí, aquí voy a volver al nivel de exhaustividad del bloque anterior. Este motor merece bastante detalle porque es uno de los tres núcleos técnicos de toda la plataforma.

En el documento original, el **Motor de Fuentes y Adaptadores** ya tiene ideas muy buenas: Strategy + Factory, `source_adapters`, logs de extracción, resolución bajo demanda, Redis con TTL dependiente de expiración, singleflight, métricas por adapter, pruebas con fixtures y live integration tests. Pero también concentra responsabilidades que ahora sabemos que pertenecen a otros dominios: inventario de Sources, resolución, salud, fallback e incluso parte de la lógica que luego vuelve a aparecer en Media Gateway. Además, el diseño original incluye mecanismos de evasión de CAPTCHA/anti-bot, proxies residenciales y una ADR de IA/OCR para CAPTCHA que no necesitamos como requisito arquitectónico.

La intervención será, por tanto, grande.
