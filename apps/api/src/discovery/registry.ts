/**
 * Registry de Discovery Adapters (§6.44 §14, §23).
 *
 * El registry (código) es la verdad del runtime: `capabilities` y `version`
 * efectivos salen de aquí, no de `discovery_adapters` (fila administrativa).
 * Registrar un adapter nuevo aquí es el gate de seguridad de Fase C: ningún
 * host externo se permite sin estar en este módulo (§53).
 */

import type { DiscoveryAdapter } from "./adapter";
import { manualImportAdapter } from "./adapters/manual-import";
import { tvmazeMetadataAdapter } from "./adapters/tvmaze-metadata";

const REGISTRY = new Map<string, DiscoveryAdapter>(
  [tvmazeMetadataAdapter, manualImportAdapter].map((adapter) => [
    adapter.id,
    adapter,
  ]),
);

export function findRegisteredAdapter(
  adapterId: string,
): DiscoveryAdapter | undefined {
  return REGISTRY.get(adapterId);
}

export function listRegisteredAdapters(): DiscoveryAdapter[] {
  return [...REGISTRY.values()];
}
