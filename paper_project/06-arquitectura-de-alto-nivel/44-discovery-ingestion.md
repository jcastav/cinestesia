# MOTOR — DISCOVERY & INGESTION

## Descubrimiento, Ingesta y Autoabastecimiento de Contenido

---

## 1. Propósito

El **Motor de Discovery & Ingestion** es el subsistema responsable de permitir que la plataforma descubra contenido y fuentes en sistemas externos, transforme esa información en candidatos procesables, determine su correspondencia con las entidades canónicas de la plataforma, enriquezca y valide los datos, y finalmente incorpore la información aprobada al **Catálogo** y al **Source Registry**.

Su propósito fundamental es resolver una de las preguntas estructurales de la plataforma:

> **¿Cómo llega contenido nuevo y cómo se mantienen actualizados el catálogo y sus fuentes sin depender de crear manualmente cada registro?**

El motor convierte información externa en conocimiento interno estructurado.

Su flujo conceptual es:

```text
Mundo externo
      ↓
Discovery
      ↓
Discovery Candidates
      ↓
Normalización
      ↓
Entity Matching
      ↓
Deduplicación
      ↓
Enriquecimiento
      ↓
Validación
      ↓
Política de aprobación
      ↓
Ingesta
      ↓
Catálogo + Source Registry
      ↓
Health
      ↓
Reconciliación
      ↓
Nuevo ciclo de Discovery
```

El motor constituye el **ciclo de incorporación y mantenimiento de contenido** de la plataforma.

No constituye el motor de reproducción.

---

# 2. Concepto central

La plataforma debe diferenciar claramente entre:

```text
Descubrir algo
      ≠
Reconocer qué es
      ≠
Incorporarlo
      ≠
Reproducirlo
```

Por ejemplo:

```text
Un adapter encuentra:

"Interstellar 2014"

        ↓

Discovery Candidate

        ↓

El sistema determina:

"Probablemente corresponde a media_items.id = 123"

        ↓

Se valida la coincidencia

        ↓

Se enriquece la información

        ↓

Se aprueba

        ↓

Catalog:
media_items.id = 123

        ↓

Se encuentra además una nueva fuente

        ↓

Source Registry:
source_456 → media_items.id = 123

        ↓

Health Checker determina disponibilidad

        ↓

Playback Orchestrator podrá utilizarla
```

El Discovery & Ingestion Engine **no reproduce la película**.

Su responsabilidad termina cuando la plataforma conoce correctamente:

```text
qué contenido existe
qué información tiene
qué fuentes están asociadas
qué procedencia tienen
qué estado de incorporación poseen
```

La resolución de una fuente para obtener una representación reproducible sigue perteneciendo al **Source Resolver**.

---

# 3. Discovery de usuarios vs Discovery de plataforma

El término Discovery aparece en dos contextos diferentes y deben permanecer separados.

## 3.1 Search / Discovery de usuario

Es el motor que responde:

> "¿Qué contenido quiere encontrar o explorar el usuario?"

Pertenece al **Motor de Search, Discovery & Recommendations**.

Ejemplos:

```text
Usuario busca:
"Interstellar"

Usuario explora:
"Películas de ciencia ficción"

Usuario recibe:
"También te puede interesar..."
```

---

## 3.2 Discovery de adquisición

Es el motor que responde:

> "¿Qué contenido o fuentes nuevas existen fuera de la plataforma?"

Pertenece al presente motor.

Ejemplos:

```text
Adapter consulta una fuente autorizada
        ↓
Encuentra 1.284 elementos
        ↓
Genera candidatos
        ↓
Pipeline procesa esos candidatos
```

Por tanto:

```text
USER DISCOVERY
    Usuario → Plataforma → Contenido

ACQUISITION DISCOVERY
    Mundo externo → Plataforma → Contenido
```

Son procesos conceptualmente opuestos y no deben compartir responsabilidades.

---

# 4. Objetivos

El motor persigue los siguientes objetivos:

1. descubrir contenido nuevo;
2. descubrir nuevas fuentes;
3. actualizar contenido existente;
4. identificar contenido ya conocido;
5. evitar duplicados;
6. preservar procedencia;
7. enriquecer metadatos;
8. validar información antes de incorporarla;
9. asociar fuentes con contenido;
10. minimizar intervención manual;
11. permitir revisión humana cuando exista incertidumbre;
12. tolerar errores parciales;
13. reintentar trabajos fallidos;
14. mantener trazabilidad;
15. reconciliar el estado externo con el interno;
16. detectar información obsoleta;
17. permitir ejecución programada;
18. permitir ejecución manual;
19. permitir evolución hacia automatización avanzada;
20. evitar operaciones destructivas basadas en evidencia insuficiente.

---

# 5. Principio de autoabastecimiento

La característica estratégica de este motor es que la plataforma no debe depender de:

```text
Administrador
    ↓
Busca película
    ↓
Crea película
    ↓
Busca fuente
    ↓
Copia fuente
    ↓
Configura fuente
```

como mecanismo principal de operación.

Ese flujo seguirá existiendo como mecanismo manual y de corrección, pero no será el único.

El objetivo evolucionado es:

```text
Scheduler
    ↓
Discovery Run
    ↓
Adapters
    ↓
Candidates
    ↓
Pipeline
    ↓
Matching
    ↓
Enrichment
    ↓
Validation
    ↓
Auto-approval / Review
    ↓
Catalog + Sources
    ↓
Health
```

El administrador pasa progresivamente de ser:

> **operador que introduce cada elemento**

a:

> **operador que supervisa excepciones y políticas.**

Esto es fundamental para que el sistema sea autosustentable.

---

# 6. Autonomía controlada

La autonomía no significa que el sistema pueda modificar cualquier cosa automáticamente.

Se establece una frontera:

```text
Alta confianza
    ↓
Automatización

Baja confianza
    ↓
Revisión humana
```

Ejemplo:

```text
External ID exacto
+
provider conocido
+
tipo compatible
+
año compatible

        ↓

MATCH DE ALTA CONFIANZA

        ↓

puede continuar automáticamente
```

Mientras:

```text
Título parecido
+
año diferente
+
sin external ID
+
varias entidades posibles

        ↓

MATCH AMBIGUO

        ↓

PENDING_REVIEW
```

El sistema debe preferir:

> **preguntar antes que inventar.**

---

# 7. Responsabilidades

El motor es responsable de:

* Discovery;
* adapters de descubrimiento;
* ejecución de runs;
* generación de candidatos;
* almacenamiento temporal/persistente de candidatos;
* normalización;
* matching;
* deduplicación;
* enriquecimiento;
* validación;
* políticas de aprobación;
* creación/actualización de entidades de catálogo mediante contratos;
* descubrimiento de fuentes;
* asociación fuente-contenido;
* reconciliación;
* scheduling;
* jobs;
* retries;
* errores de ingesta;
* trazabilidad;
* provenance;
* revisión administrativa.

---

# 8. No responsabilidades

El motor NO debe:

* reproducir contenido;
* seleccionar la fuente para playback;
* resolver una fuente durante la reproducción;
* generar Playback Sessions;
* transportar segmentos;
* actuar como Media Gateway;
* controlar el reproductor;
* decidir qué fuente usar durante playback;
* sustituir al Health Engine;
* sustituir al Search Engine;
* almacenar permanentemente vídeo como función principal;
* contener credenciales del usuario final;
* exponer directamente candidatos al usuario público.

La regla arquitectónica es:

> **Discovery & Ingestion incorpora conocimiento; Playback consume conocimiento.**

---

# 9. Arquitectura general

```text
                    MUNDO EXTERNO
                         │
              ┌──────────┴──────────┐
              │                     │
       Metadata APIs          Source Providers
              │                     │
              └──────────┬──────────┘
                         ↓
                DISCOVERY ADAPTERS
                         │
                         ↓
                DISCOVERY ORCHESTRATOR
                         │
                         ↓
                DISCOVERY CANDIDATES
                         │
                         ↓
                NORMALIZATION ENGINE
                         │
                         ↓
               ENTITY MATCHING ENGINE
                    │           │
                 MATCH       NO MATCH
                    │           │
                    └─────┬─────┘
                          ↓
                  DEDUPLICATION
                          │
                          ↓
                    ENRICHMENT
                          │
                          ↓
                    VALIDATION
                          │
                  ┌───────┴───────┐
                  │               │
              AUTOMÁTICO      REVISIÓN
                  │               │
                  └───────┬───────┘
                          ↓
                  INGESTION PIPELINE
                     │          │
                     ↓          ↓
                  CATALOG    SOURCES
                               │
                               ↓
                             HEALTH
                               │
                               ↓
                        RECONCILIATION
                               │
                               └──────→ Discovery
```

