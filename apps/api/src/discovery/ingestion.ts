/**
 * Ingesta de candidatos al Catalog (§6.44 §44, §46, contrato §9).
 *
 * El motor decide QUÉ candidato procesar; el Catalog Application Service
 * decide CÓMO representa la entidad canónica (§44): aquí no hay SQL de
 * `media_items` — sólo se invocan `createMediaItemFromIngestion` y
 * `linkExternalIdsFromIngestion` de `catalog/service.ts` (AGENTS §5,
 * Boundary Rule §39).
 *
 * Operaciones de v0.3 (contrato §9):
 * - `CREATE`   — candidato NO_MATCH → entidad nueva SIEMPRE `DRAFT` (§46:
 *                ingesta técnica ≠ publicación editorial).
 * - `NO_CHANGE`— candidato MATCHED → la entidad ya existe; sólo se enlazan
 *                sus externalIds (§50 «UPDATE real» está fuera de v0.3 →
 *                BACKLOG).
 * - `UPDATE`   — fuera de alcance en v0.3.
 */

import type { IngestionDraft } from "../catalog/service";
import type { CandidateExternalId } from "./adapter";
import type { CandidateMatch } from "./matching";
import type { NormalizedContent } from "./normalize";

export type IngestionOperation = "CREATE" | "UPDATE" | "NO_CHANGE";

/** §6.44 §9 — resultado de la orden de ingesta. */
export interface IngestionResult {
  operation: IngestionOperation;
  entityId: string;
}

/** Contrato de aplicación consumido por la Fase D (§44). */
export interface IngestionCatalogPort {
  createMediaItemFromIngestion(
    draft: IngestionDraft,
  ): Promise<{ id: string }>;
  linkExternalIdsFromIngestion(
    mediaId: string,
    externalIds: CandidateExternalId[],
  ): Promise<{ linked: number; skipped: number }>;
}

function toExternalIds(
  normalized: NormalizedContent,
): CandidateExternalId[] {
  const isIdentity = (item: CandidateExternalId) =>
    item.namespace === normalized.provider &&
    item.externalId === normalized.externalId;

  const identityEntry = normalized.externalIds.find(isIdentity);
  const identity: CandidateExternalId = {
    namespace: normalized.provider,
    externalId: normalized.externalId,
    externalUrl: identityEntry?.externalUrl ?? null,
  };
  return [identity, ...normalized.externalIds.filter((item) => !isIdentity(item))];
}

/** Borrador canónico de creación (§6.44 §46: publicationStatus = DRAFT). */
export function toIngestionDraft(normalized: NormalizedContent): IngestionDraft {
  return {
    slugBase: normalized.slugBase,
    canonicalTitle: normalized.title,
    originalTitle: normalized.originalTitle,
    mediaType: normalized.mediaType,
    synopsis: normalized.synopsis,
    releaseDate: normalized.releaseDate,
    releaseYear: normalized.releaseYear,
    runtimeSeconds: normalized.runtimeSeconds,
    posterUrl: normalized.posterUrl,
    backdropUrl: normalized.backdropUrl,
    primaryExternalId: {
      namespace: normalized.provider,
      externalId: normalized.externalId,
      externalUrl: null,
    },
    externalIds: toExternalIds(normalized),
  };
}

/** Candidato NO_MATCH → crea la entidad DRAFT y devuelve su id (§46). */
export async function createEntityFromCandidate(
  normalized: NormalizedContent,
  port: IngestionCatalogPort,
): Promise<IngestionResult> {
  const created = await port.createMediaItemFromIngestion(
    toIngestionDraft(normalized),
  );
  return { operation: "CREATE", entityId: created.id };
}

/**
 * Candidato MATCHED → `NO_CHANGE` sobre la entidad existente: sólo se
 * persisten sus externalIds (identidad primaria + ids secundarios que
 * aún no estén enlazados). Nunca crea ni modifica metadatos en v0.3.
 */
export async function linkMatchedEntity(
  normalized: NormalizedContent,
  match: CandidateMatch,
  port: IngestionCatalogPort,
): Promise<IngestionResult> {
  if (match.entityId === null) {
    throw new Error("linkMatchedEntity exige un match con entityId");
  }
  await port.linkExternalIdsFromIngestion(
    match.entityId,
    toExternalIds(normalized),
  );
  return { operation: "NO_CHANGE", entityId: match.entityId };
}
