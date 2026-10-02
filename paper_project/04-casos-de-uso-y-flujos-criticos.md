# 4. CASOS DE USO Y FLUJOS CRÍTICOS

## Objetivo

Esta sección define los principales casos de uso de la plataforma y los
flujos que representan sus operaciones críticas.

Los casos de uso se organizan alrededor de cuatro capacidades
principales:

1.  **Descubrimiento y consulta del catálogo.**

2.  **Gestión y resolución de múltiples fuentes.**

3.  **Inicio y control de sesiones de reproducción.**

4.  **Operación, mantenimiento y observabilidad de las fuentes.**

El flujo de reproducción constituye el caso de uso central de la
plataforma, ya que integra el catálogo, el registro de fuentes, la
selección automática, la resolución, el Media Gateway y el Media Player
Core.

## CU-01: Explorar catálogo y buscar contenido

**Actores:** Visitante / Usuario registrado.

**Objetivo:** Permitir al usuario localizar contenidos audiovisuales
disponibles en la plataforma.

**Flujo principal**

1.  El usuario accede a la página principal o al módulo de búsqueda.

2.  El usuario introduce un término de búsqueda o selecciona un filtro.

3.  El cliente solicita los resultados al servicio de catálogo.

4.  El sistema consulta los contenidos disponibles.

5.  Se aplican los filtros y criterios de búsqueda correspondientes.

6.  El backend devuelve los resultados normalizados.

7.  El cliente muestra los contenidos disponibles.

**Parámetros iniciales:** La búsqueda podrá contemplar:

- título;

- género;

- año;

- tipo de contenido;

- estado;

- otros filtros incorporados posteriormente.

**Resultado:** El usuario obtiene una lista navegable de contenidos que
puede consultar o reproducir.

## CU-02: Consultar detalle de contenido

**Actores:** Visitante / Usuario registrado.

**Objetivo:** Mostrar la información completa de un contenido y sus
posibilidades de reproducción.

**Flujo principal**

1.  El usuario selecciona un contenido.

2.  El cliente solicita su información al catálogo.

3.  El sistema devuelve los metadatos correspondientes.

4.  Si se trata de una serie, se consultan sus temporadas y episodios.

5.  El sistema identifica las fuentes asociadas al contenido.

6.  El cliente presenta la información disponible.

7.  El usuario puede seleccionar un episodio o iniciar la reproducción.

**Información mostrada:** Dependiendo del tipo de contenido:

- título;

- sinopsis;

- imágenes;

- año;

- géneros;

- duración;

- temporadas;

- episodios;

- idiomas disponibles;

- subtítulos disponibles;

- información de disponibilidad de fuentes.

**Importante:** la vista puede mostrar información sobre las fuentes
disponibles, pero la selección definitiva de la fuente de reproducción
corresponde al **Playback Orchestrator**.

## CU-03: Iniciar reproducción

**Actores:** Visitante / Usuario registrado.\
**Componentes involucrados:** Media Player Core, Playback Orchestrator,
Source Registry, Source Resolver, Media Gateway.

**Objetivo:** Crear una sesión de reproducción y comenzar la
reproducción de un contenido mediante una fuente disponible.

**Flujo principal**

Media Player Core

        │

        │ Solicitud de reproducción

        ▼

Playback Orchestrator

        │

        │ Consulta fuentes

        ▼

Source Registry

        │

        │ Fuentes candidatas

        ▼

Playback Orchestrator

        │

        │ Selección automática

        ▼

Source Resolver

        │

        │ Resolución

        ▼

Media Gateway

        │

        │ Sesión / manifest / acceso

        ▼

Media Player Core

        │

        ▼

Reproducción

**Secuencia detallada**

1.  El usuario pulsa **Reproducir**.

2.  El Media Player Core solicita una sesión de reproducción.

3.  El Playback Orchestrator identifica el contenido solicitado.

4.  El Orchestrator consulta el Source Registry.

5.  El Registry devuelve las fuentes candidatas.

6.  El Orchestrator descarta fuentes que no cumplan las condiciones
    mínimas de disponibilidad o compatibilidad.

7.  Se evalúan los criterios de selección configurados.

8.  El sistema selecciona automáticamente una fuente.

9.  El Orchestrator solicita al Source Resolver la resolución de dicha
    fuente.

10. El Source Resolver utiliza el adaptador correspondiente.

11. El Resolver devuelve una representación normalizada del recurso
    reproducible.

12. El sistema crea una Playback Session.

13. El Media Gateway prepara el acceso al recurso cuando sea necesario.