---

# 10. Módulos internos

El motor se divide conceptualmente en:

1. Scheduler
2. Discovery Orchestrator
3. Discovery Adapter Registry
4. Discovery Adapters
5. Candidate Store
6. Normalization Engine
7. Entity Matching Engine
8. Deduplication Engine
9. Enrichment Engine
10. Validation Engine
11. Approval Policy Engine
12. Ingestion Pipeline
13. Source Association Engine
14. Review Queue
15. Reconciliation Engine
16. Run/Job Manager
17. Retry & Error Manager
18. Provenance Manager
19. Metrics & Observability
20. Administrative Control Interface

En MVP pueden vivir dentro del mismo backend modular y utilizar workers asíncronos.

No deben convertirse automáticamente en microservicios independientes.

---

# 11. Discovery Adapters

Los **Discovery Adapters** son componentes especializados capaces de obtener información desde una determinada fuente externa y convertirla en candidatos internos.

El adapter conoce:

* cómo consultar su fuente;
* cómo paginar;
* cómo interpretar la respuesta;
* cómo identificar elementos;
* cómo extraer metadatos;
* cómo detectar fuentes;
* cómo manejar errores propios del proveedor;
* cómo transformar datos externos al contrato común.

El adapter NO decide:

* si el contenido debe publicarse;
* si dos películas son la misma;
* qué entidad canónica utilizar;
* qué fuente será utilizada en playback;
* qué prioridad tendrá durante reproducción.

---

# 12. El Collector / Scraper

El proyecto puede y debe conservar el concepto de un **Collector** amplio.

Sin embargo, el Collector no debe convertirse en una clase gigantesca que haga todo.

La arquitectura correcta es:

```text
Collector
    ↓
Discovery Adapter
    ↓
Discovery Candidate
    ↓
Pipeline
```

En otras palabras:

> **El Collector descubre; el pipeline decide qué hacer con lo descubierto.**

Un adapter puede internamente utilizar:

```text
HTTP client
HTML parser
structured data parser
feed parser
API client
browser automation
```

cuando esté permitido y sea necesario.

Pero todo resultado debe terminar convertido al contrato común de Discovery.

No se debe construir un sistema que dependa de una única implementación monolítica.

---

# 13. Tipos de Discovery Adapter

El sistema puede soportar:

### 13.1 Metadata API Adapter

Obtiene información estructurada mediante una API autorizada.

```text
API
 ↓
Adapter
 ↓
CONTENT candidates
```

---

### 13.2 Feed Adapter

Consume:

* feeds;
* catálogos;
* archivos estructurados;
* fuentes periódicas.

---

### 13.3 Authorized Web Adapter

Obtiene información de páginas o sistemas web cuando el acceso y uso sean permitidos.

Su responsabilidad es interpretar la información disponible.

No forma parte del diseño base ningún mecanismo destinado a evadir CAPTCHA, anti-bot, controles de acceso o mecanismos de protección.

---

### 13.4 Manual Import Adapter

Permite que el administrador introduzca información mediante:

* formulario;
* JSON;
* CSV;
* importación estructurada;
* operaciones administrativas.

Esto permite que la arquitectura automática y manual utilicen el mismo pipeline.

```text
Manual Import
      ↓
Discovery Candidate
      ↓
Mismo pipeline automático
```

Esto evita construir dos sistemas diferentes.

---

### 13.5 Source Discovery Adapter

Especializado en descubrir fuentes reproducibles asociadas a contenido.

Produce:

```text
SOURCE candidate
```

en lugar de:

```text
CONTENT candidate
```

---

# 14. Contrato conceptual del Adapter

El adapter debe tener una interfaz estable conceptualmente equivalente a:

```text
DiscoveryAdapter

id
version
capabilities
discover(context)
```

El método `discover()` produce candidatos.

El adapter puede emitir:

```text
CONTENT
SOURCE
```

y en futuras versiones:

```text
RELATIONSHIP
COLLECTION
EPISODE
PERSON
```

si el dominio lo requiere.

La arquitectura no debe asumir que todo Discovery produce solamente películas.

---

# 15. Discovery Candidate

Un **Discovery Candidate** es evidencia de que un sistema externo contiene información potencialmente útil para la plataforma.

No es todavía una entidad de catálogo.

Esta distinción es crítica.

```text
Candidate ≠ MediaItem
Candidate ≠ Source
```

Un candidato puede ser:

```text
válido
inválido
duplicado
ambiguo
rechazado
pendiente
procesado
fallido
obsoleto
```

---

# 16. Candidate de contenido

Ejemplo conceptual:

```json
{
  "candidateId": "dc_001",
  "kind": "CONTENT",
  "provider": "provider_x",
  "externalId": "tt0816692",
  "adapter": {
    "id": "provider_x_metadata",
    "version": "2.4.0"
  },
  "runId": "run_1842",
  "discoveredAt": "2026-10-01T10:32:14Z",
  "rawPayloadRef": "raw_abc",
  "normalized": {
    "title": "Interstellar",
    "year": 2014,
    "type": "movie"
  }
}
```

---

# 17. Candidate de fuente

Ejemplo:

```json
{
  "candidateId": "sc_001",
  "kind": "SOURCE",
  "provider": "provider_x",
  "externalId": "source_7782",
  "runId": "run_1842",
  "contentHints": {
    "title": "Interstellar",
    "year": 2014
  },
  "metadata": {
    "language": "en",
    "quality": "1080p"
  }
}
```

El candidate no necesita contener necesariamente una URL pública reproducible.

Las referencias externas deben manejarse mediante políticas de seguridad y provenance apropiadas.

---

# 18. Provenance

Todo candidato debe conservar información suficiente para responder:

> ¿De dónde salió este dato?

Como mínimo:

```text
candidateId
provider
externalId
adapterId
adapterVersion
runId
discoveredAt
rawPayloadRef
payloadChecksum
```

Opcionalmente:

```text
sourceReference
pageReference
requestReference
```

Esto permite reproducir y auditar decisiones.

---

# 19. Raw Data vs datos normalizados

El sistema debe diferenciar:

```text
RAW
 ↓
NORMALIZED
 ↓
CANONICAL
```

### Raw

Representación original recibida del adapter.

Sirve para:

* debugging;
* auditoría;
* reprocesamiento;
* evolución del parser.

Debe estar limitada por:

* tamaño;
* retención;
* seguridad;
* privacidad;
* coste.

---

### Normalized

Representación adaptada al esquema común del motor.

Ejemplo:

```text
external_title
external_year
external_type
external_ids
external_genres
```

---

### Canonical

Representación perteneciente al dominio de la plataforma:

```text
media_items
seasons
episodes
media_external_ids
```

El Raw nunca debe convertirse automáticamente en el modelo canónico sin pasar por las etapas correspondientes.

---

# 20. Pipeline de ingesta

El pipeline conceptual es:

```text
DISCOVERED
    ↓
NORMALIZING
    ↓
MATCHING
    ↓
DEDUPLICATING
    ↓
ENRICHING
    ↓
VALIDATING
    ↓
PENDING_REVIEW / AUTO_APPROVED
    ↓
INGESTING
    ↓
INGESTED
```

Errores pueden conducir a:

```text
FAILED
```

y candidatos antiguos pueden convertirse en:

```text
STALE
```

---

# 21. Estados del candidato

Estados iniciales:

```text
DISCOVERED
NORMALIZING
MATCHING
MATCHED
AMBIGUOUS
DEDUPLICATING
ENRICHING
VALIDATING
PENDING_REVIEW
APPROVED
REJECTED
INGESTING
INGESTED
FAILED
STALE
```

No todos los candidatos deben recorrer literalmente todos los estados.

Por ejemplo:

```text
external ID exacto
        ↓
MATCHED
        ↓
VALIDATING
```

mientras un candidato ambiguo puede:

```text
MATCHING
    ↓
AMBIGUOUS
    ↓
PENDING_REVIEW
```

---

# 22. Entity Matching

El **Entity Matching Engine** determina si un candidato corresponde a una entidad que la plataforma ya conoce.

Debe utilizar estrategias ordenadas por confiabilidad.

### Nivel 1 — External ID exacto

```text
provider + externalId
```

Si existe correspondencia inequívoca:

```text
MATCH
```

---

### Nivel 2 — Identidad determinística

