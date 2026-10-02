# 3. ACTORES Y ROLES

## 3.1. Visión general

La plataforma distingue entre **actores humanos**, **actores
administrativos/moderativos** y **componentes internos automatizados**.

Los actores humanos interactúan principalmente con el catálogo, la
reproducción, la gestión de fuentes y la administración de la
plataforma. Los componentes internos ejecutan procesos de
descubrimiento, verificación, resolución, selección y preparación de
reproducción.

La arquitectura diferencia claramente entre:

- **quién solicita una acción**;

- **qué componente coordina la acción**;

- **qué componente ejecuta técnicamente la operación**.

Esto evita concentrar responsabilidades en un único "Backend / Worker /
Bot".

## 3.2. Visitante / Usuario anónimo

**Acceso:** No requiere autenticación.

**Capacidades**

- Navegar por el catálogo.

- Explorar categorías, géneros, películas, series, temporadas y
  episodios.

- Realizar búsquedas.

- Consultar información y metadatos de contenidos.

- Consultar las fuentes disponibles para un contenido.

- Iniciar la reproducción.

- Seleccionar manualmente una fuente alternativa disponible.

- Cambiar calidad, audio y subtítulos cuando la sesión de reproducción
  lo permita.

- Utilizar las funciones disponibles del Media Player Core.

- Reportar problemas de reproducción o fuentes no disponibles.

- Conservar localmente progreso y preferencias básicas de reproducción.

**Limitaciones**

- No dispone de historial sincronizado en la nube.

- No dispone de favoritos sincronizados.

- No dispone de preferencias asociadas a una cuenta.

- No dispone de funciones administrativas o de moderación.

## 3.3. Usuario registrado

**Acceso:** Requiere autenticación mediante los mecanismos de identidad
definidos por la plataforma.

**Capacidades:** Hereda todas las capacidades del visitante y
adicionalmente puede:

- Sincronizar su historial de reproducción.

- Reanudar contenido desde diferentes dispositivos.

- Gestionar favoritos.

- Gestionar contenido marcado para ver posteriormente.

- Gestionar seguidos (notificaciones de nuevos capítulos).

- Mantener preferencias de reproducción.

- Configurar idioma y preferencias de subtítulos.

- Consultar su actividad de reproducción.

- Recibir funcionalidades personalizadas que sean incorporadas
  posteriormente.

Las funcionalidades de recomendación, notificaciones y personalización
avanzada no forman parte del MVP inicial.

## 3.4. Administrador

**Acceso:** Acceso restringido mediante el panel administrativo de la
plataforma.

**Gestión del catálogo**

- Crear contenidos.

- Editar metadatos.

- Asociar temporadas y episodios.

- Gestionar imágenes y demás recursos descriptivos.

- Activar, desactivar o retirar contenidos.

- Gestionar identificadores y relaciones entre contenidos.

**Gestión de fuentes**

- Crear fuentes manualmente.

- Asociar una fuente con un contenido.

- Modificar información de una fuente.

- Activar o desactivar fuentes.

- Configurar prioridades.

- Consultar estado y salud de las fuentes.

- Revisar el historial de fallos de una fuente.

- Sustituir o retirar fuentes que ya no sean utilizables.

**Una fuente no debe reemplazar automáticamente a otra fuente
existente.** La plataforma conserva múltiples fuentes asociadas al mismo
contenido.

**Gestión de usuarios y permisos**

- Gestionar usuarios.

- Gestionar roles.

- Gestionar moderadores.

- Aplicar restricciones administrativas según las políticas de la
  plataforma.

**Gestión operacional**

- Consultar reportes de reproducción.

- Consultar fallos de resolución.

- Consultar estado de los componentes.

- Consultar métricas básicas del sistema.

- Gestionar configuraciones operativas permitidas.

**Gestión de Anuncios:** configurar banners, scripts de anuncios y URLs
de VAST/VMAP para el pre-roll del reproductor.

## 3.5. Moderador

**Acceso:** Acceso al panel administrativo con permisos limitados.

**Capacidades**

- Editar metadatos básicos.

- Crear o actualizar fuentes.

- Asociar fuentes existentes con contenidos.

- Activar o desactivar fuentes dentro de sus permisos.

- Revisar reportes de fuentes o reproducción.

- Revisar el estado de disponibilidad de fuentes.

- Corregir información básica del catálogo.

- Solicitar o ejecutar reemplazos de fuentes según los permisos
  asignados.

**Limitaciones:** El moderador no puede:

- Gestionar usuarios y roles críticos.

- Modificar configuraciones de seguridad críticas.

- Modificar la infraestructura.

- Alterar configuraciones globales sensibles.

- Gestionar componentes internos fuera de sus permisos.

