## 6.13. Playable Representation

Se incorpora explícitamente una entidad conceptual que faltaba separar:

**Playable Representation**.

Representa el resultado temporal de resolver una Source.

Por ejemplo:

{

  \"sourceId\": \"src_123\",

  \"type\": \"HLS\",

  \"resource\": \"\...\",

  \"expiresAt\": \"\...\",

  \"capabilities\": {

    \"qualities\": \[\"1080p\", \"720p\"\],

    \"audioTracks\": \[\"es\"\],

    \"subtitles\": \[\]

  }

}

No debe confundirse con la Source.

Una Source puede ser relativamente persistente:

Source

src_123

mientras que una representación resuelta puede expirar:

Representation A

expires 14:30

Representation B

expires 16:45

Por ello:

Source

   1

   │

   N

Playable Representations over time
