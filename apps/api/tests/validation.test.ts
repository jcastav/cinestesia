import assert from "node:assert/strict";
import { test } from "node:test";
import { CatalogError } from "../src/catalog/errors";
import {
  SLUG_PATTERN,
  validateCreate,
  validatePatch,
} from "../src/catalog/validation";

const minimal = {
  slug: "obra-de-prueba",
  mediaType: "MOVIE",
  canonicalTitle: "Obra de Prueba",
};

function expectInvalid(fn: () => unknown, fragment?: string): void {
  assert.throws(fn, (error: unknown) => {
    assert.ok(error instanceof CatalogError);
    assert.equal(error.code, "INVALID_ARGUMENT");
    if (fragment) {
      assert.ok(
        error.message.includes(fragment),
        `mensaje «${error.message}» no contiene «${fragment}»`,
      );
    }
    return true;
  });
}

test("validateCreate: payload mínimo con defaults (DRAFT, sin genres)", () => {
  const result = validateCreate(minimal);

  assert.equal(result.values.slug, "obra-de-prueba");
  assert.equal(result.values.mediaType, "MOVIE");
  assert.equal(result.values.canonicalTitle, "Obra de Prueba");
  assert.equal(result.values.publicationStatus, "DRAFT");
  assert.deepEqual(result.genres, []);
  assert.deepEqual(result.externalIds, []);
});

test("validateCreate: payload completo normaliza y valida", () => {
  const result = validateCreate({
    ...minimal,
    originalTitle: "  Original  ",
    synopsis: "Sinopsis.",
    releaseDate: "2024-05-01",
    releaseYear: 2024,
    runtimeSeconds: 90,
    publicationStatus: "PUBLISHED",
    productionStatus: "ONGOING",
    posterUrl: "https://img.test/poster.jpg",
    backdropUrl: null,
    genres: ["sci-fi", "animation", "sci-fi"],
    externalIds: [
      { namespace: "demo", externalId: "obra-1" },
      { namespace: "imdb", externalId: "tt0000001", externalUrl: "https://imdb.test/x" },
    ],
  });

  assert.equal(result.values.originalTitle, "Original");
  assert.equal(result.values.releaseDate, "2024-05-01");
  assert.equal(result.values.publicationStatus, "PUBLISHED");
  assert.equal(result.values.backdropUrl, null);
  assert.deepEqual(result.genres, [
    { slug: "sci-fi", name: "Sci Fi" },
    { slug: "animation", name: "Animation" },
  ]);
  assert.equal(result.externalIds.length, 2);
  assert.equal(result.externalIds[0]?.namespace, "demo");
});

test("validateCreate: body no-objeto y campos desconocidos → 400", () => {
  expectInvalid(() => validateCreate(null));
  expectInvalid(() => validateCreate([minimal]));
  expectInvalid(() => validateCreate("texto"));
  expectInvalid(() => validateCreate({ ...minimal, streamUrl: "x" }), "desconocido");
});

test("validateCreate: campos obligatorios", () => {
  expectInvalid(() => validateCreate({}), "obligatorios");
  expectInvalid(() => validateCreate({ slug: "x", mediaType: "MOVIE" }), "obligatorios");
  expectInvalid(() => validateCreate({ ...minimal, canonicalTitle: "" }), "canonicalTitle");
});

test("validateCreate: enums en mayúsculas (§7.17, §7.20)", () => {
  expectInvalid(() => validateCreate({ ...minimal, mediaType: "FILM" }), "mediaType");
  expectInvalid(() => validateCreate({ ...minimal, mediaType: "movie" }), "mediaType");
  expectInvalid(() => validateCreate({ ...minimal, publicationStatus: "draft" }), "publicationStatus");
  expectInvalid(
    () => validateCreate({ ...minimal, productionStatus: "COMPLETED" }),
    "productionStatus",
  );
});

test("validateCreate: slug con formato inválido → 400", () => {
  expectInvalid(() => validateCreate({ ...minimal, slug: "Mi Obra" }), "slug");
  expectInvalid(() => validateCreate({ ...minimal, slug: "obra-final-" }), "slug");
  expectInvalid(() => validateCreate({ ...minimal, slug: "-obra" }), "slug");
  expectInvalid(() => validateCreate({ ...minimal, slug: "obra_final" }), "slug");
  assert.ok(SLUG_PATTERN.test("obra-2024-parte-1"));
});