Combinaciones como:

```text
título normalizado
+
año
+
tipo
```

u otros identificadores disponibles.

---

### Nivel 3 — Alias

Comparación mediante:

* título alternativo;
* título original;
* alias;
* idioma;
* transliteración.

---

### Nivel 4 — Matching probabilístico

Puede utilizar:

* similitud textual;
* distancia de edición;
* año;
* tipo;
* duración;
* IDs parciales;
* metadatos complementarios.

Resultado:

```text
HIGH_CONFIDENCE
MEDIUM_CONFIDENCE
LOW_CONFIDENCE
```

Los matches de baja confianza no deben incorporarse automáticamente.

---

# 23. Regla de matching

El sistema no debe preguntar solamente:

> "¿Se parecen los títulos?"

Debe preguntar:

> "¿Existe evidencia suficiente de que ambas representaciones corresponden a la misma entidad?"

Esto evita errores como:

```text
The Thing (1982)
The Thing (2011)
```

o:

```text
Batman
Batman Returns
Batman Begins
```

o múltiples obras con títulos idénticos.

---

# 24. Deduplicación

El sistema debe manejar dos formas de duplicación.

## 24.1 Duplicación del candidato

El mismo elemento puede ser descubierto varias veces:

```text
Run #100
Run #101
Run #102
```

La operación debe ser idempotente.

Una clave conceptual puede basarse en:

```text
kind
+
provider
+
externalId
```

---

## 24.2 Duplicación de entidades

Dos candidatos distintos pueden representar la misma entidad canónica.

Ejemplo:

```text
Provider A:
Interstellar

Provider B:
Interstellar

Provider C:
Interstellar
```

No deben crear automáticamente:

```text
media_001
media_002
media_003
```

si representan la misma obra.

El sistema debe consolidar la identidad y permitir múltiples fuentes.

---

# 25. Regla de deduplicación destructiva

El motor no debe ejecutar merges destructivos de baja confianza automáticamente.

Si:

```text
match = ambiguo
```

entonces:

```text
PENDING_REVIEW
```

La automatización debe favorecer:

```text
duplicado temporal
```

sobre:

```text
fusión incorrecta irreversible
```

cuando la evidencia no sea suficiente.

---

# 26. Enrichment Engine

El enriquecimiento completa información faltante.

Puede obtener:

* títulos alternativos;
* sinopsis;
* géneros;
* año;
* duración;
* créditos;
* identificadores externos;
* imágenes;
* información de temporadas;
* información de episodios.

El enriquecimiento debe ser modular.

```text
Candidate
    ↓
Matched Entity
    ↓
Enrichment Providers
    ↓
Normalized Metadata
```

No debe existir un único proveedor obligatorio para toda la información.

---

# 27. Prioridad de fuentes de metadatos

El sistema puede utilizar políticas como:

```text
Provider A
    ↓
Provider B
    ↓
Provider C
```

pero la prioridad debe pertenecer a una **política configurable**, no estar dispersa en los adapters.

Esto permite cambiar:

```text
metadata_provider_priority
```

sin reescribir el pipeline.

---

# 28. Validation Engine

Antes de incorporar una entidad deben validarse reglas de dominio.

Ejemplos:

```text
title obligatorio
type válido
año válido
externalId consistente
idioma válido
relaciones coherentes
temporada perteneciente a serie
episodio perteneciente a temporada
```

Para una fuente:

```text
provider conocido
source identity válida
metadata consistente
content association válida
```

La validación debe distinguir:

```text
ERROR
WARNING
INFO
```

Un warning no necesariamente bloquea la ingesta.

Un error crítico sí.

---

# 29. Approval Policy Engine

La plataforma necesita determinar cuándo puede actuar automáticamente.

Ejemplo conceptual:

```text
HIGH confidence
+
validación correcta
+
provider confiable
+
sin conflictos
        ↓
AUTO_APPROVE
```

Mientras:

```text
MEDIUM confidence
+
conflicto de metadatos
        ↓
PENDING_REVIEW
```

La política debe ser configurable.

---

# 30. Modos de operación

El motor puede funcionar en tres modos:

### 30.1 Manual

```text
Admin inicia run
```

---

### 30.2 Programado

```text
Scheduler
    ↓
Run periódico
```

Ejemplo:

```text
cada 6 horas
diario
semanal
```

---

### 30.3 Autónomo

El sistema puede decidir iniciar determinadas operaciones según:

* periodicidad;
* stale sources;
* nuevas fuentes;
* cambios detectados;
* reconciliaciones;
* políticas.

La autonomía avanzada se incorpora gradualmente.

---

# 31. Discovery Run

Cada ejecución de Discovery tiene un identificador:

```text
runId
```

Ejemplo:

```text
Discovery Run #1842
```

Debe registrar:

```text
adapter
version
startTime
endTime
trigger
status
itemsDiscovered
itemsProcessed
itemsMatched
itemsCreated
itemsUpdated
itemsRejected
sourcesDiscovered
errors
```

---

# 32. Estados del Run

```text
QUEUED
RUNNING
SUCCEEDED
PARTIAL
FAILED
CANCELLED
```

`PARTIAL` significa que el run produjo resultados válidos pero tuvo errores parciales.

Esto es importante para sistemas de Discovery.

Un error en 36 candidatos no debe convertir automáticamente un run con 1.248 candidatos válidos en un fracaso total.

---

# 33. Scheduler

El Scheduler determina cuándo ejecutar Discovery.

Debe soportar inicialmente:

```text
manual
scheduled
```

Futuras modalidades:

```text
event-triggered
adaptive
demand-driven
```

El Scheduler no ejecuta directamente toda la lógica.

Su responsabilidad es crear:

```text
Discovery Job
```

y entregarlo al sistema de procesamiento.

---

# 34. Jobs

Un Job representa trabajo ejecutable.

Ejemplos:

```text
DISCOVERY_RUN
NORMALIZE_CANDIDATE
MATCH_CANDIDATE
ENRICH_CANDIDATE
INGEST_CANDIDATE
ASSOCIATE_SOURCE
RECONCILE_PROVIDER
```

Esto permite procesamiento asíncrono.

---

# 35. Workers

Los workers ejecutan jobs.

En MVP pueden vivir en el mismo proyecto:

```text
Core API
Worker
Scheduler
```

pero con responsabilidades separadas.

Ejemplo:

```text
Backend
 ├── API
 ├── Worker
 │    ├── Discovery
 │    ├── Ingestion
 │    ├── Enrichment
 │    └── Reconciliation
 └── Scheduler
```

No se necesita Kubernetes para lograr esta arquitectura.

---

# 36. Queue

Redis puede utilizarse para coordinar trabajos asíncronos en MVP.

Conceptualmente:

```text
API
 ↓
Queue
 ↓
Worker
 ↓
Database
```

La cola no es la fuente de verdad.

La base de datos conserva el estado persistente del trabajo.

Redis se utiliza para:

* cola;
* locks;
* deduplicación temporal;
* rate limiting;
* coordinación;
* estado efímero.

---

# 37. Idempotencia

Un job puede ejecutarse dos veces.

Eso no debe producir:

```text
dos películas
dos fuentes
dos asociaciones
```

La operación debe diseñarse como idempotente.

Ejemplo:

```text
(provider, externalId)
```

debe identificar de manera estable la misma entidad externa.

El pipeline debe asumir:

> **At-least-once delivery es posible.**

No debe depender de una ejecución exactamente una vez.

---

# 38. Retries

Los errores temporales deben reintentarse.

Ejemplos:

```text
timeout
429
503
network error
temporary upstream failure
```

Debe utilizarse:

```text
bounded retry
+
exponential backoff
+
jitter
+
maximum attempts
+
total deadline
```

No se debe realizar:

```text
retry infinito
```

---

# 39. Dead Letter Queue

Cuando un candidato o job continúa fallando después de los límites establecidos:

```text
Worker
 ↓
max retries
 ↓
DLQ
```

El sistema conserva:

```text
jobId
candidateId
errorCode
lastError
attemptCount
timestamps
adapterVersion
```

El administrador puede:

```text
inspect
retry
reject
```

sin perder trazabilidad.

---

# 40. Error Taxonomy

Los errores deben clasificarse.

Ejemplos:

```text
DISCOVERY_ADAPTER_ERROR
UPSTREAM_TIMEOUT
UPSTREAM_RATE_LIMIT
INVALID_EXTERNAL_PAYLOAD
NORMALIZATION_ERROR
MATCHING_ERROR
AMBIGUOUS_MATCH
VALIDATION_ERROR
ENRICHMENT_ERROR
INGESTION_ERROR
SOURCE_ASSOCIATION_ERROR
PERSISTENCE_ERROR
POLICY_REJECTION
SECURITY_REJECTION
```

Esto permite distinguir:

```text
error técnico
```

de:

```text
candidato inválido
```

y de:

```text
contenido ambiguo
```

---

# 41. Source Discovery

El Discovery de fuentes es una parte fundamental del motor.

El sistema debe poder descubrir:

```text
"Existe una fuente asociada con esta obra."
```

sin asumir:

```text
"Esta fuente funciona."
```

Por tanto:

```text
Discovery
    ↓
Source Candidate
    ↓
Source Registry
    ↓
Health
```

No:

```text
Discovery
    ↓
Playback
```

---

# 42. Source Association

Cuando una fuente es descubierta:

```text
Source Candidate
       ↓
Content Matching
       ↓
media_id
       ↓
Source Registry
```

El registro conserva:

```text
provider
externalId
mediaId
language
quality
capabilities
provenance
discoveredAt
```

La fuente puede inicialmente quedar:

```text
DISCOVERED
```

y posteriormente pasar por Health.

---

# 43. Fuente descubierta sin contenido identificado

Puede ocurrir:

```text
Source discovered
      ↓
No canonical media match
```

La fuente no debe descartarse necesariamente.

Puede quedar:

```text
UNMATCHED
```

hasta que:

* aparezca el contenido;
* mejore el matching;
* un administrador la asocie;
* otro Discovery proporcione información adicional.

Esto permite que Discovery de contenido y Discovery de fuentes sean procesos independientes.

---

# 44. Catalog Integration

El motor nunca debe escribir arbitrariamente cualquier estructura interna del catálogo.

Debe utilizar contratos de aplicación.

Conceptualmente:

```text
Ingestion Pipeline
       ↓
Catalog Application Service
       ↓
media_items
```

Esto conserva la frontera:

```text
Discovery
      ↓
decide qué candidato procesar

Catalog
      ↓
decide cómo representar una entidad canónica
```

---

# 45. Source Registry Integration

De manera equivalente:

```text
Ingestion Pipeline
       ↓
Source Registry Application Service
       ↓
sources
```

El Discovery Engine no debe convertirse en propietario de la tabla `sources`.

El Source Registry sigue siendo el **source of truth** de las fuentes.

---

# 46. Publication

La incorporación técnica y la publicación editorial deben mantenerse separadas.

Una entidad puede estar:

```text
INGESTED
```

pero:

```text
publicationStatus = DRAFT
```

Esto permite:

```text
Discovery automático
        ↓
Catalog creado
        ↓
Admin revisa
        ↓
PUBLISH
```

La disponibilidad técnica de sus fuentes es otra dimensión.

```text
Publication
    ≠
Technical Availability
```

---

# 47. Reconciliation Engine

El sistema debe poder responder:

> "¿Qué debería existir según el proveedor y qué existe actualmente en nuestra plataforma?"

Ejemplo:

```text
Discovery anterior:
1.000 elementos

Discovery actual:
1.025 elementos

Diferencia:
+25
```

También:

```text
Elemento anteriormente conocido
    ↓
ya no aparece
```

Esto no significa automáticamente:

```text
DELETE
```

---

# 48. Regla de desaparición

Una única ausencia no debe provocar eliminación.

El sistema debe utilizar:

```text
missing observation
+
grace period
+
repeated confirmation
```

antes de considerar:

```text
STALE
```

o:

```text
DEPRECATED
```

La eliminación física debe ser todavía más conservadora.

---

# 49. Reconciliation Loop

```text
Discovery Run
      ↓
Expected State
      ↓
Compare
      ↓
Current State
      ↓
Differences
      ├── New
      ├── Updated
      ├── Missing
      └── Unchanged
```

Esto convierte al sistema en algo más parecido a un **control loop** que a un simple scraper.

---

# 50. Actualizaciones

Discovery no solamente incorpora contenido nuevo.

También mantiene:

```text
title
synopsis
genres
credits
images
episodes
external IDs
source metadata
```

actualizados.

Debe distinguir:

```text
CREATE
UPDATE
NO_CHANGE
```

para evitar escrituras innecesarias.

---

# 51. Versionado de adapters

Cada candidato debe conservar:

```text
adapterId
adapterVersion
```

porque un cambio en el parser puede cambiar el resultado.

Ejemplo:

```text
provider_x_adapter v1.4
```

produce:

```text
title = "Interstellar"
```

mientras:

```text
provider_x_adapter v1.5
```

corrige:

```text
originalTitle
```

La trazabilidad permite saber qué versión produjo cada resultado.

---

# 52. Rate Limiting externo

Cada adapter debe respetar límites del proveedor.

Debe existir configuración para:

```text
requests per second
concurrency
timeouts
backoff
maximum pages
maximum items
```

No se debe permitir que un Discovery Run accidentalmente genere una carga ilimitada sobre una fuente externa.

---

# 53. Seguridad de Fetch

Todo acceso externo debe pasar por políticas de seguridad.

Especialmente:

```text
SSRF protection
URL validation
scheme allowlist
redirect validation
private IP blocking
link-local blocking
DNS rebinding protection
timeouts
response-size limits
content-type validation
egress controls
```

La existencia de un adapter no constituye autorización para acceder arbitrariamente a cualquier URL.

---

# 54. Secrets

Los adapters que necesiten credenciales externas deben obtenerlas desde:

```text
Secret Manager / configuración segura
```

Nunca desde:

```text
Discovery Candidate
raw payload
logs
public DTOs
database plaintext
```

Los candidatos nunca deben convertirse en un mecanismo de transporte de secretos.

---

# 55. Observabilidad

Cada operación importante debe poder seguirse mediante:

```text
runId
jobId
candidateId
adapterId
correlationId
```

Ejemplo:

```text
run_1842
  ↓
job_9921
  ↓
candidate_dc_441
  ↓
match
  ↓
ingestion
```

Esto permite reconstruir qué ocurrió.

---

# 56. Métricas

Métricas mínimas:

```text
discovery_runs_total
discovery_run_duration_seconds
discovery_candidates_total
discovery_candidates_processed_total
discovery_candidates_matched_total
discovery_candidates_ambiguous_total
discovery_candidates_rejected_total
discovery_candidates_failed_total

ingestion_created_total
ingestion_updated_total
ingestion_unchanged_total

source_candidates_total
source_associations_total

discovery_adapter_errors_total
ingestion_errors_total

queue_depth
job_duration_seconds
job_retries_total
dead_letter_jobs_total

reconciliation_changes_total
```

Las métricas deben evitar cardinalidad excesiva.

---

# 57. Dashboard de Discovery

El panel administrativo debe poder mostrar:

```text
Discovery Runs
────────────────────────────

Run #1842
Status: PARTIAL
Duration: 04:18

Candidates found:       1,284
Matched:                  912
New content:               73
Possible duplicates:      144
Rejected:                 102

Sources discovered:     2,918
Sources associated:     2,641

Errors:                    36
```

Acciones:

```text
[Ver candidatos]
[Ver errores]
[Ver fuentes]
[Reintentar]
[Ver adapter]
```

---

# 58. Review Queue

La revisión humana debe concentrarse en excepciones.

Ejemplos:

```text
AMBIGUOUS_MATCH
VALIDATION_CONFLICT
DUPLICATE_CANDIDATE
LOW_CONFIDENCE
SOURCE_UNMATCHED
POLICY_REVIEW
```

El objetivo no es que un administrador revise 10.000 elementos.

El objetivo es:

```text
10.000 encontrados
      ↓
9.700 automáticos
      ↓
300 excepciones
      ↓
administrador revisa 300
```

Con el tiempo:

```text
10.000 encontrados
      ↓
9.950 automáticos
      ↓
50 excepciones
```

La plataforma se vuelve progresivamente más autosuficiente.

---

# 59. Admin y Discovery

El Admin/CMS debe exponer un área específica:

```text
DISCOVERY & INGESTION

├── Runs
├── Candidates
├── Review Queue
├── Errors
├── Adapters
├── Sources discovered
├── Reconciliation
└── Policies
```

El administrador no necesita conocer la implementación interna.

Debe trabajar con conceptos operativos.

---

# 60. Operaciones administrativas

Ejemplos:

```text
POST /v1/admin/discovery/runs
GET  /v1/admin/discovery/runs/{runId}

GET  /v1/admin/ingestion/candidates
GET  /v1/admin/ingestion/candidates/{candidateId}

POST /v1/admin/ingestion/candidates/{candidateId}/approve
POST /v1/admin/ingestion/candidates/{candidateId}/reject
POST /v1/admin/ingestion/candidates/{candidateId}/retry

POST /v1/admin/discovery/adapters/{adapterId}/enable
POST /v1/admin/discovery/adapters/{adapterId}/disable
```

Estos endpoints pertenecen al **Control Plane administrativo**.

No forman parte del API público del usuario.

---

# 61. API interna

El motor puede exponer contratos internos conceptuales como:

```text
POST /internal/v1/discovery/runs
POST /internal/v1/ingestion/candidates
POST /internal/v1/ingestion/jobs
```

Sin embargo, la comunicación interna puede implementarse mediante llamadas de aplicación, jobs o eventos según la topología física.

No se debe crear una API HTTP interna simplemente por estética si una llamada de módulo es suficiente en el modular monolith MVP.

---

# 62. Eventos

El motor puede emitir eventos como:

```text
DiscoveryRunStarted
DiscoveryRunCompleted
DiscoveryCandidateFound
CandidateMatched
CandidateApproved
MediaItemIngested
MediaItemUpdated
SourceCandidateDiscovered
SourceAssociated
IngestionFailed
ReconciliationCompleted
```

Estos son eventos de integración.

No implican Event Sourcing.

La base de datos continúa siendo la fuente de verdad.

---

# 63. Relación con Search

Después de que el catálogo cambia:

```text
Discovery
    ↓
Ingestion
    ↓
Catalog
    ↓
Catalog Event
    ↓
Search Projection
```

Discovery nunca debe escribir directamente:

```text
media_search_index
```

El Search Engine es propietario de su índice.

---

# 64. Relación con Health

La secuencia correcta es:

```text
Discovery
    ↓
Source Registry
    ↓
Health
```

Health determina:

```text
¿funciona?
```

Discovery determina:

```text
¿existe?
```

Son preguntas diferentes.

---

# 65. Relación con Resolver

Discovery puede descubrir:

```text
Source
```

pero no debe ejecutar obligatoriamente:

```text
Source → Playable Representation
```

Eso pertenece al Resolver.

El flujo de reproducción sigue siendo:

```text
User
 ↓
Playback Session
 ↓
Orchestrator
 ↓
Source Registry
 ↓
Resolver
 ↓
Playable Representation
 ↓
Gateway
 ↓
Player
```

Discovery no entra en ese camino crítico.

---

# 66. Relación con Health y Playback

El ciclo completo queda:

```text
Discovery
   ↓
Catalog + Sources
   ↓
Health
   ↓
Playback
   ↓
Player/Gateway/Resolver observations
   ↓
Health
   ↓
future source decisions
```

Esto permite que el conocimiento de la plataforma mejore con el uso.

---

# 67. Arquitectura de persistencia

Modelo conceptual MVP:

### `discovery_adapters`

```text
id
name
version
provider
enabled
capabilities
configuration
created_at
updated_at
```

---

### `discovery_runs`

```text
id
adapter_id
status
trigger
started_at
finished_at
counters
error_summary
```

---

### `discovery_candidates`

```text
id
run_id
kind
provider
external_id
status
normalized_data
raw_payload_ref
payload_checksum
match_reference
confidence
discovered_at
processed_at
```

---

### `ingestion_jobs`

```text
id
candidate_id
type
status
attempt_count
available_at
started_at
finished_at
last_error
```

---

### `ingestion_errors`

```text
id
candidate_id
job_id
error_code
message
details
attempt
created_at
```

---

### `source_provenance`

Puede registrar:

```text
source_id
provider
external_id
adapter_id
adapter_version
run_id
discovered_at
```

La estructura exacta puede evolucionar mediante ADR y migraciones.

---

# 68. Redis

Redis se utilizará para información efímera.

Ejemplos:

```text
discovery:queue:*
ingestion:queue:*
discovery:lock:*
candidate:dedupe:*
adapter:rate-limit:*
```

Redis no reemplaza PostgreSQL como fuente de verdad.

---

# 69. Ciclo autónomo completo

Una ejecución ideal puede verse así:

```text
01 Scheduler
       ↓
02 Discovery Run
       ↓
03 Adapter
       ↓
04 5.000 candidates
       ↓
05 Normalization
       ↓
06 Matching
       ↓
07 Deduplication
       ↓
08 Enrichment
       ↓
09 Validation
       ↓
10 Approval Policy
       ↓
11 4.700 automatic
       ↓
12 300 review
       ↓
13 Catalog + Source Registry
       ↓
14 Health
       ↓
15 Search indexing
       ↓
16 Reconciliation
       ↓
17 Next Discovery Run
```

Este es el corazón del autoabastecimiento.

---

# 70. Ejemplo: incorporación de una película

Supongamos que un adapter encuentra:

```text
Interstellar
2014
```

### Paso 1

Adapter genera:

```text
CONTENT candidate
```

### Paso 2

Normalization:

```text
title = Interstellar
year = 2014
type = movie
```

### Paso 3

Matching:

```text
external ID exacto
```

Resultado:

```text
MATCHED → media_123
```

### Paso 4

Enrichment:

```text
synopsis
genres
credits
poster
external IDs
```

### Paso 5

Validation:

```text
OK
```

### Paso 6

Approval:

```text
AUTO_APPROVED
```

### Paso 7

Catalog:

```text
media_123
```

### Paso 8

Otro adapter encuentra:

```text
SOURCE candidate
```

### Paso 9

Matching:

```text
Interstellar → media_123
```

### Paso 10

Source Registry:

```text
source_456 → media_123
```

### Paso 11

Health:

```text
ACTIVE
```

### Paso 12

Search:

```text
index updated
```

Resultado:

```text
La película aparece en el catálogo
+
tiene una fuente conocida
+
el sistema conoce su estado
+
puede ser reproducida por el flujo normal
```

---

# 71. Ejemplo de actualización

Supongamos que la plataforma ya tiene:

```text
Interstellar
```

y el Discovery vuelve a encontrarla.

No debe crear otra película.

```text
Candidate
 ↓
External ID
 ↓
Existing media_123
 ↓
COMPARE
```

Resultado:

```text
NO_CHANGE
```

o:

```text
UPDATE
```

si cambió información.

---

# 72. Ejemplo de fuente nueva

```text
media_123
    ├── source_A
    ├── source_B
    └── source_C ← nueva
```

Discovery simplemente incorpora:

```text
source_C
```

Health posteriormente determina:

```text
ACTIVE / DEGRADED / UNAVAILABLE
```

El Orchestrator decidirá cuál utilizar durante playback.

---

# 73. Ejemplo de ambigüedad

Discovery encuentra:

```text
"Crash"
2004
```

pero existen:

```text
Crash (1996)
Crash (2004)
```

El sistema detecta:

```text
multiple candidates
```

Resultado:

```text
AMBIGUOUS
    ↓
PENDING_REVIEW
```

El administrador selecciona la entidad correcta.

Esa decisión puede alimentar posteriormente reglas o señales de matching.

---

# 74. Ejemplo de error temporal

Adapter:

```text
HTTP 503
```

Resultado:

```text
UPSTREAM_UNAVAILABLE
```

No se rechaza el contenido.

Se ejecuta:

```text
retry
 ↓
backoff
 ↓
retry
```

Si continúa fallando:

```text
FAILED
```

El run puede terminar:

```text
PARTIAL
```

sin perder los demás resultados.

---

# 75. Ejemplo de desaparición

Un proveedor tenía:

```text
Interstellar
```

pero un Discovery posterior no lo devuelve.

El sistema no hace:

```text
DELETE
```

inmediatamente.

Hace:

```text
missing observation
```

Si continúa ausente durante el período definido:

```text
STALE
```

y eventualmente:

```text
DEPRECATED
```

según política.

---

# 76. Reconciliation como control loop

La arquitectura puede entenderse como un sistema de control:

```text
Estado externo observado
        ↓
Discovery
        ↓
Estado interno
        ↓
Comparación
        ↓
Corrección
        ↓
Nuevo estado
        ↓
Nueva observación
```

Esto permite que la plataforma no sea únicamente:

> "una base de datos con películas"

sino:

> **un sistema que observa, incorpora, corrige y mantiene su propio estado de conocimiento.**

---

# 77. MVP del motor

El MVP no necesita implementar toda la autonomía futura.

