import assert from "node:assert/strict";
import { test } from "node:test";
import type { DiscoveredItemInput, DiscoveryAdapter } from "../src/discovery/adapter";
import type { DiscoveryCandidateRow, DiscoveryRunRow } from "../src/db/schema";
import {
  matchCandidate,
  type MatchingPort,
} from "../src/discovery/matching";
import {
  normalizeContent,
  type NormalizedContent,
} from "../src/discovery/normalize";
import { payloadChecksum } from "../src/discovery/provenance";
import {
  executeRun,
  type CandidateUpsertValues,
  type DiscoveryRepository,
  type IngestionErrorValues,
  type RunFinishValues,
} from "../src/discovery/orchestrator";
import {
  assertCandidateTransition,
  createPipeline,
  type CandidatePipeline,
  type CandidateStorePort,
  type CandidateTransitionPatch,
} from "../src/discovery/pipeline";
import {
  blockingSummary,
  hasBlockingIssues,
  validateNormalizedContent,
} from "../src/discovery/validation";
import type { IngestionDraft } from "../src/catalog/service";
import type { IngestionCatalogPort } from "../src/discovery/ingestion";

function at<T>(list: readonly T[], index: number): T {
  const value = list[index];
  assert.ok(
    value !== undefined,
    `se esperaba un elemento en la posición ${index}`,
  );
  return value;
}

function item(
  overrides: Partial<DiscoveredItemInput> = {},
): DiscoveredItemInput {
  return {
    provider: "tvmaze",
    externalId: "169",
    raw: { id: 169, name: "Breaking Bad" },
    title: "Breaking Bad",
    type: "series",
    releaseDate: "2008-01-20",
    ...overrides,
  };
}

function normalizedFrom(
  input: DiscoveredItemInput = item(),
  overrides: Partial<NormalizedContent> = {},
): NormalizedContent {
  return { ...normalizeContent(input), ...overrides };
}

function staticPort(
  level1: { id: string } | undefined,
  level2: Array<{ id: string }>,
  calls: Array<string[]> = [],
): MatchingPort {
  return {
    async findMediaItemByExternalId(namespace, externalId) {
      calls.push(["nivel1", namespace, externalId]);
      return level1;
    },
    async findMediaItemsByTitleYearType(title, releaseYear, mediaType) {
      calls.push(["nivel2", title, String(releaseYear), mediaType]);
      return level2;
    },
  };
}

/* --------------------------- Niveles de matching --------------------------- */

test("Nivel 1: external id exacto → MATCHED EXTERNAL_ID_EXACT / HIGH", async () => {
  const calls: string[][] = [];
  const match = await matchCandidate(
    normalizedFrom(),
    staticPort({ id: "media-bb" }, [], calls),
  );
  assert.deepEqual(match, {
    result: "MATCHED",
    entityId: "media-bb",
    strategy: "EXTERNAL_ID_EXACT",
    confidence: "HIGH",
  });
  assert.deepEqual(at(calls, 0), ["nivel1", "tvmaze", "169"]);
  assert.equal(calls.length, 1, "el Nivel 1 inequívoco corta el pipeline");
});

test("Nivel 2: título + año + tipo → MATCHED DETERMINISTIC / MEDIUM", async () => {
  const calls: string[][] = [];
  const match = await matchCandidate(
    normalizedFrom(),
    staticPort(undefined, [{ id: "media-bb" }], calls),
  );
  assert.deepEqual(match, {
    result: "MATCHED",
    entityId: "media-bb",
    strategy: "DETERMINISTIC",
    confidence: "MEDIUM",
  });
  assert.deepEqual(at(calls, 1), ["nivel2", "Breaking Bad", "2008", "SERIES"]);
});

test("Nivel 2: más de una coincidencia → AMBIGUOUS (sin entityId)", async () => {
  const match = await matchCandidate(
    normalizedFrom(),
    staticPort(undefined, [{ id: "m1" }, { id: "m2" }]),
  );
  assert.equal(match.result, "AMBIGUOUS");
  assert.equal(match.entityId, null);
  assert.equal(match.strategy, "DETERMINISTIC");
});

test("Nivel 2: cero coincidencias → NO_MATCH", async () => {
  const match = await matchCandidate(normalizedFrom(), staticPort(undefined, []));
  assert.deepEqual(match, {
    result: "NO_MATCH",
    entityId: null,
    strategy: null,
    confidence: null,
  });
});

