## 6.19. Reporting

Los reportes de usuarios y la telemetría automática deberán converger
sobre identificadores comunes:

media_id

source_id

playback_session_id

error_code

timestamp

Esto permitirá determinar, por ejemplo:

50 reportes

      │

      └── 47 corresponden a Source A

                 │

                 └── mismo Adapter

                         │

                         └── posible incidencia común

Los reportes no deberán utilizarse únicamente como tickets manuales:
también constituirán señales operativas para evaluar Sources y Adapters.
