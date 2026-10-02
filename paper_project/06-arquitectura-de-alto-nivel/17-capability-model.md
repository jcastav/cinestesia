## 6.17. Capability Model

Antes de seleccionar una Source, el backend podrá recibir las
capacidades del cliente.

Ejemplo conceptual:

{

  \"platform\": \"web\",

  \"streaming\": {

    \"hls\": true

  },

  \"video\": {

    \"maxHeight\": 1080,

    \"codecs\": \[\"h264\"\]

  },

  \"features\": {

    \"subtitles\": true,

    \"pip\": true

  }

}

El objetivo no será realizar fingerprinting del usuario, sino comunicar
las capacidades estrictamente necesarias para determinar compatibilidad
de reproducción.

El Orchestrator podrá utilizar este modelo para evitar seleccionar una
Source que el cliente no pueda reproducir.
