/**
 * Manual Import Adapter (§6.44 §13.4 — obligatorio en v0.3).
 *
 * El operador pega JSON en `query`: un arreglo de ítems o un solo objeto.
 * Cada ítem requiere `title` y `externalId` (identidad estable, §37); el resto
 * de campos son opcionales y pasan por la normalización común (§19). El payload
 * es el RAW del candidato (provenance §51) y sólo se acepta application/json
 * manual — no hay red (§77).
 */

import type { CandidateExternalId, DiscoveredItemInput, DiscoveryAdapter } from "../adapter";
import { DiscoveryUpstreamError } from "../http";

const PROVIDER = "manual";
const MAX_EXTERNAL_ID = 255;

/** Debe coincidir con `discovery_adapters.version` del seed (Fase A). */
export const MANUAL_IMPORT_VERSION = "1.0.0";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message: string): DiscoveryUpstreamError {
  return new DiscoveryUpstreamError("INVALID_EXTERNAL_PAYLOAD", message, false);
}

function readText(record: Record<string, unknown>, field: string): string | null {
  const value = record[field];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function readScalar(
  record: Record<string, unknown>,
  field: string,
): number | string | null {
  const value = record[field];
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    return value.trim().length > 0 ? value : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

/** Parsea el JSON de `query`; lanza `INVALID_EXTERNAL_PAYLOAD` con el índice. */
export function parseManualItems(query: string): Record<string, unknown>[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(query);
  } catch {
    throw invalid("query no es JSON válido");
  }
  const items = Array.isArray(parsed) ? parsed : [parsed];
  if (items.length === 0) {
    throw invalid("query no contiene ítems");
  }
  return items.map((item, index) => {
    if (!isRecord(item)) {
      throw invalid(`el ítem ${index} no es un objeto JSON`);
    }
    const title = readText(item, "title");
    if (title === null) {
      throw invalid(`el ítem ${index} no tiene "title" (cadena no vacía)`);
    }
    const externalIdValue = readScalar(item, "externalId");
    if (externalIdValue === null) {
      throw invalid(
        `el ítem ${index} no tiene "externalId" (cadena o número no vacío)`,
      );
    }
    if (String(externalIdValue).length > MAX_EXTERNAL_ID) {
      throw invalid(
        `el ítem ${index} tiene "externalId" mayor a ${MAX_EXTERNAL_ID} caracteres`,
      );
    }
    return item;
  });
}

function toItem(item: Record<string, unknown>): DiscoveredItemInput {
  const externalIdValue = readScalar(item, "externalId") as number | string;
  return {
    provider: PROVIDER,
    externalId: String(externalIdValue),
    raw: item,
    title: readText(item, "title") as string,
    originalTitle: readText(item, "originalTitle"),
    type: readText(item, "type"),
    releaseYear: readScalar(item, "releaseYear"),
    releaseDate: readText(item, "releaseDate"),
    runtimeSeconds: readScalar(item, "runtimeSeconds"),
    synopsis: readText(item, "synopsis"),
    posterUrl: readText(item, "posterUrl"),
    backdropUrl: readText(item, "backdropUrl"),
    externalIds: Array.isArray(item["externalIds"])
      ? (item["externalIds"] as unknown as CandidateExternalId[])
      : undefined,
  };
}

export const manualImportAdapter: DiscoveryAdapter = {
  id: "manual_import",
  version: MANUAL_IMPORT_VERSION,
  provider: PROVIDER,
  capabilities: ["CONTENT_DISCOVERY", "REQUIRES_QUERY"],
  async discover(context) {
    if (context.query === null || context.query.trim().length === 0) {
      throw invalid("manual_import requiere un query con el JSON a importar");
    }
    const items = parseManualItems(context.query);
    const cap = context.maxItems ?? items.length;
    return items.slice(0, cap).map(toItem);
  },
};
