import assert from "node:assert/strict";
import { test } from "node:test";
import { toMediaDetail, toMediaSummary } from "../src/catalog/mapper";
import { CatalogError } from "../src/catalog/errors";
import type { SeasonWithCount } from "../src/catalog/mapper";
import {
  MAX_LIMIT,
  parsePageParams,
} from "../src/catalog/pagination";
import type { MediaItemRow } from "../src/db/schema";
import { UUID_PATTERN } from "../src/lib/uuid";

const baseRow: MediaItemRow = {
  id: "cf88bb8a-45f6-4c17-919d-18186294e3e8",
  slug: "big-buck-bunny",
  mediaType: "MOVIE",
  canonicalTitle: "Big Buck Bunny",
  originalTitle: "Big Buck Bunny",
  synopsis: "Un conejo gigante y amable.",
  releaseDate: "2008-05-21",
  releaseYear: 2008,
  runtimeSeconds: 596,
  publicationStatus: "PUBLISHED",
  productionStatus: "ENDED",
  posterUrl: "https://example.test/poster.jpg",
  backdropUrl: null,
  version: 1,
  createdAt: new Date("2026-10-02T00:00:00Z"),
  updatedAt: new Date("2026-10-03T00:00:00Z"),
};

const baseSeason: SeasonWithCount = {
  id: "11111111-2222-3333-4444-555555555555",
  mediaItemId: baseRow.id,
  seasonNumber: 1,
  title: "Temporada 1",
  synopsis: null,
  releaseDate: null,
  createdAt: new Date("2026-10-02T00:00:00Z"),
  updatedAt: new Date("2026-10-02T00:00:00Z"),
  episodesCount: 3,
};

function expectInvalidArgument(fn: () => unknown): void {
  assert.throws(fn, (error: unknown) => {
    assert.ok(error instanceof CatalogError);
    assert.equal(error.code, "INVALID_ARGUMENT");
    return true;
  });
}

test("parsePageParams aplica defaults (page=1, limit=20)", () => {
  assert.deepEqual(parsePageParams(undefined, undefined), {
    page: 1,
    limit: 20,
  });
  assert.deepEqual(parsePageParams("", ""), { page: 1, limit: 20 });
});

test("parsePageParams acepta valores válidos hasta MAX_LIMIT", () => {
  assert.deepEqual(parsePageParams("3", "50"), { page: 3, limit: 50 });
  assert.equal(MAX_LIMIT, 50);
});

test("parsePageParams rechaza parámetros inválidos con INVALID_ARGUMENT", () => {
  expectInvalidArgument(() => parsePageParams("0", undefined));
  expectInvalidArgument(() => parsePageParams(undefined, "0"));
  expectInvalidArgument(() => parsePageParams("-1", undefined));
  expectInvalidArgument(() => parsePageParams("abc", undefined));
  expectInvalidArgument(() => parsePageParams("1.5", undefined));
  expectInvalidArgument(() => parsePageParams(undefined, "51"));
  expectInvalidArgument(() => parsePageParams(undefined, "-20"));
});

test("UUID_PATTERN distingue identificadores", () => {
  assert.ok(UUID_PATTERN.test("cf88bb8a-45f6-4c17-919d-18186294e3e8"));
  assert.ok(!UUID_PATTERN.test("big-buck-bunny"));
  assert.ok(!UUID_PATTERN.test(""));
  assert.ok(!UUID_PATTERN.test("no es un id"));
});

test("CatalogError conserva código y mensaje", () => {
  const error = new CatalogError("MEDIA_NOT_FOUND", "No existe");
  assert.ok(error instanceof Error);
  assert.equal(error.code, "MEDIA_NOT_FOUND");
  assert.equal(error.message, "No existe");
});

test("toMediaSummary expone artwork y no campos internos", () => {
  const summary = toMediaSummary(baseRow);

  assert.deepEqual(summary, {
    id: baseRow.id,
    slug: baseRow.slug,
    title: baseRow.canonicalTitle,
    type: "MOVIE",
    posterUrl: baseRow.posterUrl,
    backdropUrl: baseRow.backdropUrl,
    releaseYear: baseRow.releaseYear,
  });
  assert.ok(!("publicationStatus" in summary));
  assert.ok(!("canonicalTitle" in summary));
});

test("toMediaDetail incluye estado, identificadores y temporadas", () => {
  const detail = toMediaDetail(baseRow, ["Animation"], [baseSeason]);

  assert.equal(detail.status, "PUBLISHED");
  assert.equal(detail.productionStatus, "ENDED");
  assert.deepEqual(detail.genres, ["Animation"]);
  assert.deepEqual(detail.seasons, [
    {
      id: baseSeason.id,
      number: 1,
      title: "Temporada 1",
      episodesCount: 3,
    },
  ]);
  assert.equal(detail.originalTitle, baseRow.originalTitle);
  assert.equal(detail.releaseDate, baseRow.releaseDate);
  assert.equal(detail.runtimeSeconds, baseRow.runtimeSeconds);
  // El catálogo nunca debe reflejar información de reproducción (§8.12/§8.13).
  assert.ok(!("playbackUrl" in detail));
  assert.ok(!("sourceId" in detail));
});