- Modificar configuraciones económicas o administrativas reservadas al
  administrador.

## 3.6. Sistema de Descubrimiento e Ingesta

Este actor representa los procesos automatizados encargados de
localizar, incorporar y normalizar información sobre contenidos y
fuentes.

**Responsabilidades**

- Detectar nuevos contenidos según las estrategias de descubrimiento
  configuradas.

- Detectar posibles fuentes asociadas a contenidos.

- Normalizar información obtenida.

- Identificar posibles duplicados.

- Asociar fuentes con contenidos existentes.

- Crear nuevos registros cuando corresponda.

- Actualizar información existente.

- Registrar el origen y resultado de cada operación.

- Enviar fuentes nuevas al Source Registry.

Este componente **no reproduce contenido**.

Su responsabilidad termina en entregar información estructurada al
sistema de catálogo y fuentes.

## 3.7. Source Registry

El **Source Registry** mantiene el inventario lógico de las fuentes
disponibles para cada contenido.

**Responsabilidades**

- Registrar fuentes.

- Mantener su estado.

- Asociarlas con contenidos y proveedores/hosts.

- Mantener prioridades.

- Registrar información de idioma, calidad y características
  disponibles.

- Mantener timestamps de última comprobación.

- Registrar historial básico de disponibilidad.

- Proporcionar al Playback Orchestrator las fuentes candidatas para una
  reproducción.

El Source Registry no decide por sí mismo qué fuente reproducirá el
usuario.

Esa responsabilidad corresponde al **Playback Orchestrator**.

## 3.8. Playback Orchestrator

El **Playback Orchestrator** coordina el inicio de una sesión de
reproducción.

**Responsabilidades**

1.  Recibir una solicitud de reproducción.

2.  Identificar el contenido solicitado.

3.  Consultar las fuentes disponibles.

4.  Filtrar fuentes incompatibles o no disponibles.

5.  Evaluar prioridad, calidad, idioma y estado.

6.  Seleccionar automáticamente una fuente.

7.  Solicitar su resolución al Source Resolver.

8.  Crear la sesión de reproducción.

9.  Entregar al Media Player Core una respuesta normalizada.

10. Mantener disponibles fuentes alternativas cuando sea posible.

11. Permitir posteriormente el cambio manual de fuente.

El Orchestrator constituye la **capa de decisión**, pero no debe
convertirse en un reproductor ni en un extractor.

## 3.9. Source Resolver / Extractor

Es el componente encargado de convertir una **Source conocida** en una
representación reproducible.

**Responsabilidades**

- Recibir una fuente registrada.

- Identificar el adaptador correspondiente.

- Ejecutar el proceso de resolución permitido para dicho proveedor.

- Obtener la representación de reproducción disponible.

- Normalizar información de stream.

- Detectar características como:

  - protocolo;

  - manifest;

  - variantes;

  - calidad;

  - audio;

  - subtítulos;

  - duración, cuando esté disponible;

  - expiración.

- Aplicar caché de resultados cuando sea apropiado.

- Registrar resultados y errores.

- Informar al Orchestrator si la fuente puede utilizarse.

**Principio de diseño**

El Resolver trabaja mediante **Source Adapters**.

Conceptualmente:

Source

   ↓

Source Resolver

   ↓

Adapter Registry

   ↓

SourceAdapter específico

   ↓

Resolved Media Representation

La implementación debe utilizar mecanismos de acceso permitidos por cada
fuente/proveedor. Los mecanismos destinados a evadir controles de
acceso, CAPTCHA, sistemas anti-bot u otras restricciones no constituyen
un requisito arquitectónico del MVP.

## 3.10. Media Gateway

El Media Gateway constituye la capa de transporte/intermediación entre
la sesión de reproducción y el recurso multimedia cuando dicha
intermediación sea necesaria.

**Responsabilidades**

- Crear y validar sesiones de reproducción.

- Entregar manifests cuando corresponda.

- Intermediar solicitudes de segmentos cuando corresponda.

- Aplicar tokens temporales.

- Controlar acceso.

- Aplicar límites básicos de tráfico.

- Gestionar CORS cuando corresponda.

- Registrar métricas de tráfico y errores.

- Gestionar expiración de sesiones.

- Aplicar las políticas de seguridad de salida y entrada.

El Media Gateway **no decide qué contenido reproducir ni qué fuente
utilizar**.

Recibe una fuente ya seleccionada/resuelta por las capas superiores.

## 3.11. Media Player Core

El Media Player Core es el componente responsable de la experiencia de
reproducción en el cliente.

**Responsabilidades**

- Inicializar sesiones de reproducción.

- Consumir el contrato normalizado de reproducción.

- Reproducir la representación proporcionada.

- Controlar reproducción, pausa, búsqueda y volumen.

