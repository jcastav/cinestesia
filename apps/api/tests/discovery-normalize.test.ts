import assert from "node:assert/strict";
import { test } from "node:test";
import { DiscoveryError } from "../src/discovery/errors";
import type { DiscoveredItemInput } from "../src/discovery/normalize";
import { normalizeContent, slugify } from "../src/discovery/normalize";
import { buildProvenance, payloadChecksum } from "../src/discovery/provenance";

function expectInvalidArgument(fn: () => unknown): void {
  assert.throws(fn, (error: unknown) => {
    assert.ok(error instanceof DiscoveryError);
    assert.equal(error.code, "INVALID_ARGUMENT");
    return true;
  });
}

const baseInput: DiscoveredItemInput = {
  provider: "tvmaze",
  externalId: "169",
  raw: { id: 169, name: "Breaking Bad" },
  title: "Breaking Bad",
  originalTitle: "Breaking Bad",
  type: "Series",
  releaseYear: 2008,
  releaseDate: "2008-01-20",
  runtimeSeconds: 2940,
  synopsis: "Un profesor de química con cáncer se dedica al metanfetamina.",
  posterUrl: "https://example.test/poster.jpg",
  backdropUrl: null,
  externalIds: [
    {
      namespace: "tvmaze",
      externalId: "169",
      externalUrl: "https://www.tvmaze.com/shows/169/breaking-bad",
    },
  ],
};

test("slugify elimina acentos, signos y colapsa separadores", () => {
  assert.equal(slugify("¡Büeno, ¿qué tal?"), "bueno-que-tal");
  assert.equal(slugify("  The   Wire  "), "the-wire");
  assert.equal(slugify("Amélie"), "amelie");
  assert.equal(slugify("7 Monkeys!"), "7-monkeys");
});

test("normalizeContent normaliza una entrada válida sin issues", () => {
  const result = normalizeContent(baseInput);
  assert.deepEqual(result, {
    provider: "tvmaze",
    externalId: "169",
    title: "Breaking Bad",
    originalTitle: "Breaking Bad",
    mediaType: "SERIES",
    releaseYear: 2008,
    releaseDate: "2008-01-20",
    runtimeSeconds: 2940,
    synopsis:
      "Un profesor de química con cáncer se dedica al metanfetamina.",
    posterUrl: "https://example.test/poster.jpg",
    backdropUrl: null,
    externalIds: [
      {
        namespace: "tvmaze",
        externalId: "169",
        externalUrl: "https://www.tvmaze.com/shows/169/breaking-bad",
      },
    ],
    slugBase: "breaking-bad",
    issues: [],
  });
});

test("normalizeContent mapea tipos conocidos y degrada a OTHER con issue", () => {
  assert.equal(
    normalizeContent({ ...baseInput, type: "movie" }).mediaType,
    "MOVIE",
  );
  assert.equal(
    normalizeContent({ ...baseInput, type: "TV Show" }).mediaType,
    "SERIES",
  );
  assert.equal(
    normalizeContent({ ...baseInput, type: "Documental" }).mediaType,
    "DOCUMENTARY",
  );

  const unknown = normalizeContent({ ...baseInput, type: "videogame" });
  assert.equal(unknown.mediaType, "OTHER");
  assert.ok(unknown.issues.some((issue) => issue.includes("type desconocido")));

  const missing = normalizeContent({ ...baseInput, type: null });
  assert.equal(missing.mediaType, "OTHER");
  assert.ok(missing.issues.some((issue) => issue.includes("type ausente")));
});

test("normalizeContent descarta año inválido, deriva de releaseDate y detecta desajuste", () => {
  const invalidYear = normalizeContent({
    ...baseInput,
    releaseYear: 12000,
  });
  assert.equal(invalidYear.releaseYear, 2008);
  assert.ok(
    invalidYear.issues.some((issue) => issue.includes("releaseYear inválido")),
  );

  const invalidYearNoDate = normalizeContent({
    ...baseInput,
    releaseYear: 12000,
    releaseDate: null,
  });
  assert.equal(invalidYearNoDate.releaseYear, null);

  const derived = normalizeContent({
    ...baseInput,
    releaseYear: null,
    releaseDate: "2014-11-12",
  });
  assert.equal(derived.releaseYear, 2014);

  const badDate = normalizeContent({ ...baseInput, releaseDate: "ayer" });
  assert.equal(badDate.releaseDate, null);
  assert.ok(
    badDate.issues.some((issue) => issue.includes("releaseDate inválida")),
  );

  const mismatch = normalizeContent({ ...baseInput, releaseYear: 2010 });
  assert.equal(mismatch.releaseYear, 2010);
  assert.ok(
    mismatch.issues.some((issue) => issue.includes("no coincide con")),
  );
});

test("normalizeContent descarta runtime y URLs inválidos con issue", () => {
  const result = normalizeContent({
    ...baseInput,
    runtimeSeconds: -5,
    posterUrl: "ftp://example.test/poster.jpg",
    backdropUrl: "javascript:alert(1)",
  });
  assert.equal(result.runtimeSeconds, null);
  assert.equal(result.posterUrl, null);
  assert.equal(result.backdropUrl, null);
  assert.equal(result.issues.length, 3);
});

