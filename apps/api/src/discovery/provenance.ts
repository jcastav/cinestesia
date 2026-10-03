import type { CandidateProvenance } from "@cinestesia/shared";
import { createHash } from "node:crypto";

/**
 * Provenance Contract (§6.44 §11, §18): toda incorporación automática conserva
 * provider + externalId + adapter (versión incluida) + run + instante de
 * descubrimiento + checksum del payload original.
 *
 * El checksum es `sha256:<hex>` (≤ 80 caracteres: `payload_checksum` es varchar
 * 80) sobre la representación canónica del payload: claves ordenadas
 * recursivamente, de modo que dos payloads equivalentes con distinto orden de
 * claves producen el mismo checksum (el adapter puede construir objetos en
 * orden de inserción variable). El orden de los elementos de un arreglo se
 * conserva: es significativo.
 */

export interface ProvenanceInput {
  provider: string;
  externalId: string;
  adapterId: string;
  adapterVersion: string;
  runId: string;
  discoveredAt: string;
  raw: unknown;
}

/** Serialización canónica (JSON con claves ordenadas) de un valor ya parseable. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0),
  );
  const body = entries
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(",");
  return `{${body}}`;
}

/** §6.44 §3/§11 — checksum estable del payload crudo del adapter. */
export function payloadChecksum(raw: unknown): string {
  const serialized = JSON.stringify(raw) ?? "null";
  const canonical = stableStringify(JSON.parse(serialized));
  const digest = createHash("sha256").update(canonical).digest("hex");
  return `sha256:${digest}`;
}

/** §6.44 §11 — construye la provenance completa de un candidato. */
export function buildProvenance(input: ProvenanceInput): CandidateProvenance {
  return {
    provider: input.provider,
    externalId: input.externalId,
    adapterId: input.adapterId,
    adapterVersion: input.adapterVersion,
    runId: input.runId,
    discoveredAt: input.discoveredAt,
    payloadChecksum: payloadChecksum(input.raw),
  };
}