Debe implementar un vertical slice completo.

### MVP mínimo

```text
1. Discovery Adapter
2. Manual Import Adapter
3. Discovery Run
4. Candidate Store
5. Normalization
6. Exact External-ID Matching
7. Basic deterministic matching
8. Deduplication
9. Basic validation
10. Manual review
11. Catalog ingestion
12. Source association
13. Job queue
14. Retry
15. Basic reconciliation
16. Admin visibility
17. Provenance
18. Observability
```

---

# 78. MVP: qué NO implementar todavía

No es necesario comenzar con:

* ML avanzado;
* embeddings;
* LLM matching;
* computer vision;
* crawling distribuido masivo;
* múltiples regiones;
* Kubernetes;
* Kafka;
* data lake;
* event sourcing;
* vector database;
* aprendizaje automático de políticas;
* autonomous agent swarm;
* complex ranking model;
* adaptive scheduling avanzado.

Primero debe existir:

```text
Discovery
→ Candidate
→ Match
→ Validate
→ Ingest
→ Source
→ Health
```

funcionando de extremo a extremo.

---

# 79. Evolución del motor

### Fase 1 — Manual + automático básico

```text
Manual Run
API Adapter
Manual Import
Exact Matching
Review
Ingestion
```

---

### Fase 2 — Scheduled Discovery

```text
Scheduler
+
Queue
+
Workers
+
Retries
```

---

### Fase 3 — Multi-provider

```text
Provider A
Provider B
Provider C
```

con adapters independientes.

---

### Fase 4 — Reconciliation avanzada

```text
new
updated
missing
stale
deprecated
```

---

### Fase 5 — Matching avanzado

```text
aliases
fuzzy matching
confidence
learned rules
```

---

### Fase 6 — Enrichment avanzado

```text
metadata providers
image providers
credits providers
episode providers
```

---

### Fase 7 — Autonomía adaptativa

El sistema puede determinar:

```text
qué adapter ejecutar
cuándo ejecutarlo
qué contenido necesita actualización
qué fuentes necesitan rediscovery
qué candidatos necesitan revisión
```

sin perder controles administrativos.

---

# 80. Principio de aprendizaje operativo

El sistema puede mejorar sus decisiones sin convertirse en una IA opaca.

Ejemplo:

```text
100 decisiones manuales
        ↓
se detecta patrón
        ↓
se formaliza regla
        ↓
la regla pasa a política
        ↓
la siguiente ejecución es automática
```

La automatización debe provenir preferentemente de:

```text
evidencia
+
reglas
+
políticas
+
métricas
```

antes que de complejidad algorítmica innecesaria.

---

# 81. Testing

El motor requiere varias capas de pruebas.

### Unitarias

* normalization;
* matching;
* deduplication;
* validation;
* policies;
* state transitions.

### Contract tests

Cada adapter debe demostrar que produce candidatos válidos.

### Integration tests

```text
Adapter
→ Candidate
→ Pipeline
→ Catalog
```

### Idempotency tests

Ejecutar dos veces el mismo candidato debe producir el mismo estado final.

### Failure tests

Simular:

```text
timeout
429
503
malformed payload
duplicate
ambiguous match
database failure
worker crash
```

### Reconciliation tests

Verificar:

```text
new
updated
missing
unchanged
```

---

# 82. Acceptance Criteria del MVP

El motor se considera funcional cuando:

1. puede ejecutar un Discovery Run;
2. un adapter puede producir candidatos;
3. los candidatos quedan registrados;
4. los candidatos pueden normalizarse;
5. un external ID permite encontrar una entidad existente;
6. un candidato nuevo puede crear una entidad mediante el Catalog;
7. los duplicados no crean múltiples entidades;
8. los candidatos ambiguos entran en revisión;
9. un administrador puede aprobar/rechazar;
10. una fuente puede descubrirse;
11. una fuente puede asociarse a contenido;
12. el Source Registry conserva la fuente;
13. Health puede comenzar a observarla;
14. los jobs pueden reintentarse;
15. los errores quedan registrados;
16. los runs muestran estadísticas;
17. la operación es idempotente;
18. la procedencia puede reconstruirse;
19. Search recibe los cambios a través de Catalog;
20. Playback puede consumir las fuentes mediante su arquitectura existente.

---

# 83. Vertical Slice recomendado

El primer vertical slice de este motor debe ser deliberadamente pequeño:

```text
Manual Discovery Run
        ↓
One Discovery Adapter
        ↓
CONTENT candidate
        ↓
Normalization
        ↓
External-ID Matching
        ↓
Catalog
        ↓
Admin sees result
```

Segundo:

```text
SOURCE candidate
        ↓
Matching
        ↓
Source Registry
```

Tercero:

```text
Scheduler
        ↓
Queue
        ↓
Worker
        ↓
Automatic Run
```

Cuarto:

```text
Ambiguous candidate
        ↓
Review Queue
        ↓
Admin decision
```

Quinto:

```text
Reconciliation
```

Así se mantiene la filosofía de **Vertical Slices** del proyecto.

---

# 84. Relación con el resto de motores

| Motor                 | Pregunta que responde                                          |
| --------------------- | -------------------------------------------------------------- |
| Discovery & Ingestion | ¿Qué existe fuera y cómo lo incorporamos?                      |
| Catalog               | ¿Qué contenido reconoce oficialmente la plataforma?            |
| Source Registry       | ¿Qué fuentes conocemos para ese contenido?                     |
| Health                | ¿Qué tan disponible/fiable está una fuente?                    |
| Orchestrator          | ¿Qué fuente utilizar para esta reproducción?                   |
| Resolver              | ¿Cómo convertir esa fuente en una representación reproducible? |
| Gateway               | ¿Cómo transportar esa representación de forma segura?          |
| Player Core           | ¿Cómo reproducir la sesión?                                    |
| Search                | ¿Cómo encontrar y explorar contenido?                          |
| Recommendations       | ¿Qué contenido podría interesar?                               |
| Admin/CMS             | ¿Cómo supervisar y controlar la plataforma?                    |

---

# 85. Flujo maestro de incorporación

```text
┌─────────────────────────────┐
│       EXTERNAL WORLD        │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│       DISCOVERY ADAPTER     │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│     DISCOVERY CANDIDATE     │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│       NORMALIZATION         │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│       ENTITY MATCHING       │
└──────────────┬──────────────┘
               ↓
       ┌───────┴────────┐
       │                │
     MATCH          AMBIGUOUS
       │                │
       │                ↓
       │          REVIEW QUEUE
       │                │
       └───────┬────────┘
               ↓
┌─────────────────────────────┐
│       DEDUPLICATION         │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│         ENRICHMENT          │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│         VALIDATION          │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│      APPROVAL POLICY        │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│      INGESTION PIPELINE     │
└──────────────┬──────────────┘
               ↓
        ┌──────┴───────┐
        ↓              ↓
     CATALOG       SOURCE REGISTRY
        │              │
        └──────┬───────┘
               ↓
             HEALTH
               ↓
        RECONCILIATION
               ↓
          NEXT RUN
```

---

# 86. Ciclo completo de la plataforma

Con este motor, la arquitectura completa adquiere una forma mucho más clara:

```text
                    INCORPORATION PLANE

External World
      ↓
Discovery & Ingestion
      ↓
Catalog + Source Registry
      ↓
Health / Reliability
      ↓
Search Projection
      ↓
                    CONSUMPTION PLANE

User
      ↓
Search / Discovery
      ↓
Catalog
      ↓
Playback Orchestrator
      ↓
Source Registry
      ↓
Source Resolver
      ↓
Media Gateway
      ↓
Media Player Core
      ↓
QoE / Reports
      ↓
Health
      ↓
                    FEEDBACK LOOP

Health / Reports
      ↓
Source decisions
      ↓
Reconciliation
      ↓
Discovery
```

La plataforma queda así estructurada alrededor de **dos grandes ciclos**:

### Ciclo de incorporación

```text
External World
→ Discovery
→ Ingestion
→ Catalog
→ Sources
→ Health
```

### Ciclo de consumo

```text
User
→ Search
→ Playback
→ Resolver
→ Gateway
→ Player
→ Health
```

Y ambos ciclos se retroalimentan.

---

# 87. Regla arquitectónica maestra del motor

> **Discovery encuentra.**
>
> **Ingestion incorpora.**
>
> **Catalog canoniza.**
>
> **Source Registry registra.**
>
> **Health observa.**
>
> **Orchestrator decide.**
>
> **Resolver resuelve.**
>
> **Gateway transporta.**
>
> **Player reproduce.**
>
> **Reconciliation compara y corrige.**

