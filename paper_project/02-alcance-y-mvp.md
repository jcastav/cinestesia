# 2. ALCANCE Y MVP

## 2.1. Filosofía del alcance

La arquitectura objetivo de la plataforma contempla un sistema
audiovisual extensible compuesto por catálogo, descubrimiento e ingesta,
gestión de múltiples fuentes, resolución de fuentes, Media Gateway,
Media Player Core, usuarios, búsqueda, salud, monetización,
administración y demás componentes descritos en esta especificación.

Sin embargo, la implementación se realizará de forma **evolutiva**.

El MVP no pretende implementar inmediatamente toda la arquitectura
objetivo. Su propósito es construir un **vertical slice funcional de
extremo a extremo** que permita validar la interacción entre los
componentes fundamentales del sistema.

El criterio principal para considerar el MVP exitoso será que una
persona pueda:

Descubrir contenido

       ↓

Abrir su ficha

       ↓

Consultar sus fuentes disponibles

       ↓

Iniciar reproducción

       ↓

Sistema selecciona una fuente

       ↓

Resolver la fuente

       ↓

Media Gateway entrega el stream

       ↓

Media Player Core reproduce

       ↓

Usuario puede cambiar de fuente

Por tanto, el MVP representa una **implementación reducida pero real del
núcleo arquitectónico de la plataforma**, no una demostración aislada
del reproductor.

## 2.2. ¿Qué entra en el MVP?

### A. Media Player Core -- Web

Primera implementación del núcleo de reproducción.

**Funcionalidades**

- Reproductor web personalizado.

- Compatibilidad inicial con reproducción HLS y/o fuentes progresivas
  compatibles.

- Controles básicos de reproducción.

- Play / Pause.

- Barra de progreso.

- Volumen.

- Pantalla completa.

- Control de calidad cuando la representación lo permita.

- Selección de pistas de audio (Latino, Castellano, Japonés, Alemán, etc
  etc., Sub) cuando estén disponibles sin recargar la página.

- Selección de subtítulos.

- Soporte inicial para WebVTT.

- Indicadores de carga y estados de error.

- Persistencia local del progreso de reproducción.

- Recuperación básica ante errores de reproducción.

- Interfaz para seleccionar manualmente otra fuente disponible.

**Objetivo arquitectónico**

El reproductor deberá comunicarse con una **interfaz de reproducción
normalizada**, evitando acoplarse directamente a un proveedor o
adaptador concreto.

### B. Playback Session / Orquestación de Reproducción

Se incorpora al MVP una capa mínima de orquestación responsable de
preparar una sesión de reproducción.

Su función será:

1.  Recibir la solicitud de reproducción de un contenido.

2.  Obtener las fuentes disponibles.

3.  Evaluar cuáles están disponibles para reproducción.

4.  Seleccionar una fuente inicial.

5.  Solicitar su resolución cuando sea necesario.

6.  Crear una sesión de reproducción.

7.  Entregar al Player la información necesaria para iniciar la
    reproducción.

8.  Exponer las fuentes alternativas disponibles.

Conceptualmente:

Player

   │

   │ \"quiero reproducir content_123\"

   ▼

Playback Orchestrator

   │

   ├── Source A → disponible

   ├── Source B → disponible

   └── Source C → no disponible

   │

   ▼

Selecciona Source A

   │

   ▼

Source Resolver

   │

   ▼

Playback Session

   │

   ▼

Media Player

Esto establece desde el MVP la separación entre:

**interfaz de reproducción ≠ selección de fuente ≠ resolución ≠
transporte.**

### C. Catálogo básico

El MVP tendrá un catálogo funcional, aunque reducido respecto al sistema
completo.

**Debe permitir:**

- Películas.

- Series.

- Temporadas.

- Episodios.

- Fichas individuales de contenido.

- Títulos.

- Sinopsis.

- Imágenes.

- Año.

- Géneros.

- Información básica de duración cuando esté disponible.

- Estado básico del contenido.

- Identificadores internos.

- Slugs.

- Asociación con fuentes.

**Interfaz**

- Home.

- Listado de contenidos.

- Ficha de contenido.

- Temporadas.

- Episodios.

- Buscador básico por título.

No es necesario implementar todavía todo el sistema avanzado de
descubrimiento, recomendaciones y personalización.

### D. Sistema de múltiples fuentes