test("Sin año la política es conservadora: 1 → AMBIGUOUS, 0 → NO_MATCH (§23)", async () => {
  const sinAnio = normalizedFrom(item(), {
    releaseYear: null,
    releaseDate: null,
  });
  const calls: string[][] = [];
  const conCoincidencia = await matchCandidate(
    sinAnio,
    staticPort(undefined, [{ id: "m1" }], calls),
  );
  assert.equal(conCoincidencia.result, "AMBIGUOUS");
  assert.equal(conCoincidencia.strategy, "TITLE_TYPE");
  assert.deepEqual(at(calls, 1), ["nivel2", "Breaking Bad", "null", "SERIES"]);

  const sinCoincidencia = await matchCandidate(
    sinAnio,
    staticPort(undefined, []),
  );
  assert.equal(sinCoincidencia.result, "NO_MATCH");
});

/* --------------------------- Validación §28 --------------------------- */

test("§28: año < 1888 y título vacío bloquean; año ausente sólo advierte", () => {
  const anioRaro = validateNormalizedContent(
    normalizedFrom(item({ releaseYear: 1500 })),
  );
  assert.equal(hasBlockingIssues(anioRaro), true);
  assert.ok(
    anioRaro.some(
      (entry) => entry.level === "ERROR" && entry.code === "YEAR_OUT_OF_RANGE",
    ),
  );
  assert.match(blockingSummary(anioRaro), /YEAR_OUT_OF_RANGE/);

  const sinAnio = validateNormalizedContent(
    normalizedFrom(item(), { releaseYear: null, releaseDate: null }),
  );
  assert.equal(hasBlockingIssues(sinAnio), false, "WARNING no bloquea");
  assert.ok(
    sinAnio.some(
      (entry) => entry.level === "WARNING" && entry.code === "YEAR_MISSING",
    ),
  );
  assert.ok(
    sinAnio.some(
      (entry) => entry.level === "INFO" && entry.code === "SYNOPSIS_MISSING",
    ),
    "la ausencia de sinopsis es INFO",
  );

  const sinTitulo = validateNormalizedContent(
    normalizedFrom(item(), { title: "" }),
  );
  assert.equal(hasBlockingIssues(sinTitulo), true);
  assert.ok(
    sinTitulo.some(
      (entry) => entry.level === "ERROR" && entry.code === "TITLE_REQUIRED",
    ),
  );

  const ok = validateNormalizedContent(normalizedFrom());
  assert.equal(hasBlockingIssues(ok), false, "candidato válido no bloquea");
});

/* --------------------------- Máquina de estados §21 --------------------------- */

test("§21: transiciones prohibidas lanzan error (FAILED → INGESTED)", () => {
  assert.doesNotThrow(() =>
    assertCandidateTransition("DISCOVERED", "MATCHING"),
  );
  assert.doesNotThrow(() =>
    assertCandidateTransition("AMBIGUOUS", "PENDING_REVIEW"),
  );
  assert.doesNotThrow(() => assertCandidateTransition("INGESTING", "INGESTED"));
  assert.throws(
    () => assertCandidateTransition("FAILED", "INGESTED"),
    /prohibida: FAILED → INGESTED/,
  );
  assert.throws(
    () => assertCandidateTransition("REJECTED", "INGESTED"),
    /prohibida/,
  );
  assert.throws(() => assertCandidateTransition("PENDING_REVIEW", "INGESTED"));
});

/* --------------------------- Infraestructura de dobles --------------------------- */

interface FakeEntity {
  id: string;
  title: string;
  year: number | null;
  type: string;
  externalIds: Array<{
    namespace: string;
    externalId: string;
    externalUrl?: string | null;
  }>;
}

interface FakeCatalog {
  port: IngestionCatalogPort;
  matching: MatchingPort;
  createCalls: IngestionDraft[];
  entityCount(): number;
}

function createFakeCatalog(seed: FakeEntity[] = []): FakeCatalog {
  const entities = [...seed];
  const createCalls: IngestionDraft[] = [];
  let created = 0;

  const port: IngestionCatalogPort = {
    async createMediaItemFromIngestion(draft) {
      createCalls.push(draft);
      created += 1;
      const id = `media-created-${created}`;
      entities.push({
        id,
        title: draft.canonicalTitle,
        year: draft.releaseYear ?? null,
        type: draft.mediaType,
        externalIds: draft.externalIds,
      });
      return { id };
    },
    async linkExternalIdsFromIngestion(mediaId, externalIds) {
      const entity = entities.find((entry) => entry.id === mediaId);
      let linked = 0;
      let skipped = 0;
      for (const external of externalIds) {
        const exists = entity?.externalIds.some(
          (entry) =>
            entry.namespace === external.namespace &&
            entry.externalId === external.externalId,
        );
        if (exists) {
          skipped += 1;
          continue;
        }
        entity?.externalIds.push(external);
        linked += 1;
      }
      return { linked, skipped };
    },
  };

  const matching: MatchingPort = {
    async findMediaItemByExternalId(namespace, externalId) {
      const found = entities.find((entry) =>
        entry.externalIds.some(
          (external) =>
            external.namespace === namespace &&
            external.externalId === externalId,
        ),
      );
      return found ? { id: found.id } : undefined;
    },
    async findMediaItemsByTitleYearType(title, releaseYear, mediaType) {
      const key = title.toLowerCase();
      return entities
        .filter(
          (entry) =>
            entry.type === mediaType &&
            (releaseYear === null || entry.year === releaseYear) &&
            entry.title.toLowerCase() === key,
        )
        .map((entry) => ({ id: entry.id }));
    },
  };

  return { port, matching, createCalls, entityCount: () => entities.length };
}

