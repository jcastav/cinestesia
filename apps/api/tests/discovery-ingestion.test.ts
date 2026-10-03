import assert from "node:assert/strict";
import { test } from "node:test";
import type { DiscoveredItemInput, DiscoveryAdapter } from "../src/discovery/adapter";
import type { DiscoveryCandidateRow, DiscoveryRunRow } from "../src/db/schema";
import type { IngestionDraft } from "../src/catalog/service";
import {
  createEntityFromCandidate,
  linkMatchedEntity,
  toIngestionDraft,
  type IngestionCatalogPort,
} from "../src/discovery/ingestion";
import type { CandidateMatch, MatchingPort } from "../src/discovery/matching";
import {
  normalizeContent,
  type NormalizedContent,
} from "../src/discovery/normalize";
import {
  executeRun,
  type DiscoveryRepository,
  type IngestionErrorValues,
  type RunFinishValues,
} from "../src/discovery/orchestrator";
import {
  createPipeline,
  type CandidatePipeline,
  type CandidateStorePort,
  type CandidateTransitionPatch,
} from "../src/discovery/pipeline";

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

/* --------------------------- Ingesta directa --------------------------- */

test("NO_MATCH → crea el borrador con la identidad primaria del candidato", async () => {
  const created: IngestionDraft[] = [];
  const port: IngestionCatalogPort = {
    async createMediaItemFromIngestion(draft) {
      created.push(draft);
      return { id: "media-new" };
    },
    async linkExternalIdsFromIngestion() {
      throw new Error("no debe enlazar: es una creación");
    },
  };

  const normalized = normalizedFrom(
    item({
      externalIds: [
        {
          namespace: "tvmaze",
          externalId: "169",
          externalUrl: "https://www.tvmaze.com/shows/169/breaking-bad",
        },
        { namespace: "imdb", externalId: "tt0903747" },
      ],
    }),
  );
  const result = await createEntityFromCandidate(normalized, port);

  assert.deepEqual(result, { operation: "CREATE", entityId: "media-new" });
  const draft = at(created, 0);
  assert.equal(draft.slugBase, "breaking-bad");
  assert.equal(draft.canonicalTitle, "Breaking Bad");
  assert.equal(draft.mediaType, "SERIES");
  assert.equal(draft.releaseYear, 2008);
  assert.deepEqual(
    draft.primaryExternalId,
    { namespace: "tvmaze", externalId: "169", externalUrl: null },
    "la identidad primaria define la unicidad (§44)",
  );
  assert.deepEqual(
    draft.externalIds.map((entry) => `${entry.namespace}/${entry.externalId}`),
    ["tvmaze/169", "imdb/tt0903747"],
    "la identidad primaria va primero; el resto son ids secundarios",
  );
});

test("MATCHED → NO_CHANGE: no crea entidad, sólo enlaza sus externalIds", async () => {
  const created: IngestionDraft[] = [];
  const links: Array<{ mediaId: string; count: number }> = [];
  const port: IngestionCatalogPort = {
    async createMediaItemFromIngestion(draft) {
      created.push(draft);
      return { id: "media-created-1" };
    },
    async linkExternalIdsFromIngestion(mediaId, externalIds) {
      links.push({ mediaId, count: externalIds.length });
      return { linked: 1, skipped: 1 };
    },
  };
  const match: CandidateMatch = {
    result: "MATCHED",
    entityId: "media-seed",
    strategy: "EXTERNAL_ID_EXACT",
    confidence: "HIGH",
  };

  const result = await linkMatchedEntity(normalizedFrom(), match, port);

  assert.deepEqual(result, { operation: "NO_CHANGE", entityId: "media-seed" });
  assert.equal(created.length, 0, "no se crea entidad nueva");
  assert.deepEqual(at(links, 0), { mediaId: "media-seed", count: 1 });
});

test("toIngestionDraft convierte el candidato a campos de media_items", () => {
  const draft = toIngestionDraft(
    normalizedFrom(item({ synopsis: "Profesor de química." })),
  );
  assert.equal(draft.slugBase, "breaking-bad");
  assert.equal(draft.synopsis, "Profesor de química.");
  assert.equal(draft.posterUrl, null);
  assert.equal(draft.releaseDate, "2008-01-20");
  assert.equal(draft.primaryExternalId.namespace, "tvmaze");
});

/* --------------------------- Infraestructura de dobles --------------------------- */

interface FakeEntity {
  id: string;
  title: string;
  year: number | null;
  type: string;
  externalIds: Array<{ namespace: string; externalId: string }>;
}

function createFakeCatalog(seed: FakeEntity[] = []) {
  const entities = [...seed];
  const createCalls: IngestionDraft[] = [];
  const linkCalls: Array<{ mediaId: string; ids: number }> = [];
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
        externalIds: draft.externalIds.map((entry) => ({
          namespace: entry.namespace,
          externalId: entry.externalId,
        })),
      });
      return { id };
    },
    async linkExternalIdsFromIngestion(mediaId, externalIds) {
      linkCalls.push({ mediaId, ids: externalIds.length });
      return { linked: 1, skipped: 0 };
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

  return {
    port,
    matching,
    createCalls,
    linkCalls,
    entityCount: () => entities.length,
  };
}