test("normalizeContent depura externalIds duplicados, malformados y con URL inválida", () => {
  const result = normalizeContent({
    ...baseInput,
    externalIds: [
      {
        namespace: "tvmaze",
        externalId: "169",
        externalUrl: "https://example.test/1",
      },
      {
        namespace: "tvmaze",
        externalId: "169",
        externalUrl: "https://example.test/2",
      },
      { namespace: "", externalId: "x" },
      { namespace: "imdb", externalId: "tt0903747", externalUrl: "no-url" },
    ],
  });
  assert.deepEqual(result.externalIds, [
    {
      namespace: "tvmaze",
      externalId: "169",
      externalUrl: "https://example.test/1",
    },
    { namespace: "imdb", externalId: "tt0903747", externalUrl: null },
  ]);
  assert.ok(
    result.issues.some((issue) => issue.includes("duplicado descartado")),
  );
  assert.ok(
    result.issues.some((issue) => issue.includes("externalId inválido")),
  );
  assert.ok(result.issues.some((issue) => issue.includes("externalUrl inválida")));
});

test("normalizeContent lanza INVALID_ARGUMENT ante identidad o payload inválidos", () => {
  expectInvalidArgument(() =>
    normalizeContent({ ...baseInput, provider: "   " }),
  );
  expectInvalidArgument(() =>
    normalizeContent({ ...baseInput, externalId: "" }),
  );
  expectInvalidArgument(() => normalizeContent({ ...baseInput, title: "   " }));
  expectInvalidArgument(() => normalizeContent({ ...baseInput, title: "!!!" }));
  expectInvalidArgument(() =>
    normalizeContent({
      ...baseInput,
      provider: 42,
    } as unknown as DiscoveredItemInput),
  );
  expectInvalidArgument(() =>
    normalizeContent({
      ...baseInput,
      title: 42,
    } as unknown as DiscoveredItemInput),
  );
  expectInvalidArgument(() =>
    normalizeContent({
      ...baseInput,
      raw: undefined,
    } as unknown as DiscoveredItemInput),
  );
  expectInvalidArgument(() =>
    normalizeContent({
      ...baseInput,
      raw: "texto",
    } as unknown as DiscoveredItemInput),
  );
  expectInvalidArgument(() =>
    normalizeContent({
      ...baseInput,
      raw: [1, 2],
    } as unknown as DiscoveredItemInput),
  );
});

test("normalizeContent trunca title/synopsis/slug largos y lo registra en issues", () => {
  const result = normalizeContent({
    ...baseInput,
    title: "A".repeat(520),
    synopsis: "B".repeat(5100),
  });
  assert.equal(result.title.length, 500);
  assert.equal(result.synopsis?.length, 5000);
  assert.equal(result.slugBase.length, 100);
  assert.ok(result.issues.some((issue) => issue.includes("title excede")));
  assert.ok(result.issues.some((issue) => issue.includes("synopsis excede")));
  assert.ok(result.issues.some((issue) => issue.includes("slugBase excede")));
});

test("payloadChecksum es estable ante distinto orden de claves y sensible al contenido", () => {
  const a = { id: 1, nested: { b: 2, a: 1 }, list: [1, 2] };
  const reordered = { list: [1, 2], nested: { a: 1, b: 2 }, id: 1 };
  const other = { id: 2, nested: { a: 1, b: 2 }, list: [1, 2] };

  assert.equal(payloadChecksum(a), payloadChecksum(reordered));
  assert.notEqual(payloadChecksum(a), payloadChecksum(other));
  assert.notEqual(
    payloadChecksum({ list: [1, 2] }),
    payloadChecksum({ list: [2, 1] }),
  );

  const checksum = payloadChecksum(a);
  assert.match(checksum, /^sha256:[0-9a-f]{64}$/);
  assert.ok(checksum.length <= 80);
  assert.match(payloadChecksum(undefined), /^sha256:/);
});

test("buildProvenance conserva los campos del contrato §11", () => {
  const raw = { id: 169, name: "Breaking Bad" };
  assert.deepEqual(
    buildProvenance({
      provider: "tvmaze",
      externalId: "169",
      adapterId: "tvmaze_metadata",
      adapterVersion: "1.0.0",
      runId: "3f6c0f6a-3f3f-4a5f-8f1e-9a5f5b9a1c11",
      discoveredAt: "2026-10-03T10:32:14.000Z",
      raw,
    }),
    {
      provider: "tvmaze",
      externalId: "169",
      adapterId: "tvmaze_metadata",
      adapterVersion: "1.0.0",
      runId: "3f6c0f6a-3f3f-4a5f-8f1e-9a5f5b9a1c11",
      discoveredAt: "2026-10-03T10:32:14.000Z",
      payloadChecksum: payloadChecksum(raw),
    },
  );
});
