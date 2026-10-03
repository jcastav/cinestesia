/**
 * Pipeline del candidato (§6.44 §20, §21, §22, §28, §44).
 *
 * Cerebro de la Fase D: para cada candidato recién persistido en DISCOVERED
 * ejecuta las transiciones controladas de §21 y devuelve un `PipelineOutcome`
 * con el que el orquestador actualiza los contadores del run (§6):
 *
 *   DISCOVERED → MATCHING → MATCHED|AMBIGUOUS|VALIDATING →
 *     AMBIGUOUS → PENDING_REVIEW (espera revisión humana, Fase E1)
 *     MATCHING → MATCHED → VALIDATING
 *     MATCHING → VALIDATING (NO_MATCH)
 *   VALIDATING → INGESTING → INGESTED | FAILED (ERROR §28 bloquea)
 *
 * `NORMALIZING` no se persiste: la normalización (§19) ya se aplicó al crear
 * la fila en la Fase C (decisión registrada en BACKLOG).
 *
 * Dependencias inyectadas (módulo puro de orquestación, sin imports de DB):
 * - `matching`  → puente hacia `catalog/service.ts` (§44)
 * - `ingestion` → Application Service de creación/enlace (§44)
 * - `store`     → persistencia de transiciones (discovery/repository.ts)
 */

import { CatalogError } from "../catalog/errors";
import type { CandidateStatus } from "@cinestesia/shared";
import { matchCandidate, type MatchingPort } from "./matching";
import {
  createEntityFromCandidate,
  linkMatchedEntity,
  type IngestionCatalogPort,
} from "./ingestion";
import type { NormalizedContent } from "./normalize";
import {
  blockingSummary,
  hasBlockingIssues,
  validateNormalizedContent,
} from "./validation";

/**
 * §6.44 §21 — transiciones controladas del candidato. Cualquier otra
 * transición es un error de programación (p. ej. `FAILED → INGESTED` está
 * prohibida: un candidato rechazado por validación nunca se ingiere).
 */
export const CANDIDATE_TRANSITIONS: Record<
  CandidateStatus,
  readonly CandidateStatus[]
> = {
  DISCOVERED: ["NORMALIZING", "MATCHING", "FAILED", "STALE"],
  NORMALIZING: ["MATCHING", "FAILED"],
  MATCHING: ["MATCHED", "AMBIGUOUS", "VALIDATING", "FAILED"],
  MATCHED: ["VALIDATING", "INGESTING", "FAILED", "STALE"],
  AMBIGUOUS: ["PENDING_REVIEW", "MATCHING", "FAILED", "REJECTED"],
  DEDUPLICATING: ["ENRICHING", "FAILED"],
  ENRICHING: ["VALIDATING", "FAILED"],
  VALIDATING: ["PENDING_REVIEW", "INGESTING", "FAILED"],
  PENDING_REVIEW: ["APPROVED", "REJECTED", "FAILED"],
  APPROVED: ["INGESTING", "FAILED"],
  REJECTED: ["STALE"],
  INGESTING: ["INGESTED", "FAILED"],
  INGESTED: ["STALE"],
  FAILED: ["DISCOVERED", "STALE"],
  STALE: ["DISCOVERED", "MATCHING", "FAILED"],
};