14. El backend devuelve al Media Player Core la información normalizada
    de reproducción.

15. El Player inicializa el protocolo correspondiente.

16. Comienza la reproducción.

17. El sistema registra los eventos relevantes de la sesión.

**Resultado:** El usuario reproduce el contenido sin necesidad de
conocer:

- qué proveedor proporciona la fuente;

- qué adaptador fue utilizado;

- cómo se resolvió la fuente;

- qué infraestructura intermedia se utilizó.

## CU-04: Selección automática de fuente

**Actor:** Playback Orchestrator.\
**Componentes:** Source Registry / Source Resolver / Media Gateway.

**Objetivo:** Seleccionar automáticamente una fuente adecuada entre las
múltiples fuentes asociadas a un contenido.

**Flujo**

1.  El Orchestrator solicita las fuentes activas.

2.  El Source Registry devuelve las fuentes candidatas.

3.  Se eliminan fuentes incompatibles.

4.  Se consideran atributos como:

    a.  disponibilidad;

    b.  estado de salud;

    c.  calidad;

    d.  idioma;

    e.  compatibilidad;

    f.  prioridad configurada;

    g.  confiabilidad histórica, cuando esté disponible.

5.  El Orchestrator ordena las candidatas según la política de
    selección.

6.  Selecciona la primera candidata válida.

7.  Solicita su resolución.

8.  Si la resolución es satisfactoria, crea la sesión.

9.  Si la resolución falla, puede intentar una fuente alternativa según
    las reglas de fallback.

**Principio:** La existencia de múltiples fuentes permite que un fallo
individual no implique necesariamente la indisponibilidad del contenido.

Contenido

 ├── Fuente A → falla

 ├── Fuente B → disponible ← seleccionada

 └── Fuente C → disponible

## CU-05: Cambiar manualmente de fuente

**Actor:** Visitante / Usuario registrado.

**Objetivo:** Permitir al usuario cambiar la fuente seleccionada
automáticamente por otra fuente disponible.

**Flujo**

1.  El usuario abre el selector de servidores/fuentes.

2.  El Media Player Core solicita las alternativas disponibles para la
    sesión.

3.  El sistema devuelve las fuentes que pueden utilizarse.

4.  El usuario selecciona una fuente.

5.  El Orchestrator solicita su resolución.

6.  El Source Resolver obtiene la representación correspondiente.

7.  Se crea o actualiza la sesión de reproducción.

8.  El Player cambia al nuevo recurso.

9.  El sistema intenta conservar la posición temporal actual.

10. Si el cambio no es posible, el Player informa al usuario y conserva
    la sesión anterior cuando sea viable.

**Consideración:** El cambio manual no significa que el Player conozca
directamente los proveedores.

El Player solamente trabaja con identificadores y capacidades expuestas
por el contrato de reproducción.

## CU-06: Cambiar calidad, audio o subtítulos

**Actor:** Visitante / Usuario registrado.

**Objetivo:** Modificar las características de reproducción disponibles
dentro de la representación seleccionada.

**Flujo**

1.  El usuario abre el menú de configuración del reproductor.

2.  El Player consulta las capacidades disponibles de la sesión.

3.  El usuario selecciona:

    a.  calidad;

    b.  pista de audio;

    c.  subtítulos.

4.  El Player aplica el cambio cuando la representación lo permite.

5.  Si el cambio requiere una nueva representación o sesión, el sistema
    realiza la transición correspondiente.

6.  Se intenta conservar la posición temporal actual.

**Consideración arquitectónica:** El sistema no debe asumir que todas
las fuentes proporcionan exactamente las mismas capacidades.

Una fuente podría ofrecer:

1080p

720p

480p

Español

Inglés

Subtítulos

mientras otra podría ofrecer solamente:

720p

Español

El Player debe recibir las capacidades reales de la sesión.

## CU-07: Fallback automático ante fallo de reproducción

**Actores:** Media Player Core / Playback Orchestrator.

**Objetivo:** Intentar continuar la reproducción cuando la fuente
actualmente seleccionada deja de estar disponible.

**Flujo**

1.  El Player detecta un error de reproducción.

2.  Determina si el error es potencialmente recuperable.

3.  Informa al backend del fallo.

4.  El Playback Orchestrator identifica fuentes alternativas.

5.  Se selecciona una fuente alternativa compatible.

6.  El Source Resolver intenta resolverla.

7.  Si la resolución es exitosa, se crea una nueva sesión o
    representación.

8.  El Player intenta continuar la reproducción.

9.  Se registra el resultado del fallback.

**Resultado posible**

