## 6.20. Persistencia y propiedad de datos

La base de datos podrá ser físicamente compartida durante el MVP, pero
cada módulo deberá tener una propiedad lógica clara sobre sus datos.

Ejemplo:

  ----------------------------------------------------------
  **Dominio**                       **Propietario lógico**
  --------------------------------- ------------------------
  media_items                       Catalog

  seasons                           Catalog

  episodes                          Catalog

  sources                           Source Registry

  source_adapters                   Resolver / Adapter
                                    Registry

  source_health                     Health

  extraction_logs / resolution_logs Resolver

  playback_sessions o estado        Playback
  equivalente                       

  reports                           Reporting

  users                             Identity

  watch_progress                    Users/Playback
  \----------------------------------------------------------

En el MVP no será necesario asignar una base de datos físicamente
distinta a cada dominio.

De hecho, hacerlo probablemente introduciría complejidad innecesaria.
