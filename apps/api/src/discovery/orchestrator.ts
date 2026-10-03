/**
 * Orquestador de Discovery Runs (§6.44 §20–§22, §31–§32, §40).
 *
 * Ejecuta un run reclamado (QUEUED → RUNNING) sin bloquear el proceso:
 * `executeRun` nunca relanza errores de dominio — todo fallo termina como
 * fila `ingestion_errors` (§40) y el estado del run (`SUCCEEDED`/`PARTIAL`/
 * `FAILED` según §32). Los contadores son operacionales (§6): found/processed/
 * errors ya en la Fase C; matched/newContent/ambiguous/rejected se completan
 * en la Fase D con el pipeline de candidatos.
 *
 * Pipeline (Fase D): tras persistir el candidato en DISCOVERED se ejecuta
 * `deps.pipeline` (matching §22 → validación §28 → ingesta §44) que aplica
 * las transiciones controladas de §21 y devuelve un `PipelineOutcome`:
 * - `INGESTED`      → counters.matched (NO_CHANGE) o counters.newContent (CREATE)
 * - `PENDING_REVIEW`→ counters.ambiguous (espera Fase E1)
 * - `FAILED`        → counters.errors (+ counters.rejected si fue VALIDATION_ERROR)
 *                       y fila `ingestion_errors` (§40)
 * Los candidatos cuya fila ya no está en DISCOVERED (INGESTED/PENDING_REVIEW
 * de un run anterior) se contabilizan como `processed` sin re-ejecutar
 * (idempotencia §37). Sin `pipeline` inyectado los candidatos quedan en
 * DISCOVERED (comportamiento de la Fase C; `service.ts` siempre inyecta).
 *
 * El repositorio es un puerto inyectado: los tests usan un doble en memoria
 * y producción lo resuelve `discovery/repository.ts` (sin Redis ni worker —
 * ejecución en proceso con estado durable en Postgres, decisión v0.3).
 */

import type { DiscoveryRunCounters, DiscoveryRunStatus } from "@cinestesia/shared";
import type { DiscoveryCandidateRow, DiscoveryRunRow } from "../db/schema";
import type { DiscoveryAdapter, DiscoveredItemInput } from "./adapter";
import { DiscoveryError } from "./errors";
import { DiscoveryUpstreamError } from "./http";
import { emptyRunCounters } from "./mapper";
import {
  hasStableIdentity,
  normalizeContent,
  type NormalizedContent,
} from "./normalize";
import type { CandidatePipeline } from "./pipeline";
import { payloadChecksum } from "./provenance";

const ERROR_SUMMARY_MAX = 1000;

export interface CandidateUpsertValues {
  runId: string;
  kind: "CONTENT" | "SOURCE";
  provider: string;
  externalId: string;
  adapterId: string;
  adapterVersion: string;
  status: string;
  normalizedData: Record<string, unknown> | null;
  rawPayload: Record<string, unknown> | null;
  payloadChecksum: string;
  processedAt: Date | null;
}

export interface IngestionErrorValues {
  runId: string;
  candidateId: string | null;
  errorCode: string;
  message: string;
  attempt: number;
  details: Record<string, unknown> | null;
}

export interface RunFinishValues {
  status: DiscoveryRunStatus;
  counters: DiscoveryRunCounters;
  errorSummary: string | null;
  finishedAt: Date;
}

/** Puerto de persistencia del orquestador (implementado en `repository.ts`). */
export interface DiscoveryRepository {
  claimRun(runId: string): Promise<DiscoveryRunRow | undefined>;
  finishRun(runId: string, values: RunFinishValues): Promise<void>;
  upsertCandidate(values: CandidateUpsertValues): Promise<DiscoveryCandidateRow>;
  recordError(values: IngestionErrorValues): Promise<void>;
}

export interface ExecuteRunDeps {
  repo: DiscoveryRepository;
  resolveAdapter(adapterId: string): DiscoveryAdapter | undefined;
  /**
   * Fase D: matching §22 → validación §28 → ingesta §44 con transiciones
   * controladas (§21). Opcional para aislar la Fase C en tests; `service.ts`
   * lo inyecta siempre en producción.
   */
  pipeline?: CandidatePipeline;
  logError?(message: string, error: unknown): void;
}

function truncateSummary(value: string): string {
  return value.length > ERROR_SUMMARY_MAX
    ? `${value.slice(0, ERROR_SUMMARY_MAX - 1)}…`
    : value;
}

/** Aplica el pipeline al candidato persistido y actualiza los contadores (§6). */
async function applyPipeline(
  candidate: DiscoveryCandidateRow,
  normalized: NormalizedContent,
  run: DiscoveryRunRow,
  counters: DiscoveryRunCounters,
  deps: ExecuteRunDeps,
): Promise<string | null> {
  const pipeline = deps.pipeline;
  if (!pipeline || candidate.status !== "DISCOVERED") {
    // Fila ya procesada por un run anterior (INGESTED/PENDING_REVIEW/…):
    // idempotencia §37 — se contabiliza como procesada sin re-ejecutar.
    return null;
  }

  // Error técnico (p. ej. base de datos): se propaga y aborta el run (§32 FAILED).
  const outcome = await pipeline.process({
    id: candidate.id,
    kind: "CONTENT",
    normalized,
  });

  if (outcome.kind === "INGESTED") {
    if (outcome.operation === "CREATE") {
      counters.newContent++;
    } else {
      counters.matched++;
    }
    return null;
  }

  if (outcome.kind === "PENDING_REVIEW") {
    counters.ambiguous++;
    return null;
  }

  counters.errors++;
  if (outcome.errorCode === "VALIDATION_ERROR") {
    counters.rejected++;
  }
  await deps.repo.recordError({
    runId: run.id,
    candidateId: candidate.id,
    errorCode: outcome.errorCode,
    message: outcome.message,
    attempt: 1,
    details: outcome.details ?? null,
  });
  return outcome.message;
}

