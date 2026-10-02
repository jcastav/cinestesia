## 6.40. Search, Discovery & Recommendations

### a. Propósito general

Este dominio permite al usuario **encontrar y descubrir contenido** dentro del catálogo.

Lo dividiremos conceptualmente en: 

```text
DISCOVERY DOMAIN
│
├── Search
│   ├── Query Processing
│   ├── Full-Text Search
│   ├── Fuzzy Matching
│   ├── Filtering
│   ├── Faceting
│   └── Search Ranking
│
├── Browse / Discovery
│   ├── Trending
│   ├── Popular
│   ├── Recent
│   ├── Genre / Category
│   └── Editorial Collections
│
└── Recommendations
    ├── Similar Content
    ├── Personalized Feed
    ├── Because You Watched
    └── Recommendation Ranking
```

La regla fundamental será:

> **Search responde a una intención explícita del usuario; Recommendations intenta anticipar contenido relevante sin una consulta explícita.**

---

### b. Tres problemas diferentes

Tenemos realmente:

### Search

El usuario sabe aproximadamente qué busca:

```text
"blade runner"
```

y queremos encontrarlo.

### Browse / Discovery

El usuario explora:

```text
Películas
Thrillers
Estrenos
Más vistos
Documentales
```

### Recommendations

El sistema intenta responder:

```text
¿Qué podría interesarle a este usuario?
```

No mezclaremos estos tres conceptos aunque puedan compartir infraestructura.

---

### c. Responsabilidad de Search

Search será responsable de:

> **Transformar una consulta del usuario y sus filtros en un conjunto ordenado de entidades del catálogo.**

Incluye:

```text
query parsing
normalization
full-text matching
fuzzy matching
aliases
filters
facets
ranking
pagination
```

No incluye:

```text
source selection
source health
playback
personal authentication
content ingestion
```

---

### d. Search no es Catalog

Otra separación fundamental:

```text
Catalog
   =
source of truth
```

mientras:

```text
Search Index
   =
read-optimized projection
```

Por tanto:

> **El índice de búsqueda nunca será la fuente canónica del contenido.**

Si desaparece:

```text
Search Index
```

podemos reconstruirlo desde:

```text
Catalog
```

---

### e. Search Document

El documento original utiliza `animes_index` con campos como título canónico, japonés, títulos alternativos, sinopsis, géneros, año, popularidad y rating.

Generalizaremos esa idea:

```json
{
  "id": "media_123",

  "mediaType": "movie",

  "title": "Blade Runner",

  "alternateTitles": [
    "Blade Runner: The Director's Cut"
  ],

  "synopsis": "...",

  "genres": [
    "science-fiction",
    "thriller"
  ],

  "releaseYear": 1982,

  "productionStatus": "RELEASED",

  "popularityScore": 0.82,

  "updatedAt": "..."
}
```

No llamaremos al índice:

```text
animes_index
```

sino, conceptualmente:

```text
media_search_index
```

---

### f. Qué NO debe entrar al índice público

Search no necesita:

```text
source URLs
provider credentials
gateway tokens
playback manifests
passwords
private user data
```

El documento de Search será una **proyección de descubrimiento del Catalog**, no un dump de toda PostgreSQL.

---

### g. Index Projection

Formalizaremos:

```text
Catalog MediaItem
       │
       ▼
Search Projection Builder
       │
       ▼
SearchDocument
       │
       ▼
Search Index
```

El Projection Builder decide qué información es indexable.

---

### h. Flujo de indexación

```text
Catalog mutation
      │
      ▼
media.created
media.updated
media.published
media.archived
      │
      ▼
Search Projection
      │
      ▼
Index Upsert/Delete
```

Así evitamos que Search tenga que inspeccionar periódicamente toda la base para descubrir cambios.

---

### i. Consistencia eventual

El índice será:

```text
eventually consistent
```

respecto al catálogo.

Ejemplo:

```text
12:00:00 Catalog updated
12:00:01 Search projection updated
```

es aceptable.

Lo importante será medir:

```text
search_index_sync_lag
```

---

### j. Reconciliación

El documento original propone una reconstrucción completa nocturna para corregir inconsistencias.

Conservaremos la idea de reconciliación, pero no dependeremos de ella como mecanismo normal.

Tendremos:

```text
incremental synchronization
        +
periodic reconciliation
        +
full rebuild capability
```

---

### k. Full Rebuild

Debe ser posible ejecutar:

```text
Catalog
   │
   ▼
all published MediaItems
   │
   ▼
new Search Index
```

y posteriormente realizar un:

```text
alias/index swap
```

si el motor elegido lo permite.

Esto permite reconstruir Search sin interrumpir necesariamente consultas.

---

### l. Search API

Generalizamos la API original:

```http
GET /v1/search
```

