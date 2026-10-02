# 5. REQUISITOS FUNCIONALES Y NO FUNCIONALES

## 5.1. Objetivo

Los requisitos de esta sección especifican las capacidades que deberá
ofrecer la plataforma y las propiedades de calidad bajo las cuales
deberán operar sus componentes.

Se distinguen dos categorías:

- **Requisitos funcionales (RF):** describen qué debe hacer el sistema.

- **Requisitos no funcionales (RNF):** establecen condiciones de
  rendimiento, seguridad, disponibilidad, mantenibilidad,
  observabilidad, compatibilidad y otras propiedades de calidad.

La arquitectura objetivo contempla una plataforma audiovisual capaz de
gestionar múltiples fuentes por contenido, seleccionar y resolver dichas
fuentes, crear sesiones de reproducción y entregar al **Media Player
Core** una interfaz normalizada independiente del proveedor de origen.

La implementación será evolutiva. Por ello, cada requisito podrá
clasificarse como:

- **MVP:** necesario para demostrar el flujo vertical principal.

- **V1:** parte de la arquitectura funcional objetivo, pero no
  necesariamente imprescindible para la primera versión operativa.

- **Evolutivo:** capacidad prevista para fases posteriores.

## 5.2. Requisitos funcionales

### RF-01. Catálogo audiovisual

**Prioridad:** MVP

El sistema deberá mantener un catálogo canónico de contenidos
audiovisuales.

Cada contenido deberá disponer, según corresponda, de información como:

- identificador interno;

- título principal;

- títulos alternativos;

- descripción o sinopsis;

- tipo de contenido;

- imágenes;

- géneros;

- año o fecha de publicación;

- duración;

- clasificación;

- temporadas y episodios cuando corresponda;

- estado de publicación;

- metadatos adicionales.

El modelo de dominio deberá permitir representar diferentes clases de
contenido audiovisual sin limitarse a una categoría específica.

Entre los tipos previstos se encuentran:

- películas;

- series;

- episodios;

- documentales;

- cortometrajes;

- conciertos;

- clips;

- otros formatos audiovisuales compatibles con la evolución del
  producto.

### RF-02. Exploración, búsqueda y filtrado

**Prioridad:** MVP

El usuario deberá poder explorar el catálogo y localizar contenidos
mediante:

- búsqueda textual;

- categorías;

- géneros;

- tipo de contenido;

- año;

- idioma cuando corresponda;

- otros filtros incorporados posteriormente.

La búsqueda deberá operar sobre las entidades canónicas del catálogo y
no directamente sobre las fuentes audiovisuales.

### RF-03. Gestión de múltiples fuentes por contenido

**Prioridad:** MVP

El sistema deberá permitir asociar \*\*una o múltiples Sources\*\* a un
mismo contenido o unidad reproducible.

Ejemplo conceptual:

MediaItem / Episode

    │

    ├── Source A

    ├── Source B

    ├── Source C

    └── Source D

Cada Source deberá poder almacenar, según disponibilidad:

- identificador;

- contenido asociado;

- Provider/Host;

- URL o referencia de origen;

- idioma;

- calidad declarada;

- prioridad;

- estado;

- fecha de descubrimiento;

- fecha de última comprobación;

- información de salud;

- metadatos técnicos;

- Adapter correspondiente;

- información operativa adicional.

La indisponibilidad de una Source individual no deberá implicar
automáticamente la indisponibilidad del contenido.

### RF-04. Source Registry

**Prioridad:** MVP

El sistema deberá disponer de un \*\*Source Registry\*\* encargado de
mantener el inventario y estado lógico de las Sources conocidas.

Como mínimo deberá permitir:

- registrar Sources;

- asociarlas a contenidos;

- consultar Sources disponibles;

- actualizar sus metadatos;

- almacenar su estado;

- mantener información de prioridad;

- registrar información de salud;

- deshabilitar Sources sin eliminarlas necesariamente;

- conservar fechas relevantes para su operación.

Los estados iniciales contemplados son:

DISCOVERED

    ↓

ACTIVE

    ↓

