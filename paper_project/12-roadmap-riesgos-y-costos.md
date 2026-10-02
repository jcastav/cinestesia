# 12. ROADMAP, VERSIONADO, RIESGOS Y COSTOS

## 12.1. Propósito de la sección

Esta sección define cómo la arquitectura diseñada en las secciones anteriores se transforma progresivamente en un sistema funcional, verificable y operable.

El objetivo no es establecer una fecha artificial para “terminar” el proyecto, sino definir una secuencia de evolución que permita:

* construir primero los caminos de mayor valor técnico;
* validar continuamente que la arquitectura funciona en la práctica;
* evitar desarrollar motores completos de manera aislada;
* obtener una versión funcional visible cada una o dos semanas;
* controlar la complejidad técnica;
* introducir infraestructura únicamente cuando sea necesaria;
* mantener el sistema ejecutable durante toda su evolución;
* identificar y mitigar los riesgos antes de que se conviertan en bloqueos;
* mantener los costos iniciales cercanos a cero;
* establecer criterios objetivos para pasar de una versión a la siguiente.

La estrategia principal será **Vertical Slice Development**.

En lugar de seguir una secuencia como:

```text
Catálogo completo
      ↓
Source Registry completo
      ↓
Resolver completo
      ↓
Gateway completo
      ↓
Player completo
      ↓
Usuarios completos
```

el proyecto seguirá una secuencia transversal:

```text
                   VERTICAL SLICE
                         │
                         ▼
┌─────────────────────────────────────────────┐
│ UI                                          │
│   ↓                                         │
│ API                                         │
│   ↓                                         │
│ Catalog                                     │
│   ↓                                         │
│ Source Registry                             │
│   ↓                                         │
│ Playback Orchestrator                       │
│   ↓                                         │
│ Resolver                                    │
│   ↓                                         │
│ Media Gateway                               │
│   ↓                                         │
│ Player                                      │
│   ↓                                         │
│ Video funcionando                           │
└─────────────────────────────────────────────┘
```

Cada nueva versión incrementará la profundidad, confiabilidad o capacidad de esta cadena.

La regla fundamental será:

> **No construir profundidad arquitectónica que todavía no tenga un camino funcional que la utilice.**

---

# 12.2. Restricciones reales de desarrollo

El roadmap se diseña considerando las condiciones reales del proyecto y no las de un equipo empresarial.

### 12.2.1. Capacidad disponible

El proyecto será desarrollado inicialmente por una sola persona, con una dedicación aproximada de:

**10–20 horas semanales.**

Por lo tanto, el roadmap no utilizará estimaciones propias de un equipo de varios desarrolladores.

La duración de una versión será una estimación de planificación y no una obligación contractual.

Una versión podrá prolongarse cuando aparezcan problemas de:

* integración;
* debugging;
* infraestructura;
* reproducción HLS;
* compatibilidad de navegador;
* resolución de fuentes;
* seguridad;
* límites de proveedores;
* aprendizaje de nuevas tecnologías.

### 12.2.2. Nivel técnico

El desarrollador tiene experiencia previa con:

* JavaScript;
* aplicaciones web;
* Next.js;
* despliegues;
* Supabase;
* proyectos pequeños.

Pero todavía está desarrollando experiencia en:

* TypeScript avanzado;
* Docker;
* debugging avanzado;
* observabilidad;
* infraestructura;
* sistemas de streaming;
* resiliencia;
* operación de servicios.

Por esta razón, el roadmap debe funcionar también como una **ruta de aprendizaje progresivo**.

No se introducirá una tecnología únicamente porque sea técnicamente interesante.

### 12.2.3. Presupuesto inicial

El presupuesto inicial objetivo es:

**USD $0.**

Esto significa que durante la etapa de desarrollo se priorizarán:

* planes gratuitos;
* recursos locales;
* servicios administrados con free tier;
* herramientas open source;
* despliegues pequeños;
* ausencia de servidores permanentes innecesarios;
* eliminación de infraestructura que todavía no genere valor.

El proyecto no debe asumir desde el inicio costos propios de una plataforma de producción con tráfico significativo.

### 12.2.4. Restricción de validación

Debe existir una demostración funcional con una frecuencia máxima aproximada de:

**una demostración cada 1–2 semanas.**

Una demostración puede ser pequeña.

Ejemplos:

* una página mostrando contenido real desde PostgreSQL;
* una película reproduciéndose;
* dos fuentes disponibles;
* fallback funcionando;
* progreso guardado;
* un reporte apareciendo en el CMS.

El objetivo es evitar semanas de trabajo cuyo resultado sea únicamente código interno invisible.

---

# 12.3. Principio rector: Vertical Slices

El proyecto no se desarrollará “motor por motor”.

Cada motor será implementado únicamente hasta el nivel requerido por la vertical slice actual.

Por ejemplo, para conseguir:

```text
Usuario
   ↓
Página de contenido
   ↓
Playback Session
   ↓
Fuente
   ↓
HLS
   ↓
Player
   ↓
Video
```

no es necesario implementar desde el principio:

* todos los estados de Health;
* todos los adaptadores;
* recomendaciones;
* autenticación avanzada;
* múltiples roles administrativos;
* circuit breakers;
* observabilidad completa;
* escalado horizontal;
* monetización.

La primera versión debe demostrar el camino crítico.

Posteriormente, cada versión aumentará la sofisticación.

### Regla de profundidad progresiva

La evolución será:

```text
Funciona
   ↓
Funciona con datos persistentes
   ↓
Puede descubrir e incorporar contenido
   ↓
Funciona con múltiples fuentes
   ↓
Puede resolver fuentes reales
   ↓
Funciona ante fallos
   ↓
Puede administrarse
   ↓
Puede observarse
   ↓
Puede escalar
   ↓
Puede monetizarse
   ↓
Puede operar de forma estable
```

La incorporación de Discovery & Ingestion antes de la expansión de múltiples Sources es deliberada.

La plataforma no debe depender indefinidamente de:

```text
Administrador
   ↓
crear MediaItem manualmente
   ↓
crear Source manualmente
```

sino evolucionar hacia:

```text
External World
      ↓
Discovery
      ↓
Ingestion
      ↓
Catalog + Source Registry
      ↓
Playback
```

La automatización se incrementará progresivamente, manteniendo provenance, validación y mecanismos de revisión para los casos ambiguos.


---

# 12.4. Roadmap general

El roadmap se organizará mediante **vertical slices progresivas**.

La incorporación de contenido y fuentes mediante **Discovery & Ingestion** se introduce antes de completar la arquitectura de reproducción, porque constituye el mecanismo mediante el cual la plataforma adquiere, normaliza y mantiene el contenido que posteriormente será consumido por Catalog, Source Registry y Playback.

El roadmap queda definido así:

| Versión          | Estado                 | Objetivo principal                                              |
| ---------------- | ---------------------- | --------------------------------------------------------------- |
| **v0.1.0-alpha** | Prototipo técnico      | Primer vertical slice: reproducir un video                      |
| **v0.2.0-alpha** | Catálogo               | Contenido persistente y navegación                              |
| **v0.3.0-alpha** | Discovery & Ingestion  | Descubrimiento, candidatos, matching e incorporación automática |
| **v0.4.0-alpha** | Sources + Orchestrator | Múltiples fuentes y selección de reproducción                   |
| **v0.5.0-beta**  | Resolución + Gateway   | Resolución real y transporte seguro                             |
| **v0.6.0-beta**  | Identity               | Usuarios, sesiones, biblioteca y progreso                       |
| **v0.7.0-beta**  | Health + Recovery      | Salud, reportes, fallback y recuperación                        |
| **v0.8.0-beta**  | Admin/CMS              | Operación administrativa e ingestión supervisada                |
| **v0.9.0-rc**    | Hardening              | Seguridad, testing, observabilidad y operación                  |
| **v1.0.0**       | V1                     | Primera versión estable del sistema definido                    |

Estas versiones no representan “motores terminados”.

Representan **incrementos funcionales del sistema completo**.

Una versión puede utilizar partes de múltiples motores cuando la vertical slice lo requiera.

---

# 12.5. v0.1.0-alpha — Primer Vertical Slice

## Objetivo

Demostrar que la plataforma puede reproducir un contenido audiovisual mediante su propia interfaz.

La versión debe responder afirmativamente a la pregunta:

> ¿Puedo abrir una página de contenido y ver un video?

### Alcance

Se implementará únicamente lo necesario para demostrar:

```text
Next.js
   ↓
Página de contenido
   ↓
Fastify API
   ↓
Contenido mínimo
   ↓
Playback básico
   ↓
Hls.js
   ↓
Stream de prueba
```

### Componentes

**Frontend**

* Next.js;
* TypeScript;
* Tailwind;
* página de detalle mínima;
* componente Player;
* integración Hls.js;
* controles básicos.

**Backend**

* Node.js;
* Fastify;
* endpoint básico de contenido;
* DTO mínimo;
* validación básica.

**Persistencia**

Inicialmente puede utilizarse PostgreSQL/Supabase con un modelo mínimo.

No se implementará todavía todo el modelo definitivo.

### Datos

Puede existir inicialmente un único contenido:

```text
media_item
    id
    slug
    title
    type
```

y una referencia mínima de reproducción.

La fuente puede ser una fuente de prueba autorizada y estable.

### No entra

* múltiples fuentes;
* Discovery & Ingestion completo;
* Source Resolver completo;
* Health;
* recomendaciones;
* autenticación;
* CMS;
* Ads;
* fallback automático;
* Gateway avanzado.

### Criterio de salida

La versión se considera terminada cuando:

1. la aplicación inicia correctamente;
2. el frontend obtiene contenido desde el backend;
3. el contenido se muestra;
4. Hls.js inicializa correctamente;
5. el usuario puede iniciar reproducción;
6. el video reproduce correctamente;
7. existe manejo básico de error.

---

# 12.6. v0.2.0-alpha — Catálogo mínimo

## Objetivo

Transformar el prototipo en una aplicación que posea un catálogo persistente.

Se introducirá formalmente el **Motor de Catálogo**.

### Funcionalidad

* `MediaItem`;
* tipos de contenido;
* títulos;
* identificadores;
* slug;
* estado de publicación;
* página de detalle;
* listado básico;
* persistencia PostgreSQL;
* repositorios y servicios de aplicación;
* DTOs de Catalog.

### Regla arquitectónica

El Catalog será la fuente canónica de identidad del contenido.

No se deberá confundir:

```text
MediaItem
```

con:

```text
Source
```

ni:

```text
Playable Representation
```

### Criterio de salida

Debe ser posible:

1. crear contenido;
2. almacenarlo;
3. consultarlo;
4. visualizarlo desde frontend;
5. reproducir un contenido asociado a una fuente de prueba.

---

# 12.7. v0.3.0-alpha — Discovery & Ingestion

## Objetivo

Introducir el motor que permite que la plataforma **encuentre, procese y proponga/incorpore contenido y fuentes sin depender de que el administrador cree manualmente cada registro**.

Esta versión constituye el primer vertical slice del ciclo de adquisición.

La pregunta que debe responder es:

> ¿Puede la plataforma descubrir información externa, convertirla en candidatos, determinar a qué contenido pertenece y comenzar a incorporarlo al sistema de forma trazable?

### Flujo principal

```text
External Source
      ↓
Discovery Adapter
      ↓
Discovery Candidate
      ↓
Normalization
      ↓
Entity Matching
      ↓
Deduplication
      ↓
Validation
      ↓
Ingestion
      ↓
Catalog / Source Registry
```

### Componentes

**Discovery**

* Discovery Orchestrator;
* Discovery Adapter;
* primer adapter autorizado;
* ejecución manual de Discovery;
* Discovery Run;
* generación de candidatos.

**Ingestion**

* Candidate Store;
* normalización;
* matching por External ID;
* matching determinístico básico;
* deduplicación;
* validación;
* incorporación a Catalog.

**Provenance**

Cada candidato deberá conservar, como mínimo:

```text
provider
externalId
adapterId
adapterVersion
runId
discoveredAt
```

### Collector

El Collector o scraper que realice la adquisición externa puede ser una implementación importante del adapter.

Sin embargo:

```text
Collector
    ↓
Discovery Adapter
    ↓
Discovery Candidate
```

y no:

```text
Collector
    ↓
Catalog directamente
```

El Collector no será responsable de:

* publicar contenido;
* seleccionar Sources;
* resolver Streams;
* seleccionar fuentes de playback;
* ejecutar Playback;
* determinar Health.

### Candidatos

Se soportarán inicialmente:

```text
CONTENT
SOURCE
```

Un Source puede ser descubierto antes de que exista una entidad canónica correspondiente.

### Matching

El orden inicial será:

```text
External ID exacto
       ↓
Identidad determinística
       ↓
Alias / título normalizado
       ↓
Caso ambiguo
       ↓
Revisión
```

No se realizarán merges destructivos cuando la evidencia sea insuficiente.

### Revisión

Los candidatos ambiguos podrán quedar:

```text
PENDING_REVIEW
```

La revisión administrativa completa se desarrollará en `v0.8.0-beta`, pero el modelo debe existir desde esta versión.

### Asincronía

Discovery podrá ejecutarse mediante:

```text
Run
  ↓
Job
  ↓
Queue
  ↓
Worker
```

La infraestructura deberá mantenerse proporcional al tamaño real del MVP.

No se introducirá Kafka, Kubernetes u otra infraestructura distribuida únicamente por anticipación.

### Criterio de salida

Debe ser posible ejecutar un Discovery Run y demostrar:

1. el adapter obtiene información externa;
2. se crea un Run;
3. se generan Discovery Candidates;
4. los candidatos conservan provenance;
5. se normalizan;
6. un candidato con External ID conocido puede hacer match con un `MediaItem`;
7. un candidato nuevo puede convertirse en una incorporación de Catalog;
8. un candidato ambiguo no se incorpora silenciosamente;
9. el proceso puede ejecutarse nuevamente sin crear duplicados;
10. los errores quedan registrados.

### Resultado esperado

```text
Proveedor externo
       ↓
   Discovery
       ↓
 Candidate Store
       ↓
    Matching
       ↓
 ┌─────┴─────┐
 ↓           ↓
MATCH      AMBIGUOUS
 ↓           ↓
Catalog    Review
```

Esta versión convierte el catálogo en un sistema que **puede comenzar a alimentarse automáticamente**.

---

# 12.8. v0.4.0-alpha — Sources y Playback Orchestrator

## Objetivo

Introducir formalmente múltiples fuentes por contenido y la capacidad de seleccionar una fuente de reproducción.

### Source Registry

Se implementará:

* `Source`;
* `Provider`;
* relación Content → Sources;
* estados de Source;
* metadata de idioma;
* calidad;
* capacidades;
* provenance;
* Source Registry.

Discovery podrá producir:

```text
Source Candidate
```

pero Source Registry será el propietario de la entidad canónica:

```text
Source
```

### Playback Orchestrator

Se implementará:

* obtención de Sources;
* filtrado por capacidad;
* evaluación básica de disponibilidad;
* selección;
* creación de PlaybackSession;
* manual source switch básico.

### Flujo

```text
Content
   ↓
Source Registry
   ↓
Multiple Sources
   ↓
Playback Orchestrator
   ↓
Selected Source
   ↓
PlaybackSession
```

### Regla

El Player no seleccionará Sources.

La decisión pertenece al backend.

### Criterio de salida

Debe ser posible:

1. asociar múltiples Sources a un contenido;
2. consultar sus metadata;
3. solicitar una PlaybackSession;
4. permitir que el Orchestrator seleccione una;
5. reproducir la sesión;
6. cambiar manualmente a otra Source mediante backend.

---

# 12.9. v0.5.0-beta — Source Resolver y Media Gateway

## Objetivo

Sustituir la referencia simplificada de reproducción por la arquitectura real de resolución y transporte.

### Flujo

```text
Player
   ↓
Playback Session
   ↓
Orchestrator
   ↓
Source Registry
   ↓
Resolver
   ↓
Adapter
   ↓
Playable Representation
   ↓
Media Gateway
   ↓
Hls.js
```

### Source Resolver

Se implementará:

* contrato `SourceAdapter`;
* Adapter Registry;
* primer adapter autorizado;
* resolución;
* timeout;
* errores normalizados;
* registro de intentos;
* políticas básicas de retry;
* protección SSRF.

### Media Gateway

Inicialmente:

* validación de PlaybackSession;
* manifest endpoint;
* resource IDs;
* reescritura segura de HLS;
* streaming;
* timeouts;
* backpressure;
* validación SSRF;
* Range cuando corresponda;
* métricas básicas.

### Importante

No se implementará todavía una infraestructura de Gateway diseñada para miles de usuarios simultáneos.

Primero debe comprobarse que:

```text
Source
   ↓
Resolver
   ↓
Gateway
   ↓
Player
```

funciona correctamente.

### Criterio de salida

Un usuario debe poder reproducir un contenido real utilizando la arquitectura definitiva de reproducción.

---

# 12.10. v0.6.0-beta — Identity, sesiones y progreso

## Objetivo

Introducir la identidad del usuario sin alterar la arquitectura de reproducción.

### Funcionalidad

* registro;
* inicio de sesión;
* logout;
* sesiones;
* perfil;
* preferencias básicas;
* favoritos;
* historial;
* progreso.

### Progreso

El flujo será:

```text
Player
   ↓
Playback Progress
   ↓
Identity / User Domain
   ↓
PostgreSQL
```

Para usuarios anónimos se mantendrá almacenamiento local.

Para usuarios registrados se utilizará persistencia del servidor.

### Regla

```text
AuthSession ≠ PlaybackSession
```

Una sesión de autenticación identifica al usuario.

Una PlaybackSession autoriza y controla una reproducción concreta.

### Criterio de salida

Un usuario registrado debe poder:

1. iniciar sesión;
2. reproducir contenido;
3. guardar progreso;
4. abandonar;
5. regresar;
6. continuar desde el punto almacenado.

---

# 12.11. v0.7.0-beta — Source Health y recuperación

## Objetivo

Introducir resiliencia real frente a fuentes defectuosas.