Ejemplo:

```text
?q=blade+runner
&type=movie
&genres=science-fiction
&year=1982
&page=1
&limit=20
```

Respuesta:

```json
{
  "items": [
    {
      "id": "media_123",
      "title": "Blade Runner",
      "mediaType": "movie",
      "posterUrl": "...",
      "releaseYear": 1982
    }
  ],

  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

---

### m. Search Result DTO

Search devuelve:

```text
SearchResult
```

no el `MediaItem` completo.

Puede contener:

```text
id
title
poster
mediaType
releaseYear
short metadata
```

El detalle completo sigue siendo responsabilidad de:

```text
Catalog API
```

---

### n. Match Score

El original expone:

```text
match_score
```

al frontend.

No lo estableceremos como contrato público obligatorio.

Los scores internos de motores diferentes:

```text
PostgreSQL
Meilisearch
Typesense
Elasticsearch
vector search
```

no necesariamente son comparables.

Mejor:

```text
Search ranks results
```

y el score interno permanece interno salvo una necesidad concreta.

---

### o. Query Processing

Antes de consultar:

```text
raw query
   │
   ▼
normalization
   │
   ▼
validated SearchQuery
```

Podremos normalizar:

```text
whitespace
Unicode
case
supported punctuation
```

sin destruir significado.

---

### p. Alternate Titles

Aquí la arquitectura audiovisual general se beneficia mucho.

Un contenido puede tener:

```text
canonical title
original title
localized titles
alternate titles
aliases
```

Ejemplo:

```text
La casa de papel
Money Heist
```

Search deberá poder indexar esas variantes.

---

### q. Idiomas

No utilizaremos campos rígidos como:

```text
title_japanese
title_spanish
title_english
```

como única solución.

Conceptualmente:

```text
LocalizedTitle
│
├── language
├── script
├── title
└── type
```

Ejemplo:

```json
{
  "language": "ja",
  "script": "Jpan",
  "title": "..."
}
```

Esto escala mejor a un catálogo audiovisual general.

---

### r. Fuzzy Search

Conservamos la capacidad original:

```text
kimetsu
kimetsuu
kimetsu no yaiba
```

pueden encontrar resultados relacionados.

Pero:

> **Fuzzy matching es una herramienta de recuperación, no el algoritmo completo de relevancia.**

Una tolerancia excesiva puede producir resultados absurdos.

---

### s. Search Ranking

Ranking podrá combinar:

```text
text relevance
exact-title match
prefix match
alternate-title match
popularity
recency
editorial signals
```

Por ejemplo conceptualmente:

```text
candidate retrieval
        │
        ▼
ranking
        │
        ▼
ordered results
```

No fijaremos una fórmula mágica desde ahora.

---

### t. Exact Match Boost

Una búsqueda:

```text
Oldboy
```

debería favorecer fuertemente un título exacto `Oldboy` frente a contenido cuya sinopsis simplemente mencione esa palabra.

Por tanto, tendremos señales diferenciadas:

```text
exact title
alternate title
prefix
description
```

---

### u. Search Filters

Baseline:

```text
media type
genre
release year
production status
```

Posteriormente:

```text
country
language
runtime
age classification
```

si Catalog los soporta.

Search no inventa filtros cuyos datos no existan canónicamente.

---

### v. Facets

Las facetas permiten:

```text
Science Fiction (143)
Drama (82)
Thriller (67)
```

para el conjunto de resultados.

Son una capacidad del Search Engine, no necesariamente una tabla adicional.

---

### w. Pagination

Para consultas normales:

```text
page / limit
```

puede ser suficiente.

Para datasets muy grandes podremos evaluar:

```text
cursor pagination
```

según capacidades del motor.

No optimizaremos prematuramente.

---

### x. Empty Query

Debemos definir qué significa:

```text
GET /search?q=
```

Probablemente Search no debería transformarse accidentalmente en:

```text
SELECT all catalog
```

Puede:

```text
reject
```

o redirigir conceptualmente a:

```text
Browse
```

según UX.

---

### y. Search Safety

El original menciona escapar operadores especiales para prevenir consultas abusivas.

Lo reformulamos:

> **Nunca concatenar la consulta del usuario directamente a la sintaxis nativa del Search Engine.**

Usaremos:

```text
structured query builder
```

con:

```text
length limits
filter allowlists
complexity limits
timeouts
pagination limits
```

---

### z. Search Abuse

Ejemplos:

```text
10 MB query
extreme wildcard expansion
pathological regex
thousands of filters
huge page size
```

deberán rechazarse antes de alcanzar el motor.

---

### aa. Search Cache

El original fija 15 minutos de Redis para búsquedas frecuentes.

No lo convertiremos en requisito.

Primero mediremos:

```text
query repetition
search latency
index capacity
```

y solo cachearemos donde aporte valor.

---

### ab. Cache Key

Si existe:

```text
search:{queryHash}:{filterHash}:{page}
```

deberá incluir todas las dimensiones que alteran el resultado.

Y:

```text
normalized query
```

para evitar claves equivalentes innecesarias.

---

### ac. Search Cache Invalidation

Dos estrategias:

```text
short TTL
```

o:

```text
index version
```

pueden ser más simples que invalidar cada consulta afectada cuando cambia un título.

---

### ad. ¿Necesitamos Meilisearch/Typesense/Elasticsearch en MVP?

Aquí cambiaría bastante el documento original.

No.

No obligatoriamente.

Podemos empezar con:

```text
PostgreSQL
├── Full Text Search
└── pg_trgm
```

si el tamaño inicial del catálogo y carga lo permiten.

---

### ae. Search MVP

Topología:

```text
Client
  │
  ▼
