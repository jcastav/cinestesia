## 6.16. Media Player Core

El Media Player Core constituirá el componente principal de experiencia
audiovisual.

Arquitectura interna conceptual:

Media Player Core

│

├── Playback Controller

├── Media Engine

├── UI Controls

├── Track Manager

├── Quality Manager

├── Subtitle Manager

├── Progress Manager

├── Error Recovery

├── Source Switching

├── QoE Telemetry

└── Platform Adapter

El núcleo deberá mantenerse desacoplado de APIs particulares de una
plataforma siempre que sea razonable.

Las diferencias entre Web, Mobile y TV podrán encapsularse mediante
adaptadores de plataforma.