### Componentes

* HealthObservation;
* Source Health;
* reportes;
* agregación;
* probes básicos;
* estados `ACTIVE`, `DEGRADED`, `UNAVAILABLE`;
* confidence/hysteresis;
* fallback;
* recuperación.

### Flujo

```text
Playback Failure
      ↓
Observation
      ↓
Health Engine
      ↓
Source Health
      ↓
Orchestrator
      ↓
Alternative Source
      ↓
New PlaybackSession
      ↓
Player Recovery
```

### Manual source switch

También se implementará:

```text
Player
  ↓
Switch Source
  ↓
Playback API
  ↓
Orchestrator
  ↓
Alternative Source
  ↓
New PlaybackSession
```

### Integración con Discovery

Discovery no deberá marcar una Source como `ACTIVE` simplemente porque haya sido encontrada.

La relación será:

```text
Discovery
    ↓
Source Registry
    ↓
Health
    ↓
Availability State
```

### Criterio de salida

Una fuente que falle no debe obligatoriamente provocar el final de la reproducción si existe una alternativa válida.

La recuperación deberá conservar, cuando sea posible:

```text
currentTime
```

y reconstruir la reproducción desde el nuevo punto de entrada.

---

# 12.12. v0.8.0-beta — Admin/CMS y operación del sistema

## Objetivo

Permitir operar la plataforma sin modificar directamente la base de datos.

El Admin será el **Control Plane humano** de los motores.

### Catalog

* crear contenido;
* editar;
* publicar;
* archivar.

### Sources

* agregar;
* editar;
* deshabilitar;
* consultar estado;
* consultar provenance.

### Health

* visualizar fuentes degradadas;
* consultar observaciones;
* revisar reportes.

### Discovery & Ingestion

Se incorpora formalmente la operación del motor:

* consultar Discovery Runs;
* iniciar Runs;
* consultar candidatos;
* revisar candidatos ambiguos;
* aprobar;
* rechazar;
* reintentar;
* consultar errores;
* consultar provenance;
* visualizar adapters;
* habilitar/deshabilitar adapters cuando corresponda.

### Ejemplo conceptual

```text
Discovery Run #1842

Started: 10:32
Duration: 04:18

Candidates found: 1,284
New content: 73
Existing content: 912
Possible duplicates: 144
Rejected: 102

Sources discovered: 2,918
Sources associated: 2,641

Errors: 36

[Ver candidatos]
[Ver errores]
[Reintentar]
```

### Users

* consultar;
* suspender;
* administrar permisos básicos.

### Audit

* registrar acciones administrativas;
* conservar actor;
* timestamp;
* recurso;
* resultado;
* motivo;
* correlation ID.

### Regla arquitectónica

```text
Admin UI
   ↓
Admin API
   ↓
Application Commands
   ↓
Motores
   ↓
Persistencia
```

Nunca:

```text
Admin UI → PostgreSQL
```

### Criterio de salida

El operador debe poder gestionar el contenido y las fuentes principales de la plataforma mediante el CMS y, adicionalmente, **operar el ciclo Discovery → Ingestion sin acceder directamente a la base de datos**.


# 12.13. v0.9.0-rc — Hardening y Release Candidate

Esta versión no pretende agregar una gran cantidad de funcionalidades.

Su objetivo es convertir el sistema construido en un sistema confiable.

## Seguridad

Se revisará:

* autenticación;
* autorización;
* sesiones;
* secretos;
* SSRF;
* CORS;
* CSP;
* CSRF;
* XSS;
* SQL injection;
* rate limiting;
* validación de entrada;
* protección de Gateway;
* protección de Admin;
* exposición accidental de URLs de origen;
* logs con información sensible.

## Testing

Se completará la pirámide:

```text
          E2E
        ───────
      Integration
    ───────────────
       Component
  ───────────────────
          Unit
```

Se añadirán pruebas específicas de:

* Catalog;
* Source Registry;
* Orchestrator;
* Resolver;
* Gateway;
* Player;
* Identity;
* Search;
* Health;
* Admin.

## Observabilidad

Se incorporarán:

* logs estructurados;
* métricas;
* tracing cuando sea necesario;
* error monitoring;
* QoE;
* dashboards básicos;
* alertas relevantes.

## Operación

Se verificará:

* despliegue reproducible;
* migraciones;
* backups;
* restore;
* health checks;
* readiness;
* rollback;
* configuración;
* secretos;
* recuperación ante fallos.

## Performance

No se utilizarán los presupuestos teóricos definidos durante el diseño como garantías.

Se realizarán mediciones reales de:

* API;
* DB;
* Resolver;
* Gateway;
* Player;
* TTFF;
* Playback Success;
* Rebuffer;
* concurrencia;
* bandwidth;
* resolución.

### Criterio de salida

El sistema deberá poder desplegarse de manera reproducible y contar con evidencia suficiente para diagnosticar los problemas principales.

---

# 12.14. v1.0.0 — Primera versión estable

La versión 1.0.0 no significa que el proyecto esté “terminado para siempre”.

Significa que la arquitectura definida para la primera generación del producto ha alcanzado un nivel estable y operable.

## Capacidades esperadas

### Producto

* catálogo;
* detalle;
* búsqueda;
* reproducción;
* fuentes múltiples;
* selección automática;
* cambio manual;
* fallback;
* progreso;
* usuarios;
* reportes;
* administración.

### Arquitectura

* Catalog;
* Source Registry;
* Source Resolver;
* Playback Orchestrator;
* Media Gateway;
* Media Player Core;
* Identity;
* Search & Discovery;
* Source Health;
* Admin/CMS;
* Ad Manager cuando se haya habilitado como parte del producto.

### Operación

* CI/CD;
* testing;
* logs;
* métricas;
* error monitoring;
* backups;
* rollback;
* configuración;
* seguridad;
* documentación operacional.

### Criterio general

```text
v1.0.0

        ┌──────────────────────┐
        │      Usuario         │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │    Web / Player      │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │      Core API        │
        └──────────┬───────────┘
                   │
       ┌───────────┼────────────┐
       ▼           ▼            ▼
   Catalog      Search       Identity
       │
       ▼
 Source Registry
       │
       ▼
 Orchestrator
       │
       ▼
   Resolver
       │
       ▼
   Gateway
       │
       ▼
    Video

        + Health
        + Reports
        + Admin
        + Observability
        + Security
```

---

# 12.15. Desarrollo posterior a v1.0.0

La arquitectura no debe asumir desde el principio todas las capacidades futuras.

Después de v1.0.0 pueden aparecer nuevas líneas de evolución:

### v1.x

* más fuentes;
* mejores adaptadores;
* mejor búsqueda;
* mejores recomendaciones;
* optimización de Gateway;
* mejoras de Player;
* mejoras de UX;
* mejoras de observabilidad;
* monetización;
* optimización de costos.

### v2.x

Podrían evaluarse:

* aplicaciones móviles;
* aplicaciones para TV;
* búsqueda semántica;
* recomendaciones avanzadas;
* infraestructura distribuida;
* CDN más sofisticada;
* multi-región;
* escalado avanzado;
* mayor automatización.

Estas funcionalidades no deben convertirse en requisitos ocultos de v1.0.

---

# 12.16. Cadencia de desarrollo

La unidad básica de planificación no será únicamente la versión.

También se utilizará un ciclo corto de aproximadamente 1–2 semanas.

Cada ciclo deberá producir:

```text
Plan
 ↓
Implementación
 ↓
Integración
 ↓
Prueba
 ↓
Demo
 ↓
Corrección
 ↓
Siguiente slice
```

## Ejemplo

### Semana 1

Objetivo:

```text
API → contenido → Player
```

Demo:

> “Puedo abrir una película y reproducirla.”

### Semana 2

Objetivo:

```text
PostgreSQL → catálogo → página de detalle
```

Demo:

> “El contenido ya no está hardcodeado.”

### Semana 3

Objetivo:

```text
Content → Sources
```

Demo:

> “Una película tiene múltiples fuentes.”

### Semana 4

Objetivo:

```text
Source → Orchestrator → PlaybackSession
```

Demo:

> “El backend decide qué fuente reproducir.”

Este patrón continuará durante todo el proyecto.

---

# 12.17. Criterios de promoción de versión

Una versión no se considera completada simplemente porque “el código funciona en mi computador”.

Debe cumplir cuatro dimensiones:

## 1. Funcional

La funcionalidad principal funciona.

## 2. Integrada

La funcionalidad atraviesa correctamente las capas correspondientes.

## 3. Verificable

Existen pruebas manuales o automatizadas suficientes para demostrar que funciona.

## 4. Operable

Cuando la complejidad de la versión lo justifique, existen:

* logs;
* manejo de errores;
* configuración;
* health checks;
* documentación;
* rollback o recuperación.

La exigencia operativa crecerá progresivamente.

No tendría sentido exigir observabilidad completa a `v0.1.0-alpha`, pero sí sería inaceptable llegar a `v1.0.0` sin ella.

---

# 12.18. Estrategia de versionado

Se utilizará una variante de **Semantic Versioning**:

```text
MAJOR.MINOR.PATCH
```