Search API
  │
  ▼
PostgreSQL
  │
  ├── FTS
  └── pg_trgm
```

Ventajas:

```text
one datastore
no index synchronization
simpler deployment
simpler backups
lower operational burden
```

Para un desarrollador solo, esto importa muchísimo.

---

### af. Dedicated Search Engine

Cuando aparezcan necesidades como:

```text
large catalog
high QPS
advanced typo tolerance
complex facets
ranking experimentation
multilingual search
operational isolation
```

podemos extraer:

```text
Search API
    │
    ▼
Meilisearch / Typesense / Elasticsearch / other
```

---

### ag. Search Engine como detalle de implementación

Por tanto:

> **La arquitectura define una abstracción Search Index; no fija todavía un producto concreto.**

Esto evita diseñar todo alrededor de:

```text
Elasticsearch
```

antes de necesitar Elasticsearch.

---

### ah. Search Provider Interface

Conceptualmente:

```text
SearchProvider
│
├── search(query)
├── index(document)
├── delete(id)
└── health()
```

El MVP puede implementar:

```text
PostgresSearchProvider
```

y después:

```text
DedicatedSearchProvider
```

sin alterar el contrato público.

---

### ai. Fallback a PostgreSQL

El original plantea que, si Meilisearch/Typesense tarda más de 150 ms, se ejecute automáticamente `pg_trgm/ILIKE`.

La idea es atractiva, pero hay un problema:

```text
Search Engine result semantics
≠
PostgreSQL fallback semantics
```

Podrían cambiar:

```text
ranking
facets
pagination
typo tolerance
```

durante una misma experiencia.

---

### aj. Fallback Policy

Si posteriormente usamos motor dedicado, decidiremos explícitamente:

```text
Search unavailable
      │
      ├── degraded PostgreSQL search
      └── temporary unavailable response
```

según producto.

Si usamos fallback, la respuesta podrá indicar internamente:

```text
searchMode = DEGRADED
```

para observabilidad.

---

### ak. Search Health

Mediremos:

```text
availability
query latency
error rate
index lag
zero-result rate
```

No consideraremos:

```text
zero results
```

automáticamente un error técnico.

Puede significar simplemente que el catálogo no contiene lo solicitado.

---

### al. Zero Result Queries

Son muy valiosas.

Podemos analizar:

```text
frequent zero-result queries
```

para detectar:

```text
missing aliases
catalog gaps
spelling patterns
content demand
```

El documento original ya identifica correctamente esta métrica.

---

### am. Search Analytics y privacidad

El original guarda `query_string` completa en logs analíticos.

Debemos separar:

```text
operational logs
```

de:

```text
search analytics
```

Las consultas pueden contener datos inesperadamente sensibles escritos por el usuario.

Por eso:

```text
query retention
sampling
access
analytics purpose
```

deben definirse conscientemente.

No enviaremos cada query completa indefinidamente a logs generales.

---

### an. Browse / Discovery

Ahora añadimos una frontera que el original deja implícita.

Browse responde consultas como:

```text
latest movies
popular series
documentaries
action
2026 releases
```

sin que el usuario escriba una búsqueda textual.

---

### ao. Browse API

Conceptualmente:

```http
GET /v1/discovery/trending
GET /v1/discovery/popular
GET /v1/discovery/recent
GET /v1/discovery/genres/{genre}
```

No necesariamente serán esos endpoints exactos.

---

### ap. Trending ≠ Popular

Muy importante:

```text
Popular
```

puede representar actividad acumulada.

```text
Trending
```

representa crecimiento/actividad reciente.

Ejemplo:

```text
Content A:
100,000 historical views
1,000 this week

