## 6.11. Playback Orchestrator

Se incorpora formalmente el **Playback Orchestrator**, componente que no
está representado de manera suficientemente explícita en la arquitectura
original.

Su responsabilidad será:

Playback Request

       │

       ▼

Obtain Sources

       │

       ▼

Filter

       │

       ▼

Score / Prioritize

       │

       ▼

Select

       │

       ▼

Resolve

       │

       ▼

Create Playback Session

No deberá encargarse de transportar segmentos audiovisuales.

Tampoco deberá contener código específico de cada proveedor.

Conceptualmente podrá exponer una operación semejante a:

startPlayback(

    mediaUnit,

    clientCapabilities,

    preferences

) -\> PlaybackSession

La implementación exacta del contrato se definirá posteriormente en la
sección de APIs.
