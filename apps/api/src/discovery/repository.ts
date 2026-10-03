/**
 * Repositorio de Discovery & Ingestion (Drizzle/Postgres).
 *
 * Notas de implementación (Fase C):
 * - Un solo run activo: `pg_advisory_xact_lock` sobre la creación + chequeo de
 *   runs QUEUED/RUNNING dentro de la transacción (decisión v0.3: sin índice
 *   único parcial — queda en BACKLOG). Corrida en proceso (sin Redis/worker).
 * - `upsertCandidate` es idempotente por (kind, provider, externalId) (§37):
 *   sólo refresca filas en estado descubrible (DISCOVERED/FAILED/STALE) para no
 *   pisar estados editoriales de la Fase D+ (§21); `version` (OCC §35) sube
 *   sólo si cambia checksum, versión de adapter o status.
 * - `recoverOrphanedRuns` se ejecuta al boot: runs QUEUED/RUNNING de un proceso
 *   anterior quedan FAILED (§32; un run nunca puede quedar colgado).
 */

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { DiscoveryError } from "./errors";
import type {
  CandidateStorePort,
  CandidateTransitionPatch,
} from "./pipeline";
import type {
  CandidateUpsertValues,
  DiscoveryRepository,
  IngestionErrorValues,
  RunFinishValues,
} from "./orchestrator";

const ACTIVE_RUN_STATUSES = ["QUEUED", "RUNNING"] as const;
const DISCOVERABLE_STATUSES = ["DISCOVERED", "FAILED", "STALE"] as const;
const ADVISORY_LOCK_KEY = "cinestesia:discovery_run_active";
const ORPHANED_SUMMARY = "Interrumpido por reinicio del proceso";

export async function findAdapterRow(adapterKey: string) {
  return db.query.discoveryAdapters.findFirst({
    where: eq(schema.discoveryAdapters.adapterKey, adapterKey),
  });
}

export async function findRun(runId: string) {
  return db.query.discoveryRuns.findFirst({
    where: eq(schema.discoveryRuns.id, runId),
  });
}