acompañada por estados de madurez cuando corresponda.

Ejemplos:

```text
0.1.0-alpha
0.5.0-beta
0.9.0-rc
1.0.0
1.0.1
1.1.0
2.0.0
```

## MAJOR

Se incrementa cuando existe una incompatibilidad importante con los contratos públicos o una evolución arquitectónica que requiere migración.

Ejemplo:

```text
v1.x → v2.x
```

cuando los contratos públicos o el modelo fundamental de interacción cambian de manera incompatible.

## MINOR

Se incrementa cuando se añade funcionalidad compatible.

Ejemplo:

```text
v1.0.0 → v1.1.0
```

por incorporar una funcionalidad nueva sin romper los contratos existentes.

## PATCH

Se utiliza para:

* bugs;
* correcciones;
* vulnerabilidades;
* pequeños ajustes;
* mejoras internas compatibles.

Ejemplo:

```text
v1.1.0 → v1.1.1
```

---

# 12.19. Significado de alpha, beta y release candidate

## Alpha

El sistema está siendo construido y puede cambiar significativamente.

Características:

* funcionalidad incompleta;
* contratos todavía evolucionando;
* errores conocidos;
* arquitectura en validación;
* no destinada a usuarios externos.

Ejemplo:

```text
v0.3.0-alpha
```

## Beta

El camino principal funciona y el esfuerzo comienza a desplazarse desde construcción hacia estabilización.

Características:

* funcionalidades principales implementadas;
* integración considerable;
* pruebas más completas;
* cambios todavía posibles;
* usuarios controlados pueden comenzar a probar.

Ejemplo:

```text
v0.7.0-beta
```

## Release Candidate

La funcionalidad principal se considera completa.

El objetivo pasa a ser encontrar defectos antes de declarar estable la versión.

Ejemplo:

```text
v0.9.0-rc
```

## Stable

La versión estable es:

```text
v1.0.0
```

y representa la primera línea de producto que se considera suficientemente madura para uso normal.

---

# 12.20. Versionado de código, API y base de datos

El versionado del producto no será el único versionado.

Existirán al menos cuatro niveles:

```text
Producto
   │
   ├── Application Version
   │
   ├── API Version
   │
   ├── Database Schema Version
   │
   └── Adapter Version
```

## Application Version

Ejemplo:

```text
v0.7.0-beta
```

Identifica el estado global del sistema.

## API Version

Las APIs públicas comenzarán con:

```text
/v1/...
```

La evolución compatible deberá mantenerse dentro de `v1`.

Un cambio incompatible podrá introducir:

```text
/v2/...
```

pero no se creará una nueva versión simplemente por agregar un campo opcional.

## Database Schema

El esquema será administrado mediante migraciones versionadas.

Cada cambio importante deberá poder identificarse y reproducirse.

No se realizarán modificaciones manuales no documentadas sobre producción.

## Adapter Version

Los adaptadores deberán poder evolucionar independientemente del resto del sistema.

Conceptualmente:

```text
provider: example-provider
adapter:
    name: example
    version: 1.3.0
```

Esto permitirá identificar qué implementación produjo una determinada resolución.

---

# 12.21. Matriz de riesgos

Los riesgos principales se agrupan en:

1. técnicos;
2. operativos;
3. de costos;
4. de seguridad;
5. de dependencia externa;
6. de producto;
7. de capacidad individual.

Se utilizará:

```text
Impacto × Probabilidad
```

como mecanismo cualitativo de priorización.

No debe interpretarse como una probabilidad matemática precisa.

---

# 12.22. Riesgo: complejidad excesiva para una sola persona

**Impacto:** Alto
**Probabilidad:** Alta

La arquitectura contiene múltiples motores y responsabilidades que podrían superar la capacidad disponible de desarrollo.

### Mitigación

* vertical slices;
* modular monolith inicialmente;
* evitar microservicios prematuros;
* limitar herramientas;
* priorizar camino crítico;
* introducir infraestructura sólo cuando sea necesaria;
* definir MVP real;
* mantener una lista explícita de deuda técnica.

### Señal de alerta

Si una funcionalidad requiere semanas sin producir una demostración visible, debe reconsiderarse su alcance.

---

# 12.23. Riesgo: aprendizaje de tecnologías nuevas

**Impacto:** Medio/Alto
**Probabilidad:** Alta

El proyecto requiere aprender:

* TypeScript;
* Fastify;
* Drizzle;
* HLS;
* Docker;
* Redis;
* observabilidad;
* debugging;
* seguridad;
* operación.

### Mitigación

No aprender todas simultáneamente.

La secuencia será:

```text
Next.js + Fastify
       ↓
PostgreSQL + Drizzle
       ↓
Hls.js
       ↓
Playback architecture
       ↓
Redis
       ↓
Gateway
       ↓
Testing
       ↓
Docker
       ↓
Observability
```

Docker, por ejemplo, no debe convertirse en requisito para demostrar `v0.1.0`.

---

# 12.24. Riesgo: cambios o indisponibilidad de fuentes externas

**Impacto:** Alto
**Probabilidad:** Alta

Las fuentes externas están fuera del control del proyecto.

Pueden:

* cambiar su estructura;
* modificar sus APIs;
* dejar de estar disponibles;
* modificar sus formatos;
* cambiar sus requisitos de acceso;
* presentar errores intermitentes.

### Mitigación

* Adapter Registry;
* Strategy Pattern;
* aislamiento por proveedor;
* múltiples Sources;
* Source Health;
* fallback;
* resolución desacoplada;
* feature flags;
* versionado de adaptadores;
* pruebas con fixtures;
* integración autorizada.

Una modificación de un proveedor no debe obligar a modificar el Player.

---

# 12.25. Riesgo: dependencia de una única fuente

**Impacto:** Alto
**Probabilidad:** Alta

Si un contenido depende de una única Source, su disponibilidad depende completamente de ella.

### Mitigación

El modelo de datos debe permitir:

```text
1 Content
   ↓
N Sources
```

La disponibilidad debe evaluarse por Source y no únicamente por Content.

---

# 12.26. Riesgo: Media Gateway como cuello de botella

**Impacto:** Muy alto
**Probabilidad:** Media

Si el Gateway retransmite todo el video, la transferencia de datos puede convertirse rápidamente en el principal costo y cuello de botella del sistema.

### Mitigación

* Smart Passthrough cuando sea técnica y legalmente apropiado;
* clasificación de hosts;
* streaming sin almacenamiento local;
* backpressure;
* límites de concurrencia;
* métricas de bandwidth;
* medición de conexiones activas;
* CDN cuando el volumen lo justifique;
* capacidad basada en bitrate y concurrencia, no únicamente RPS.

La capacidad del Gateway debe medirse aproximadamente mediante:

```text
Concurrent Viewers
×
Average Bitrate
=
Required Throughput
```

Por ejemplo, 100 espectadores consumiendo simultáneamente un promedio de 3 Mbps implican aproximadamente:

```text
100 × 3 Mbps = 300 Mbps
```

antes de considerar overhead, picos y características específicas del flujo.

---

# 12.27. Riesgo: costos de egress

**Impacto:** Muy alto
**Probabilidad:** Alta una vez que exista tráfico

El video es un tipo de tráfico radicalmente diferente al tráfico convencional de una API.

Una API puede recibir miles de solicitudes pequeñas.

Un Gateway de video puede mantener conexiones prolongadas y transferir gigabytes o terabytes.

Una estimación simplificada será:

```text
Monthly Egress
≈
Concurrent Viewers
×
Average Bitrate
×
Viewing Hours
×
3600
÷
8
```

Por ejemplo:

```text
100 viewers
× 3 Mbps
× 4 h/día
× 30 días
÷ 8

≈ 16.2 TB/mes
```

Este cálculo demuestra por qué **el número de usuarios no es suficiente para estimar el costo**.

También deben conocerse:

* bitrate promedio;
* duración promedio;
* horas de visualización;
* porcentaje de tráfico que atraviesa Gateway;
* cache hit ratio;
* tráfico directo;
* tráfico de manifests;
* tráfico de segmentos.

---

# 12.28. Riesgo: Redis utilizado como fuente de verdad

**Impacto:** Alto
**Probabilidad:** Media

Redis puede contener:

* sesiones;
* locks;
* cache;
* rate limits;
* metadata temporal;
* singleflight;
* colas.

Pero no debe convertirse accidentalmente en la única fuente de datos críticos.

### Mitigación

La fuente de verdad persistente será PostgreSQL.

Redis será tratado como infraestructura efímera o aceleradora cuando corresponda.

Si Redis desaparece:

```text
La aplicación puede degradarse
```

pero no debería perder permanentemente:

* catálogo;
* usuarios;
* progreso persistido;
* fuentes;
* reportes;
* configuración crítica.

---

# 12.29. Riesgo: inconsistencias entre Catalog y Search

**Impacto:** Medio
**Probabilidad:** Media

El índice de búsqueda es una proyección.

Puede quedar temporalmente desactualizado.

### Mitigación

* eventos de dominio;
* actualización incremental;
* reconciliación;
* rebuild completo;
* métricas de indexing lag.

El índice no será tratado como fuente de verdad.

