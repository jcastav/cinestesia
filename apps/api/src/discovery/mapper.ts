import type { DiscoveryRunCounters, DiscoveryRunDto } from "@cinestesia/shared";
import type { DiscoveryRunRow } from "../db/schema";

/** §6.44 §6 — contadores operacionales a cero (Fase C llena found/processed/errors). */
export function emptyRunCounters(): DiscoveryRunCounters {
  return {
    candidatesFound: 0,
    processed: 0,
    matched: 0,
    newContent: 0,
    ambiguous: 0,
    rejected: 0,
    sourcesDiscovered: 0,
    errors: 0,
  };
}

function readCounters(stored: Record<string, number>): DiscoveryRunCounters {
  const counters = emptyRunCounters();
  for (const key of Object.keys(counters) as Array<
    keyof DiscoveryRunCounters
  >) {
    const value = stored[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      counters[key] = value;
    }
  }
  return counters;
}

export function toRunDto(row: DiscoveryRunRow): DiscoveryRunDto {
  return {
    runId: row.id,
    adapterId: row.adapterId,
    adapterVersion: row.adapterVersion,
    trigger: row.trigger as DiscoveryRunDto["trigger"],
    mode: row.mode as DiscoveryRunDto["mode"],
    status: row.status as DiscoveryRunDto["status"],
    query: row.query,
    maxItems: row.maxItems,
    startedAt: row.startedAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    durationMs:
      row.startedAt && row.finishedAt
        ? row.finishedAt.getTime() - row.startedAt.getTime()
        : null,
    counters: readCounters(row.counters),
    errorSummary: row.errorSummary,
    createdAt: row.createdAt.toISOString(),
  };
}