Este punto **entra oficialmente en el MVP**.

Un contenido debe poder tener varias fuentes simultáneamente:

Contenido

│

├── Source A

├── Source B

└── Source C

Cada fuente debe conservar como mínimo:

- identificador;

- contenido asociado;

- proveedor/host;

- URL o referencia de origen;

- estado;

- información básica de idioma;

- información básica de calidad;

- adapter asociado cuando corresponda;

- timestamps;

- información de salud básica.

El sistema no deberá sobrescribir una fuente existente simplemente
porque se haya añadido otra.

### E. Incorporación manual de fuentes

También entra en el MVP.

Un administrador o moderador podrá:

1.  seleccionar un contenido;

2.  crear una fuente;

3.  indicar el proveedor;

4.  registrar la referencia de origen;

5.  asociarla al contenido;

6.  activar/desactivar la fuente;

7.  consultar su estado.

Esto es importante porque significa que **no dependemos de la
automatización para demostrar el funcionamiento del sistema**.

Podemos crear inicialmente:

Película

 ├── Fuente A

 ├── Fuente B

 └── Fuente C

manualmente y probar todo el pipeline.

Posteriormente el sistema podrá poblar esas mismas entidades
automáticamente.

### F. Source Registry básico

El MVP implementará un registro de fuentes con estados básicos.

Por ejemplo:

DISCOVERED

    ↓

ACTIVE

    ↓

DEGRADED

    ↓

UNAVAILABLE

Y posteriormente podremos ampliar el ciclo de vida.

El objetivo inicial es que el sistema pueda distinguir entre:

\"conozco esta fuente\" y

\"esta fuente está actualmente disponible para reproducción\".

### G. Source Resolver / Extractor

El MVP implementará una arquitectura de adaptadores, pero con una
cantidad deliberadamente pequeña de integraciones iniciales.

**Incluye:**

- Contrato formal de SourceAdapter.

- Registro/factory de adaptadores.

- Resolución de fuentes compatibles.

- Normalización de la salida.

- Caché de resultados cuando corresponda.

- Expiración de resultados.

- Manejo de errores.

- Timeouts.

- Reintentos controlados.

- Registro de resultados de resolución.

- Métricas básicas por adaptador.

El objetivo del MVP no es soportar una cantidad enorme de proveedores.

El objetivo es demostrar:

Source

   ↓

Adapter

   ↓

Resolved Representation

   ↓

Playback Session

La cantidad de adaptadores crecerá posteriormente mediante la misma
arquitectura.

**Nota:** las integraciones también deberán operar mediante técnicas y
mecanismos destinadas a eludir CAPTCHA, controles anti-bot u otras
restricciones de acceso, por lo tanto constituyen un requisito
arquitectónico del MVP.

### H. Media Gateway

El MVP tendrá un Media Gateway funcional.

**Primera versión:**

- Creación/validación de sesiones de reproducción.

- Entrega de manifiestos compatibles.

- Proxy de recursos cuando sea necesario y permitido.

- Reescritura controlada de referencias dentro de manifiestos cuando
  corresponda.

- Tokens temporales de acceso.

- Validación de sesión.

- Control básico de acceso.

- Rate limiting básico.

- CORS correctamente configurado.

- Logs y métricas.

- Sin almacenamiento permanente de vídeo.

El Gateway **no realizará transcodificación**.

### I. Selección automática de fuente

Esto entra en el MVP, pero en una versión deliberadamente sencilla.

No necesitamos todavía un sistema de scoring sofisticado.

Inicialmente puede utilizar una política como:

1\. Fuente activa

2\. Compatible con la solicitud

3\. Mejor calidad disponible

4\. Preferencia de idioma

5\. Prioridad configurada

6\. Estado de salud

Posteriormente evolucionará hacia un sistema de ranking más completo.

La arquitectura debe permitir esa evolución sin modificar el Player.

### J. Cambio manual de fuente

El usuario podrá abrir un selector del tipo:

Servidores disponibles

● Servidor A --- 1080p --- Español

○ Servidor B --- 720p --- Español

○ Servidor C --- 1080p --- Subtitulado

El cambio deberá producir una nueva sesión/representación de
reproducción sin obligar al usuario a abandonar la ficha del contenido.

Cuando sea técnicamente viable, se intentará conservar la posición
temporal actual.

### K. Health Checker básico

También entra en el MVP, pero no como el sistema avanzado descrito para
la V1.