---

# 12.30. Riesgo: errores de seguridad en Gateway

**Impacto:** Crítico
**Probabilidad:** Media

El Gateway interactúa con recursos externos y procesa tráfico de video.

Un diseño incorrecto puede introducir:

* SSRF;
* abuso de ancho de banda;
* fuga de URLs;
* hotlinking;
* consumo ilimitado;
* acceso a recursos no autorizados;
* problemas de autenticación.

### Mitigación

* PlaybackSession;
* resource IDs opacos;
* tokens temporales;
* validación estricta de URLs;
* bloqueo de redes privadas/reservadas;
* validación de redirects;
* límites de tamaño;
* timeouts;
* rate limiting;
* observabilidad;
* pruebas de seguridad.

---

# 12.31. Riesgo: pérdida de datos

**Impacto:** Alto
**Probabilidad:** Baja/Media

Los datos importantes incluyen:

* catálogo;
* fuentes;
* usuarios;
* progreso;
* reportes;
* auditoría;
* configuración.

### Mitigación

* PostgreSQL administrado;
* backups;
* restauración probada;
* migraciones versionadas;
* separación entre datos persistentes y cache;
* documentación de recuperación.

---

# 12.32. Riesgo: cambios destructivos en base de datos

**Impacto:** Alto
**Probabilidad:** Media

Una migración incorrecta puede romper simultáneamente varias partes del sistema.

### Mitigación

Se utilizará la estrategia:

```text
Expand
   ↓
Deploy
   ↓
Migrate / Backfill
   ↓
Contract
```

En lugar de:

```text
DROP COLUMN
   ↓
Deploy
   ↓
Esperar que todo funcione
```

Las migraciones destructivas requerirán especial revisión.

---

# 12.33. Riesgo: falta de observabilidad

**Impacto:** Alto
**Probabilidad:** Media/Alta

Una aplicación puede funcionar correctamente durante las pruebas y fallar de manera difícil de diagnosticar en producción.

### Mitigación

Desde etapas progresivas se incorporarán:

* structured logs;
* request IDs;
* error monitoring;
* métricas;
* Playback telemetry;
* Gateway metrics;
* Resolver metrics.

La observabilidad crecerá junto con la complejidad.

---

# 12.34. Riesgo: exceso de arquitectura

**Impacto:** Alto
**Probabilidad:** Alta

Existe un riesgo particular en este proyecto: construir la arquitectura con mayor velocidad que el producto.

Ejemplos:

* Kubernetes antes de tener usuarios;
* múltiples microservicios antes de tener integración;
* Kafka antes de necesitar procesamiento distribuido;
* multi-región antes de existir carga;
* service mesh antes de existir una flota de servicios;
* observabilidad empresarial antes de tener tráfico significativo.

### Mitigación

Principio:

> **La arquitectura debe crecer como respuesta a evidencia, no como anticipación ilimitada.**

Por ello el MVP podrá ejecutarse como un **monolito modular con workers y un Gateway separado cuando sea necesario**, aunque conceptualmente existan múltiples motores.

---

# 12.35. Riesgo: scope creep

**Impacto:** Alto
**Probabilidad:** Alta

El proyecto tiene muchas posibilidades de expansión:

* móvil;
* TV;
* IA;
* recomendaciones;
* chat;
* comentarios;
* monetización;
* crawling;
* automatización;
* multi-región;
* analytics;
* nuevas fuentes.

### Mitigación

Toda nueva funcionalidad debe clasificarse:

```text
MVP
V1
V1.x
V2
Backlog
Descartado
```

Si una funcionalidad no es necesaria para la vertical slice actual, no debe bloquearla.

---

# 12.36. Riesgo: agotamiento del desarrollador

**Impacto:** Alto
**Probabilidad:** Media/Alta

Al tratarse de un proyecto individual desarrollado en paralelo con otras responsabilidades, existe riesgo de intentar avanzar demasiado rápido.

### Mitigación

* 10–20 horas semanales como referencia;
* objetivos pequeños;
* demos frecuentes;
* versiones incrementales;
* semanas de estabilización;
* deuda técnica explícita;
* evitar jornadas indefinidas;
* aceptar que una versión puede tardar más de lo estimado.

La continuidad del proyecto es más importante que acelerar una versión concreta.

---

# 12.37. Riesgos legales y de cumplimiento

**Impacto:** Alto
**Probabilidad:** Dependiente del contenido y jurisdicción

La plataforma opera alrededor de contenido audiovisual y fuentes externas.

Por ello existe un riesgo que no es puramente técnico.

La arquitectura debe permitir separar:

```text
Technical availability
```

de:

```text
Authorization / Legal status
```

El hecho de que una fuente sea técnicamente accesible no significa que su utilización esté necesariamente autorizada.

### Mitigación arquitectónica

* mantener claridad sobre el rol de agregación;
* no asumir que una fuente externa puede utilizarse simplemente porque es accesible;
* documentar procedencia;
* permitir deshabilitar fuentes;
* mantener registros administrativos;
* establecer procesos de retirada cuando sean aplicables;
* revisar obligaciones legales antes de operar públicamente.

Este documento describe arquitectura técnica y no constituye asesoría jurídica.

---

# 12.38. Matriz consolidada de riesgos

| Riesgo                      | Impacto    | Probabilidad     | Mitigación principal         |
| --------------------------- | ---------- | ---------------- | ---------------------------- |
| Complejidad individual      | Alto       | Alta             | Vertical slices              |
| Aprendizaje tecnológico     | Medio/Alto | Alta             | Evolución progresiva         |
| Cambio de fuentes externas  | Alto       | Alta             | Adapters + Registry          |
| Fuente única                | Alto       | Alta             | Multi-source                 |
| Gateway saturado            | Muy alto   | Media            | Smart Passthrough + medición |
| Egress elevado              | Muy alto   | Alta con tráfico | Control de delivery          |
| Redis como fuente de verdad | Alto       | Media            | PostgreSQL                   |
| Search desactualizado       | Medio      | Media            | Reconciliation               |
| Vulnerabilidad Gateway      | Crítico    | Media            | SSRF + sessions + limits     |
| Pérdida de datos            | Alto       | Baja/Media       | Backups + restore            |
| Migraciones destructivas    | Alto       | Media            | Expand/Contract              |
| Falta de observabilidad     | Alto       | Media/Alta       | Logs + metrics               |
| Sobrearquitectura           | Alto       | Alta             | Evidencia antes de escalar   |
| Scope creep                 | Alto       | Alta             | Versionado/backlog           |
| Agotamiento                 | Alto       | Media/Alta       | Cadencia sostenible          |
| Riesgo legal                | Alto       | Dependiente      | Governance + revisión legal  |

---

# 12.39. Estrategia de costos

El costo del proyecto se dividirá en cuatro categorías:

```text
1. Desarrollo
2. Infraestructura
3. Operación
4. Escalamiento
```

Durante las primeras versiones, el objetivo será mantener:

```text
Costo recurrente ≈ $0
```

siempre que los límites de los servicios utilizados lo permitan.

No se debe interpretar esto como una garantía de que una plataforma de streaming completa puede operar indefinidamente sin costo.

La estrategia es:

> **$0 mientras el proyecto sea principalmente desarrollo y pruebas; pagar únicamente cuando exista una necesidad real.**

---

# 12.40. Costos de desarrollo

Inicialmente:

```text
Código: $0
IDE: $0
Git: $0
Frameworks: $0
Librerías open source: $0
Testing local: $0
Docker: $0
```

El costo principal será el tiempo del desarrollador.

Por esta razón, el recurso más escaso inicialmente no será el dinero:

**será el tiempo.**

---

# 12.41. Costos de infraestructura durante desarrollo

La infraestructura objetivo será:

```text
Frontend
Vercel

Backend
Railway

Database
Supabase PostgreSQL

Cache
Upstash Redis
```

La utilización de planes gratuitos o créditos iniciales será prioritaria mientras sea técnicamente suficiente.

El diseño debe asumir que estos límites pueden cambiar y que cada servicio debe evaluarse antes de convertirlo en dependencia permanente.

No se considerará que un free tier es una garantía contractual de producción.

---

# 12.42. Estrategia económica por versión

| Versión | Infraestructura esperada    |           Objetivo de costo |
| ------- | --------------------------- | --------------------------: |
| v0.1    | Local + servicios gratuitos |                          $0 |
| v0.2    | PostgreSQL gratuito         |                          $0 |
| v0.3    | DB + Redis gratuito         |                          $0 |
| v0.4    | Core API pequeña            |                 $0 o mínimo |
| v0.5    | Resolver + Gateway          | Puede requerir primer costo |
| v0.6    | Identity + DB               |                 $0 o mínimo |
| v0.7    | Health workers              |                 $0 o mínimo |
| v0.8    | Admin                       |                 $0 o mínimo |
| v0.9    | Hardening/operación         |        Según observabilidad |
| v1.0    | Producción inicial          |          Según tráfico real |

La tabla representa una estrategia de planificación, no una cotización de proveedores.

---

# 12.43. Primer momento en que debe aceptarse un costo

El proyecto no debe pagar infraestructura simplemente porque “ya existe una arquitectura profesional”.