Fuente A

   ↓

Fallo

   ↓

Fuente B

   ↓

Resolución OK

   ↓

Reproducción continúa

Si todas las alternativas fallan, el sistema informa al usuario y
registra el fallo.

**Métrica asociada:** El sistema debe poder medir posteriormente:

**Automatic Failover Success Rate**

para conocer qué porcentaje de fallos puede recuperarse automáticamente.

## CU-08: Reportar una fuente o reproducción defectuosa

**Actor:** Visitante / Usuario registrado.

**Objetivo:** Permitir que el usuario comunique problemas detectados
durante la reproducción.

**Flujo**

1.  El usuario selecciona **Reportar problema**.

2.  El Player recopila el contexto disponible.

3.  El cliente envía el reporte.

4.  El backend registra:

    a.  contenido;

    b.  fuente;

    c.  sesión;

    d.  tipo de error;

    e.  timestamp;

    f.  información técnica relevante.

5.  El sistema evita duplicar reportes idénticos cuando corresponda.

6.  El reporte queda disponible para revisión administrativa.

7.  Los reportes recurrentes pueden alimentar los indicadores de salud
    de una fuente.

## CU-09: Guardar progreso y reanudar reproducción

**Actores:** Visitante / Usuario registrado.

**Flujo para visitante**

1.  El Player registra periódicamente la posición.

2.  La posición se almacena localmente.

3.  El usuario abandona la reproducción.

4.  Al regresar al contenido, el Player recupera la posición.

5.  El usuario puede continuar desde el punto guardado.

**Flujo para usuario registrado**

1.  El Player registra la posición.

2.  El cliente envía periódicamente el progreso al backend.

3.  El backend almacena el progreso asociado al usuario y contenido.

4.  Otro dispositivo puede consultar dicha posición.

5.  El Player puede reanudar desde el último punto registrado.

## CU-10: Añadir una fuente manualmente

**Actores:** Administrador / Moderador autorizado.

**Objetivo:** Permitir incorporar una nueva fuente a un contenido sin
depender exclusivamente del sistema automático de descubrimiento.

**Flujo**

1.  El administrador/moderador accede al contenido.

2.  Selecciona **Añadir fuente**.

3.  Introduce la información requerida.

4.  El sistema valida la estructura de los datos.

5.  La fuente se registra como nueva entidad.

6.  La fuente se asocia al contenido correspondiente.

7.  El Source Registry establece su estado inicial.

8.  El sistema puede solicitar una comprobación de salud o resolución.

9.  El resultado queda registrado.

10. La fuente pasa a estar disponible para futuras selecciones si cumple
    las condiciones necesarias.

**Principio:** La incorporación de una nueva fuente **no elimina ni
sobrescribe automáticamente las fuentes existentes**.

## CU-11: Descubrimiento e ingesta automática

**Actor:** Sistema de Descubrimiento / Ingesta.

**Objetivo:** Incorporar automáticamente nuevos contenidos y/o fuentes
siguiendo las estrategias de descubrimiento configuradas.

**Flujo general**

Fuente externa de información

          │

          ▼

   Descubrimiento

          │

          ▼

      Normalización

          │

          ▼

    Detección de duplicados

          │

          ▼

     Asociación

      ┌───┴───┐

      ▼       ▼

   Content   Source

      │       │

      └───┬───┘

          ▼

      Registro

El proceso debe registrar:

- origen;

- timestamp;

- resultado;

- identificadores detectados;

- errores;

- contenido/fuente creada o actualizada.

La automatización avanzada de este proceso queda fuera del alcance
inicial del MVP, pero la arquitectura debe permitir incorporarla
posteriormente.

## CU-12: Verificar salud de una fuente

**Actor:** Health Checker.

**Objetivo:** Determinar periódicamente si una fuente registrada
continúa disponible.

**Flujo**

1.  El scheduler genera una tarea de comprobación.

2.  El Health Checker identifica la fuente.

3.  Realiza la comprobación correspondiente.

4.  Registra el resultado.

5.  Actualiza el estado de la fuente.

6.  Actualiza la fecha de última comprobación.

7.  Si existe un patrón de fallos, puede marcar la fuente como degradada
    o no disponible.

8.  El resultado queda disponible para el Source Registry y el Playback
    Orchestrator.

**Estados**

DISCOVERED

     │

     ▼

   ACTIVE

     │

     ├──────────────┐

     ▼              ▼

 DEGRADED      UNAVAILABLE

     │              │

     └──────┬───────┘

            ▼

       comprobación

            │

            ▼

          ACTIVE

