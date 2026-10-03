import type { DiscoveryRunCounters } from "@cinestesia/shared";
import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  DiscoveredItemInput,
  DiscoveryAdapter,
} from "../src/discovery/adapter";
import { manualImportAdapter } from "../src/discovery/adapters/manual-import";
import {
  createTvmazeMetadataAdapter,
  parseTvmazeSearch,
  showToItem,
} from "../src/discovery/adapters/tvmaze-metadata";
import type { DiscoveryCandidateRow, DiscoveryRunRow } from "../src/db/schema";
import { DiscoveryError } from "../src/discovery/errors";
import { DiscoveryUpstreamError, type JsonHttpClient } from "../src/discovery/http";
import {
  executeRun,
  type CandidateUpsertValues,
  type DiscoveryRepository,
  type IngestionErrorValues,
  type RunFinishValues,
} from "../src/discovery/orchestrator";
import { payloadChecksum } from "../src/discovery/provenance";
import {
  parseRunListParams,
  parseRunRequest,
} from "../src/discovery/validation";

function at<T>(list: readonly T[], index: number): T {
  const value = list[index];
  assert.ok(
    value !== undefined,
    `se esperaba un elemento en la posición ${index}`,
  );
  return value;
}

function isUpstream(
  errorCode: string,
  retryable?: boolean,
): (error: unknown) => boolean {
  return (error: unknown) => {
    assert.ok(error instanceof DiscoveryUpstreamError, "debe ser upstream error");
    assert.equal(error.errorCode, errorCode);
    if (retryable !== undefined) {
      assert.equal(error.retryable, retryable);
    }
    return true;
  };
}

const TVMAZE_FIXTURE = [
  {
    score: 0.91,
    show: {
      id: 169,
      name: "Breaking Bad",
      type: "Scripted",
      runtime: 45,
      premiered: "2008-01-20",
      summary: "<p>Un <b>profesor</b> de química &amp; su alumno.</p>",
      url: "https://www.tvmaze.com/shows/169/breaking-bad",
      image: {
        original:
          "https://static.tvmaze.com/uploads/images/original_1/169.jpg",
      },
      externals: { imdb: "tt0903747", thetvdb: 81189 },
    },
  },
  {
    score: 0.8,
    show: {
      id: 13,
      name: "Game of Thrones",
      type: "Scripted",
      runtime: 60,
      premiered: "2011-04-17",
      summary: "<p>Reinos y dragones.</p>",
      url: "https://www.tvmaze.com/shows/13/game-of-thrones",
      image: {},
      externals: {},
    },
  },
];

test("tvmaze_metadata busca con query y normaliza el resultado", async () => {
  const calls: Array<{ url: string; allowedHosts: readonly string[] }> = [];
  const http: JsonHttpClient = {
    async fetchJson(url, policy) {
      calls.push({ url, allowedHosts: policy.allowedHosts });
      return TVMAZE_FIXTURE;
    },
  };
  const adapter = createTvmazeMetadataAdapter(http);
  assert.equal(adapter.id, "tvmaze_metadata");
  assert.equal(adapter.provider, "tvmaze");
  assert.ok(adapter.capabilities.includes("REQUIRES_QUERY"));

  const items = await adapter.discover({ query: "breaking bad", maxItems: null });
  const call = at(calls, 0);
  const endpoint = new URL(call.url);
  assert.equal(
    `${endpoint.origin}${endpoint.pathname}`,
    "https://api.tvmaze.com/search/shows",
  );
  assert.equal(endpoint.searchParams.get("q"), "breaking bad");
  assert.deepEqual([...call.allowedHosts], ["api.tvmaze.com"]);

  assert.equal(items.length, 2, "default 20 no recorta el fixture");
  const first = at(items, 0);
  assert.equal(first.provider, "tvmaze");
  assert.equal(first.externalId, "169");
  assert.equal(first.title, "Breaking Bad");
  assert.equal(first.type, "Series");
  assert.equal(first.releaseDate, "2008-01-20");
  assert.equal(first.releaseYear, null, "lo deriva normalizeContent (§19)");
  assert.equal(first.runtimeSeconds, 45 * 60);
  assert.equal(first.synopsis, "Un profesor de química & su alumno.");
  assert.equal(
    first.posterUrl,
    "https://static.tvmaze.com/uploads/images/original_1/169.jpg",
  );
  assert.deepEqual(first.externalIds, [
    {
      namespace: "tvmaze",
      externalId: "169",
      externalUrl: "https://www.tvmaze.com/shows/169/breaking-bad",
    },
    { namespace: "imdb", externalId: "tt0903747", externalUrl: null },
  ]);
  assert.deepEqual(first.raw, at(TVMAZE_FIXTURE, 0).show);

  const limited = await adapter.discover({ query: "x", maxItems: 1 });
  assert.equal(limited.length, 1);
});