interface FakeRepo {
  repo: DiscoveryRepository;
  candidates: Map<string, DiscoveryCandidateRow>;
  errors: IngestionErrorValues[];
  finishes: Array<{ runId: string } & RunFinishValues>;
}

function buildRunRow(): DiscoveryRunRow {
  const now = new Date();
  return {
    id: "2f9d2f6a-1b2c-4d5e-8f70-9a5f5b9a1c11",
    adapterId: "tvmaze_metadata",
    adapterVersion: "1.0.0",
    status: "QUEUED",
    trigger: "MANUAL",
    mode: "FULL",
    query: "breaking bad",
    maxItems: null,
    counters: {},
    errorSummary: null,
    startedAt: null,
    finishedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

const DISCOVERABLE = new Set(["DISCOVERED", "FAILED", "STALE"]);

function createFakeRepo(): FakeRepo {
  const candidates = new Map<string, DiscoveryCandidateRow>();
  const errors: IngestionErrorValues[] = [];
  const finishes: Array<{ runId: string } & RunFinishValues> = [];

  const repo: DiscoveryRepository = {
    async claimRun(runId) {
      return { ...buildRunRow(), id: runId };
    },
    async finishRun(runId, values) {
      finishes.push({ runId, ...values });
    },
    async upsertCandidate(values: CandidateUpsertValues) {
      const key = `${values.kind}|${values.provider}|${values.externalId}`;
      const existing = candidates.get(key);
      if (existing && !DISCOVERABLE.has(existing.status)) {
        return existing;
      }
      if (existing) {
        Object.assign(existing, {
          runId: values.runId,
          status: values.status,
          adapterId: values.adapterId,
          adapterVersion: values.adapterVersion,
          normalizedData: values.normalizedData,
          rawPayload: values.rawPayload,
          payloadChecksum: values.payloadChecksum,
          processedAt: values.processedAt,
          version: existing.version + 1,
          updatedAt: new Date(),
        });
        return existing;
      }
      const now = new Date();
      const row: DiscoveryCandidateRow = {
        id: `candidate-${candidates.size + 1}`,
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
        matchReference: null,
        matchStrategy: null,
        confidence: null,
        rejectionReason: null,
        version: 1,
        discoveredAt: now,
        processedAt: values.processedAt,
        createdAt: now,
        updatedAt: now,
      };
      candidates.set(key, row);
      return row;
    },
    async recordError(values) {
      errors.push(values);
    },
  };

  return { repo, candidates, errors, finishes };
}

interface FakeStore {
  port: CandidateStorePort;
  transitions: Array<{
    id: string;
    from: string;
    to: string;
    patch?: CandidateTransitionPatch;
  }>;
}

function createFakeStore(candidates: Map<string, DiscoveryCandidateRow>): FakeStore {
  const transitions: FakeStore["transitions"] = [];
  const port: CandidateStorePort = {
    async transition(id, from, to, patch) {
      const row = [...candidates.values()].find((entry) => entry.id === id);
      assert.ok(row, `candidato ${id} inexistente para la transición`);
      assert.equal(row.status, from, `transición desde estado ${from}`);
      assertCandidateTransition(from, to);
      row.status = to;
      if (patch?.matchReference !== undefined) {
        row.matchReference = patch.matchReference;
      }
      if (patch?.matchStrategy !== undefined) {
        row.matchStrategy = patch.matchStrategy;
      }
      if (patch?.confidence !== undefined) {
        row.confidence = patch.confidence;
      }
      row.version += 1;
      row.updatedAt = new Date();
      transitions.push({ id, from, to, ...(patch ? { patch } : {}) });
    },
  };
  return { port, transitions };
}

function adapterOf(items: DiscoveredItemInput[]): DiscoveryAdapter {
  return {
    id: "tvmaze_metadata",
    version: "1.0.0",
    provider: "tvmaze",
    capabilities: ["CONTENT_DISCOVERY", "REQUIRES_QUERY"],
    async discover() {
      return items;
    },
  };
}

function countersOf(
  partial: Partial<Record<string, number>>,
): Record<string, number> {
  return {
    candidatesFound: 0,
    processed: 0,
    matched: 0,
    newContent: 0,
    ambiguous: 0,
    rejected: 0,
    sourcesDiscovered: 0,
    errors: 0,
    ...partial,
  };
}

function buildPipelineHarness(catalog: FakeCatalog, fake: FakeRepo) {
  const store = createFakeStore(fake.candidates);
  const pipeline: CandidatePipeline = createPipeline({
    matching: catalog.matching,
    ingestion: catalog.port,
    store: store.port,
  });
  return { pipeline, store };
}

/* --------------------------- Pipeline integrado --------------------------- */

test("validación bloqueante → candidato FAILED + VALIDATION_ERROR y run PARTIAL", async () => {
  const fake = createFakeRepo();
  const catalog = createFakeCatalog();
  const { pipeline, store } = buildPipelineHarness(catalog, fake);
  const items = [item({ releaseYear: 1500 })];

  await executeRun("run-invalid", {
    repo: fake.repo,
    resolveAdapter: () => adapterOf(items),
    pipeline,
  });

  const finish = at(fake.finishes, 0);
  assert.equal(finish.status, "PARTIAL");
  assert.deepEqual(
    finish.counters,
    countersOf({ candidatesFound: 1, processed: 1, rejected: 1, errors: 1 }),
  );
  const error = at(fake.errors, 0);
  assert.equal(error.errorCode, "VALIDATION_ERROR");
  assert.equal(error.candidateId, "candidate-1");
  assert.match(error.message, /YEAR_OUT_OF_RANGE/);
  assert.equal(catalog.createCalls.length, 0, "nada bloqueado se ingiere");
  const last = at(store.transitions, store.transitions.length - 1);
  assert.equal(last.to, "FAILED");
  const candidate = [...fake.candidates.values()][0];
  assert.ok(candidate);
  assert.equal(candidate.status, "FAILED");
  assert.equal(candidate.matchReference, null);
});

test("pipeline AMBIGUOUS → PENDING_REVIEW sin crear entidad y contador ambiguous", async () => {
  const fake = createFakeRepo();
  const catalog = createFakeCatalog([
    {
      id: "m1",
      title: "Breaking Bad",
      year: 2008,
      type: "SERIES",
      externalIds: [],
    },
    {
      id: "m2",
      title: "Breaking Bad",
      year: 2008,
      type: "SERIES",
      externalIds: [],
    },
  ]);
  const { pipeline } = buildPipelineHarness(catalog, fake);
  const items = [item({ externalId: "sin-match" })];

  await executeRun("run-amb", {
    repo: fake.repo,
    resolveAdapter: () => adapterOf(items),
    pipeline,
  });

  const finish = at(fake.finishes, 0);
  assert.equal(finish.status, "SUCCEEDED");
  assert.deepEqual(
    finish.counters,
    countersOf({ candidatesFound: 1, processed: 1, ambiguous: 1 }),
  );
  assert.equal(catalog.createCalls.length, 0, "lo ambiguo no se ingiere");
  assert.equal(fake.errors.length, 0, "lo ambiguo no es un error (§40)");
  const candidate = [...fake.candidates.values()][0];
  assert.ok(candidate);
  assert.equal(candidate.status, "PENDING_REVIEW");
});

test("idempotencia: re-ejecutar el mismo run no crea un MediaItem duplicado (§37)", async () => {
  const fake = createFakeRepo();
  const catalog = createFakeCatalog();
  const { pipeline } = buildPipelineHarness(catalog, fake);
  const items = [item()];
  const deps = {
    repo: fake.repo,
    resolveAdapter: () => adapterOf(items),
    pipeline,
  };

  await executeRun("run-1", deps);
  const first = at(fake.finishes, 0);
  assert.equal(first.status, "SUCCEEDED");
  assert.deepEqual(
    first.counters,
    countersOf({ candidatesFound: 1, processed: 1, newContent: 1 }),
  );
  assert.equal(catalog.entityCount(), 1);
  assert.equal(fake.candidates.size, 1);

  await executeRun("run-2", deps);
  const second = at(fake.finishes, 1);
  assert.equal(second.status, "SUCCEEDED");
  assert.deepEqual(
    second.counters,
    countersOf({ candidatesFound: 1, processed: 1 }),
    "sin newContent: la fila ya no está en DISCOVERED",
  );
  assert.equal(catalog.entityCount(), 1, "sin entidad duplicada");
  assert.equal(fake.candidates.size, 1);

  const candidate = [...fake.candidates.values()][0];
  assert.ok(candidate);
  assert.equal(candidate.status, "INGESTED");
  assert.ok(candidate.matchReference?.startsWith("media-created-"));
  assert.ok(candidate.payloadChecksum === payloadChecksum(item().raw));
});