export async function listRuns(page: number, limit: number) {
  const rows = await db
    .select()
    .from(schema.discoveryRuns)
    .orderBy(desc(schema.discoveryRuns.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
  const [totalRow] = await db
    .select({ total: count() })
    .from(schema.discoveryRuns);
  return { rows, total: totalRow?.total ?? 0 };
}

/**
 * §6.44 §31 — crea el run en QUEUED garantizando unicidad de run activo.
 * Lanza `RUN_ALREADY_RUNNING` (409) si ya existe uno.
 */
export async function createRunWithLock(values: {
  adapterId: string;
  adapterVersion: string;
  trigger: string;
  mode: string;
  query: string | null;
  maxItems: number | null;
  counters: Record<string, number>;
}) {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${ADVISORY_LOCK_KEY}))`,
    );
    const [active] = await tx
      .select({ id: schema.discoveryRuns.id })
      .from(schema.discoveryRuns)
      .where(inArray(schema.discoveryRuns.status, [...ACTIVE_RUN_STATUSES]))
      .limit(1);
    if (active) {
      throw new DiscoveryError(
        "RUN_ALREADY_RUNNING",
        "Ya existe un Discovery Run activo; espera a que termine",
      );
    }
    const [row] = await tx
      .insert(schema.discoveryRuns)
      .values({ ...values, status: "QUEUED" })
      .returning();
    if (!row) {
      throw new Error("No se pudo crear el Discovery Run");
    }
    return row;
  });
}

/** Boot: runs huérfanos de un proceso anterior → FAILED (§32). */
export async function recoverOrphanedRuns(): Promise<number> {
  const rows = await db
    .update(schema.discoveryRuns)
    .set({
      status: "FAILED",
      errorSummary: ORPHANED_SUMMARY,
      updatedAt: new Date(),
    })
    .where(inArray(schema.discoveryRuns.status, [...ACTIVE_RUN_STATUSES]))
    .returning({ id: schema.discoveryRuns.id });
  return rows.length;
}

async function claimRun(runId: string) {
  const [row] = await db
    .update(schema.discoveryRuns)
    .set({
      status: "RUNNING",
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.discoveryRuns.id, runId),
        eq(schema.discoveryRuns.status, "QUEUED"),
      ),
    )
    .returning();
  return row;
}

async function finishRun(runId: string, values: RunFinishValues): Promise<void> {
  await db
    .update(schema.discoveryRuns)
    .set({
      status: values.status,
      counters: values.counters,
      errorSummary: values.errorSummary,
      finishedAt: values.finishedAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.discoveryRuns.id, runId));
}

async function upsertCandidate(
  values: CandidateUpsertValues,
): Promise<typeof schema.discoveryCandidates.$inferSelect> {
  const [row] = await db
    .insert(schema.discoveryCandidates)
    .values({
      runId: values.runId,
      kind: values.kind,
      provider: values.provider,
      externalId: values.externalId,
      status: values.status,
      adapterId: values.adapterId,
      adapterVersion: values.adapterVersion,
      normalizedData: values.normalizedData,
      rawPayload: values.rawPayload,
      payloadChecksum: values.payloadChecksum,
      processedAt: values.processedAt,
    })
    .onConflictDoUpdate({
      target: [
        schema.discoveryCandidates.kind,
        schema.discoveryCandidates.provider,
        schema.discoveryCandidates.externalId,
      ],
      setWhere: sql`${schema.discoveryCandidates.status} IN (${sql.join(
        DISCOVERABLE_STATUSES.map((status) => sql`${status}`),
        sql`, `,
      )})`,
      set: {
        runId: values.runId,
        status: values.status,
        adapterId: values.adapterId,
        adapterVersion: values.adapterVersion,
        normalizedData: values.normalizedData,
        rawPayload: values.rawPayload,
        payloadChecksum: values.payloadChecksum,
        processedAt: values.processedAt,
        version: sql`CASE
          WHEN ${schema.discoveryCandidates.payloadChecksum} IS DISTINCT FROM ${values.payloadChecksum}
            OR ${schema.discoveryCandidates.adapterVersion} IS DISTINCT FROM ${values.adapterVersion}
            OR ${schema.discoveryCandidates.status} IS DISTINCT FROM ${values.status}
          THEN ${schema.discoveryCandidates.version} + 1
          ELSE ${schema.discoveryCandidates.version}
        END`,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (row) {
    return row;
  }

  // Conflicto con un estado no refrescable (Fase D+: APPROVED/INGESTED/…):
  // se conserva la fila existente y se devuelve sin modificar (§21).
  const existing = await db.query.discoveryCandidates.findFirst({
    where: and(
      eq(schema.discoveryCandidates.kind, values.kind),
      eq(schema.discoveryCandidates.provider, values.provider),
      eq(schema.discoveryCandidates.externalId, values.externalId),
    ),
  });
  if (!existing) {
    throw new Error("upsert de candidato no produjo ninguna fila");
  }
  return existing;
}

async function recordError(values: IngestionErrorValues): Promise<void> {
  await db.insert(schema.ingestionErrors).values({
    runId: values.runId,
    candidateId: values.candidateId,
    errorCode: values.errorCode,
    message: values.message,
    attempt: values.attempt,
    details: values.details,
  });
}

/**
 * §6.44 §21 — transiciones controladas del candidato (Fase D).
 * Condiciona la escritura al estado `from` (optimista, igual que el upsert):
 * si la fila no está en el estado esperado no se modifica y se lanza error —
 * el orquestador decide si eso aborta el run. `version` (OCC §35) sube con
 * cada transición.
 */
async function transition(
  candidateId: string,
  from: string,
  to: string,
  patch?: CandidateTransitionPatch,
): Promise<void> {
  const [row] = await db
    .update(schema.discoveryCandidates)
    .set({
      status: to,
      ...(patch ?? {}),
      version: sql`${schema.discoveryCandidates.version} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.discoveryCandidates.id, candidateId),
        eq(schema.discoveryCandidates.status, from),
      ),
    )
    .returning({ id: schema.discoveryCandidates.id });

  if (!row) {
    throw new Error(
      `No se pudo transicionar el candidato ${candidateId}: ${from} → ${to}`,
    );
  }
}

export const discoveryRepository: DiscoveryRepository = {
  claimRun,
  finishRun,
  upsertCandidate,
  recordError,
};

export const candidateStore: CandidateStorePort = {
  transition,
};
