# 1. VISIÓN DEL PRODUCTO

## ¿Qué es?

Una plataforma audiovisual moderna de **agregación, descubrimiento y
reproducción de contenido multimedia**, diseñada para unificar en una
única experiencia contenidos provenientes de múltiples fuentes externas.

La plataforma mantiene un **catálogo audiovisual unificado**, en el que
un mismo contenido puede estar asociado simultáneamente a múltiples
fuentes de reproducción. Estas fuentes pueden incorporarse de forma
**automática mediante procesos de descubrimiento e ingesta**, o de forma
**manual mediante las herramientas administrativas y de moderación de la
plataforma**.

Sobre este catálogo se construye una arquitectura de reproducción
compuesta por tres componentes centrales:

- **Media Player Core:** núcleo de reproducción responsable de
  proporcionar una experiencia de reproducción consistente al usuario,
  independientemente de la fuente utilizada. Su primera implementación
  será web, pero su diseño estará orientado a permitir posteriormente
  clientes para dispositivos móviles y televisores.

- **Motor de Fuentes y Adaptadores / Source Resolver:** componente
  responsable de interpretar y resolver fuentes externas compatibles y
  transformarlas en una representación de reproducción normalizada para
  la plataforma.

- **Media Gateway:** capa intermedia responsable de gestionar de forma
  controlada el transporte de los recursos multimedia entre las fuentes
  compatibles y los clientes de reproducción.

El sistema seleccionará automáticamente una fuente de reproducción
utilizando información como **disponibilidad, estado de salud, calidad,
idioma, compatibilidad y confiabilidad histórica**, cuando dicha
información esté disponible. El usuario conservará además la posibilidad
de consultar y seleccionar manualmente otra fuente disponible.

La plataforma no estará limitada conceptualmente a un único tipo de
contenido. Su modelo de dominio estará preparado para representar
diferentes formas de contenido audiovisual, incluyendo películas,
series, episodios, cortometrajes, documentales, conciertos, clips y
otras modalidades que puedan incorporarse posteriormente.

La primera interfaz de consumo será una **aplicación web**, pero el
objetivo arquitectónico es que la lógica de reproducción constituya un
**Media Player Core multiplataforma**, desacoplado de las
particularidades de un único dispositivo.

## ¿Para quién?

**Usuarios finales:** Personas que desean descubrir y reproducir
contenido audiovisual desde una interfaz unificada, evitando tener que
interactuar directamente con múltiples reproductores, interfaces y
experiencias diferentes asociadas a las distintas fuentes.

La plataforma busca proporcionar:

- reproducción centralizada;

- selección automática de una fuente adecuada;

- posibilidad de cambiar manualmente de fuente;

- selección de calidad cuando el formato de la fuente lo permita;

- selección de pistas de audio;

- selección y sincronización de subtítulos;

- continuidad de reproducción;

- historial y progreso de reproducción;

- una experiencia consistente entre diferentes contenidos y fuentes.

**Administradores y moderadores:** Usuarios responsables de mantener la
calidad del catálogo y de las fuentes asociadas.

Sus funciones incluyen:

- creación y edición de contenidos;

- incorporación manual de fuentes;

- revisión y actualización de fuentes existentes;

- supervisión de la salud de las fuentes;

- corrección de metadatos;

- gestión de incidencias y reportes;

- mantenimiento de la disponibilidad general del catálogo.

**Sistema automatizado:** Procesos internos encargados de ejecutar
tareas de forma automática, entre ellas:

- descubrimiento e ingesta;

- normalización de información;

- asociación de fuentes con contenidos;

- resolución de fuentes compatibles;

- comprobación de disponibilidad;

- actualización del estado de las fuentes;

- mantenimiento de cachés;

- procesamiento de tareas asíncronas.

## ¿Qué problema resuelve?

**Fragmentación de las fuentes**

Un mismo contenido puede encontrarse en múltiples servidores o fuentes,
cada uno con una interfaz, comportamiento y nivel de disponibilidad
diferente.

La plataforma abstrae esa fragmentación mediante un **registro unificado
de fuentes**, permitiendo que múltiples fuentes coexistan asociadas al
mismo contenido.

**Dependencia de un único servidor**

La disponibilidad de un contenido no debería depender necesariamente de
una sola fuente.

Si existen varias fuentes válidas, el sistema puede seleccionar
automáticamente una disponible y permitir al usuario cambiar manualmente
a otra cuando sea necesario.

**Experiencias de reproducción inconsistentes**

Cada fuente externa puede presentar diferentes reproductores, controles,
formatos y capacidades.

El **Media Player Core** proporciona una interfaz de reproducción común
y desacoplada de la fuente.