Debe poder:

- comprobar fuentes conocidas;

- registrar éxito/fallo;

- actualizar estado;

- registrar timestamp de última comprobación;

- detectar fuentes persistentemente fallidas;

- proporcionar esa información al selector de fuentes.

No necesitamos todavía:

- modelos predictivos;

- scoring complejo;

- dashboards avanzados;

- análisis histórico profundo.

### L. Reportes de reproducción

Se conserva la idea original del documento.

Desde el reproductor:

**Reportar problema**

Con categorías iniciales:

- vídeo no disponible;

- audio no disponible;

- subtítulos incorrectos;

- reproducción fallida;

- otro.

El reporte queda asociado a:

content_id

source_id

playback_session_id

error_code

timestamp

Esto será muy útil posteriormente para alimentar el Health Checker.

### M. Administración mínima

El MVP necesita un pequeño CMS operativo.

**Administrador**

Podrá:

- crear contenido;

- editar contenido;

- eliminar/desactivar contenido;

- gestionar fuentes;

- cambiar prioridad de fuentes;

- consultar estados;

- revisar reportes.

**Moderador**

Podrá:

- editar metadatos básicos;

- añadir fuentes;

- actualizar fuentes;

- revisar reportes;

- marcar fuentes problemáticas.

El sistema avanzado de permisos y administración se desarrollará
posteriormente.

### N. Persistencia local

Para visitantes anónimos:

- progreso;

- preferencias básicas;

- último punto de reproducción.

Se conservará inicialmente en el navegador.

La sincronización entre dispositivos mediante cuenta quedará para una
fase posterior.

## 2.3. ¿Qué NO entra en el MVP?

No entra plataformas cliente adicionales:

- aplicación nativa iOS;

- aplicación nativa Android;

- aplicaciones específicas para Smart TV;

- integración específica con Android TV;

- WebOS;

- Tizen;

- Apple TV.

Sí se diseña el Media Player Core pensando en ellas, pero en el MVP la
implementación inicial será exclusivamente web.

Procesamiento o compresión de video propia (no re-codificaremos ni
almacenaremos archivos de video en nuestros servidores).

Comentarios de usuarios, foros o salas de chat en vivo.

Pasarelas de pago o suscripciones VIP/Premium (el sitio será 100%
gratuito monetizado con anuncios).

Descarga directa de archivos de video para el usuario.

No entra todavía la automatización avanzada de descubrimiento:

- crawling masivo;

- descubrimiento automatizado a gran escala;

- actualización completa de catálogo mediante bots;

- múltiples pipelines automáticos de ingestión

El MVP puede utilizar una combinación de:

ingesta manual

\+

dataset/catalogación inicial

\+

automatización limitada

para demostrar el funcionamiento completo.

No entrará aun un sistema avanzado de recomendaciones:

- recomendaciones personalizadas;

- collaborative filtering;

- embeddings;

- modelos ML;

- perfiles de gusto;

- experimentación A/B.

Aun no entrará la comunidad, es decir, no entrará:

- comentarios;

- foros;

- chat;

- perfiles sociales;

- seguidores;

- valoraciones sociales.

No entra procesamiento de video:

- transcoding;

- encoding;

- compresión;

- almacenamiento permanente de vídeo;

- generación propia de múltiples calidades.

La plataforma trabajará inicialmente con representaciones compatibles
proporcionadas por las fuentes integradas.

No entra las funcionalidades avanzadas de monetización inicialmente como
dependencia crítica:

- sistema publicitario complejo;

- múltiples redes simultáneas;

- optimización avanzada de fill rate;

- AdPod;

- experimentación publicitaria;

- marketplace de anunciantes;

- pagos o suscripciones.

Puede existir una **integración mínima o placeholder**, pero el
funcionamiento del sistema no deberá depender de ella.

No entra las aplicaciones de pago:

- suscripciones;

- planes premium;

- pasarelas de pago;

- facturación;

- contenido de pago.

No entra las funciones avanzadas de escala:

- arquitectura multi-región;

- multi-tenant;

- despliegue global;

- autoscaling complejo;

- Kubernetes como requisito;

- múltiples regiones de bases de datos;

- infraestructura distribuida de gran escala.

## 2.4. ¿Qué se deja para las Fases Posteriores (Post-MVP)?

### Fase 2 -- Inteligencia y automatización