Ningún componente debe absorber la responsabilidad de otro simplemente porque sea conveniente implementarlo así.

---

# 88. Regla de autonomía

La autonomía del sistema debe crecer en este orden:

```text
Automatizar operaciones seguras
        ↓
Medir resultados
        ↓
Detectar excepciones
        ↓
Automatizar decisiones de alta confianza
        ↓
Reducir revisión manual
        ↓
Reconciliar automáticamente
        ↓
Adaptar frecuencia y prioridades
```

Nunca:

```text
"automatizar todo desde el día uno"
```

La plataforma debe ser **autosustentable**, pero también:

* observable;
* reversible;
* auditable;
* idempotente;
* conservadora ante incertidumbre;
* controlable desde Admin.

---

# 89. Regla final

El Motor de Discovery & Ingestion no debe diseñarse como:

> **"el scraper del proyecto".**

Debe diseñarse como:

> **"el sistema de adquisición, interpretación, incorporación y mantenimiento del conocimiento de contenido y fuentes de la plataforma".**

El scraper/collector es únicamente una de las capacidades que alimentan ese sistema.

La arquitectura resultante permite que, en una fase madura:

```text
la plataforma descubra
        ↓
entienda
        ↓
identifique
        ↓
deduplicate
        ↓
enriquezca
        ↓
valide
        ↓
incorpore
        ↓
vigile
        ↓
reconcilie
        ↓
y vuelva a descubrir
```

con intervención humana concentrada en los casos que realmente requieren criterio editorial u operativo.

Este motor completa la mitad que faltaba de la arquitectura: **el sistema que alimenta y mantiene vivo el universo de contenido que posteriormente consume el sistema de reproducción.**

# CONTRATOS DE INTEGRACIÓN — DISCOVERY & INGESTION

Esta sección define los contratos que permiten integrar el Motor de Discovery & Ingestion con el resto de la arquitectura.

El objetivo no es fijar prematuramente una implementación concreta, sino establecer **qué información debe entrar y salir de cada frontera**.

---

# 1. Principio contractual

El motor no debe comunicarse con otros subsistemas mediante estructuras internas de base de datos.

La integración debe producirse mediante:

```text
Application Contracts
DTOs
Commands
Events
Jobs
```

según la naturaleza de la operación.

---

# 2. Flujo contractual principal

```text
Discovery Adapter
      ↓
DiscoveryCandidate
      ↓
Normalization
      ↓
Matching
      ↓
Validation
      ↓
Ingestion Command
      ↓
Catalog / Source Registry
      ↓
Events
      ↓
Search / Health / Observability
```

---

# 3. DiscoveryCandidate

Contrato conceptual:

```json
{
  "candidateId": "dc_123",
  "kind": "CONTENT",
  "provider": "provider_x",
  "externalId": "tt0816692",
  "adapter": {
    "id": "provider_x",
    "version": "2.4.0"
  },
  "runId": "run_1842",
  "discoveredAt": "2026-10-01T10:32:14Z",
  "normalized": {
    "title": "Interstellar",
    "year": 2014,
    "type": "movie"
  },
  "rawPayloadRef": "raw_123",
  "payloadChecksum": "sha256:..."
}
```

---

# 4. Candidate Kind

Valores iniciales:

```text
CONTENT
SOURCE
```

Valores futuros posibles:

```text
EPISODE
PERSON
COLLECTION
RELATIONSHIP
```

No deben implementarse hasta que exista una necesidad concreta.

---

# 5. Discovery Run

Contrato conceptual:

```json
{
  "runId": "run_1842",
  "adapterId": "provider_x",
  "adapterVersion": "2.4.0",
  "trigger": "SCHEDULED",
  "status": "RUNNING",
  "startedAt": "2026-10-01T10:32:00Z"
}
```

Estados:

```text
QUEUED
RUNNING
SUCCEEDED
PARTIAL
FAILED
CANCELLED
```

---

# 6. Run Summary

Al finalizar:

```json
{
  "runId": "run_1842",
  "status": "PARTIAL",
  "durationMs": 258000,
  "counters": {
    "candidatesFound": 1284,
    "processed": 1248,
    "matched": 912,
    "newContent": 73,
    "ambiguous": 144,
    "rejected": 102,
    "sourcesDiscovered": 2918,
    "sourcesAssociated": 2641,
    "errors": 36
  }
}
```

Los contadores son operacionales y no constituyen la fuente de verdad de las entidades.

---

# 7. Match Result

Contrato conceptual:

```json
{
  "candidateId": "dc_123",
  "result": "MATCHED",
  "entityType": "MEDIA_ITEM",
  "entityId": "media_456",
  "confidence": "HIGH",
  "strategy": "EXTERNAL_ID_EXACT"
}
```

Resultados:

```text
MATCHED
NO_MATCH
AMBIGUOUS
```

---

# 8. Match Candidate

Cuando existen múltiples posibilidades:

```json
{
  "candidateId": "dc_123",
  "result": "AMBIGUOUS",
  "candidates": [
    {
      "entityId": "media_1",
      "confidence": 0.91
    },
    {
      "entityId": "media_2",
      "confidence": 0.87
    }
  ]
}
```

Las puntuaciones internas no deben necesariamente exponerse al usuario público.

---

# 9. Ingestion Command

El pipeline puede generar una orden conceptual:

```json
{
  "candidateId": "dc_123",
  "target": {
    "type": "MEDIA_ITEM",
    "entityId": "media_456"
  },
  "operation": "UPDATE",
  "policy": {
    "approval": "AUTO_APPROVED"
  }
}
```

Operaciones:

```text
CREATE
UPDATE
NO_CHANGE
```

---

# 10. Source Association Command

Para fuentes:

```json
{
  "candidateId": "sc_123",
  "mediaId": "media_456",
  "operation": "ASSOCIATE",
  "source": {
    "provider": "provider_x",
    "externalId": "source_7782",
    "language": "es",
    "quality": "1080p"
  }
}
```

El Source Registry decide cómo representar internamente la fuente.

---

# 11. Provenance Contract

Toda incorporación automática deberá poder conservar:

```json
{
  "provider": "provider_x",
  "externalId": "tt0816692",
  "adapterId": "provider_x",
  "adapterVersion": "2.4.0",
  "runId": "run_1842",
  "discoveredAt": "2026-10-01T10:32:14Z",
  "payloadChecksum": "sha256:..."
}
```

---

# 12. Candidate Status Contract

```text
DISCOVERED
NORMALIZING
MATCHING
MATCHED
AMBIGUOUS
DEDUPLICATING
ENRICHING
VALIDATING
PENDING_REVIEW
APPROVED
REJECTED
INGESTING
INGESTED
FAILED
STALE
```

Las transiciones deben estar controladas.

No se permitirá:

```text
FAILED → INGESTED
```

sin una nueva operación válida.

---

# 13. Job Contract

```json
{
  "jobId": "job_123",
  "type": "MATCH_CANDIDATE",
  "candidateId": "dc_123",
  "attempt": 2,
  "status": "RUNNING",
  "createdAt": "2026-10-01T10:33:00Z"
}
```

Tipos iniciales:

```text
DISCOVERY_RUN
NORMALIZE_CANDIDATE
MATCH_CANDIDATE
ENRICH_CANDIDATE
INGEST_CANDIDATE
ASSOCIATE_SOURCE
RECONCILE_PROVIDER
```

---

# 14. Error Contract

Los errores de procesamiento deben conservar una estructura consistente:

```json
{
  "code": "AMBIGUOUS_MATCH",
  "message": "Candidate requires manual review.",
  "candidateId": "dc_123",
  "jobId": "job_123",
  "retryable": false
}
```

Para errores técnicos:

```json
{
  "code": "UPSTREAM_TIMEOUT",
  "message": "External provider did not respond within the configured deadline.",
  "retryable": true
}
```

---

# 15. Admin API

El área administrativa puede exponer:

```text
POST /v1/admin/discovery/runs
GET  /v1/admin/discovery/runs
GET  /v1/admin/discovery/runs/{runId}

GET  /v1/admin/ingestion/candidates
GET  /v1/admin/ingestion/candidates/{candidateId}

POST /v1/admin/ingestion/candidates/{candidateId}/approve
POST /v1/admin/ingestion/candidates/{candidateId}/reject
POST /v1/admin/ingestion/candidates/{candidateId}/retry

GET  /v1/admin/discovery/adapters
POST /v1/admin/discovery/adapters/{adapterId}/enable
POST /v1/admin/discovery/adapters/{adapterId}/disable
```