El primer gasto debe producirse cuando exista una razón objetiva.

Ejemplos:

### Caso A — Backend

El backend supera de manera recurrente los recursos gratuitos.

Entonces:

```text
Free Tier
   ↓
medición
   ↓
cuello de botella
   ↓
upgrade
```

### Caso B — Base de datos

La base de datos supera:

* capacidad;
* conexiones;
* egress;
* características requeridas.

Se escala únicamente el componente afectado.

### Caso C — Redis

Redis supera sus límites de almacenamiento, comandos o bandwidth.

Se mide primero.

### Caso D — Gateway

Este es el caso más crítico.

Si el tráfico de video crece, el costo puede venir principalmente del **egress**, no de PostgreSQL ni de la API.

Por eso el Gateway tendrá un presupuesto y métricas propias.

---

# 12.44. Presupuesto de transición a producción

Antes de activar una operación pública significativa, se deberá construir un presupuesto basado en mediciones reales.

La fórmula conceptual será:

```text
Costo mensual total
=
Frontend
+
Backend
+
Database
+
Redis
+
Gateway
+
CDN
+
Storage
+
Observability
+
Domain
+
Other services
```

Pero el componente dominante puede cambiar dependiendo del tráfico.

Para esta plataforma:

```text
Video Egress
```

debe tratarse como una categoría independiente.

---

# 12.45. Presupuesto basado en escenarios

En lugar de definir un único costo fijo, se utilizarán escenarios.

## Escenario A — Desarrollo

```text
Usuarios: muy pocos
Concurrencia: mínima
Video: pruebas
```

Objetivo:

```text
≈ $0
```

## Escenario B — Beta privada

```text
Usuarios: decenas
Concurrencia: baja
Video: uso real limitado
```

Objetivo:

```text
Costo bajo y controlado
```

## Escenario C — Primera producción

```text
Usuarios: cientos
Concurrencia: variable
Video: consumo real
```

Se requiere:

* medición de egress;
* monitoring;
* backups;
* alertas;
* presupuesto mensual.

## Escenario D — Crecimiento

```text
Usuarios: miles+
Concurrencia significativa
```

En este punto pueden justificarse:

* CDN;
* Gateway horizontal;
* workers adicionales;
* base de datos escalada;
* Redis de mayor capacidad;
* observabilidad avanzada;
* infraestructura especializada.

---

# 12.46. Regla de escalamiento

No se escalará toda la plataforma cuando sólo exista un cuello de botella.

La secuencia será:

```text
Medir
  ↓
Identificar bottleneck
  ↓
Optimizar
  ↓
Volver a medir
  ↓
Escalar componente
  ↓
Volver a medir
```

Ejemplo:

Si el problema es:

```text
Gateway bandwidth
```

no tiene sentido aumentar inmediatamente:

```text
PostgreSQL
Redis
Frontend
```

El escalamiento debe atacar el cuello de botella real.

---

# 12.47. Control de costos

Se implementarán progresivamente:

* límites de presupuesto;
* alertas de uso;
* métricas de bandwidth;
* métricas de almacenamiento;
* métricas de requests;
* métricas de Gateway;
* revisión mensual de costos;
* eliminación de recursos no utilizados;
* TTL para datos temporales;
* cache cuando reduzca costo;
* feature flags para deshabilitar funcionalidades costosas.

Los costos serán considerados una métrica operacional.

---

# 12.48. Costos de observabilidad

Durante desarrollo:

```text
Logs locales
+
monitorización básica
```

pueden ser suficientes.

A medida que crezca el sistema podrán incorporarse:

* error tracking;
* métricas;
* dashboards;
* tracing;
* alertas.

No se instalará una plataforma completa de observabilidad empresarial antes de necesitarla.

---

# 12.49. Costos de almacenamiento

El proyecto intentará evitar almacenamiento permanente de video.

La arquitectura base es:

```text
External Source
      ↓
Resolver
      ↓
Gateway
      ↓
User
```

y no:

```text
External Source
      ↓
Nuestro Storage
      ↓
Nuestro CDN
      ↓
User
```

Esto evita convertir el proyecto en un sistema de almacenamiento/transcodificación audiovisual.

El almacenamiento propio quedará principalmente para:

* metadata;
* imágenes permitidas;
* configuración;
* logs;
* reportes;
* datos de usuarios;
* artefactos necesarios.

---

# 12.50. Costos de dominio y servicios adicionales

Los costos externos que pueden aparecer posteriormente incluyen:

* dominio;
* correo transaccional;
* servicios de observabilidad;
* CDN;
* infraestructura adicional;
* backups externos;
* servicios de monetización;
* herramientas de analítica;
* proveedores de autenticación especializados.

Ninguno debe ser introducido antes de que exista una necesidad concreta.

---

# 12.51. Monetización y regla financiera

La monetización no debe utilizarse para justificar una arquitectura prematuramente costosa.

El orden será:

```text
Producto funcional
       ↓
Usuarios
       ↓
Uso real
       ↓
Medición
       ↓
Costos
       ↓
Monetización
       ↓
Escalamiento
```

El Ad Manager puede permanecer deshabilitado durante las primeras versiones.

Cuando la plataforma tenga suficiente uso para justificar publicidad, se podrá activar mediante feature flag.

La monetización debe financiar progresivamente la infraestructura en lugar de asumir desde el principio que existirá ingreso.

---

# 12.52. Definition of Done del roadmap

Una versión estará terminada cuando:

### Producto

* la funcionalidad definida funciona;
* el usuario puede utilizarla;
* no rompe las capacidades anteriores.

### Arquitectura

* las responsabilidades permanecen correctamente separadas;
* no se introducen dependencias ilegítimas;
* los contratos están actualizados.

### Código

* código integrado;
* lint;
* type-check;
* pruebas correspondientes;
* migraciones aplicadas.

### Operación

Según la madurez:

* logs;
* métricas;
* health;
* manejo de errores;
* configuración;
* documentación.

### Seguridad

Se revisarán los riesgos introducidos por la versión.

### Demo

Debe existir una demostración reproducible de la funcionalidad.

---

# 12.53. Definition of Done de v1.0.0

La versión 1.0.0 deberá cumplir como mínimo:

```text
[ ] Catálogo funcional
[ ] Sources múltiples
[ ] Source Registry
[ ] Discovery & Ingestion
[ ] Discovery Adapters
[ ] Discovery Runs
[ ] Discovery Candidates
[ ] Normalization
[ ] Entity Matching
[ ] Deduplication
[ ] Enrichment
[ ] Validation
[ ] Source Association
[ ] Reconciliation
[ ] Playback Orchestrator
[ ] Source Resolver
[ ] Adapter Registry
[ ] Playable Representation
[ ] Media Gateway
[ ] Playback Session
[ ] Media Player Core
[ ] Progress
[ ] Identity
[ ] Search
[ ] Source Health
[ ] Reports
[ ] Fallback
[ ] Manual source switch
[ ] Admin/CMS
[ ] Seguridad transversal
[ ] Testing
[ ] CI/CD
[ ] Observabilidad
[ ] Backups
[ ] Rollback
[ ] Documentación
[ ] Control de costos
```

El Ad Manager podrá formar parte de la versión estable si la estrategia de producto lo requiere, pero no deberá retrasar innecesariamente la validación del núcleo técnico.

---

# 12.54. Roadmap consolidado

```text
               PROYECTO
                   │
                   ▼
        ┌────────────────────┐
        │ v0.1.0-alpha       │
        │ Primer video       │
        └─────────┬──────────┘
                  │
                  ▼
        ┌────────────────────┐
        │ v0.2.0-alpha       │
        │ Catalog            │
        └─────────┬──────────┘
                  │
                  ▼
        ┌────────────────────┐
        │ v0.3.0-alpha       │
        │ Discovery &        │
        │ Ingestion          │
        └─────────┬──────────┘
                  │
                  ▼
        ┌────────────────────┐
        │ v0.4.0-alpha       │
        │ Sources +          │
        │ Orchestrator       │
        └─────────┬──────────┘
                  │
                  ▼
        ┌────────────────────┐
        │ v0.5.0-beta        │
        │ Resolver + Gateway │
        └─────────┬──────────┘
                  │
                  ▼
        ┌────────────────────┐
        │ v0.6.0-beta        │
        │ Identity           │
        └─────────┬──────────┘
                  │
                  ▼
        ┌────────────────────┐
        │ v0.7.0-beta        │
        │ Health + Recovery  │
        └─────────┬──────────┘
                  │
                  ▼
        ┌────────────────────┐
        │ v0.8.0-beta        │
        │ Admin/CMS           │
        └─────────┬──────────┘
                  │
                  ▼
        ┌────────────────────┐
        │ v0.9.0-rc          │
        │ Hardening           │
        └─────────┬──────────┘
                  │
                  ▼
        ┌────────────────────┐
        │ v1.0.0              │
        │ Primera versión     │
        │ estable             │
        └────────────────────┘
```

---

# 12.55. Regla maestra del roadmap

El proyecto no seguirá la pregunta:

> “¿Qué motor falta por terminar?”

Seguirá estas preguntas:

1. **¿Qué puede hacer el usuario ahora que antes no podía hacer?**
2. **¿Qué parte de la arquitectura nueva es necesaria para conseguirlo?**
3. **¿Cuál es la menor implementación que demuestra esa capacidad?**
4. **¿Cómo verificamos que funciona?**
5. **¿Qué aprendimos?**
6. **¿Qué riesgo nuevo apareció?**
7. **¿Qué debemos estabilizar antes de continuar?**

Por tanto, el roadmap no es únicamente una lista de funcionalidades.

Es también un mecanismo de **validación progresiva de la arquitectura**.

---

# 12.56. Criterio final de evolución

La plataforma evolucionará siguiendo el siguiente principio:

```text
          PRODUCTO
             │
             ▼
       VERTICAL SLICE
             │
             ▼
       VALIDACIÓN REAL
             │
             ▼
        MEDICIÓN
             │
             ▼
       ESTABILIZACIÓN
             │
             ▼
         SIGUIENTE
           SLICE
             │
             └───────────────┐
                             ▼
                         ESCALAMIENTO
                         SOLO CUANDO
                          SEA NECESARIO
```

El proyecto comenzará deliberadamente pequeño.

No se intentará construir desde el primer día una plataforma equivalente, en infraestructura, a un servicio audiovisual de gran escala.

Primero se demostrará:

```text
“puedo reproducir”
```

Después:

```text
“puedo reproducir desde múltiples fuentes”
```

Después:

```text
“puedo elegir y recuperar automáticamente”
```

Después:

```text
“puedo administrar y observar el sistema”
```

Y finalmente:

```text
“puedo operar la plataforma de manera estable
y escalarla cuando el tráfico real lo justifique”.
```

# 12.57. Instrucciones para el agente de código

Los agentes de IA utilizados durante la implementación —por ejemplo Cursor, Claude Code, OpenCode, Antigravity o GitHub Copilot— deberán trabajar bajo las siguientes reglas.

Estas reglas tienen como objetivo evitar que el agente convierta una arquitectura planificada en una implementación sobredimensionada, introduzca funcionalidades no solicitadas o avance demasiado rápido sin producir resultados verificables.

El agente debe tratar el roadmap, el criterio de Done, el backlog y las decisiones arquitectónicas existentes como restricciones de implementación.

---

## 12.57.1. Regla 1 — Trabajar en vertical slices, no en motores completos

El agente no debe intentar implementar un motor completo antes de pasar al siguiente.

Debe identificar la **vertical slice actual** y modificar únicamente los componentes necesarios para que dicha funcionalidad atraviese las capas correspondientes.

Ejemplo:

```text
Media
  ↓
API
  ↓
Orchestrator
  ↓
Resolver
  ↓
Gateway
  ↓
Player
```

es preferible a:

```text
“Implementar completamente Source Resolver”
```

sin que exista todavía una funcionalidad que lo utilice de extremo a extremo.

---

## 12.57.2. Regla 2 — Cada slice debe terminar con algo visible

Toda vertical slice debe producir un resultado que pueda demostrarse.

El resultado puede ser:

* una pantalla;
* una funcionalidad;
* una reproducción;
* una búsqueda;
* un flujo administrativo;
* un fallback;
* un progreso guardado;
* un reporte;
* una mejora observable.

Si una tarea termina únicamente con código interno y no existe ninguna forma razonable de verificar su resultado, el agente deberá cuestionar si la tarea está correctamente dividida.

---

## 12.57.3. Regla 3 — No añadir features no planificadas

El agente no debe introducir funcionalidades adicionales simplemente porque considere que podrían ser útiles.

Si durante la implementación aparece una idea como:

* nueva funcionalidad;
* nuevo módulo;
* nueva integración;
* nuevo proveedor;
* nueva pantalla;
* optimización no necesaria;
* nueva capacidad del Player;
* nueva automatización;

deberá registrarse en:

```text
BACKLOG.md
```

y no implementarse dentro de la tarea actual.

La existencia de una buena idea no convierte automáticamente esa idea en parte del alcance actual.

---

## 12.57.4. Regla 4 — Actualizar CHANGELOG.md al cerrar cada tarea

Cuando una tarea o slice se considere terminado, el agente deberá actualizar:

```text
CHANGELOG.md
```

con un resumen conciso del cambio realizado.

Debe indicar, cuando corresponda:

* funcionalidad agregada;
* comportamiento modificado;
* bug corregido;
* cambio arquitectónico relevante;
* breaking change.

No debe convertir el CHANGELOG en documentación técnica extensa.

---

## 12.57.5. Regla 5 — Tests después de que funcione, excepto seguridad

Durante el desarrollo normal de una vertical slice, el orden preferido será:

```text
Implementar
   ↓
Ejecutar
   ↓
Verificar
   ↓
Corregir
   ↓
Tests
```

El objetivo es evitar dedicar una cantidad excesiva de tiempo a diseñar pruebas sobre una implementación que todavía no ha demostrado funcionar.

La excepción son las funcionalidades relacionadas directamente con seguridad.

Para:

* autenticación;
* autorización;
* sesiones;
* SSRF;
* validación de entrada;
* secretos;
* permisos;
* Gateway;
* acceso administrativo;

las pruebas y validaciones de seguridad deberán considerarse desde el principio de la implementación.

---

## 12.57.6. Regla 6 — Si algo no está en el plan de la versión, se aparca

El agente deberá comprobar el alcance de la versión actual antes de implementar una funcionalidad.

Si una tarea pertenece a una versión posterior, deberá permanecer fuera de la implementación actual.

Ejemplo:

Si se está trabajando en:

```text
v0.3.0-alpha
```

y aparece la necesidad de recomendaciones personalizadas, no se deberá implementar simplemente porque Search & Discovery ya exista parcialmente.

La funcionalidad se registra para la versión correspondiente o en:

```text
BACKLOG.md
```

---

## 12.57.7. Regla 7 — Cada commit corresponde a un slice o sub-slice

Los commits deberán representar unidades coherentes de trabajo.

Preferentemente:

```text
1 commit = 1 slice
```

o, cuando una slice sea demasiado grande:

```text
1 commit = 1 sub-slice coherente
```

No deberán mezclarse en el mismo commit cambios no relacionados como:

```text
Player
+
Auth
+
CSS
+
Docker
+
Search
```

salvo que exista una dependencia real entre ellos.

El historial Git debe permitir reconstruir razonablemente cómo evolucionó el producto.

---

## 12.57.8. Regla 8 — Antes de empezar una versión, leer el criterio de Done

Antes de comenzar una nueva versión, el agente deberá consultar:

1. objetivo de la versión;
2. alcance;
3. dependencias;
4. criterios de salida;
5. riesgos conocidos;
6. decisiones arquitectónicas relevantes.

No debe comenzar implementando tareas arbitrarias de la lista sin entender primero qué significa que la versión esté terminada.

---

## 12.57.9. Regla 9 — Al cerrar una versión, crear un tag en Git

Cuando una versión haya cumplido su Definition of Done y se considere cerrada, deberá crearse un tag correspondiente.

Ejemplo:

```text
v0.1.0-alpha
v0.2.0-alpha
v0.5.0-beta
v0.9.0-rc
v1.0.0
```

El tag deberá apuntar al commit que representa realmente el estado cerrado de esa versión.

No deberá etiquetarse una versión antes de cumplir sus criterios de salida.

---

## 12.57.10. Regla 10 — Bugs bloqueantes tienen prioridad sobre features

Si durante una tarea aparece un bug que impide utilizar una funcionalidad existente, el agente deberá priorizar su corrección antes de añadir nuevas funcionalidades.

Prioridad general:

```text
Bug bloqueante
    ↓
Bug funcional importante
    ↓
Regresión
    ↓
Tarea actual
    ↓
Mejora
    ↓
Nueva feature
```

No se debe construir una nueva capa sobre una funcionalidad fundamental que ya está rota.

---

## 12.57.11. Regla 11 — No introducir infraestructura nueva sin justificación

El agente no deberá introducir infraestructura adicional únicamente porque sea una práctica habitual o porque técnicamente sea posible.

Antes de añadir:

* Docker;
* Redis;
* una cola;
* un nuevo servicio;
* un CDN;
* Kubernetes;
* un servicio externo;
* un sistema de observabilidad;
* un nuevo proveedor;

deberá existir una razón concreta relacionada con la tarea o con una necesidad demostrada.

La pregunta obligatoria es:

> ¿Qué problema actual resuelve esta infraestructura y por qué no puede resolverse razonablemente con lo que ya existe?

---

## 12.57.12. Regla 12 — Mantener el código mínimo funcional

El agente deberá implementar la solución más pequeña que satisfaga correctamente el requisito actual.

Debe evitar:

* abstracciones prematuras;
* interfaces innecesarias;
* factories que todavía no tienen múltiples implementaciones;
* configuraciones excesivamente genéricas;
* sistemas de plugins sin necesidad actual;
* capas creadas únicamente para “el futuro”;
* patrones arquitectónicos introducidos por decoración.

La abstracción debe aparecer cuando exista una necesidad real.

Esto no significa escribir código desordenado.

Significa distinguir entre:

```text
Código simple y suficiente
```

y:

```text
Arquitectura hipotética para problemas que todavía no existen
```

---

## 12.57.13. Regla 13 — Cada versión debe poder desplegarse

Cada versión cerrada debe representar un estado ejecutable y desplegable del proyecto.

El agente no debe dejar deliberadamente el repositorio en un estado donde:

* la aplicación no compile;
* el backend no pueda iniciar;
* las migraciones sean inconsistentes;
* las variables obligatorias estén indefinidas sin documentación;
* una funcionalidad anterior quede rota sin justificación.

Durante el desarrollo pueden existir estados intermedios incompletos, pero el estado final de cada versión debe ser reproducible.

---

## 12.57.14. Regla 14 — Documentar solo lo no obvio

El agente deberá documentar las decisiones y comportamientos que no puedan deducirse razonablemente del código.

Debe documentar:

* decisiones arquitectónicas;
* comportamientos especiales;
* restricciones;
* contratos;
* decisiones de seguridad;
* procedimientos operativos;
* razones detrás de soluciones no evidentes.

No debe documentar innecesariamente:

```text
const user = await getUser(id);
```

con explicaciones que simplemente repitan lo que el código ya expresa.

La documentación debe explicar principalmente:

> **por qué**

y no únicamente:

> **qué hace esta línea.**

---

## 12.57.15. Regla 15 — Cuando dudes, pregunta antes de implementar

Si existen varias interpretaciones razonables y la elección puede afectar:

* arquitectura;
* modelo de datos;
* API;
* seguridad;
* comportamiento del usuario;
* costos;
* compatibilidad;
* alcance de una versión;

el agente deberá detenerse y solicitar una decisión antes de implementar.

No debe inventar una decisión arquitectónica importante.

Si la decisión es pequeña, reversible y está claramente dentro del patrón existente, puede utilizar el criterio establecido previamente.

---

## 12.57.16. Regla 16 — Leer el contexto antes de modificar código

Antes de modificar una parte significativa del sistema, el agente deberá inspeccionar el contexto necesario.

Como mínimo, deberá revisar:

* archivos relacionados;
* contratos utilizados;
* modelos involucrados;
* tests existentes;
* configuración relevante;
* documentación de la funcionalidad;
* decisiones arquitectónicas aplicables.

No debe modificar un archivo basándose únicamente en el fragmento que aparece en la búsqueda.

---

## 12.57.17. Regla 17 — Respetar los límites entre motores

El agente no deberá resolver una necesidad creando dependencias arbitrarias entre motores.

Debe respetar las responsabilidades establecidas.

Ejemplos:

```text
Catalog
→ conoce contenido

Source Registry
→ conoce Sources

Orchestrator
→ decide

Resolver
→ resuelve

Gateway
→ transporta

Player
→ reproduce

Health
→ observa y registra salud
```

Si una implementación requiere que un motor asuma una responsabilidad que pertenece a otro, el agente deberá detenerse y verificar la decisión arquitectónica antes de continuar.

---

## 12.57.18. Regla 18 — No exponer detalles internos innecesariamente

Los agentes deberán respetar la separación entre modelos internos y contratos públicos.

No deben exponerse al frontend:

* credenciales;
* secretos;
* URLs internas de origen cuando no sean necesarias;
* metadata interna del proveedor;
* estructuras internas de adaptadores;
* información de infraestructura;
* detalles internos de resolución.

El frontend deberá recibir los DTOs definidos por los contratos de la plataforma.

---

## 12.57.19. Regla 19 — No solucionar errores ocultándolos

Ante un error, el agente no deberá simplemente:

* capturarlo y descartarlo;
* devolver `null`;
* devolver `[]`;
* ocultarlo del usuario;
* utilizar valores ficticios;
* desactivar una validación;
* ampliar arbitrariamente un timeout;
* ignorar un test fallido.

Primero deberá determinar:

```text
¿Es un error esperado?
¿Es un error de datos?
¿Es un error de integración?
¿Es un error de configuración?
¿Es un bug?
¿Es una dependencia externa?
```

Después deberá aplicar el manejo correspondiente.

---

## 12.57.20. Regla 20 — No modificar arquitectura por conveniencia local

Una solución que haga más sencilla una tarea concreta no debe introducir una contradicción con la arquitectura global.

Por ejemplo, no debe:

```text
Player → Source URL directa
```

simplemente porque sea más fácil que utilizar:

```text
Player → PlaybackSession → Gateway
```

si la arquitectura de la versión ya requiere el segundo flujo.

La implementación debe adaptarse a la arquitectura, no deformar la arquitectura para ahorrar unas líneas de código.

---

## 12.57.21. Regla 21 — Verificar antes de declarar terminado

El agente no deberá afirmar que una tarea está terminada únicamente porque el código fue escrito.

Antes de cerrarla deberá, según corresponda:

```text
Implementar
   ↓
Type-check / build
   ↓
Ejecutar
   ↓
Probar flujo principal
   ↓
Revisar errores
   ↓
Ejecutar tests correspondientes
   ↓
Actualizar CHANGELOG.md
   ↓
Revisar diff
   ↓
Commit
```

La verificación debe ser proporcional a la tarea.

Una modificación pequeña no requiere una batería completa de E2E; una modificación del Playback Gateway sí requiere pruebas mucho más cuidadosas.

---

## 12.57.22. Regla 22 — El agente no decide por sí solo el alcance

El agente puede proponer mejoras, detectar riesgos y señalar inconsistencias, pero no debe convertir automáticamente sus propuestas en trabajo.

La distinción será:

```text
Requisito
    ↓
Implementar

Propuesta
    ↓
Informar

Idea futura
    ↓
BACKLOG.md

Decisión arquitectónica
    ↓
Consultar

Bug bloqueante
    ↓
Priorizar
```

El agente es un implementador asistido por contexto, no el propietario autónomo del roadmap.

---

## 12.57.23. Regla 23 — Mantener el proyecto ejecutable durante la evolución

Cada cambio deberá procurar mantener una ruta clara hacia un estado ejecutable.

Si una tarea requiere temporalmente una migración incompatible o una modificación de contrato, deberá realizarse de forma controlada y documentada.

No se deberá acumular una cadena indefinida de:

```text
“Esto se arregla al final”
```

La deuda técnica deberá ser explícita y rastreable.

---

## 12.57.24. Regla 24 — Ante una decisión irreversible, detenerse

Si una acción puede producir una consecuencia difícil de revertir, el agente deberá solicitar confirmación cuando no exista una instrucción explícita.

Ejemplos:

* eliminar datos;
* eliminar tablas;
* realizar migraciones destructivas;
* cambiar contratos públicos;
* borrar configuración;
* eliminar infraestructura;
* cambiar autenticación;
* modificar mecanismos de seguridad;
* introducir una dependencia externa crítica.

Las operaciones reversibles pueden automatizarse con mayor libertad.

---

## 12.57.25. Regla 25 — Priorizar evidencia sobre suposiciones

Cuando exista una duda técnica, el agente deberá buscar evidencia en este orden:

```text
Código existente
   ↓
Tests existentes
   ↓
Contratos/documentación del proyecto
   ↓
Configuración
   ↓
Documentación oficial de la tecnología
   ↓
Hipótesis
```

Una suposición no deberá presentarse como un hecho.

Cuando una decisión dependa de comportamiento específico de una librería, framework o proveedor, deberá verificarse en la documentación correspondiente cuando sea necesario.

---

## 12.57.26. Regla 26 — El estado del repositorio debe reflejar el estado real del proyecto

El agente deberá evitar que el repositorio comunique un estado de madurez superior al real.

Por ejemplo:

```text
v0.4.0-alpha
```

no debe implicar que existe una implementación estable y completa del sistema.

Los documentos, CHANGELOG, tags y código deben mantener una correspondencia razonable con el estado real del proyecto.

---

## 12.57.27. Regla maestra del agente

Ante cualquier tarea, el agente deberá razonar siguiendo esta secuencia:

```text
¿En qué versión estamos?
        ↓
¿Cuál es la vertical slice actual?
        ↓
¿Cuál es su criterio de Done?
        ↓
¿Qué componentes necesita?
        ↓
¿Cuál es la implementación mínima?
        ↓
¿Existe algún riesgo o decisión arquitectónica?
        ↓
Implementar
        ↓
Verificar
        ↓
Documentar lo necesario
        ↓
CHANGELOG.md
        ↓
Commit
```

Y deberá mantener siempre la siguiente prioridad:

```text
┌─────────────────────────────────────┐
│  1. Mantener funcionando lo actual  │
│  2. Completar la slice actual       │
│  3. Corregir bugs bloqueantes       │
│  4. Verificar                       │
│  5. Documentar lo necesario         │
│  6. Registrar cambios               │
│  7. Continuar                       │
└─────────────────────────────────────┘
```

La regla fundamental es:

> **El agente debe ayudar a hacer avanzar el producto, no hacer crecer innecesariamente el código.**


Esta secuencia mantiene alineados **producto, arquitectura, capacidad individual, riesgo y costos**, evitando que la complejidad técnica del diseño supere prematuramente la capacidad real de implementación.
