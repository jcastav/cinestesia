/**
 * Contrato de Discovery Adapter (§6.44 §14, §13, §23).
 *
 * El adapter es la única frontera autorizada hacia un proveedor externo: no
 * conoce la base de datos ni los endpoints admin. Devuelve ítems en formato
 * `DiscoveredItemInput`; la normalización (§19), el checksum de provenance
 * (§51) y la persistencia viven en el orquestador.
 *
 * Versión = versión del código en ejecución (decisión registrada en BACKLOG:
 * el runtime usa `registry`, no la fila `discovery_adapters.version`, que es
 * sólo metadato para la UI).
 */

export interface CandidateExternalId {
  namespace: string;
  externalId: string;
  externalUrl?: string | null;
}

/** Entrada común de un adapter (§6.44 §3). */
export interface DiscoveredItemInput {
  provider: string;
  externalId: string;
  raw: Record<string, unknown>;
  title: string;
  originalTitle?: string | null;
  type?: string | null;
  releaseYear?: number | string | null;
  releaseDate?: string | null;
  runtimeSeconds?: number | string | null;
  synopsis?: string | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  externalIds?: CandidateExternalId[];
}

/** §6.44 §14 — contexto inyectado por el orquestador al adapter. */
export interface DiscoveryContext {
  /** Término de búsqueda; `null` cuando el adapter no lo exige (§13.4). */
  query: string | null;
  /** Tope de ítems ya validado (1..250); `null` = default del adapter. */
  maxItems: number | null;
}

/** §6.44 §14 — contrato estable de los adapters (contrato público: §16). */
export interface DiscoveryAdapter {
  /** Clave lógica idéntica a `discovery_adapters.adapter_id`. */
  readonly id: string;
  /** Versión semántica del código del adapter. */
  readonly version: string;
  /** Namespace de identidad que dará a sus ítems (§7.27). */
  readonly provider: string;
  /** §14: p.ej. `CONTENT_DISCOVERY`, `REQUIRES_QUERY`. */
  readonly capabilities: readonly string[];
  /**
   * Descubre ítems. Debe fallar con `DiscoveryUpstreamError` ante problemas
   * del proveedor (§40) y propagar errores de datos inválidos como
   * `INVALID_EXTERNAL_PAYLOAD`; nunca debe lanzar `DiscoveryError`.
   */
  discover(context: DiscoveryContext): Promise<DiscoveredItemInput[]>;
}
