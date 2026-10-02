## 6.7. Flujo de descubrimiento e ingesta

El descubrimiento de contenido deberá mantenerse separado del flujo de
reproducción.

Arquitectura conceptual:

External Metadata / Authorized Sources

                  │

                  ▼

              Discovery

                  │

                  ▼

              Candidate

                  │

                  ▼

             Normalization

                  │

                  ▼

             Deduplication

                  │

                  ▼

               Matching

              ┌───┴────┐

              ▼        ▼

           Catalog   Source Registry

Debe distinguirse entre:

**Discovery**

\> ¿Dónde podría existir contenido o una Source?

**Ingestion**

\> ¿Cómo incorporamos esa información al modelo interno?

**Source Resolution**

\> Dada una Source que ya conocemos, ¿cómo obtenemos una representación
reproducible?

Son problemas diferentes y deberán permanecer desacoplados.

En el MVP, Discovery/Ingestion podrá ser principalmente manual o
semiautomático.

La automatización intensiva pertenece a fases posteriores.