/** Procesa un ítem: normaliza + persiste + pipeline, o registra su error (§19, §21, §40). */
async function processItem(
  item: DiscoveredItemInput,
  run: DiscoveryRunRow,
  counters: DiscoveryRunCounters,
  deps: ExecuteRunDeps,
): Promise<string | null> {
  const checksum = payloadChecksum(item.raw);
  try {
    const normalized = normalizeContent(item);
    const candidate = await deps.repo.upsertCandidate({
      runId: run.id,
      kind: "CONTENT",
      provider: normalized.provider,
      externalId: normalized.externalId,
      adapterId: run.adapterId,
      adapterVersion: run.adapterVersion,
      status: "DISCOVERED",
      normalizedData: normalized,
      rawPayload: item.raw,
      payloadChecksum: checksum,
      processedAt: new Date(),
    });
    const pipelineMessage = await applyPipeline(
      candidate,
      normalized,
      run,
      counters,
      deps,
    );
    counters.processed++;
    return pipelineMessage;
  } catch (error) {
    // Sólo errores de dominio de normalización: un error técnico (DB) aborta
    // el run vía el catch de executeRun (§32 FAILED).
    if (!(error instanceof DiscoveryError)) {
      throw error;
    }
    counters.errors++;
    // Sin identidad estable no existe fila posible (§67: provider/externalId
    // son NOT NULL): queda el error del run sin candidato (§40, criterio 10).
    if (!hasStableIdentity(item)) {
      await deps.repo.recordError({
        runId: run.id,
        candidateId: null,
        errorCode: "INVALID_EXTERNAL_PAYLOAD",
        message: error.message,
        attempt: 1,
        details: { adapterId: run.adapterId, adapterVersion: run.adapterVersion },
      });
      return error.message;
    }
    const candidate = await deps.repo.upsertCandidate({
      runId: run.id,
      kind: "CONTENT",
      provider: item.provider,
      externalId: item.externalId,
      adapterId: run.adapterId,
      adapterVersion: run.adapterVersion,
      status: "FAILED",
      normalizedData: null,
      rawPayload: item.raw,
      payloadChecksum: checksum,
      processedAt: null,
    });
    await deps.repo.recordError({
      runId: run.id,
      candidateId: candidate.id,
      errorCode: "INVALID_EXTERNAL_PAYLOAD",
      message: error.message,
      attempt: 1,
      details: { adapterId: run.adapterId, adapterVersion: run.adapterVersion },
    });
    return error.message;
  }
}

/** §6.44 §31 — ejecución completa de un run; jamás lanza excepciones. */
export async function executeRun(
  runId: string,
  deps: ExecuteRunDeps,
): Promise<void> {
  const run = await deps.repo.claimRun(runId);
  if (!run) {
    // Otro proceso/reclamo lo tomó (o el run ya no está QUEUED): nada que hacer.
    return;
  }

  const counters = emptyRunCounters();
  try {
    const adapter = deps.resolveAdapter(run.adapterId);
    if (!adapter) {
      // Adapter registrado en la fila administrativa pero sin código en el
      // registry: error del operador, no reintenable (§53 gate del registry).
      throw new DiscoveryUpstreamError(
        "DISCOVERY_ADAPTER_ERROR",
        `adapter "${run.adapterId}" no está registrado en el runtime`,
        false,
      );
    }

    const items = await adapter.discover({
      query: run.query,
      maxItems: run.maxItems,
    });
    counters.candidatesFound = items.length;

    let firstError: string | null = null;
    for (const item of items) {
      const message = await processItem(item, run, counters, deps);
      if (message !== null && firstError === null) {
        firstError = message;
      }
    }

    const status: DiscoveryRunStatus =
      counters.errors === 0
        ? "SUCCEEDED"
        : counters.processed > 0
          ? "PARTIAL"
          : "FAILED";
    const errorSummary =
      counters.errors === 0
        ? null
        : status === "PARTIAL"
          ? `${counters.errors} error(es) durante la ejecución`
          : truncateSummary(firstError ?? `${counters.errors} error(es)`);

    await deps.repo.finishRun(run.id, {
      status,
      counters,
      errorSummary,
      finishedAt: new Date(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const errorCode =
      error instanceof DiscoveryUpstreamError
        ? error.errorCode
        : "DISCOVERY_ADAPTER_ERROR";
    try {
      await deps.repo.recordError({
        runId: run.id,
        candidateId: null,
        errorCode,
        message,
        attempt: 1,
        details: { adapterId: run.adapterId, adapterVersion: run.adapterVersion },
      });
      await deps.repo.finishRun(run.id, {
        status: "FAILED",
        counters,
        errorSummary: truncateSummary(message),
        finishedAt: new Date(),
      });
    } catch (finishError) {
      deps.logError?.(
        "no se pudo finalizar el Discovery Run tras un error",
        finishError,
      );
    }
    deps.logError?.("Discovery Run falló", error);
  }
}