---

# 16. Crear un Discovery Run

```http
POST /v1/admin/discovery/runs
```

Request conceptual:

```json
{
  "adapterId": "provider_x",
  "mode": "FULL"
}
```

Respuesta:

```json
{
  "runId": "run_1842",
  "status": "QUEUED"
}
```

El endpoint no debe esperar a que termine el Discovery completo.

---

# 17. Consultar Run

```http
GET /v1/admin/discovery/runs/{runId}
```

Respuesta:

```json
{
  "runId": "run_1842",
  "status": "PARTIAL",
  "startedAt": "...",
  "finishedAt": "...",
  "counters": {
    "candidatesFound": 1284,
    "processed": 1248,
    "errors": 36
  }
}
```

---

# 18. Consultar candidatos

```http
GET /v1/admin/ingestion/candidates
```

Filtros conceptuales:

```text
status
kind
provider
runId
confidence
createdAfter
createdBefore
```

Debe soportar paginación.

---

# 19. Revisar candidato

```http
GET /v1/admin/ingestion/candidates/{candidateId}
```

La respuesta administrativa puede incluir:

```text
candidate
normalized data
provenance
match result
validation results
errors
candidate history
recommended action
```

No debe exponer secretos ni información sensible innecesaria.

---

# 20. Aprobar candidato

```http
POST /v1/admin/ingestion/candidates/{candidateId}/approve
```

La operación debe registrar:

```text
actor
admin session
timestamp
candidate
decision
reason
correlationId
```

y generar el correspondiente Audit Event.

---

# 21. Rechazar candidato

```http
POST /v1/admin/ingestion/candidates/{candidateId}/reject
```

Debe registrar un motivo.

Ejemplos:

```text
WRONG_ENTITY
DUPLICATE
INVALID_METADATA
OUT_OF_SCOPE
INCORRECT_SOURCE
OTHER
```

---

# 22. Retry

```http
POST /v1/admin/ingestion/candidates/{candidateId}/retry
```

No debe modificar manualmente el estado interno del candidato.

Debe generar una nueva operación de procesamiento controlada.

---

# 23. Adapter Contract

Conceptualmente:

```text
DiscoveryAdapter

id
version
capabilities
discover(context)
```

El adapter produce:

```text
DiscoveryCandidateInput
```

No produce directamente:

```text
MediaItem
Source
PlaybackSession
```

---

# 24. Discovery Context

El adapter puede recibir:

```json
{
  "runId": "run_1842",
  "mode": "FULL",
  "cursor": "...",
  "limits": {
    "maxItems": 5000
  }
}
```

El contexto debe ser controlado por el Scheduler/Orchestrator del Discovery.

---

# 25. Cursor

Adapters paginados pueden devolver información de continuación.

Conceptualmente:

```json
{
  "items": [],
  "nextCursor": "abc123",
  "hasMore": true
}
```

El cursor pertenece al estado del Discovery Run y no debe depender exclusivamente de memoria del worker.

---

# 26. Adapter Capabilities

Ejemplo:

```text
CONTENT_DISCOVERY
SOURCE_DISCOVERY
INCREMENTAL_DISCOVERY
FULL_DISCOVERY
METADATA_ENRICHMENT
```

Esto permite que el sistema conozca qué puede hacer cada adapter.

---

# 27. Events

Eventos de integración iniciales:

```text
DiscoveryRunStarted
DiscoveryRunCompleted
DiscoveryCandidateFound
CandidateMatched
CandidateApproved
MediaItemIngested
MediaItemUpdated
SourceCandidateDiscovered
SourceAssociated
IngestionFailed
ReconciliationCompleted
```

Los eventos deben contener identificadores y metadata suficiente para correlación.

No deben transportar secretos.

---

# 28. Event Example

```json
{
  "eventId": "evt_123",
  "eventType": "MediaItemIngested",
  "occurredAt": "2026-10-01T10:42:00Z",
  "aggregate": {
    "type": "MEDIA_ITEM",
    "id": "media_456"
  },
  "metadata": {
    "runId": "run_1842",
    "candidateId": "dc_123"
  }
}
```

---

# 29. Catalog Integration

Después de una incorporación:

```text
Discovery
    ↓
Catalog Application Service
    ↓
MediaItem
    ↓
Catalog Event
```

Discovery no debe conocer detalles internos como:

```text
SQL queries
table joins
database-specific implementation
```

---

# 30. Source Registry Integration

De forma equivalente:

```text
Discovery
    ↓
Source Registry Application Service
    ↓
Source
    ↓
Source Event
```

El Discovery Engine no decide cómo se almacena internamente una fuente.

---

# 31. Search Integration

La integración será indirecta:

```text
Discovery
    ↓
Catalog
    ↓
Catalog Event
    ↓
Search Projection
```

Nunca:

```text
Discovery
    ↓
Search DB
```

---

# 32. Health Integration

Después de registrar una fuente:

```text
Source Registry
    ↓
Source created
    ↓
Health observation/probe scheduling
```

Health determinará posteriormente:

```text
ACTIVE
DEGRADED
UNAVAILABLE
```

Discovery no asignará estos estados basándose únicamente en haber encontrado la fuente.

---

# 33. Idempotency

Los comandos de ingestión deberán soportar claves idempotentes cuando la operación pueda ser repetida.

Ejemplo:

```text
provider_x:tt0816692:CONTENT
```

La implementación concreta de la clave puede variar.

La propiedad requerida es:

> Reprocesar el mismo input válido no debe crear una segunda entidad canónica.

---

# 34. Concurrency

Dos workers pueden intentar procesar simultáneamente el mismo candidato.

La arquitectura deberá utilizar:

```text
unique constraints
transactions
idempotency
optimistic locking
```

según la operación.

Redis locks pueden complementar, pero no sustituir restricciones de integridad de PostgreSQL.

---

# 35. Optimistic Concurrency

Si un candidato es modificado mientras un administrador lo está revisando:

```text
Admin A
    ↓
Candidate version 5

Worker
    ↓
Candidate version 6
```

la operación administrativa debe detectar el conflicto.

Resultado:

```text
409 CONFLICT
```

en lugar de sobrescribir silenciosamente información.

---

# 36. API Error Semantics

Debe utilizarse el envelope global de la arquitectura:

```json
{
  "error": {
    "code": "CANDIDATE_NOT_FOUND",
    "message": "The requested candidate does not exist.",
    "details": {},
    "requestId": "req_123"
  }
}
```

Códigos relevantes:

```text
400
401
403
404
409
422
429
500
502
503
504
```

---

# 37. Seguridad contractual

Los contratos públicos nunca deben incluir:

```text
provider credentials
adapter secrets
raw authorization headers
internal URLs
private network information
gateway signing secrets
resolver credentials
```

Los contratos administrativos deben mostrar solamente la información necesaria para operar y auditar.

---

# 38. Versionado

Las APIs públicas y administrativas seguirán el esquema:

```text
/v1/...
```

Los cambios incompatibles requerirán nueva versión.

Los contratos internos podrán evolucionar independientemente cuando la comunicación sea puramente interna y esté controlada por el mismo repositorio.

---

# 39. Boundary Rule

La regla para el agente de código es:

> **Nunca usar la base de datos de otro motor como API.**

Incorrecto:

```text
Discovery → INSERT directo a media_items
```

si la arquitectura establece ownership mediante Catalog Application Service.

Correcto:

```text
Discovery
    ↓
Catalog Application Contract
    ↓
Catalog
```

---

# 40. Contrato final del pipeline

El flujo contractual completo queda:

```text
DiscoveryAdapter
      ↓
DiscoveryCandidate
      ↓
NormalizationResult
      ↓
MatchResult
      ↓
ValidationResult
      ↓
ApprovalDecision
      ↓
IngestionCommand
      ↓
Catalog / SourceRegistry
      ↓
Domain Event
      ↓
Search / Health / Observability
```

Este flujo constituye la frontera formal entre:

```text
adquisición
```

y:

```text
dominio canónico
```

---

# 41. Contrato maestro

El principio contractual definitivo es:

> **Los adapters producen evidencia; el pipeline interpreta esa evidencia; Catalog y Source Registry mantienen las entidades canónicas; Health determina disponibilidad; Playback consume esas entidades.**

Ninguna capa debe saltarse esta cadena para conseguir una implementación localmente más sencilla.