Content B:
20,000 historical views
15,000 this week
```

B podría estar:

```text
more trending
```

aunque A sea más popular históricamente.

---

### aq. Popularity Signals

Podremos utilizar:

```text
playback starts
successful playback
completions
favorites
search clicks
detail views
```

pero no todas las señales tienen el mismo valor.

Y debemos protegernos de:

```text
bots
repeated refresh
abuse
```

antes de convertir contadores crudos en ranking.

---

### ar. Trending Window

Conceptualmente:

```text
activity over recent window
+
decay
```

No fijaremos todavía:

```text
7 days
```

como verdad arquitectónica.

---

### as. Editorial Collections

Discovery también puede tener:

```text
Staff Picks
Halloween
Cine coreano
Ganadoras del Oscar
```

creadas editorialmente.

Esto no es Recommendation ML.

Es:

```text
Editorial Discovery
```

y puede resultar extremadamente útil incluso con cero algoritmos avanzados.

---

### at. Recommendation Engine

Ahora sí, dominio separado.

Su responsabilidad:

> **Generar candidatos de contenido potencialmente relevantes para un contexto y ordenarlos según una estrategia de recomendación.**

Flujo general:

```text
Context
   │
   ▼
Candidate Generation
   │
   ▼
Filtering
   │
   ▼
Ranking
   │
   ▼
Recommendation List
```

---

### au. Recommendation Context

Puede incluir:

```text
current MediaItem
userId if authenticated
recent history
library
language
surface
```

pero solo los datos necesarios.

No enviamos todo el perfil automáticamente.

---

### av. Recomendaciones anónimas

El motor debe funcionar sin cuenta.

Para visitante:

```text
popular
trending
editorial
similar content
```

son suficientes.

Por tanto:

```text
Recommendations
≠
requires authentication
```

---

### aw. Recomendaciones personalizadas

Para usuario autenticado:

```text
Playback History
Favorites
Library
        │
        ▼
Recommendation Signals
```

pueden mejorar los resultados.

Pero el sistema debe degradar correctamente cuando no existan datos.

---

### ax. Cold Start — usuario

Usuario nuevo:

```text
history = empty
favorites = empty
```

No significa:

```text
recommendations = empty
```

Fallback:

```text
popular
trending
editorial
contextual
```

---

### ay. Cold Start — contenido

Un MediaItem nuevo tampoco tendrá interacciones.

Podemos utilizar:

```text
genres
keywords
credits
language
year
editorial relationships
metadata similarity
```

si esos datos existen.

---

### az. Candidate Generation

Podemos tener varias estrategias:

```text
PopularCandidateGenerator
TrendingCandidateGenerator
SimilarContentGenerator
HistoryBasedGenerator
EditorialCandidateGenerator
```

Todas producen:

```text
Candidate[]
```

---

### ba. Candidate

Conceptualmente:

```json
{
  "mediaItemId": "media_123",
  "reason": "SIMILAR_CONTENT",
  "signals": {
    "metadataSimilarity": 0.81
  }
}
```

Los detalles internos no necesariamente llegan al frontend.

---

### bb. Candidate Filtering

Antes del ranking eliminamos:

```text
unpublished content
archived content
duplicate candidates
blocked content
incompatible policy items
```

y opcionalmente:

```text
already completed content
```

según la superficie.

---

### bc. Ranking

Después:

```text
Candidate Set
      │
      ▼
Recommendation Ranker
      │
      ▼
ordered list
```

El Ranker podrá combinar:

```text
similarity
popularity
freshness
user affinity
editorial boost
diversity
```

sin que la API dependa de la fórmula.

---

### bd. Diversity

Un ranking puramente por similitud podría devolver:

```text
10 películas prácticamente iguales
```

Por eso posteriormente podremos introducir:

```text
diversity / deduplication
```

para equilibrar:

```text
relevance
vs
variety
```

---

### be. Recommendation Reasons

Para UX podemos devolver razones normalizadas:

```text
BECAUSE_YOU_WATCHED
SIMILAR_TO
TRENDING
POPULAR
NEW_RELEASE
EDITORIAL
```

No necesariamente expondremos la lógica matemática.

---

### bf. API de recomendaciones

Conceptualmente:

```http
GET /v1/recommendations
```

o por superficie:

```http
GET /v1/recommendations/home
GET /v1/media/{id}/similar
```

Respuesta:

```json
{
  "items": [
    {
      "mediaItemId": "media_123",
      "reason": "SIMILAR_TO"
    }
  ]
}
```

El frontend puede hidratar metadata o recibir una proyección ya enriquecida.

---

### bg. “Porque viste X”

El original contempla esta funcionalidad.

Formalmente:

```text
User watched X
       │
       ▼
Contextual Recommendation
       │
       ▼