function buildRunRow(): DiscoveryRunRow {
  const now = new Date();
  return {
    id: "2f9d2f6a-1b2c-4d5e-8f70-9a5f5b9a1c22",
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

function createFakeRepo() {
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
    async upsertCandidate(values) {
      const key = `${values.kind}|${values.provider}|${values.externalId}`;
      const existing = candidates.get(key);
      if (existing && !DISCOVERABLE.has(existing.status)) {
        return existing;
      }
      if (existing) {
        Object.assign(existing, {
          runId: values.runId,
          status: values.status,
          normalizedData: values.normalizedData,
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

function createFakeStore(candidates: Map<string, DiscoveryCandidateRow>) {
  const transitions: Array<{
    id: string;
    from: string;
    to: string;
    patch?: CandidateTransitionPatch;
  }> = [];
  const port: CandidateStorePort = {
    async transition(id, from, to, patch) {
      const row = [...candidates.values()].find((entry) => entry.id === id);
      assert.ok(row, `candidato ${id} inexistente`);
      assert.equal(row.status, from);
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

function harness(catalog: ReturnType<typeof createFakeCatalog>) {
  const fake = createFakeRepo();
  const store = createFakeStore(fake.candidates);
  const pipeline: CandidatePipeline = createPipeline({
    matching: catalog.matching,
    ingestion: catalog.port,
    store: store.port,
  });
  return { fake, store, pipeline };
}

/* --------------------------- Pipeline end-to-end --------------------------- */

test("executeRun: contadores distinguen matched (NO_CHANGE) de newContent (CREATE)", async () => {
  const catalog = createFakeCatalog([
    {
      id: "media-bb",
      title: "Breaking Bad",
      year: 2008,
      type: "SERIES",
      externalIds: [{ namespace: "tvmaze", externalId: "169" }],
    },
  ]);
  const { fake, pipeline } = harness(catalog);
  const items = [
    item(),
    item({
      externalId: "13",
      title: "Game of Thrones",
      releaseDate: "2011-04-17",
      raw: { id: 13, name: "Game of Thrones" },
    }),
  ];

  await executeRun("run-mixed", {
    repo: fake.repo,
    resolveAdapter: () => adapterOf(items),
    pipeline,
  });

  const finish = at(fake.finishes, 0);
  assert.equal(finish.status, "SUCCEEDED");
  assert.equal(finish.errorSummary, null);
  assert.deepEqual(finish.counters, {
    candidatesFound: 2,
    processed: 2,
    matched: 1,
    newContent: 1,
    ambiguous: 0,
    rejected: 0,
    sourcesDiscovered: 0,
    errors: 0,
  });
  assert.equal(catalog.createCalls.length, 1, "sólo el NO_MATCH crea");
  assert.equal(catalog.entityCount(), 2);
  assert.equal(fake.errors.length, 0);

  const matched = [...fake.candidates.values()].find(
    (entry) => entry.externalId === "169",
  );
  assert.ok(matched);
  assert.equal(matched.status, "INGESTED");
  assert.equal(matched.matchReference, "media-bb");
  assert.equal(matched.matchStrategy, "EXTERNAL_ID_EXACT");
  assert.equal(matched.confidence, "HIGH");

  const created = [...fake.candidates.values()].find(
    (entry) => entry.externalId === "13",
  );
  assert.ok(created);
  assert.equal(created.status, "INGESTED");
  assert.equal(created.matchReference, "media-created-1");
  assert.equal(created.matchStrategy, null, "NO_MATCH no tiene estrategia");
});

test("transiciones del candidato NO_MATCH siguen §21 hasta INGESTED", async () => {
  const catalog = createFakeCatalog();
  const { fake, store, pipeline } = harness(catalog);

  await executeRun("run-order", {
    repo: fake.repo,
    resolveAdapter: () => adapterOf([item()]),
    pipeline,
  });

  assert.deepEqual(
    store.transitions.map((entry) => [entry.from, entry.to]),
    [
      ["DISCOVERED", "MATCHING"],
      ["MATCHING", "VALIDATING"],
      ["VALIDATING", "INGESTING"],
      ["INGESTING", "INGESTED"],
    ],
  );
  const last = at(store.transitions, 3);
  assert.equal(last.patch?.matchReference, "media-created-1");
});

test("transiciones del candidato MATCHED pasan por MATCHED antes de VALIDATING", async () => {
  const catalog = createFakeCatalog([
    {
      id: "media-bb",
      title: "Breaking Bad",
      year: 2008,
      type: "SERIES",
      externalIds: [{ namespace: "tvmaze", externalId: "169" }],
    },
  ]);
  const { fake, store, pipeline } = harness(catalog);

  await executeRun("run-matched", {
    repo: fake.repo,
    resolveAdapter: () => adapterOf([item()]),
    pipeline,
  });

  assert.deepEqual(
    store.transitions.map((entry) => [entry.from, entry.to]),
    [
      ["DISCOVERED", "MATCHING"],
      ["MATCHING", "MATCHED"],
      ["MATCHED", "VALIDATING"],
      ["VALIDATING", "INGESTING"],
      ["INGESTING", "INGESTED"],
    ],
  );
  assert.equal(at(fake.finishes, 0).status, "SUCCEEDED");
  assert.equal(catalog.createCalls.length, 0);
  assert.equal(catalog.linkCalls.length, 1, "se enlazan los externalIds");
});
