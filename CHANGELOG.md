# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/),
y el proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

## [0.2.0-alpha] - 2026-10-03

Catálogo mínimo: Motor de Catálogo persistente con creación, consulta, visualización y reproducción (§12.6).

### Added

- Esquema v2 del catálogo (migración `0001`): `media_items` ampliado (`original_title`, `release_date`, `runtime_seconds`, `publication_status`, `production_status`, `poster_url`, `backdrop_url`, `version`) y nuevas tablas `genres`, `media_genres`, `media_external_ids`, `seasons`, `episodes` con índices de consulta; seed idempotente enriquecido (película PUBLISHED con source HLS de prueba, serie demo 1×3 sin Source, 4 géneros, external ids).
- Módulo Catalog en la API (`apps/api/src/catalog/`: repository, service, mapper) con errores de dominio `CatalogError`; las rutas quedan como adaptadores HTTP delgados.
- `GET /v1/media` paginado: solo PUBLISHED, meta `{page,limit,total}`, `limit` máx. 50 (default 20), 400 en parámetros inválidos (adición a §8 → BACKLOG).
- Detalle enriquecido con resolución dual UUID→slug: genres, artwork, estados (§7.17/§7.20) y resumen de temporadas (§8.13).
- `GET /v1/media/{identifier}/seasons/{n}` (§8.14; 404 `SEASON_NOT_FOUND`, 400 en `seasonNumber` inválido).
- Catalog Admin API (§8.35): `POST /v1/admin/media` (201) y `PATCH /v1/admin/media/{identifier}` (200); validación de enums, slug, fechas, URLs, genres (reemplazo completo) y externalIds; escrituras dentro de transacción con rollback y 409 `CONFLICT`.
- Frontend: página `/catalog` paginada server-side (`?page=`), detalle con breadcrumb, línea de metadatos, chips de géneros/estado, artwork opcional, selector de temporada `?season=N` y episodios display-only; enlace «Catálogo» en la home.
- Tests con `node:test` nativo (20: paginación, mappers, `CatalogError` y validación del admin).

### Changed

- `GET /v1/media/{identifier}` con identificador no-UUID inexistente responde 404 `MEDIA_NOT_FOUND` (v0.1 devolvía 400 `INVALID_ARGUMENT`); cambio deliberado y aprobado en el plan de v0.2.
- El handler global de errores de la API mapea `CatalogError` y los 4xx del parser a los códigos de §8.7 (antes respondían 500).
- El Player solo se monta en contenido unitario; las series muestran episodios display-only (reproducción de episodios → v0.4, BACKLOG).

### Security

- Catalog Admin API protegida con `Authorization: Bearer ADMIN_API_TOKEN` (token generado localmente, solo en `apps/api/.env` gitignored; `.env.example` con placeholder), verificación timing-safe; migración a RBAC (§8.76) → BACKLOG.
- Verificado por grep que ningún archivo trackeado contiene el token de administración ni credenciales de base de datos.

## [0.1.0-alpha] - 2026-10-02

Primer vertical slice: reproducción de un contenido audiovisual (§12.5).

### Added

- Estructura de monorepo con pnpm workspaces: `apps/web` (Next.js 15 + TypeScript + Tailwind 4), `apps/api` (Fastify 5) y `packages/shared` (contratos iniciales de la Sección 8).
- Scripts raíz de verificación: `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`.
- Endpoint de verificación `GET /v1/health` en la API.
- Persistencia mínima en Supabase (Postgres) con Drizzle ORM: esquema `media_items` + `sources`, migración v1 aplicada y seed con contenido de prueba (HLS de demo de Mux).
- Endpoints de contenido según Sección 8: `GET /v1/catalog/featured` (§8.12), `GET /v1/media/{mediaId}` (§8.13), `GET /v1/media/{mediaId}/sources` (§8.16) y `GET /v1/media/{mediaId}/playback` (temporal, ver BACKLOG).
- Contrato de error `{error:{code,message,requestId}}` (§8.7), envoltura `{data,requestId}` (§8.6), correlación `X-Request-Id` (§8.50) y CORS restringido a `WEB_ORIGIN`.
- Frontend: home con contenido destacado desde `GET /v1/catalog/featured`, página de detalle `/media/[id]` y componente Player con Hls.js (init/destroy, controles nativos, manejo de errores fatales de reproducción y mensaje de error cuando la API no responde).

### Security

- Credenciales de base de datos y origen permitido solo en `.env`/`.env.local` (gitignored); `.env.example` sin valores; verificado por grep que ningún archivo trackeado contiene credenciales.