Candidates similar to X
```

No necesitamos collaborative filtering para lograr una primera versión útil.

---

### bh. Collaborative Filtering

Lo clasificaremos:

```text
V1+/Evolutive
```

porque requiere suficiente interacción.

Con pocos usuarios:

```text
collaborative signal
```

puede ser extremadamente débil.

No construiremos una matriz sofisticada para veinte usuarios.

---

### bi. Content-Based Recommendations

Para primeras fases son mucho más prácticas:

```text
Media A
 │
 ├── genres
 ├── keywords
 ├── year
 ├── people
 └── metadata
       │
       ▼
similarity
       │
       ▼
Media B/C/D
```

---

### bj. Vector Embeddings

El original propone Pgvector posteriormente para búsquedas semánticas.

Lo mantenemos como ADR futura.

Embeddings podrían utilizarse en dos problemas distintos:

```text
semantic search
```

y:

```text
content similarity / recommendations
```

No son lo mismo aunque compartan vectores.

---

### bk. Vector Search no reemplaza Lexical Search

Una búsqueda:

```text
"Oldboy 2003"
```

es extraordinariamente adecuada para matching lexical/exacto.

No necesitamos embedding para todo.

Arquitectura futura:

```text
Lexical Retrieval
       +
Vector Retrieval
       │
       ▼
Hybrid Ranking
```

si datos reales justifican la complejidad.

---

### bl. Semantic Query

Para algo como:

```text
"películas melancólicas sobre soledad en una gran ciudad"
```

vector retrieval podría aportar valor.

Pero será:

```text
enhancement
```

no requisito del MVP.

---

### bm. Recommendation Feedback

Posteriormente podemos aprender de:

```text
impression
click
detail opened
playback started
playback completed
favorite
dismiss
```

pero debemos distinguir:

```text
shown
```

de:

```text
engaged
```

Si nunca registramos impresiones, no podemos interpretar correctamente los clicks.

---

### bn. Recommendation Impression

Conceptualmente:

```text
recommendation list generated
       │
       ▼
actually rendered
       │
       ▼
impression event
```

No contaremos como impresión algo generado server-side pero nunca mostrado.

---

### bo. Feedback Loop

```text
Recommendations
      │
      ▼
Impressions
      │
      ▼
Interactions
      │
      ▼
Analytics
      │
      ▼
Future Ranking
```

No necesariamente en tiempo real.

---

### bp. Evitar feedback loops peligrosos

Si recomendamos solo lo popular:

```text
popular
  ↓
more exposure
  ↓
more clicks
  ↓
even more popular
```

creamos un ciclo auto-reforzado.

Posteriormente podremos introducir:

```text
exploration
diversity
freshness
editorial balancing
```

---

### bq. Recommendation Store

No asumiremos una base especial inicialmente.

Para MVP:

```text
PostgreSQL
+
computed queries
```

puede bastar.

Después:

```text
precomputed recommendation sets
Redis
vector index
analytics warehouse
```

si hace falta.

---

### br. Precomputation

Algunas recomendaciones pueden calcularse offline:

```text
similar media
popular
trending
```

y almacenarse temporalmente.

No necesitamos recalcular todo para cada request.

---

### bs. Online vs Offline

Arquitectura futura:

```text
OFFLINE
Catalog + Events
      │
      ▼
Candidate/Feature Computation
      │
      ▼
Precomputed Data

ONLINE
Request
  │
  ▼
retrieve candidates
  │
  ▼
contextual ranking
  │
  ▼
response
```

Pero no construimos un feature store de ML en MVP.

---

### bt. Search vs Recommendation Data

Pueden compartir:

```text
Catalog metadata
popularity signals
embeddings
```

pero no deben compartir necesariamente:

```text
ranking implementation
```

Search Ranking responde:

```text
"¿qué coincide con mi consulta?"
```

Recommendation Ranking responde:

```text
"¿qué debería mostrarle?"
```

---

### bu. Search Click Analytics

Podremos registrar:

```text
SEARCH_RESULT_IMPRESSION
SEARCH_RESULT_CLICKED
SEARCH_ZERO_RESULTS
```

con cuidado de privacidad.

Esto permite medir relevancia real.

---

### bv. Recommendation Analytics

```text
RECOMMENDATION_IMPRESSION
RECOMMENDATION_CLICKED
RECOMMENDATION_PLAYBACK_STARTED
RECOMMENDATION_DISMISSED
```

No mezclaremos estas métricas con Search.

---

### bw. Search Quality Metrics

En lugar de solo:

```text
latency
```

necesitamos calidad.

Ejemplos:

```text
Zero Result Rate
Click-Through Rate
Successful Search Rate
MRR
Recall@K
NDCG@K
```

según madurez.

---

### bx. Recommendation Quality Metrics

Separadas:

```text
Recommendation CTR
Playback Start Rate
Completion Rate after Recommendation
Coverage
Diversity
Novelty
```

No existe una única métrica perfecta.

---

### by. El Top-3 >95 % original

El documento exige que títulos principales aparezcan entre los primeros tres para más del 95 % de 100 queries.

La idea de un benchmark es excelente.

El número no será SLO universal todavía.

Conservaremos:

```text
Search Relevance Benchmark
```

con dataset versionado:

```text
query
expected relevant items
importance
language
query type
```

---

### bz. Golden Query Set

Ejemplo:

```text
"blade runner"
→ Blade Runner