test("tvmaze_metadata exige query y no toca la red sin él", async () => {
  let calls = 0;
  const http: JsonHttpClient = {
    async fetchJson() {
      calls++;
      return TVMAZE_FIXTURE;
    },
  };
  const adapter = createTvmazeMetadataAdapter(http);
  await assert.rejects(
    adapter.discover({ query: null, maxItems: null }),
    isUpstream("INVALID_EXTERNAL_PAYLOAD", false),
  );
  assert.equal(calls, 0);
});

test("parseTvmazeSearch rechaza payloads que no son resultados válidos", () => {
  assert.throws(
    () => parseTvmazeSearch({ results: [] }),
    isUpstream("INVALID_EXTERNAL_PAYLOAD", false),
  );
  assert.throws(
    () => parseTvmazeSearch([{ noShow: true }]),
    isUpstream("INVALID_EXTERNAL_PAYLOAD", false),
  );
  assert.throws(
    () => parseTvmazeSearch([null]),
    isUpstream("INVALID_EXTERNAL_PAYLOAD", false),
  );
  const shows = parseTvmazeSearch(TVMAZE_FIXTURE);
  assert.equal(shows.length, 2);
  assert.deepEqual(at(shows, 0), at(TVMAZE_FIXTURE, 0).show);
});

test("showToItem exige id y nombre, y mapea tipo Movie", () => {
  assert.throws(
    () => showToItem({ id: null, name: "x" }),
    isUpstream("INVALID_EXTERNAL_PAYLOAD", false),
  );
  assert.throws(
    () => showToItem({ id: 1, name: "   " }),
    isUpstream("INVALID_EXTERNAL_PAYLOAD", false),
  );
  const movie = showToItem({ id: 99, name: "El Renacido", type: "Movie" });
  assert.equal(movie.externalId, "99");
  assert.equal(movie.type, "Movie");
});

test("manual_import acepta arreglo o único objeto con provider manual", async () => {
  const items = await manualImportAdapter.discover({
    query: JSON.stringify([
      {
        title: "El Renacido",
        externalId: 42,
        type: "movie",
        releaseYear: 2015,
        externalIds: [{ namespace: "imdb", externalId: "tt1663202" }],
      },
      { title: "Amélie", externalId: "amelie-2001" },
    ]),
    maxItems: null,
  });
  assert.equal(items.length, 2);
  const first = at(items, 0);
  assert.equal(first.provider, "manual");
  assert.equal(first.externalId, "42", "externalId numérico → cadena");
  assert.equal(first.title, "El Renacido");
  assert.equal(first.type, "movie");
  assert.deepEqual(first.externalIds, [
    { namespace: "imdb", externalId: "tt1663202" },
  ]);
  assert.equal(at(items, 1).externalId, "amelie-2001");

  const single = await manualImportAdapter.discover({
    query: JSON.stringify({ title: "Solo", externalId: "s1" }),
    maxItems: null,
  });
  assert.equal(single.length, 1);
  assert.deepEqual(at(single, 0).raw, { title: "Solo", externalId: "s1" });

  const capped = await manualImportAdapter.discover({
    query: JSON.stringify([
      { title: "A", externalId: "a" },
      { title: "B", externalId: "b" },
    ]),
    maxItems: 1,
  });
  assert.equal(capped.length, 1);
});

