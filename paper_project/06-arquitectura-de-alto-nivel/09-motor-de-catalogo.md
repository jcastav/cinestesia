## 6.9. Motor de Catálogo

El Motor de Catálogo continuará siendo la fuente de verdad para la
estructura descriptiva del contenido audiovisual.

Su responsabilidad comprende:

MediaItem

Season

Episode

Genres

Metadata

Publication state

Relations

No será responsable de:

- resolver Sources;

- seleccionar Sources;

- transportar video;

- crear Adapters;

- ejecutar lógica específica de proveedores.

La relación correcta será:

Catalog

   │

   ├── MediaItem

   ├── Season

   └── Episode

          │

          │ referenced by

          ▼

     Source Registry

Esto conserva el principio que ya aparece correctamente en el documento
original: el catálogo administra metadatos y estructura, mientras el
dominio de Sources se ocupa de las fuentes operativas.

**Fuente de verdad**

PostgreSQL será la fuente de verdad persistente del catálogo.

Redis, CDN, índices de búsqueda u otras capas deberán considerarse
proyecciones o cachés derivadas, nunca la autoridad primaria.