"blade runer"
→ Blade Runner

"peliculas de batman"
→ relevant Batman titles

"title alternate"
→ canonical media
```

Cada cambio del ranking se prueba contra este conjunto.

---

### ca. Search Regression Testing

Si modificamos:

```text
ranking weights
tokenization
fuzzy settings
synonyms
```

ejecutamos:

```text
old benchmark
vs
new benchmark
```

para detectar regresiones.

---

### cb. Recommendation Offline Evaluation

Cuando exista suficiente información:

```text
historical interactions
       │
       ▼
train/test split
       │
       ▼
evaluate ranking
```

pero esto pertenece a una fase de madurez posterior.

---

### cc. Search Latency

Los valores originales:

```text
p50 <10 ms
p95 <35 ms
2500 RPS/node
```

quedan como hipótesis históricas, no contratos definitivos.

Mediremos:

```text
p50
p95
p99
error rate
throughput
```

y fijaremos SLO a partir del deployment real.

---

### cd. Index Lag

Sí conservaremos como métrica de primera clase:

```text
search_index_sync_lag_seconds
```

cuando exista índice separado.

Si Search usa directamente PostgreSQL:

```text
index sync lag
```

prácticamente deja de ser un problema arquitectónico separado.

Esa es otra ventaja del MVP simple.

---

### ce. Search Tracing

Trace conceptual:

```text
HTTP Search Request
       │
       ▼
Query Validation
       │
       ▼
Query Normalization
       │
       ▼
Search Provider
       │
       ▼
Ranking
       │
       ▼
Response Mapping
```

---

### cf. Recommendation Tracing

```text
Recommendation Request
       │
       ▼
Context Build
       │
       ▼
Candidate Generation
       │
       ▼
Filtering
       │
       ▼
Ranking
       │
       ▼
Response
```

Esto permite saber qué etapa es lenta.

---

### cg. Low-cardinality Metrics

Correcto:

```text
search_requests_total{
  result="success"
}
```

Incorrecto:

```text
search_requests_total{
  query="peliculas de ciencia ficción..."
}
```

Las consultas nunca deben convertirse en labels de Prometheus.

---

### ch. Feature Flags

Search:

```text
search_fuzzy_enabled
search_dedicated_engine_enabled
search_semantic_enabled
```

Recommendations:

```text
recommendations_enabled
recommendations_personalized_enabled
recommendations_collaborative_enabled
recommendations_vector_similarity_enabled
```

Discovery:

```text
discovery_trending_enabled
discovery_editorial_enabled
```

---

### ci. Search Engine Migration

Si pasamos:

```text
PostgreSQL
    ↓
Meilisearch
```

la migración debería ser:

```text
build index
     │
     ▼
shadow queries / validation
     │
     ▼
compare
     │
     ▼
enable gradually
```

No:

```text
Friday 18:00
switch everything
```

---

### cj. Shadow Search

Podemos enviar temporalmente:

```text
user request
    │
    ├── PostgreSQL → response
    │
    └── New Search Engine → measurement only
```

y comparar:

```text
latency
result overlap
ranking
errors
```

sin afectar al usuario.

Fase futura, pero arquitectónicamente elegante.

---

### ck. Failure Modes

Search puede sufrir:

```text
SearchProviderUnavailable
SearchTimeout
InvalidQuery
IndexNotReady
IndexStale
```

Recommendations:

```text
RecommendationUnavailable
InsufficientSignals
RankingFailure
```

Estos estados no son equivalentes.

---

### cl. Recommendation Fail-open

Si Recommendations falla:

```text
personalized recommendations
          X
          │
          ▼