export function assertCandidateTransition(
  from: CandidateStatus,
  to: CandidateStatus,
): void {
  if (!CANDIDATE_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transición de candidato prohibida: ${from} → ${to}`);
  }
}

/** Datos de match que acompañan a la transición (columnas del candidato). */
export interface CandidateTransitionPatch {
  matchReference?: string | null;
  matchStrategy?: string | null;
  confidence?: string | null;
}

/** Puerto de persistencia de transiciones (implementado en repository.ts). */
export interface CandidateStorePort {
  transition(
    candidateId: string,
    from: CandidateStatus,
    to: CandidateStatus,
    patch?: CandidateTransitionPatch,
  ): Promise<void>;
}

export interface PipelineCandidate {
  id: string;
  kind: "CONTENT" | "SOURCE";
  normalized: NormalizedContent;
}

/** §6.44 §9/§20 — resultado terminal del pipeline para un candidato. */
export type PipelineOutcome =
  | {
      kind: "INGESTED";
      operation: "CREATE" | "NO_CHANGE";
      entityId: string;
      strategy: string | null;
      confidence: "HIGH" | "MEDIUM" | null;
    }
  | { kind: "PENDING_REVIEW"; strategy: string | null }
  | {
      kind: "FAILED";
      errorCode: string;
      message: string;
      details?: Record<string, unknown>;
    };

export interface CandidatePipeline {
  process(candidate: PipelineCandidate): Promise<PipelineOutcome>;
}

export interface PipelineDeps {
  matching: MatchingPort;
  ingestion: IngestionCatalogPort;
  store: CandidateStorePort;
}

function classifyIngestionError(error: unknown): {
  code: string;
  message: string;
} {
  if (!(error instanceof CatalogError)) {
    // Error técnico (p. ej. base de datos): no se oculta ni se convierte en
    // fallo de candidato (AGENTS §6) — aborta el run vía el orquestador.
    throw error;
  }
  if (error.code === "INVALID_ARGUMENT") {
    return { code: "VALIDATION_ERROR", message: error.message };
  }
  return { code: "INGESTION_ERROR", message: error.message };
}

/** §6.44 §20 — pipeline conceptual para un candidato; jamás relanza un
 * error de dominio (termina como `FAILED` con su taxonomía §40). */
export function createPipeline(deps: PipelineDeps): CandidatePipeline {
  async function go(
    candidateId: string,
    from: CandidateStatus,
    to: CandidateStatus,
    patch?: CandidateTransitionPatch,
  ): Promise<void> {
    assertCandidateTransition(from, to);
    await deps.store.transition(candidateId, from, to, patch);
  }

  async function process(
    candidate: PipelineCandidate,
  ): Promise<PipelineOutcome> {
    const { id, normalized } = candidate;

    await go(id, "DISCOVERED", "MATCHING");
    const match = await matchCandidate(normalized, deps.matching);

    if (match.result === "AMBIGUOUS") {
      await go(id, "MATCHING", "AMBIGUOUS", {
        matchReference: null,
        matchStrategy: match.strategy,
        confidence: null,
      });
      await go(id, "AMBIGUOUS", "PENDING_REVIEW");
      return { kind: "PENDING_REVIEW", strategy: match.strategy };
    }

    if (match.result === "MATCHED") {
      await go(id, "MATCHING", "MATCHED", {
        matchReference: match.entityId,
        matchStrategy: match.strategy,
        confidence: match.confidence,
      });
      await go(id, "MATCHED", "VALIDATING");
    } else {
      await go(id, "MATCHING", "VALIDATING");
    }

    const issues = validateNormalizedContent(normalized);
    if (hasBlockingIssues(issues)) {
      await go(id, "VALIDATING", "FAILED");
      return {
        kind: "FAILED",
        errorCode: "VALIDATION_ERROR",
        message: blockingSummary(issues),
        details: { issues },
      };
    }

    await go(id, "VALIDATING", "INGESTING");
    try {
      const result =
        match.result === "MATCHED"
          ? await linkMatchedEntity(normalized, match, deps.ingestion)
          : await createEntityFromCandidate(normalized, deps.ingestion);
      await go(id, "INGESTING", "INGESTED", {
        matchReference: result.entityId,
      });
      return {
        kind: "INGESTED",
        // UPDATE no existe en v0.3 (§9): sólo CREATE y NO_CHANGE.
        operation: result.operation === "CREATE" ? "CREATE" : "NO_CHANGE",
        entityId: result.entityId,
        strategy: match.strategy,
        confidence: match.confidence,
      };
    } catch (error) {
      const { code, message } = classifyIngestionError(error);
      await go(id, "INGESTING", "FAILED");
      return { kind: "FAILED", errorCode: code, message };
    }
  }

  return { process };
}
