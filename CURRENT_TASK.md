# CURRENT_TASK — v0.1.0-alpha: Primer Vertical Slice

Fuente: `paper_project/12-roadmap-riesgos-y-costos.md` §12.5.

## Objetivo

Demostrar que la plataforma puede reproducir un contenido audiovisual mediante su propia interfaz.

La versión debe responder afirmativamente a:

> ¿Puedo abrir una página de contenido y ver un video?

## Alcance

Cadena a demostrar:

```text
Next.js
   ↓
Página de contenido
   ↓
Fastify API
   ↓
Contenido mínimo
   ↓
Playback básico
   ↓
Hls.js
   ↓
Stream de prueba
```

### Frontend

- Next.js + TypeScript + Tailwind CSS.
- Página de detalle mínima.
- Componente Player.
- Integración Hls.js.
- Controles básicos.
- Manejo básico de error.

### Backend

- Node.js + Fastify + TypeScript.
- Endpoint básico de contenido: `GET /v1/catalog/featured`, `GET /v1/media/{mediaId}` (§8.12, §8.13).
- DTO mínimo (`MediaItem`).
- Validación básica.
- Envoltura de respuesta `{ data, requestId }` (§8.6) y contrato de error `{ error: { code, message, requestId } }` (§8.7), con código estable `MEDIA_NOT_FOUND` en recurso inexistente.

### Persistencia

- Supabase (Postgres, free tier) + Drizzle ORM, modelo mínimo:
  - `media_items`: `id`, `slug`, `title` (`canonical_title`), `type` (`media_type`).
  - Referencia mínima de reproducción.
- No se implementa todavía el modelo definitivo de la Sección 7.
- Seed con un único contenido de prueba.
- Fuente: una fuente de prueba autorizada y estable (stream HLS público de demo).
- Secretos solo en variables de entorno (AGENTS.md §6).

## Qué NO hacer

Fuera de alcance según §12.5 "No entra":

- múltiples fuentes;
- Discovery & Ingestion completo;
- Source Resolver completo;
- Health;
- recomendaciones;
- autenticación;
- CMS;
- Ads;
- fallback automático;
- Gateway avanzado;
- motores individuales de la Sección 6 (`34–44`) completos;
- cualquier funcionalidad no listada aquí (AGENTS.md §3).

## Definition of Done

Criterios de salida de §12.5:

1. La aplicación inicia correctamente.
2. El frontend obtiene contenido desde el backend.
3. El contenido se muestra.
4. Hls.js inicializa correctamente.
5. El usuario puede iniciar reproducción.
6. El video reproduce correctamente.
7. Existe manejo básico de error.

Criterios transversales (§12.52 + AGENTS.md §7 y §9):

8. `typecheck`, `lint` y `build` en verde; migración aplicada.
9. Demostración reproducible verificada manualmente.
10. Responsabilidades separadas y nada fuera de alcance modificado (revisión de diff).
11. `CHANGELOG.md`, `DEVELOPMENT_STATE.md` y `CURRENT_TASK.md` actualizados.
12. Commit coherente por slice + tag `v0.1.0-alpha`.

## Siguiente paso concreto

Fase C: persistencia mínima en Supabase (Drizzle + migración de `media_items` + referencia de reproducción + seed).