test("manual_import valida el contrato del JSON con índice del ítem", async () => {
  const discover = (query: string | null) =>
    manualImportAdapter.discover({ query, maxItems: null });

  await assert.rejects(
    discover(null),
    isUpstream("INVALID_EXTERNAL_PAYLOAD", false),
  );
  await assert.rejects(
    discover("no es json"),
    isUpstream("INVALID_EXTERNAL_PAYLOAD", false),
  );
  await assert.rejects(
    discover("[]"),
    isUpstream("INVALID_EXTERNAL_PAYLOAD", false),
  );
  await assert.rejects(
    discover(JSON.stringify([{ externalId: "x" }])),
    (error: unknown) => {
      assert.ok(error instanceof DiscoveryUpstreamError);
      assert.match(error.message, /ítem 0/);
      return true;
    },
  );
  await assert.rejects(
    discover(
      JSON.stringify([
        { title: "A", externalId: "x" },
        { title: "B" },
      ]),
    ),
    (error: unknown) => {
      assert.ok(error instanceof DiscoveryUpstreamError);
      assert.match(error.message, /ítem 1/);
      return true;
    },
  );
  await assert.rejects(
    discover(JSON.stringify([{ title: "A", externalId: "x" }, "texto"])),
    (error: unknown) => {
      assert.ok(error instanceof DiscoveryUpstreamError);
      assert.match(error.message, /ítem 1/);
      return true;
    },
  );
});

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

interface FakeRepo {
  repo: DiscoveryRepository;
  upserts: CandidateUpsertValues[];
  errors: IngestionErrorValues[];
  finishes: Array<{ runId: string } & RunFinishValues>;
}

function createFakeRepo(options?: { claim?: boolean }): FakeRepo {
  const claim = options?.claim ?? true;
  const upserts: CandidateUpsertValues[] = [];
  const errors: IngestionErrorValues[] = [];
  const finishes: Array<{ runId: string } & RunFinishValues> = [];
  const repo: DiscoveryRepository = {
    async claimRun(runId) {
      return claim ? { ...buildRunRow(), id: runId } : undefined;
    },
    async finishRun(runId, values) {
      finishes.push({ runId, ...values });
    },
    async upsertCandidate(values) {
      upserts.push(values);
      return {
        id: `candidate-${upserts.length}`,
      } as unknown as DiscoveryCandidateRow;
    },
    async recordError(values) {
      errors.push(values);
    },
  };
  return { repo, upserts, errors, finishes };
}