DEGRADED

    ↓

UNAVAILABLE

La transición entre estados no tiene que ser estrictamente lineal. Una
Source previamente marcada como \`UNAVAILABLE\` podrá regresar a
\`ACTIVE\` si vuelve a superar las comprobaciones correspondientes.

### RF-05. Selección automática de Source

**Prioridad:** MVP

Antes de iniciar una reproducción, el sistema deberá poder seleccionar
automáticamente una Source adecuada entre las alternativas disponibles.

Esta responsabilidad corresponderá al **Playback Orchestrator**.

La selección podrá considerar:

- disponibilidad;

- estado de salud;

- compatibilidad con el cliente;

- idioma;

- calidad;

- prioridad configurada;

- fiabilidad histórica;

- capacidad técnica de la Source;

- resultados recientes de resolución;

- otros criterios incorporados posteriormente.

El algoritmo inicial podrá ser determinista y relativamente sencillo.

La arquitectura deberá permitir evolucionarlo posteriormente sin
modificar el Media Player Core.

### RF-06. Cambio manual de Source

**Prioridad:** MVP

El usuario deberá poder solicitar el cambio hacia otra Source disponible
cuando existan alternativas.

El cambio deberá ser coordinado por el Playback Orchestrator.

Cuando sea técnicamente posible, el sistema deberá conservar:

- posición de reproducción;

- estado de reproducción;

- preferencias de audio;

- subtítulos;

- otras preferencias compatibles.

El Player no deberá necesitar conocer la lógica específica del proveedor
seleccionado.

### RF-07. Playback Orchestrator

**Prioridad:** MVP

El backend deberá incorporar una capa de \*\*Playback Orchestration\*\*
responsable de coordinar el inicio y continuidad de una reproducción.

El Orchestrator deberá poder:

1.  recibir una solicitud de reproducción;

2.  identificar el contenido solicitado;

3.  consultar sus Sources;

4.  descartar Sources no utilizables;

5.  evaluar las alternativas;

6.  seleccionar una Source;

7.  solicitar su resolución;

8.  gestionar errores de resolución;

9.  intentar una alternativa cuando corresponda;

10. solicitar la creación de una Playback Session;

11. devolver al cliente una representación normalizada de la sesión;

12. conservar las alternativas disponibles para cambios o recuperación.

El Orchestrator \*\*decide qué Source utilizar\*\*, pero no deberá
implementar internamente la lógica específica de cada proveedor.

### RF-08. Playback Session

**Prioridad:** MVP

Toda reproducción iniciada mediante el flujo normal deberá poder
representarse mediante una **Playback Session**.

Una sesión deberá contener o referenciar, según corresponda:

- identificador de sesión;

- contenido;

- Source seleccionada;

- representación reproducible;

- capacidades disponibles;

- recurso o manifest de reproducción;

- fecha de creación;

- expiración;

- estado;

- alternativas disponibles;

- información necesaria para recuperación y observabilidad.

Contrato conceptual:

{

  \"playbackSessionId\": \"ps_123\",

  \"media\": {

    \"id\": \"movie_456\"

  },

  \"selectedSource\": {

    \"id\": \"source_01\",

    \"quality\": \"1080p\",

    \"language\": \"es\"

  },

  \"playback\": {

    \"manifestUrl\": \"\...\",

    \"expiresAt\": \"\...\"

  },

  \"alternatives\": \[

    {

      \"id\": \"source_02\",

      \"quality\": \"720p\",

      \"language\": \"es\"

    }

  \]

}

Este contrato es conceptual y podrá evolucionar durante el diseño
detallado de la API.

### RF-09. Source Resolver / Extractor

**Prioridad:** MVP

El sistema deberá disponer de un \*\*Source Resolver / Extractor\*\*
encargado de transformar una Source conocida en una representación
reproducible normalizada.

Su responsabilidad podrá incluir:

- seleccionar el Adapter correspondiente;

- ejecutar la lógica específica de resolución;

- obtener información necesaria para la reproducción;

- identificar manifests o recursos audiovisuales;

- normalizar el resultado;

- identificar expiraciones cuando existan;

- aplicar timeouts;

- registrar errores;

- recopilar métricas;

- utilizar caché de resolución cuando sea apropiado.

La relación conceptual será:

Source

   ↓

Adapter

   ↓

Resolution

   ↓

Playable Representation

La resolución deberá realizarse mediante mecanismos de acceso permitidos
para la fuente correspondiente. La evasión de CAPTCHA, sistemas anti-bot
u otros controles de acceso no constituye un requisito funcional del
MVP.

### RF-10. Arquitectura de Adapters

**Prioridad:** MVP

La lógica específica de proveedores deberá estar encapsulada mediante
Adapters.

El sistema deberá permitir:

- registrar nuevos Adapters;

- identificar qué Adapter corresponde a una Source;

- ejecutar una interfaz común de resolución;

- aislar cambios específicos de un proveedor;

- registrar fallos por Adapter;

- habilitar o deshabilitar Adapters;

- mantener versiones cuando sea necesario.

Conceptualmente:

Source Resolver

       │

       ├── Adapter A

       ├── Adapter B

       ├── Adapter C

       └── Adapter N

La incorporación o modificación de un Adapter no deberá exigir cambios
en el Media Player Core.

### RF-11. Media Gateway

**Prioridad:** MVP

El sistema deberá disponer de un \*\*Media Gateway\*\* encargado de
controlar la capa de entrega necesaria entre una Playback Session y el
Media Player Core.

Dependiendo de la Source y del modo de reproducción, podrá encargarse
de:

- crear sesiones temporales de acceso;

- entregar manifests;

- reescribir referencias cuando sea necesario;

- mediar solicitudes de segmentos cuando corresponda;

- validar tokens;

- controlar expiraciones;

- aplicar políticas de acceso;

- aplicar rate limiting;

- registrar métricas;

- registrar errores de transporte.

El Gateway no deberá seleccionar qué Source utilizar ni implementar
lógica específica de descubrimiento.

La intermediación de recursos externos deberá respetar las condiciones
técnicas y de acceso aplicables a la Source correspondiente.

### RF-12. Media Player Core

**Prioridad:** MVP

El sistema deberá proporcionar un reproductor audiovisual propio
denominado **Media Player Core**.

Como mínimo deberá ofrecer:

- reproducir;

- pausar;

- buscar una posición temporal;

- control de volumen;

- silencio;

- pantalla completa;

- visualización del progreso;

- estados de carga;

- manejo de errores;

- selección de calidad cuando esté disponible;

- selección de audio cuando esté disponible;

- selección de subtítulos cuando estén disponibles;

- cambio manual de Source;

- recuperación básica ante errores;

- Picture-in-Picture cuando la plataforma cliente lo soporte.

El Player deberá consumir un contrato normalizado de reproducción.

No deberá contener lógica específica para proveedores o Adapters
concretos.

### RF-13. Capability Model del cliente

**Prioridad:** V1

El cliente deberá poder comunicar al backend sus capacidades relevantes
para la reproducción.

Entre ellas podrán encontrarse:

- formatos soportados;

- codecs;

- HLS u otros protocolos compatibles;

- resolución máxima;

- capacidades de audio;

- capacidades de subtítulos;

- restricciones particulares de la plataforma.

El Playback Orchestrator podrá utilizar estas capacidades como criterio
para seleccionar Sources compatibles.

Esto permitirá mantener el núcleo de reproducción desacoplado de
navegadores, dispositivos móviles o televisores concretos.

### RF-14. Calidad, audio y subtítulos

**Prioridad:** MVP

El sistema deberá permitir utilizar las capacidades disponibles en la
Source seleccionada para gestionar:

- calidad;

- pistas de audio;

- idioma;

- subtítulos.

Los subtítulos externos podrán utilizar formatos compatibles con el
cliente, incluyendo WebVTT cuando corresponda.

No deberá asumirse que todas las Sources proporcionan exactamente las
mismas capacidades.

### RF-15. Persistencia del progreso

**Prioridad:** MVP básico / V1 completo

El sistema deberá almacenar la posición de reproducción del usuario.

Para usuarios anónimos, el MVP podrá utilizar persistencia local.

Para usuarios registrados, una versión posterior deberá permitir
sincronizar el progreso mediante backend.

El sistema deberá permitir reanudar una reproducción desde una posición
previamente almacenada.

### RF-16. Health Checker

**Prioridad:** MVP

El sistema deberá disponer de un proceso encargado de comprobar
periódicamente la salud de las Sources.

El Health Checker deberá poder:

- seleccionar Sources pendientes de comprobación;

- realizar una comprobación controlada;

- registrar el resultado;

- actualizar el estado correspondiente;

- almacenar la fecha de comprobación;

- registrar errores;

- generar métricas operativas.

Una comprobación fallida aislada no deberá necesariamente producir la
eliminación permanente de una Source.

### RF-17. Fallback automático

**Prioridad:** MVP

Cuando la Source seleccionada falle antes o durante el establecimiento
de la reproducción, el sistema deberá poder intentar una alternativa
disponible.

Flujo conceptual:

Source A

   ↓

fallo

   ↓

Playback Orchestrator

   ↓

Source B

   ↓

Resolver

   ↓

Playback Session actualizada/nueva

   ↓

Player

Cuando sea técnicamente viable, la reproducción deberá continuar
conservando la posición previa.

El resultado deberá registrarse para calcular métricas de recuperación.

### RF-18. Sistema de reportes

**Prioridad:** MVP

Los usuarios deberán poder reportar problemas relacionados con
contenidos, Sources o sesiones de reproducción.

Entre los problemas reportables podrán incluirse:

- Source no disponible;

- reproducción que no inicia;

- interrupción de reproducción;

- error de resolución;

- problemas de manifest;

- problemas de audio;

- subtítulos incorrectos;

- calidad incorrecta;

- contenido incorrecto.

El reporte deberá poder asociarse con:

- contenido;

- Source;

- Playback Session;

- usuario o sesión anónima cuando corresponda;

- tipo de problema;

- fecha;

- información técnica relevante.

El sistema deberá incorporar mecanismos básicos para evitar reportes
duplicados o abuso.

### RF-19. CMS / Administración

**Prioridad:** MVP

La plataforma deberá disponer de una interfaz administrativa mínima.

Los usuarios autorizados deberán poder, según su rol:

- crear y editar contenidos;

- gestionar temporadas y episodios;

- agregar Sources;

- modificar Sources;

- deshabilitar Sources;

- consultar su estado;

- consultar reportes;

- consultar información básica de salud;

- gestionar metadatos.

Las acciones administrativas relevantes deberán ser auditables.

### RF-20. Descubrimiento e ingesta

**Prioridad:** MVP limitado / V1 automatizado

El sistema deberá permitir incorporar nuevos contenidos y Sources al
catálogo.

En el MVP, la ingesta podrá realizarse principalmente de forma manual o
semiautomática.

La arquitectura objetivo deberá permitir posteriormente:

Discovery

   ↓

Normalization

   ↓

Deduplication

   ↓

Matching

   ↓

Catalog / Source Registry

El sistema deberá evitar que el descubrimiento automático genere
duplicados innecesarios de contenidos ya existentes.

El descubrimiento de una Source no implica que esta haya sido validada
como reproducible.

### RF-21. Usuarios registrados y preferencias

**Prioridad:** V1

El sistema deberá permitir cuentas de usuario cuando esta capacidad sea
habilitada.

Los usuarios registrados podrán disponer progresivamente de:

- historial;

- progreso sincronizado;

- favoritos;

- lista para ver después;

- preferencias;

- configuraciones de reproducción;

- personalización.

Estas funciones no deberán bloquear el funcionamiento básico del MVP
para usuarios anónimos.

### RF-22. Publicidad audiovisual

**Prioridad:** Evolutivo

La arquitectura podrá admitir integración publicitaria mediante
estándares compatibles, como VAST/VMAP u otros mecanismos equivalentes.

La publicidad deberá permanecer desacoplada de la lógica fundamental de
resolución de Sources y de la arquitectura del Media Gateway.

El fallo del subsistema publicitario no deberá, por diseño, provocar un
fallo innecesario del sistema principal de reproducción.

Las reglas de omisión, duración y frecuencia deberán ser configurables y
depender de la política publicitaria adoptada.

## 5.3. Requisitos no funcionales

### RNF-01. Rendimiento de APIs

**Prioridad:** MVP

Las APIs críticas deberán diseñarse para proporcionar latencias
compatibles con una experiencia interactiva.

Deberán medirse al menos:

- p50;

- p95;

- p99 cuando sea necesario;

- tasa de errores;

- throughput.

Los objetivos numéricos generales deberán establecerse mediante pruebas
de carga y capacidad.

**Objetivo inicial:** \`\[por definir\]\`.

Los componentes que ya dispongan posteriormente de SLO propios podrán
definir objetivos más estrictos.

### RNF-02. Tiempo hasta primera imagen

**Prioridad:** MVP

La plataforma deberá medir el tiempo transcurrido desde que el usuario
solicita reproducir un contenido hasta que comienza efectivamente la
reproducción.

La métrica principal será:

**Time-to-First-Frame (TTFF)**

El objetivo deberá definirse separando, cuando sea posible:

Playback Request

      ↓

Source Selection

      ↓

Resolution

      ↓

Session Creation

      ↓

Manifest / Media Delivery

      ↓

Player Startup

      ↓

First Frame

**SLO inicial de TTFF:** \`\[por definir\]\`.

### RNF-03. Rendimiento frontend

**Prioridad:** MVP

La interfaz deberá optimizar:

- carga inicial;

- navegación;

- tamaño de bundles;

- imágenes;

- renderizado;

- Core Web Vitals;

- tiempo de interacción.

Deberá medirse especialmente \*\*Largest Contentful Paint (LCP)\*\*.

El objetivo cuantitativo deberá establecerse explícitamente durante las
pruebas del frontend.

### RNF-04. Seguridad de transporte y aplicación

**Prioridad:** MVP

Todo tráfico público deberá utilizar HTTPS.

La plataforma deberá aplicar, según corresponda:

- validación de entrada;

- autenticación;

- autorización;

- rate limiting;

- CORS restrictivo;

- gestión segura de secretos;

- expiración de sesiones;

- tokens temporales;

- auditoría administrativa;

- protección frente a abuso;

- políticas de mínimo privilegio.

Las credenciales o secretos de proveedores no deberán exponerse al
cliente.

### RNF-05. Protección SSRF y acceso a recursos externos

**Prioridad:** MVP crítico

Debido a que determinados componentes procesarán URLs o recursos
externos, la plataforma deberá considerar \*\*Server-Side Request
Forgery (SSRF)\*\* como una amenaza de primer nivel.

Los componentes que realicen solicitudes externas deberán incorporar
controles como:

- esquemas/protocolos permitidos;

- validación de URLs;

- validación de redirecciones;

- bloqueo de direcciones privadas;

- bloqueo de loopback;

- bloqueo de link-local;

- bloqueo de rangos reservados;

- validación de resolución DNS;

- mitigación de DNS rebinding;

- límites de redirección;

- timeouts;

- límites de tamaño de respuesta;

- restricciones de egress cuando la infraestructura lo permita.

Las URLs descubiertas dentro de manifests deberán someterse nuevamente a
las políticas correspondientes y no considerarse automáticamente
confiables por provenir de una Source previamente aceptada.

### RNF-06. Disponibilidad y tolerancia a fallos

**Prioridad:** MVP

La indisponibilidad de una Source no deberá provocar necesariamente la
indisponibilidad del contenido cuando existan Sources alternativas
utilizables.

El sistema deberá utilizar:

- fallback;

- timeouts;

- retries controlados;

- estados de salud;

- degradación controlada.

**Objetivo general de disponibilidad:** \`\[por definir\]\`.

### RNF-07. Resiliencia

**Prioridad:** MVP

Las llamadas entre componentes y hacia servicios externos deberán
disponer de:

- timeout explícito;

- número limitado de reintentos;

- backoff cuando corresponda;

- límites de concurrencia;

- manejo explícito de errores.

En fases posteriores podrán incorporarse mecanismos como circuit
breakers cuando la complejidad operativa lo justifique.

Los reintentos no deberán producir tormentas de solicitudes ante la
caída de un proveedor.

### RNF-08. Escalabilidad

**Prioridad:** Arquitectura V1

Los componentes deberán diseñarse de manera que aquellos que sean
stateless puedan replicarse horizontalmente cuando sea necesario.

La arquitectura podrá utilizar contenedores desde etapas tempranas para
obtener reproducibilidad y aislamiento.

Sin embargo, la primera versión no requerirá una infraestructura
distribuida compleja.

El despliegue inicial podrá utilizar una topología semejante a:

Web / BFF

     │

Core API

     │

├── PostgreSQL

├── Redis

├── Worker / Resolver

└── Media Gateway

La migración a orquestadores de contenedores, múltiples nodos o
arquitecturas distribuidas deberá responder a necesidades reales de
capacidad y operación.

### RNF-09. Observabilidad

**Prioridad:** MVP

Los componentes críticos deberán generar:

- logs estructurados;

- métricas;

- identificadores de correlación;

- información de errores;

- eventos relevantes de reproducción.

Deberá ser posible correlacionar conceptualmente:

Request

   ↓

Playback Session

   ↓

Source

   ↓

Resolution

   ↓

Gateway

   ↓

Player Event

La arquitectura deberá permitir incorporar tracing distribuido cuando
sea necesario.

### RNF-10. Métricas de calidad de reproducción

**Prioridad:** MVP / V1

La plataforma deberá permitir medir progresivamente:

- Playback Success Rate;

- Playback Failure Rate;

- Time-to-First-Frame;

- Rebuffer Ratio;

- Source Resolution Success Rate;

- Source Availability Rate;

- Automatic Failover Success Rate;

- Playback Session Continuity;

- Catalog Coverage;

- Catalog Freshness;

- abandono relacionado con publicidad cuando esta exista.

Estas métricas deberán utilizarse para evaluar el comportamiento real
del sistema y orientar futuras optimizaciones.

### RNF-11. Integridad e idempotencia

**Prioridad:** MVP

Las operaciones de ingesta, registro de Sources y procesamiento
asíncrono deberán diseñarse para evitar duplicaciones accidentales.

Cuando corresponda deberán emplearse:

- identificadores estables;

- restricciones de unicidad;

- operaciones idempotentes;

- deduplicación;

- transacciones;

- control de concurrencia.

Un mismo evento procesado más de una vez no deberá producir corrupción
del catálogo.

### RNF-12. Privacidad y minimización de datos

**Prioridad:** MVP

La plataforma deberá recopilar únicamente la información necesaria para
sus funciones y operación.

Datos técnicos como direcciones IP, User-Agent, identificadores de
sesión y telemetría deberán disponer de una finalidad definida y una
política de retención apropiada.

Los logs no deberán almacenar innecesariamente:

- contraseñas;

- tokens completos;

- secretos;

- credenciales;

- datos sensibles de autenticación.

### RNF-13. Costos y consumo de ancho de banda

**Prioridad:** MVP crítico

La arquitectura deberá permitir observar y controlar el volumen de
tráfico procesado por el Media Gateway.

Deberán medirse al menos:

- bytes transferidos;

- tráfico por sesión;

- tráfico por Source;

- tráfico por Provider;

- duración de reproducción;

- concurrencia;

- bitrate efectivo cuando sea posible.

La plataforma deberá evitar asumir que todo el tráfico audiovisual puede
ser intermediado indefinidamente sin considerar su costo operativo.

Las decisiones de caché, proxy e intermediación deberán evaluarse según:

- costo;

- seguridad;

- arquitectura;

- características técnicas de la Source;

- condiciones de acceso aplicables.

### RNF-14. Mantenibilidad y modularidad

**Prioridad:** MVP

La arquitectura deberá mantener separadas las responsabilidades de:

Discovery / Ingestion

Catalog

Source Registry

Playback Orchestrator

Source Resolver

Adapters

Media Gateway

Media Player Core

Health Checker

Reporting

Esta separación es \*\*lógica\*\* y no implica que cada módulo deba
desplegarse inicialmente como un microservicio independiente.

El MVP podrá implementar varios módulos dentro de una misma aplicación
siempre que se mantengan límites claros entre sus responsabilidades.

### RNF-15. Compatibilidad

**Prioridad:** MVP

La primera implementación estará orientada principalmente a navegadores
web modernos.

La arquitectura deberá evitar acoplar las reglas centrales de
reproducción exclusivamente a APIs específicas del navegador para
facilitar futuras implementaciones en:

- aplicaciones móviles;

- televisores;

- otros clientes compatibles.

Las capacidades particulares deberán representarse mediante el
Capability Model cuando corresponda.

### RNF-16. SEO y descubrimiento web

**Prioridad:** V1

Las páginas públicas de contenido deberán poder utilizar técnicas
apropiadas de renderizado e indexación.

Podrán incluir:

- SSR;

- generación estática o incremental cuando resulte apropiada;

- Open Graph;

- metadatos estructurados;

- JSON-LD;

- URLs canónicas;

- sitemap.

Estas decisiones corresponden a la capa de presentación y no deberán
condicionar la arquitectura interna de reproducción.

### RNF-17. Gobernanza de Sources

**Prioridad:** MVP / V1

La plataforma deberá mantener trazabilidad suficiente sobre el origen y
estado de las Sources integradas.

El sistema deberá permitir:

- identificar el Provider;

- conocer cuándo se incorporó una Source;

- habilitarla o deshabilitarla;

- auditar cambios administrativos;

- aplicar políticas específicas por Provider;

- retirar Sources cuando corresponda.

Los Adapters deberán concebirse como mecanismos de integración con
fuentes cuyo acceso resulte aplicable y permitido para el contexto de
despliegue.

## 5.4. Matriz de prioridad

  ------------------------------------------------------------------------
  **Área**                       **MVP**           **V1 / posterior**
  ------------------------------ ----------------- -----------------------
  Catálogo                       Sí                Evolución

  Búsqueda                       Sí                Avanzada

  Múltiples Sources              Sí                Sí

  Source Registry                Sí                Avanzado

  Selección automática           Sí                Scoring avanzado

  Cambio manual                  Sí                Sí

  Playback Orchestrator          Sí                Avanzado

  Playback Session               Sí                Avanzada

  Resolver                       Sí                Más Adapters

  Media Gateway                  Sí                Escalado/optimización

  Player Core                    Sí                Multiplataforma

  Health Checker                 Básico            Avanzado

  Reportes                       Básico            Avanzado

  Discovery/Ingestion            Manual/semi       Automatizado

  Usuarios                       Opcional/básico   Completo

  Recomendaciones                No                Posterior

  Publicidad                     No esencial       Posterior

  Mobile/TV nativo               No                Posterior

  Infraestructura distribuida    No                Según necesidad
  compleja                                         
  ------------------------------------------------------------------------

## 5.5. Criterio arquitectónico fundamental

Los requisitos anteriores se apoyan en una separación que deberá
mantenerse durante el diseño detallado:

Content

   ≠

Source

   ≠

Provider / Host

   ≠

Stream / Representation

   ≠

Playback Session

Asimismo:

Discovery

    │

    ▼

Ingestion

    │

    ▼

Catalog + Source Registry

    │

    ▼

Playback Orchestrator

    │

    ├── selección de Source

    │

    ▼

Source Resolver

    │

    ├── Adapter

    │

    ▼

Playable Representation

    │

    ▼

Media Gateway

    │

    ▼

Playback Session

    │

    ▼

Media Player Core

Esta separación permitirá que el catálogo, la resolución de Sources, el
transporte audiovisual y la experiencia de reproducción evolucionen
independientemente sin convertir el Player o el backend en componentes
monolíticos dependientes de proveedores concretos.