test("validateCreate: fechas, años y runtimes inválidos → 400", () => {
  expectInvalid(() => validateCreate({ ...minimal, releaseDate: "01-05-2024" }), "releaseDate");
  expectInvalid(() => validateCreate({ ...minimal, releaseDate: "2024-13-01" }), "releaseDate");
  expectInvalid(() => validateCreate({ ...minimal, releaseDate: "2023-02-29" }), "releaseDate");
  expectInvalid(() => validateCreate({ ...minimal, releaseYear: 0 }), "releaseYear");
  expectInvalid(() => validateCreate({ ...minimal, releaseYear: 40000 }), "releaseYear");
  expectInvalid(() => validateCreate({ ...minimal, releaseYear: "2024" }), "releaseYear");
  expectInvalid(() => validateCreate({ ...minimal, runtimeSeconds: 0 }), "runtimeSeconds");
  expectInvalid(() => validateCreate({ ...minimal, runtimeSeconds: 1.5 }), "runtimeSeconds");
});

test("validateCreate: URLs no http(s) → 400", () => {
  expectInvalid(() => validateCreate({ ...minimal, posterUrl: "javascript:alert(1)" }), "posterUrl");
  expectInvalid(() => validateCreate({ ...minimal, posterUrl: "ftp://x/y.jpg" }), "posterUrl");
});

test("validateCreate: genres con formato inválido → 400", () => {
  expectInvalid(() => validateCreate({ ...minimal, genres: "action" }), "genres");
  expectInvalid(() => validateCreate({ ...minimal, genres: [""] }), "género");
  expectInvalid(() => validateCreate({ ...minimal, genres: ["Action"] }), "género");
  expectInvalid(() => validateCreate({ ...minimal, genres: [1] }), "slugs");
});

test("validateCreate: externalIds inválidos → 400", () => {
  expectInvalid(() => validateCreate({ ...minimal, externalIds: {} }), "externalIds");
  expectInvalid(
    () => validateCreate({ ...minimal, externalIds: [{ namespace: "demo" }] }),
    "namespace y externalId",
  );
  expectInvalid(
    () =>
      validateCreate({
        ...minimal,
        externalIds: [
          { namespace: "demo", externalId: "dup" },
          { namespace: "demo", externalId: "dup" },
        ],
      }),
    "duplicado",
  );
  expectInvalid(
    () =>
      validateCreate({
        ...minimal,
        externalIds: [{ namespace: "demo", externalId: "x", provider: "y" }],
      }),
    "desconocido",
  );
});

test("validatePatch: partials válidos", () => {
  const patch = validatePatch({ publicationStatus: "PUBLISHED" });
  assert.deepEqual(patch.values, { publicationStatus: "PUBLISHED" });

  const clear = validatePatch({ synopsis: null });
  assert.deepEqual(clear.values, { synopsis: null });

  const genres = validatePatch({ genres: ["drama"] });
  assert.deepEqual(genres.genres, [{ slug: "drama", name: "Drama" }]);
  assert.deepEqual(genres.values, {});

  const external = validatePatch({ externalIds: [] });
  assert.deepEqual(external.externalIds, []);
});

test("validatePatch: body vacío, campos desconocidos y enums inválidos → 400", () => {
  expectInvalid(() => validatePatch({}), "sin campos");
  expectInvalid(() => validatePatch({ noExiste: 1 }), "desconocido");
  expectInvalid(
    () => validatePatch({ publicationStatus: "PUBLISHED2" }),
    "publicationStatus",
  );
  expectInvalid(() => validatePatch({ slug: "Slug Malo" }), "slug");
  expectInvalid(() => validatePatch({ mediaType: null }), "mediaType");
  expectInvalid(() => validatePatch({ synopsis: 123 }), "synopsis");
});

test("validatePatch: un slug existente pasa la validación (el 409 es del servicio)", () => {
  // La validación es pura: detectar slug/externalId duplicados ocurre dentro
  // de la transacción del servicio (409 CONFLICT), no aquí.
  const patch = validatePatch({ slug: "big-buck-bunny" });
  assert.equal(patch.values.slug, "big-buck-bunny");
});
