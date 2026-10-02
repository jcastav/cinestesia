## 6.1. Objetivo arquitectónico

La plataforma se diseña como un sistema audiovisual modular orientado a
cuatro capacidades principales:

1.  **descubrir, ingerir y organizar contenidos;**

2.  **gestionar múltiples Sources por contenido;**

3.  **seleccionar y resolver dinámicamente una Source reproducible;**

4.  **entregar una Playback Session normalizada al Media Player Core.**

La arquitectura deberá permitir que las Sources, proveedores y
mecanismos de resolución evolucionen independientemente de la
experiencia de reproducción.

El principio fundamental será:

el Player reproduce sesiones;

el Orchestrator decide;

el Resolver resuelve Sources;

el Gateway transporta;

el Registry conoce las Sources;

el Catalog conoce los contenidos.

Por tanto, el Media Player Core no deberá conocer la implementación
particular de un Provider/Host ni ejecutar lógica específica de sus
Adapters.

Asimismo, la arquitectura descrita en esta sección representa la
arquitectura lógica objetivo de la V1. Esto no significa que cada módulo
deba desplegarse desde el MVP como un microservicio independiente.

La implementación física inicial será deliberadamente más simple.
