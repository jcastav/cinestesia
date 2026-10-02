## 6.4. Plano de control y plano de datos

Una distinción importante de la arquitectura será separar el **Control
Plane** del **Media/Data Plane**.

### 6.4.1. Control Plane

El Control Plane toma decisiones y administra estado lógico.

Incluye principalmente:

Catalog

Source Registry

Playback Orchestrator

Source Resolver

Health Checker

Discovery / Ingestion

Admin / CMS

Reporting

Sus responsabilidades incluyen:

- saber qué contenido existe;

- conocer qué Sources pertenecen a cada contenido;

- determinar su estado;

- seleccionar una Source;

- resolverla;

- crear una Playback Session;

- administrar reportes;

- gestionar salud y disponibilidad.

El Control Plane no deberá transportar innecesariamente grandes
volúmenes de datos audiovisuales.

### 6.4.2. Media/Data Plane

El Media/Data Plane participa en la entrega efectiva necesaria para la
reproducción.

Incluye principalmente:

Media Gateway

       │

       ▼

Media Player Core

Dependiendo del modo de reproducción autorizado y técnicamente
disponible, el Gateway podrá intervenir en:

- manifests;

- recursos temporales;

- validación de sesión;

- reescritura controlada;

- proxy de determinados recursos;

- segmentos cuando sea necesario;

- telemetría de entrega.

Esta separación resulta especialmente importante porque el perfil de
carga es radicalmente distinto.

Una solicitud de catálogo puede transferir kilobytes.

Una sesión audiovisual puede transferir gigabytes.

Por tanto:

escalar Core API

        ≠

escalar Media Gateway
