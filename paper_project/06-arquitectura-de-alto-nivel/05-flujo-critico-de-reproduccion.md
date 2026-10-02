## 6.5. Flujo crítico de reproducción

El flujo central de la plataforma deberá ser el siguiente:

Usuario

   │

   ▼

Media Player Core

   │

   │ startPlayback(mediaId, capabilities)

   ▼

Playback Orchestrator

   │

   ▼

Source Registry

   │

   │ available sources

   ▼

Playback Orchestrator

   │

   │ select source

   ▼

Source Resolver

   │

   ▼

Adapter

   │

   ▼

Playable Representation

   │

   ▼

Media Gateway

   │

   │ create playback access/session

   ▼

Playback Session

   │

   ▼

Media Player Core

   │

   ▼

Playback

En términos de responsabilidades:

**1. Player**

Solicita reproducir un contenido.

No elige directamente un proveedor concreto.

**2. Orchestrator**

Consulta las Sources disponibles y determina cuál utilizar.

**3. Source Registry**

Proporciona las Sources conocidas y su estado.

**4. Resolver**

Transforma la Source seleccionada en una representación reproducible.

**5. Adapter**

Implementa la integración específica necesaria para ese tipo de Source.

**6. Gateway**

Prepara el mecanismo de acceso requerido para la reproducción.

**7. Playback Session**

Representa el resultado normalizado que consumirá el Player.