- descubrimiento automático;

- ingesta automatizada;

- normalización avanzada;

- deduplicación avanzada;

- múltiples adaptadores;

- ranking inteligente de fuentes;

- health checking avanzado;

- fallback automático;

- actualización automática del catálogo;

- búsqueda avanzada.

### Fase 3 -- Experiencia multiplataforma

- sincronización de usuarios;

- favoritos;

- historial en la nube;

- preferencias sincronizadas;

- Chromecast;

- AirPlay;

- clientes móviles;

- adaptación del Media Player Core a dispositivos móviles;

- adaptación progresiva a televisores.

### Fase 4 -- Plataforma avanzada

- recomendaciones;

- analítica avanzada;

- CMS avanzado;

- observabilidad operacional completa;

- dashboards;

- notificaciones;

- personalización;

- optimización de infraestructura.

- Bot/Scraper automatizado para actualización de catálogo diario

### Fase 5 -- Monetización y escala

- infraestructura publicitaria avanzada;

- optimización de monetización;

- analítica publicitaria;

- optimización de costes;

- CDN y estrategias avanzadas de distribución;

- escalamiento horizontal;

- optimización avanzada del Media Gateway.

## 2.5. Definición formal de "MVP terminado"

El MVP se considera funcional cuando puede completarse exitosamente el
siguiente escenario:

1\. Administrador crea un contenido

          ↓

2\. Administrador añade ≥2 fuentes

          ↓

3\. Las fuentes quedan registradas

          ↓

4\. Health Checker determina su estado

          ↓

5\. Usuario abre el contenido

          ↓

6\. Backend obtiene las fuentes disponibles

          ↓

7\. Playback Orchestrator selecciona una fuente

          ↓

8\. Source Resolver obtiene una representación válida

          ↓

9\. Media Gateway crea la sesión de reproducción

          ↓

10\. Media Player Core comienza reproducción

          ↓

11\. Usuario puede cambiar manualmente de fuente

          ↓

12\. Nueva fuente puede reproducirse

          ↓

13\. Un fallo de fuente puede registrarse

          ↓

14\. El sistema conserva el estado de salud correspondiente

**Criterio de aceptación principal**

El MVP debe demostrar reproducción audiovisual funcional de extremo a
extremo utilizando múltiples fuentes intercambiables bajo una interfaz
de reproducción unificada.

## 2.6. Arquitectura objetivo vs. MVP

Quiero agregar al final de esta sección una pequeña tabla que nos va a
servir muchísimo durante todo el proyecto:

  --------------------------------------------------------------------
     **Componente**     **MVP**                **V1 objetivo**
  --------------------- ---------------------- -----------------------
      **Catálogo**      Básico                 Completo

       **Ingesta**      Manual + limitada      Automática + manual

  **Fuentes múltiples** **Sí**                 Sí

   **Source Registry**  Básico                 Completo

   **Source Resolver**  1--2 adaptadores       Ecosistema de
                                               adaptadores

       **Selección      Básica                 Ranking avanzado
      automática**                             

      **Fallback**      Básico                 Inteligente

   **Health Checker**   Básico                 Continuo + histórico

    **Media Gateway**   Funcional              Alta
                                               disponibilidad/escala

  **Media Player Core** Web                    Multiplataforma

       **Cambio de      **Sí**                 Sí
       servidor**                              

      **Usuarios**      Básico/anónimo         Completo

      **Búsqueda**      Básica                 Avanzada

   **Recomendaciones**  No                     Sí

    **Monetización**    Preparación            Completa

         **CMS**        Básico                 Avanzado

       **Mobile**       No                     Sí

         **TV**         No                     Sí

   **Automatización**   Limitada               Amplia

   **Observabilidad**   Básica                 Completa

       **Escala**       Single-node/limitada   Horizontal
  --------------------------------------------------------------------

MVP Antes:

MVP

 └── Player

      └── 1--2 fuentes

Post-MVP

 ├── múltiples fuentes

 ├── extractor multitarea

 ├── fallback

 └── automatización

MVP Ahora

MVP

 ├── Player Core

 ├── múltiples fuentes

 ├── Source Registry

 ├── Source Resolver

 ├── selección automática básica

 ├── cambio manual de fuente

 ├── fallback básico

 ├── Health Checker básico

 ├── Media Gateway

 └── catálogo + CMS mínimo