popular / editorial / recent
```

La home no debería quedar vacía porque falló un algoritmo personalizado.

---

### cm. Search Failure

Search tiene menos posibilidades de fail-open silencioso porque el usuario pidió algo explícitamente.

Podemos ofrecer:

```text
degraded search
```

si existe.

Si no:

```text
temporary search unavailable
```

es más honesto que devolver resultados aleatorios.

---

### cn. Search Security

Controles:

```text
query length limit
page-size limit
filter allowlist
structured query building
timeout
rate limiting
resource limits
```

---

### co. Recommendation Security

Especial cuidado con:

```text
userId
```

El cliente no debe poder pedir arbitrariamente:

```text
/recommendations?userId=OTHER_PERSON
```

y obtener inferencias de otro usuario.

El backend deriva:

```text
userId
```

del `AuthContext`.

---

### cp. Privacy

Recommendation Engine no recibe automáticamente:

```text
email
password
IP
auth tokens
```

Recibe señales relevantes:

```text
userId/pseudonymous internal ID
history features
library signals
```

según necesidad.

---

### cq. Right to Delete / Account Deletion

Si User Domain elimina/anonymiza una cuenta, los sistemas derivados deberán tener estrategia para:

```text
recommendation features
analytics events
cached recommendations
```

No basta con borrar `users`.

Esto conecta con nuestra ADR de retención.

---

### cr. Arquitectura MVP

Yo la dejaría así:

```text
                    CLIENT
                      │
             ┌────────┴────────┐
             │                 │
             ▼                 ▼
          SEARCH            DISCOVERY
             │                 │
             └────────┬────────┘
                      ▼
                  CORE API
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
     Search Module          Discovery Module
          │                       │
          └───────────┬───────────┘
                      ▼
                  PostgreSQL
                      │
             ┌────────┴────────┐
             ▼                 ▼
             FTS            pg_trgm
```

Y Recommendations MVP:

```text
Catalog Metadata
       +
Basic Popularity
       +
Current Media Context
       │
       ▼
Basic Recommendation Module
       │
       ▼
Popular / Similar / Recent
```

Eso es muchísimo más razonable inicialmente que desplegar Elasticsearch + vector DB + collaborative filtering.

---

### cs. Arquitectura V1+

Cuando crezca:

```text
                     CATALOG
                        │
                        ▼
                Domain Events / Outbox
                        │
             ┌──────────┴──────────┐
             │                     │
             ▼                     ▼
      Search Projection     Recommendation Data
             │                     │
             ▼                     ▼
       Search Index         Candidate Stores
             │                     │
             ▼                     ▼
        Search API        Recommendation Engine
             │                     │
             └──────────┬──────────┘
                        ▼
                      CLIENT
```

---

### ct. Arquitectura avanzada futura

Solo si los datos lo justifican:

```text
                       CATALOG
                          │
                ┌─────────┴─────────┐
                │                   │
                ▼                   ▼
         Lexical Index        Vector Index
                │                   │
                └─────────┬─────────┘
                          ▼
                    Hybrid Search


User Interactions
       │
       ▼
Analytics Pipeline
       │
       ▼
Feature Computation
       │
       ▼
Candidate Generation
       │
       ▼
Recommendation Ranker
       │
       ▼
Personalized Feed
```

---

### cu. MVP exacto

### Search

Implementaremos:

```text
title search
alternate-title search
basic fuzzy matching
media-type filter
genre filter
year filter
pagination
```

con PostgreSQL cuando sea suficiente.

### Browse

```text
recent
genre
basic popular
```

### Recommendations

```text
similar by metadata
popular
recent
```

Personalización avanzada:

```text
NOT MVP
```

---

### cv. Criterios de aceptación — Search

Search MVP estará listo cuando:

1. un título exacto pueda encontrarse;
2. títulos alternativos puedan encontrarse;
3. errores ortográficos razonables puedan recuperarse;
4. puedan aplicarse filtros;
5. solo contenido publicable aparezca;
6. paginación sea determinista;
7. consultas inválidas sean rechazadas;
8. una query no pueda generar trabajo ilimitado;
9. Search no dependa de Sources;
10. Search no modifique Catalog;
11. exista benchmark de relevancia;
12. se mida latencia y zero-result rate.

---

### cw. Criterios de aceptación — Discovery

1. puedan listarse contenidos recientes;
2. pueda explorarse por género/categoría;
3. exista al menos una definición explícita de popularidad;
4. contenido archivado/no publicado sea excluido;
5. las consultas sean reproducibles y paginables cuando corresponda.

---

### cx. Criterios de aceptación — Recommendations

1. funcionen sin usuario autenticado;
2. exista fallback cuando no haya historial;
3. pueda obtenerse contenido similar;
4. no recomiende contenido no publicable;
5. elimine duplicados;
6. no necesite consultar Source URLs;
7. una caída de Recommendations no impida Search ni Playback;
8. las recomendaciones puedan atribuirse a una estrategia interna;
9. se puedan medir impresiones e interacciones cuando esa telemetría se habilite.

---

### cy. No MVP

No pondría inicialmente:

```text
Elasticsearch cluster
vector search
embeddings
collaborative filtering
real-time ML ranking
feature store
online learning
complex personalization
multi-armed bandits
GPU inference
```

Nada de eso es necesario para demostrar el producto.

---

### cz. ADRs abiertas

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

### da. Arquitectura consolidada del Motor 7

```text
                         DISCOVERY DOMAIN
                                │
           ┌────────────────────┼────────────────────┐
           │                    │                    │
           ▼                    ▼                    ▼
        SEARCH               BROWSE          RECOMMENDATIONS
           │                    │                    │
           ▼                    ▼                    ▼
 Query Processing        Discovery Queries    Context Builder
           │                    │                    │
           ▼                    │                    ▼
 Candidate Retrieval            │           Candidate Generation
           │                    │                    │
           ▼                    │                    ▼
 Search Ranking                 │                Filtering
           │                    │                    │
           ▼                    │                    ▼
 Search Results                 │                 Ranking
           │                    │                    │
           └─────────────┬──────┴──────────────┬────┘
                         │                     │
                         ▼                     ▼
                      CLIENT               CLIENT


                         ▲
                         │
                  Catalog Metadata
                         │
                  ┌──────┴───────┐
                  │              │
             PostgreSQL      Search Index
               MVP           when needed
