## 6.15. Playback Session

La **Playback Session** será la frontera contractual principal entre
backend y Player.

Ejemplo conceptual:

{

  \"playbackSessionId\": \"ps_123\",

  \"media\": {

    \"id\": \"episode_42\"

  },

  \"selectedSource\": {

    \"id\": \"source_01\",

    \"language\": \"es\",

    \"quality\": \"1080p\"

  },

  \"playback\": {

    \"manifestUrl\": \"/playback/ps_123/master.m3u8\",

    \"expiresAt\": \"\...\"

  },

  \"capabilities\": {

    \"sourceSwitching\": true,

    \"qualitySelection\": true,

    \"subtitles\": true

  },

  \"alternatives\": \[

    {

      \"id\": \"source_02\",

      \"language\": \"es\",

      \"quality\": \"720p\"

    }

  \]

}

El Player deberá trabajar principalmente con este contrato, no con
información interna del Adapter.
