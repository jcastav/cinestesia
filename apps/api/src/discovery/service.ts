/**
 * Servicio de Discovery Runs (§6.44 §60 — endpoints admin) y gate de adapters.
 *
 * Contratos de la Fase C:
 * - `POST /v1/admin/discovery/runs` valida el body (`discovery/validation.ts`,
 *   modo sólo FULL), el adapter (fila administrativa + registry de código) y
 *   la capability `REQUIRES_QUERY` antes de crear el run; la ejecución es
 *   asíncrona en el mismo proceso y el endpoint responde 202 con
 *   `runId`/`status`.
 * - `GET .../runs` lista con paginación (§8.48); `GET .../runs/:runId` devuelve
 *   el detalle o 404 `RUN_NOT_FOUND`.
 * - Un solo run activo (QUEUED/RUNNING) → 409 `RUN_ALREADY_RUNNING`.
 */

import type { DiscoveryRunDto, PageMeta } from "@cinestesia/shared";
import * as catalogService from "../catalog/service";
import { UUID_PATTERN } from "../lib/uuid";
import { DiscoveryError } from "./errors";
import { executeRun } from "./orchestrator";
import { emptyRunCounters, toRunDto } from "./mapper";
import { createPipeline, type CandidatePipeline } from "./pipeline";
import * as repository from "./repository";
import { findRegisteredAdapter } from "./registry";
import {
  parseRunListParams,
  parseRunRequest,
} from "./validation";

const REQUIRES_QUERY = "REQUIRES_QUERY";

/**
 * Pipeline de candidatos de la Fase D (§6.44 §20–§22, §28, §44): su cerebro
 * es puro (`discovery/pipeline.ts`); aquí se le inyectan los puertos reales —
 * matching/ingesta contra el Application Service del Catalog (§44: sin SQL de
 * `media_items` fuera de `catalog/repository.ts`) y el store de transiciones
 * de `discovery/repository.ts`.
 */
export function buildCandidatePipeline(): CandidatePipeline {
  return createPipeline({
    matching: catalogService,
    ingestion: catalogService,
    store: repository.candidateStore,
  });
}

export type LogErrorFn = (message: string, error: unknown) => void;

export interface CreateRunResult {
  runId: string;
  status: "QUEUED";
}

export interface RunListResult {
  runs: DiscoveryRunDto[];
  meta: PageMeta;
}

/** §6.44 §60 — crea el run (202) y lo despacha en proceso (sin worker). */
export async function createRun(
  rawBody: unknown,
  logError?: LogErrorFn,
): Promise<CreateRunResult> {
  const request = parseRunRequest(rawBody);

  const adapterRow = await repository.findAdapterRow(request.adapterId);
  if (!adapterRow) {
    throw new DiscoveryError(
      "ADAPTER_NOT_FOUND",
      `Adapter desconocido: ${request.adapterId}`,
    );
  }
  if (!adapterRow.enabled) {
    throw new DiscoveryError(
      "ADAPTER_DISABLED",
      `Adapter deshabilitado: ${request.adapterId}`,
    );
  }
  // La capability efectiva vive en el código (registry = verdad del runtime);
  // la fila administrativa es metadato para la UI (decisión Fase C).
  const adapter = findRegisteredAdapter(request.adapterId);
  if (!adapter) {
    throw new DiscoveryError(
      "ADAPTER_NOT_FOUND",
      `Adapter "${request.adapterId}" no tiene implementación en el runtime`,
    );
  }
  if (
    adapter.capabilities.includes(REQUIRES_QUERY) &&
    request.query === null
  ) {
    throw new DiscoveryError(
      "INVALID_ARGUMENT",
      `${adapter.id} requiere un "query"`,
    );
  }

  const run = await repository.createRunWithLock({
    adapterId: adapter.id,
    adapterVersion: adapter.version,
    trigger: "MANUAL",
    mode: request.mode,
    query: request.query,
    maxItems: request.maxItems,
    counters: emptyRunCounters(),
  });

  void executeRun(run.id, {
    repo: repository.discoveryRepository,
    resolveAdapter: findRegisteredAdapter,
    pipeline: buildCandidatePipeline(),
    logError,
  }).catch((error: unknown) => {
    logError?.("Discovery Run terminó con una excepción inesperada", error);
  });

  return { runId: run.id, status: "QUEUED" };
}

export async function getRun(runId: string): Promise<DiscoveryRunDto> {
  if (!UUID_PATTERN.test(runId)) {
    throw new DiscoveryError("RUN_NOT_FOUND", "Discovery Run no encontrado");
  }
  const row = await repository.findRun(runId);
  if (!row) {
    throw new DiscoveryError("RUN_NOT_FOUND", "Discovery Run no encontrado");
  }
  return toRunDto(row);
}

export async function listRuns(
  pageRaw?: string,
  limitRaw?: string,
): Promise<RunListResult> {
  const { page, limit } = parseRunListParams(pageRaw, limitRaw);
  const { rows, total } = await repository.listRuns(page, limit);
  return { runs: rows.map(toRunDto), meta: { page, limit, total } };
}
