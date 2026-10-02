## 6.2. Principios arquitectónicos

La arquitectura deberá seguir los siguientes principios.

**Separación de responsabilidades**

Cada dominio deberá tener una responsabilidad claramente delimitada.

En particular:

Discovery ≠ Ingestion

Content ≠ Source

Source ≠ Provider

Source ≠ Playable Representation

Resolution ≠ Delivery

Playback Session ≠ Source

Player ≠ Resolver

**Arquitectura modular antes que microservicios**

Los límites entre módulos deberán existir desde el diseño, aunque
inicialmente varios módulos puedan ejecutarse dentro de una misma
aplicación.

Un límite lógico no implica automáticamente un límite de despliegue.

**Dependencias dirigidas**

Los componentes de experiencia no deberán depender de detalles
específicos de proveedores.

La dependencia deberá avanzar hacia contratos internos estables:

Player

  ↓

Playback Contract

  ↓

Orchestrator

  ↓

Source / Resolution abstractions

**Fallo parcial**

La caída de una Source, Adapter o proveedor no deberá provocar
necesariamente la caída del contenido ni de la plataforma completa.

**Observabilidad desde el diseño**

Las operaciones críticas deberán producir suficiente información para
reconstruir el recorrido:

request

   ↓

playback_session_id

   ↓

source_id

   ↓

resolution_id

   ↓

gateway_session

   ↓

player events

**Seguridad por defecto**

Cualquier componente capaz de realizar solicitudes hacia recursos
externos deberá considerarse una frontera de seguridad.

**Evolución incremental**

La arquitectura deberá admitir un MVP pequeño pero real sin obligar a
desplegar prematuramente infraestructura propia de sistemas de gran
escala.
