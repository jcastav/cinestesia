# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/),
y el proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/spec/v2.0.0.html).

## [Unreleased]

### Added

- Estructura de monorepo con pnpm workspaces: `apps/web` (Next.js 15 + TypeScript + Tailwind 4), `apps/api` (Fastify 5) y `packages/shared` (contratos iniciales de la Sección 8).
- Scripts raíz de verificación: `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`.
- Endpoint de verificación `GET /v1/health` en la API.
- Persistencia mínima en Supabase (Postgres) con Drizzle ORM: esquema `media_items` + `sources`, migración v1 aplicada y seed con contenido de prueba (HLS de demo de Mux).
- Endpoints de contenido según Sección 8: `GET /v1/catalog/featured` (§8.12), `GET /v1/media/{mediaId}` (§8.13), `GET /v1/media/{mediaId}/sources` (§8.16) y `GET /v1/media/{mediaId}/playback` (temporal, ver BACKLOG).
- Contrato de error `{error:{code,message,requestId}}` (§8.7), envoltura `{data,requestId}` (§8.6), correlación `X-Request-Id` (§8.50) y CORS restringido a `WEB_ORIGIN`.

### Changed

### Deprecated

### Removed

### Fixed

### Security