**Fuentes inestables o temporalmente indisponibles**

Las fuentes externas pueden cambiar de estado con el tiempo.

El sistema incorpora mecanismos de:

- health checking;

- clasificación de estado;

- detección de fallos;

- actualización de disponibilidad;

- selección de fuentes alternativas.

De esta manera, una fuente individual puede quedar indisponible sin que
necesariamente el contenido completo deje de estar disponible.

**Complejidad técnica de las fuentes externas**

Las diferentes fuentes pueden utilizar formatos, estructuras y
mecanismos de entrega diferentes.

El sistema abstrae esta heterogeneidad mediante una arquitectura de
**adaptadores especializados**, evitando que el catálogo, el reproductor
o la interfaz de usuario tengan que conocer las particularidades de cada
proveedor.

## ¿En qué se diferencia de otras páginas?

**Catálogo desacoplado de las fuentes**

El contenido y la fuente no son tratados como una misma entidad.

Un contenido puede mantener múltiples fuentes simultáneamente:

Contenido

 ├── Fuente A

 ├── Fuente B

 ├── Fuente C

 └── Fuente D

Esto permite gestionar la disponibilidad y las características de cada
fuente de forma independiente.

**Selección automática + control manual**

La plataforma intentará seleccionar automáticamente una fuente adecuada
para iniciar la reproducción.

Al mismo tiempo, el usuario podrá consultar las alternativas disponibles
y cambiar manualmente de servidor cuando lo considere necesario.

**Media Player Core**

El reproductor no estará diseñado alrededor de un proveedor concreto.

La fuente de contenido constituye una dependencia del sistema de
reproducción, no de la interfaz del usuario.

Esto permite que la experiencia del reproductor permanezca consistente
incluso cuando cambia la fuente utilizada.

**Arquitectura orientada a múltiples dispositivos**

Aunque el desarrollo inicial se realizará sobre web, el núcleo de
reproducción se diseñará como un **Media Player Core**, con una
separación clara entre la lógica de reproducción y las particularidades
de cada plataforma cliente.

La arquitectura podrá evolucionar posteriormente hacia:

                    Media Player Core

                           │

             ┌─────────────┼─────────────┐

             │             │             │

            Web          Mobile          TV

sin convertir la implementación web inicial en una dependencia
arquitectónica permanente.

**Automatización + control humano**

El catálogo podrá crecer mediante procesos automatizados, pero los
administradores y moderadores conservarán mecanismos para incorporar,
corregir y mantener fuentes manualmente.

La automatización complementará la operación humana en lugar de hacer
que todo el sistema dependa exclusivamente de ella.

**Experiencia de reproducción limpia**

La interfaz propia centraliza los controles de reproducción y busca
evitar que el usuario tenga que abandonar la plataforma para interactuar
con la interfaz de una fuente externa.

La monetización y los componentes publicitarios, cuando estén
habilitados, estarán desacoplados del núcleo de reproducción y sujetos a
las restricciones definidas por la arquitectura de producto.

## Métricas de Éxito (KPIs)

### Experiencia de reproducción

**Playback Success Rate**

Porcentaje de intentos de reproducción que alcanzan exitosamente el
inicio efectivo del contenido.

**Time-to-First-Frame (TTFF)**

Tiempo transcurrido entre la solicitud de reproducción y la presentación
del primer frame reproducible.

**Playback Failure Rate**

Porcentaje de sesiones que no logran iniciar correctamente o que fallan
durante el proceso inicial de reproducción.

**Rebuffer Ratio**

Porcentaje del tiempo efectivo de reproducción durante el cual el
usuario permanece detenido debido a falta de datos.

### Disponibilidad de fuentes

**Source Resolution Success Rate**

Porcentaje de solicitudes de resolución que producen una representación
reproducible válida.

**Source Availability Rate**

Porcentaje de fuentes conocidas que se encuentran disponibles durante
las comprobaciones de salud.

**Automatic Failover Success Rate**

Porcentaje de sesiones en las que el sistema consigue cambiar
exitosamente hacia una fuente alternativa después de detectar un fallo
de la fuente seleccionada.

### Calidad del catálogo

**Catalog Coverage**

Cantidad de contenidos publicados y correctamente normalizados.

**Source Coverage**

Cantidad media de fuentes disponibles por contenido.

**Catalog Freshness**

Tiempo transcurrido entre la detección de un cambio relevante en una
fuente y su reflejo en el catálogo.

### Experiencia del usuario

**Playback Session Continuity**

Porcentaje de sesiones que mantienen una reproducción estable sin
errores críticos.

**Ad-related Abandonment Rate**

Porcentaje de sesiones que abandonan durante o inmediatamente después de
una experiencia publicitaria.
