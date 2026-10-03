import type { ApiErrorCode } from "@cinestesia/shared";

/**
 * Error de dominio de Discovery & Ingestion (Fase B de v0.3).
 * Mismo patrón que CatalogError: código de la taxonomía pública + mensaje.
 * El handler de server.ts lo traduce a su estado HTTP vía sendError.
 */
export class DiscoveryError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "DiscoveryError";
    this.code = code;
  }
}