## CU-13: Gestionar catálogo y fuentes desde CMS

**Actores:** Administrador / Moderador.

**Administrador**

- Crear contenido.

- Editar contenido.

- Eliminar o desactivar contenido.

- Crear y gestionar fuentes.

- Configurar prioridades.

- Gestionar usuarios y roles.

- Consultar reportes.

- Consultar estado operacional.

**Moderador**

- Editar metadatos permitidos.

- Crear/actualizar fuentes.

- Revisar reportes.

- Actualizar información de disponibilidad.

Todas las operaciones administrativas deben quedar registradas mediante
auditoría cuando corresponda.

## CU-14: Registrar y consultar una Playback Session

**Actores:** Playback Orchestrator / Media Player Core.

Este caso merece existir por separado porque **Playback Session es una
entidad arquitectónica importante**, no simplemente un detalle técnico.

**Flujo**

1.  El usuario solicita reproducción.

2.  El Orchestrator selecciona una fuente.

3.  El Resolver obtiene la representación reproducible.

4.  Se crea una Playback Session.

5.  Se asigna un identificador único.

6.  Se establecen las capacidades y recursos disponibles.

7.  Se define una expiración.

8.  El Player recibe la información necesaria.

9.  Durante la reproducción se registran eventos relevantes.

10. La sesión finaliza, expira o es invalidada.

Conceptualmente:

Content

   │

   ▼

Selected Source

   │

   ▼

Resolved Representation

   │

   ▼

Playback Session

   │

   ├── manifest / resource

   ├── capabilities

   ├── selected source

   ├── alternatives

   └── expiration

   │

   ▼

Media Player Core

## Flujo crítico central de la plataforma

Finalmente, esta sección debería dejar **un único flujo de referencia**
que podamos reutilizar posteriormente en arquitectura, APIs, seguridad,
observabilidad y pruebas.

┌──────────────────────┐

│        Usuario       │

└──────────┬───────────┘

           │

           ▼

┌──────────────────────┐

│  Media Player Core   │

└──────────┬───────────┘

           │ requestPlayback()

           ▼

┌──────────────────────┐

│ Playback Orchestrator│

└──────────┬───────────┘

           │

           ▼

┌──────────────────────┐

│   Source Registry    │

└──────────┬───────────┘

           │

      fuentes candidatas

           │

           ▼

┌──────────────────────┐

│ Playback Orchestrator│

│ selección automática │

└──────────┬───────────┘

           │

           ▼

┌──────────────────────┐

│   Source Resolver    │

│  + Source Adapter    │

└──────────┬───────────┘

           │

       representación

       reproducible

           │

           ▼

┌──────────────────────┐

│   Media Gateway      │

└──────────┬───────────┘

           │

     Playback Session

           │

           ▼

┌──────────────────────┐

│  Media Player Core   │

└──────────┬───────────┘

           │

           ▼

       REPRODUCCIÓN

           │

      ┌────┴─────┐

      │          │

      ▼          ▼

    Éxito      Error

                 │

                 ▼

        Fallback / Reporte

Y el ecosistema de mantenimiento queda alrededor:

                 ┌─────────────────────┐

                 │ Discovery / Ingestion│

                 └──────────┬──────────┘

                            ▼

                    ┌───────────────┐

                    │    Catalog    │

                    └───────┬───────┘

                            │

                            ▼

                    ┌───────────────┐

                    │ Source Registry│

                    └───────┬───────┘

                            ▲

                            │

                 ┌──────────┴──────────┐

                 │                     │

          ┌──────┴──────┐       ┌─────┴──────┐

          │ Health       │       │ Admin /    │

          │ Checker      │       │ Moderator  │

          └──────────────┘       └────────────┘

## Priorización de los casos de uso

Para que posteriormente podamos convertir esto en backlog, los casos
pueden clasificarse así:

  -----------------------------------------------------------------------
  **Prioridad**            **Casos de uso**
  ------------------------ ----------------------------------------------
  **Núcleo MVP**           CU-01, CU-02, CU-03, CU-04, CU-05, CU-06,
                           CU-07, CU-08, CU-09, CU-10, CU-12

  **MVP administrativo**   CU-13

  **Preparación para       CU-11
  automatización**         

  **Arquitectura           CU-14
  transversal**            
  \-----------------------------------------------------------------------

El punto importante es que **CU-03 no está aislado**: depende de CU-04,
CU-05, CU-07 y CU-12. Eso refleja exactamente la idea central del
proyecto: **el reproductor no es el sistema; es la interfaz final de un
sistema de fuentes y reproducción mucho más amplio.**