function countersOf(
  partial: Partial<DiscoveryRunCounters>,
): DiscoveryRunCounters {
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

function validItem(
  overrides: Partial<DiscoveredItemInput> = {},
): DiscoveredItemInput {
  return {
    provider: "tvmaze",
    externalId: "169",
    raw: { id: 169, name: "Breaking Bad" },
    title: "Breaking Bad",
    ...overrides,
  };
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

function throwingAdapter(error: Error): DiscoveryAdapter {
  return {
    id: "tvmaze_metadata",
    version: "1.0.0",
    provider: "tvmaze",
    capabilities: ["CONTENT_DISCOVERY", "REQUIRES_QUERY"],
    async discover() {
      throw error;
    },
  };
}

test("executeRun happy path: SUCCEEDED con contadores y provenance", async () => {
  const fake = createFakeRepo();
  const items = [
    validItem(),
    validItem({
      externalId: "13",
      title: "Game of Thrones",
      raw: { id: 13, name: "Game of Thrones" },
    }),
  ];
  await executeRun("run-1", {
    repo: fake.repo,
    resolveAdapter: () => adapterOf(items),
  });

  assert.equal(fake.finishes.length, 1);
  const finish = at(fake.finishes, 0);
  assert.equal(finish.runId, "run-1");
  assert.equal(finish.status, "SUCCEEDED");
  assert.equal(finish.errorSummary, null);
  assert.ok(finish.finishedAt instanceof Date);
  assert.deepEqual(
    finish.counters,
    countersOf({ candidatesFound: 2, processed: 2 }),
  );
  assert.equal(fake.upserts.length, 2);
  const first = at(fake.upserts, 0);
  assert.equal(first.kind, "CONTENT");
  assert.equal(first.status, "DISCOVERED");
  assert.equal(first.provider, "tvmaze");
  assert.equal(first.externalId, "169");
  assert.equal(first.adapterId, "tvmaze_metadata");
  assert.equal(first.adapterVersion, "1.0.0");
  assert.equal(first.payloadChecksum, payloadChecksum(at(items, 0).raw));
  assert.equal(first.normalizedData?.["title"], "Breaking Bad");
  assert.ok(first.processedAt instanceof Date);
  assert.equal(fake.errors.length, 0);
});

test("executeRun no hace nada si el run no está QUEUED", async () => {
  const fake = createFakeRepo({ claim: false });
  let resolved = false;
  await executeRun("run-2", {
    repo: fake.repo,
    resolveAdapter: () => {
      resolved = true;
      return undefined;
    },
  });
  assert.equal(resolved, false);
  assert.equal(fake.finishes.length, 0);
  assert.equal(fake.upserts.length, 0);
  assert.equal(fake.errors.length, 0);
});

test("executeRun termina FAILED si el adapter no está registrado", async () => {
  const fake = createFakeRepo();
  await executeRun("run-3", {
    repo: fake.repo,
    resolveAdapter: () => undefined,
  });
  const finish = at(fake.finishes, 0);
  assert.equal(finish.status, "FAILED");
  assert.match(finish.errorSummary ?? "", /no está registrado/);
  const error = at(fake.errors, 0);
  assert.equal(error.errorCode, "DISCOVERY_ADAPTER_ERROR");
  assert.equal(error.candidateId, null);
  assert.deepEqual(finish.counters, countersOf({}));
});

test("executeRun clasifica errores del proveedor sin perder el run", async () => {
  const fake = createFakeRepo();
  const upstream = new DiscoveryUpstreamError(
    "UPSTREAM_TIMEOUT",
    "timeout del proveedor: 10s",
    true,
  );
  await executeRun("run-4", {
    repo: fake.repo,
    resolveAdapter: () => throwingAdapter(upstream),
  });
  const finish = at(fake.finishes, 0);
  assert.equal(finish.status, "FAILED");
  assert.equal(finish.errorSummary, "timeout del proveedor: 10s");
  const error = at(fake.errors, 0);
  assert.equal(error.errorCode, "UPSTREAM_TIMEOUT");
  assert.equal(error.attempt, 1);
  assert.deepEqual(finish.counters, countersOf({}));
});

test("executeRun produce PARTIAL con candidato FAILED cuando un ítem no normaliza", async () => {
  const fake = createFakeRepo();
  const items = [validItem(), validItem({ externalId: "bad", title: "!!!" })];
  await executeRun("run-5", {
    repo: fake.repo,
    resolveAdapter: () => adapterOf(items),
  });

  const finish = at(fake.finishes, 0);
  assert.equal(finish.status, "PARTIAL");
  assert.equal(finish.errorSummary, "1 error(es) durante la ejecución");
  assert.deepEqual(
    finish.counters,
    countersOf({ candidatesFound: 2, processed: 1, errors: 1 }),
  );
  assert.equal(fake.upserts.length, 2);
  assert.equal(at(fake.upserts, 0).status, "DISCOVERED");
  const failed = at(fake.upserts, 1);
  assert.equal(failed.status, "FAILED");
  assert.equal(failed.normalizedData, null);
  assert.equal(failed.payloadChecksum, payloadChecksum(at(items, 1).raw));
  const error = at(fake.errors, 0);
  assert.equal(fake.errors.length, 1);
  assert.equal(error.candidateId, "candidate-2");
  assert.equal(error.errorCode, "INVALID_EXTERNAL_PAYLOAD");
  assert.equal(error.details?.["adapterId"], "tvmaze_metadata");
});

test("executeRun registra error de run cuando el ítem no tiene identidad estable", async () => {
  const fake = createFakeRepo();
  const items = [validItem({ provider: "", externalId: "" })];
  await executeRun("run-6", {
    repo: fake.repo,
    resolveAdapter: () => adapterOf(items),
  });

  const finish = at(fake.finishes, 0);
  assert.equal(finish.status, "FAILED");
  assert.match(finish.errorSummary ?? "", /provider/);
  assert.deepEqual(
    finish.counters,
    countersOf({ candidatesFound: 1, errors: 1 }),
  );
  assert.equal(fake.upserts.length, 0, "sin identidad no hay fila posible");
  assert.equal(fake.errors.length, 1);
  const error = at(fake.errors, 0);
  assert.equal(error.candidateId, null);
  assert.equal(error.errorCode, "INVALID_EXTERNAL_PAYLOAD");
});

function expectInvalidArgument(body: unknown): void {
  assert.throws(() => parseRunRequest(body), (error: unknown) => {
    assert.ok(error instanceof DiscoveryError);
    assert.equal(error.code, "INVALID_ARGUMENT");
    return true;
  });
}

test("parseRunRequest acepta el contrato de Fase C y rechaza basura", () => {
  assert.deepEqual(
    parseRunRequest({
      adapterId: "manual_import",
      query: '[{"title":"A","externalId":1}]',
    }),
    {
      adapterId: "manual_import",
      mode: "FULL",
      query: '[{"title":"A","externalId":1}]',
      maxItems: null,
    },
  );
  assert.deepEqual(
    parseRunRequest({
      adapterId: " tvmaze_metadata ",
      mode: "FULL",
      query: "",
      maxItems: 10,
    }),
    { adapterId: "tvmaze_metadata", mode: "FULL", query: null, maxItems: 10 },
  );

  expectInvalidArgument("texto");
  expectInvalidArgument([]);
  expectInvalidArgument({});
  expectInvalidArgument({ adapterId: "" });
  expectInvalidArgument({ adapterId: 42 });
  expectInvalidArgument({ adapterId: "x", mode: "INCREMENTAL" });
  expectInvalidArgument({ adapterId: "x", query: 42 });
  expectInvalidArgument({ adapterId: "x", query: "y".repeat(100_001) });
  expectInvalidArgument({ adapterId: "x", maxItems: 0 });
  expectInvalidArgument({ adapterId: "x", maxItems: 251 });
  expectInvalidArgument({ adapterId: "x", maxItems: 1.5 });
  expectInvalidArgument({ adapterId: "x", unexpected: true });
});

test("parseRunListParams pagina con tope de §8.48", () => {
  assert.deepEqual(parseRunListParams(undefined, undefined), {
    page: 1,
    limit: 20,
  });
  assert.deepEqual(parseRunListParams("3", "50"), { page: 3, limit: 50 });

  for (const page of ["0", "abc", "-1"]) {
    assert.throws(
      () => parseRunListParams(page, undefined),
      (error: unknown) => {
        assert.ok(error instanceof DiscoveryError);
        assert.equal(error.code, "INVALID_ARGUMENT");
        return true;
      },
    );
  }
  for (const limit of ["51", "x", "0"]) {
    assert.throws(
      () => parseRunListParams(undefined, limit),
      (error: unknown) => {
        assert.ok(error instanceof DiscoveryError);
        assert.equal(error.code, "INVALID_ARGUMENT");
        return true;
      },
    );
  }
});
