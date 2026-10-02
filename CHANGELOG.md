# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/),
y el proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/spec/v2.0.0.html).

## [Unreleased]

### Added

- Estructura de monorepo con pnpm workspaces: `apps/web` (Next.js 15 + TypeScript + Tailwind 4), `apps/api` (Fastify 5) y `packages/shared` (contratos iniciales de la Sección 8).
- Scripts raíz de verificación: `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`.
- Endpoint de verificación `GET /v1/health` en la API.

### Changed

### Deprecated

### Removed

### Fixed

### Security