```

### Reglas maestras del Motor 7

Yo pondría estas siete:

> **1. Catalog es la fuente de verdad; Search Index es una proyección reconstruible.**

> **2. Search, Browse y Recommendations pertenecen al mismo dominio de descubrimiento, pero resuelven problemas distintos.**

> **3. Search Ranking y Recommendation Ranking no son el mismo algoritmo.**

> **4. Recommendations deben funcionar también sin identidad ni historial del usuario.**

> **5. Vector Search y embeddings son optimizaciones/capacidades futuras, no sustitutos obligatorios de búsqueda lexical.**

> **6. El MVP comienza con la infraestructura mínima que satisfaga relevancia y rendimiento; PostgreSQL FTS + `pg_trgm` es una opción válida antes de introducir un Search Engine dedicado.**

> **7. La calidad de Search/Recommendations se mide tanto como su latencia; responder en 10 ms con resultados irrelevantes no constituye un buen sistema.**

Con esto solucionamos además una inconsistencia que empezaba a propagarse por todo el documento: ya no tenemos un **“motor de recomendaciones que consume directamente `bookmarks` y `watch_history` del Motor de Usuarios”**, como decía el original.  Ahora tenemos fronteras mucho más limpias:

```text
User Domain
    │
    │ authorized interaction signals
    ▼
Recommendation Engine

Catalog
    │
    ├──────────────► Search
    ├──────────────► Browse
    └──────────────► Recommendations
```

Y fíjate en algo interesante: con los motores que llevamos corregidos ya empieza a aparecer una arquitectura bastante coherente sin que la hayamos forzado a ser de microservicios:

```text
                           WEB CLIENT
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
      SEARCH                CATALOG               USER
         │                     │                     │
         └─────────────┬───────┴──────────┬──────────┘
                       │                  │
                       ▼                  ▼
                 CORE API          PLAYBACK ORCHESTRATOR
                                          │
                                          ▼
                                   SOURCE REGISTRY
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
                              ┌───────────┴───────────┐
                              ▼                       ▼
                         AD MANAGER           MEDIA PLAYER CORE
                                                      │
                                                      ▼
                                                   USER
```

Y ahora viene el **Motor 8: Health Checker / Reporte de Fuentes**. Ahí tenemos que ser especialmente cuidadosos porque el documento original le da demasiada autoridad: dice que verifica URLs externas, marca fuentes `dead`, **reordena prioridades de reproducción**, solicita reextracción y habla de “autorreparación”.

Eso choca directamente con varias decisiones que ya tomamos. El **Health Checker debe observar y producir evidencia de salud**, el **Source Registry mantiene el estado derivado**, el **Playback Orchestrator decide qué Source usar**, y **Discovery/Ingestion decide cómo conseguir nuevas Sources**. Así que el siguiente bloque será muy importante para cerrar definitivamente el ciclo:

```text
Playback Failure
       │
       ▼
Health Observation
       │
       ▼
Health Aggregation
       │
       ▼
Source State
       │
       ├────────► Orchestrator selection
       │
       └────────► Discovery/Ingestion replenishment
```

Ahí también vamos a separar **user reports**, **passive playback signals**, **active probes**, **health observations**, **derived health state** y **recovery/replenishment**, que ahora mismo están mezclados en un único “Health Checker”.


Perfecto. Continuamos con el **Motor 8**, y este es especialmente importante porque conecta casi todo lo que construimos alrededor de `Source`.

El original tiene buenas ideas: reportes de usuarios, comprobaciones proactivas, historial de health checks, protección contra falsos reportes, jitter/backoff, alertas por fallos masivos de proveedor y la regla de que un solo reporte no deshabilite inmediatamente una fuente. Pero también concentra demasiadas responsabilidades: el Health Checker verifica, cambia estados, reordena prioridades, dispara reextracción y habla de “autorreparación”.

Vamos a convertirlo en un sistema mucho más limpio.