- Gestionar pantalla completa y PiP cuando la plataforma lo soporte.

- Gestionar calidad.

- Gestionar pistas de audio.

- Gestionar subtítulos.

- Mostrar estados de carga y error.

- Informar eventos de reproducción al backend.

- Permitir cambio manual de fuente.

- Intentar recuperación ante errores recuperables.

- Mantener la posición local de reproducción cuando corresponda.

**Principio fundamental**

El Player **no conoce la implementación de los proveedores externos**.

No debe contener lógica específica como:

if provider == \"X\"

if host == \"Y\"

if adapter == \"Z\"

En su lugar recibe una interfaz normalizada de reproducción.

Por ejemplo:

PlaybackSession

├── sessionId

├── content

├── selectedSource

├── playback

│   ├── manifest

│   ├── protocol

│   └── expiresAt

└── alternatives\[\]

Esto permite que el mismo Media Player Core sea reutilizado
posteriormente en:

Web

Mobile

Android TV

Smart TV

otros clientes

sin trasladar al cliente la complejidad del sistema de fuentes.

## 3.12. Health Checker

El Health Checker ejecuta verificaciones automatizadas sobre las fuentes
registradas.

**Responsabilidades**

- Comprobar periódicamente fuentes conocidas.

- Registrar éxito o fallo.

- Actualizar estado.

- Registrar fecha de última comprobación.

- Detectar fallos persistentes.

- Proporcionar información histórica al sistema de selección.

- Generar eventos o alertas cuando una fuente presente degradación
  significativa.

Estados iniciales:

DISCOVERED

    ↓

ACTIVE

    ↓

DEGRADED

    ↓

UNAVAILABLE

El Health Checker no elimina automáticamente una fuente únicamente
porque una comprobación aislada falle.

## 3.13. Sistema de Reportes

El sistema recibe información proveniente de usuarios y componentes
internos.

Puede registrar:

- fuente no disponible;

- fallo de reproducción;

- fallo de resolución;

- error de manifest;

- error de segmento;

- audio ausente;

- subtítulos ausentes;

- problemas de calidad;

- otros errores definidos por la plataforma.

Los reportes deben asociarse, cuando sea posible, con:

contentId

sourceId

playbackSessionId

userId / anonymous session

errorCode

timestamp

Esto permitirá diferenciar un problema aislado del usuario de un
problema recurrente de una fuente.

## 3.14. Actores externos

La plataforma puede interactuar con sistemas externos para obtener o
procesar información, dependiendo de la implementación concreta.

Entre ellos pueden encontrarse:

- proveedores de metadatos;

- proveedores de imágenes;

- proveedores de fuentes audiovisuales;

- servicios de autenticación;

- servicios de publicidad;

- servicios de almacenamiento;

- servicios de analítica;

- servicios de notificaciones.

Estos sistemas no forman parte del núcleo lógico de la plataforma.

Las integraciones deben abstraerse mediante interfaces o adaptadores
para evitar acoplar el dominio principal a un proveedor específico.

## 3.15. Mapa general de actores y componentes

La relación conceptual queda así:

                        ┌──────────────────────┐

                        │      VISITANTE       │

                        └──────────┬───────────┘

                                   │

                        ┌──────────▼───────────┐

                        │  USUARIO REGISTRADO  │

                        └──────────┬───────────┘

                                   │

                                   ▼

                         ┌───────────────────┐

                         │ Media Player Core │

                         └─────────┬─────────┘

                                   │

                                   ▼

                         ┌───────────────────┐

                         │ Playback           │

                         │ Orchestrator       │

                         └───────┬───────────┘

                                 │

                    ┌────────────┼────────────┐

                    │            │            │

                    ▼            ▼            ▼

             ┌────────────┐ ┌──────────┐ ┌──────────────┐

             │  Catalog   │ │  Source  │ │    Source    │

             │            │ │ Registry │ │   Resolver   │

             └────────────┘ └──────────┘ └──────┬───────┘

                                                │

                                                ▼

                                        ┌──────────────┐

                                        │ Media        │

                                        │ Gateway      │

                                        └──────┬───────┘

                                               │

                                               ▼

                                      ┌─────────────────┐

                                      │ External Source │

                                      └─────────────────┘

 ┌──────────────┐       ┌───────────────┐

 │ Admin        │──────►│ Administration│

 └──────────────┘       │ / CMS         │

                        └───────┬───────┘

                                │

 ┌──────────────┐               │

 │ Moderator    │───────────────┘

 └──────────────┘

 ┌──────────────────────┐

 │ Discovery / Ingestion│

 └───────────┬──────────┘

             ▼

       Catalog + Sources

 ┌──────────────────────┐

 │ Health Checker       │

 └───────────┬──────────┘

             ▼

       Source Registry
