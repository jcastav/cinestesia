import { and, eq } from "drizzle-orm";
import { client, db, schema } from "./index";

const seedMovie = {
  slug: "big-buck-bunny",
  mediaType: "MOVIE" as const,
  canonicalTitle: "Big Buck Bunny",
  originalTitle: "Big Buck Bunny",
  synopsis:
    "Un conejo gigante y amable se enfrenta a tres roedores molestos en el bosque.",
  releaseDate: "2008-05-21",
  releaseYear: 2008,
  runtimeSeconds: 596,
  publicationStatus: "PUBLISHED" as const,
  productionStatus: "ENDED",
  posterUrl: null,
  backdropUrl: null,
};

const seedMoviePlaybackUrl =
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

const seedSeries = {
  slug: "serie-de-prueba",
  mediaType: "SERIES" as const,
  canonicalTitle: "Serie de Prueba",
  synopsis:
    "Serie de prueba del catálogo: una temporada con tres episodios y sin Source reproducible todavía.",
  releaseYear: 2024,
  publicationStatus: "PUBLISHED" as const,
  productionStatus: "ONGOING",
};

const seedGenres = [
  { slug: "animation", name: "Animation" },
  { slug: "comedy", name: "Comedy" },
  { slug: "short", name: "Short" },
  { slug: "drama", name: "Drama" },
];

const seedSeriesEpisodes = [
  { episodeNumber: 1, title: "Episodio 1", durationSeconds: 1500 },
  { episodeNumber: 2, title: "Episodio 2", durationSeconds: 1620 },
  { episodeNumber: 3, title: "Episodio 3", durationSeconds: 1740 },
];

/**
 * Registry de Discovery Adapters (§6.44 §67). TVMaze decidido para v0.3
 * (REST + JSON + ids externos + rate limit claro, sin auth); Wikidata → v0.4.
 */
const seedDiscoveryAdapters = [
  {
    adapterKey: "tvmaze_metadata",
    name: "TVMaze Metadata API",
    version: "1.0.0",
    provider: "tvmaze",
    enabled: true,
    capabilities: ["CONTENT_DISCOVERY", "REQUIRES_QUERY"],
    configuration: {
      baseUrl: "https://api.tvmaze.com",
      timeoutMs: 10000,
      maxItems: 20,
      requestsPerSecond: 5,
    },
  },
  {
    adapterKey: "manual_import",
    name: "Manual Import Adapter",
    version: "1.0.0",
    provider: "manual",
    enabled: true,
    capabilities: ["CONTENT_DISCOVERY", "REQUIRES_QUERY"],
    configuration: {},
  },
];

async function upsertMedia(
  values: typeof seedMovie | typeof seedSeries,
): Promise<{ id: string; slug: string }> {
  const [row] = await db
    .insert(schema.mediaItems)
    .values(values)
    .onConflictDoUpdate({
      target: schema.mediaItems.slug,
      set: { ...values, updatedAt: new Date() },
    })
    .returning();

  if (!row) {
    throw new Error(`No se pudo crear el media_item ${values.slug}`);
  }

  return row;
}

async function upsertGenre(values: { slug: string; name: string }) {
  const [row] = await db
    .insert(schema.genres)
    .values(values)
    .onConflictDoUpdate({
      target: schema.genres.slug,
      set: { name: values.name },
    })
    .returning();

  if (!row) {
    throw new Error(`No se pudo crear el género ${values.slug}`);
  }

  return row;
}

async function linkGenre(mediaId: string, genreId: string): Promise<void> {
  const existing = await db.query.mediaGenres.findFirst({
    where: and(
      eq(schema.mediaGenres.mediaItemId, mediaId),
      eq(schema.mediaGenres.genreId, genreId),
    ),
  });

  if (!existing) {
    await db
      .insert(schema.mediaGenres)
      .values({ mediaItemId: mediaId, genreId })
      .onConflictDoNothing();
  }
}

async function ensureExternalId(
  mediaId: string,
  values: { namespace: string; externalId: string },
): Promise<void> {
  const existing = await db.query.mediaExternalIds.findFirst({
    where: and(
      eq(schema.mediaExternalIds.namespace, values.namespace),
      eq(schema.mediaExternalIds.externalId, values.externalId),
    ),
  });

  if (!existing) {
    await db
      .insert(schema.mediaExternalIds)
      .values({ mediaItemId: mediaId, ...values })
      .onConflictDoNothing();
  }
}

async function upsertDiscoveryAdapter(
  values: (typeof seedDiscoveryAdapters)[number],
): Promise<void> {
  const [row] = await db
    .insert(schema.discoveryAdapters)
    .values(values)
    .onConflictDoUpdate({
      target: schema.discoveryAdapters.adapterKey,
      set: { ...values, updatedAt: new Date() },
    })
    .returning();

  if (!row) {
    throw new Error(`No se pudo crear el adapter ${values.adapterKey}`);
  }
}

async function main(): Promise<void> {
  const genreRows: Record<string, string> = {};
  for (const genre of seedGenres) {
    const row = await upsertGenre(genre);
    genreRows[genre.slug] = row.id;
  }

  const movie = await upsertMedia(seedMovie);
  const series = await upsertMedia(seedSeries);

  for (const slug of ["animation", "comedy", "short"]) {
    await linkGenre(movie.id, genreRows[slug]!);
  }
  await linkGenre(series.id, genreRows["drama"]!);

  await ensureExternalId(movie.id, {
    namespace: "demo",
    externalId: "big-buck-bunny",
  });
  await ensureExternalId(series.id, {
    namespace: "demo",
    externalId: "serie-de-prueba",
  });

  for (const adapter of seedDiscoveryAdapters) {
    await upsertDiscoveryAdapter(adapter);
  }

  const existingSource = await db.query.sources.findFirst({
    where: eq(schema.sources.mediaItemId, movie.id),
  });

  if (!existingSource) {
    await db.insert(schema.sources).values({
      mediaItemId: movie.id,
      playbackUrl: seedMoviePlaybackUrl,
    });
  }

  const [season] = await db
    .insert(schema.seasons)
    .values({
      mediaItemId: series.id,
      seasonNumber: 1,
      title: "Temporada 1",
      synopsis: "Primera temporada de la serie de prueba.",
    })
    .onConflictDoUpdate({
      target: [schema.seasons.mediaItemId, schema.seasons.seasonNumber],
      set: { updatedAt: new Date() },
    })
    .returning();

  if (!season) {
    throw new Error("No se pudo crear la temporada de prueba");
  }

  for (const episode of seedSeriesEpisodes) {
    await db
      .insert(schema.episodes)
      .values({
        mediaItemId: series.id,
        seasonId: season.id,
        episodeNumber: episode.episodeNumber,
        title: episode.title,
        synopsis: `${episode.title} de la serie de prueba.`,
        durationSeconds: episode.durationSeconds,
        publicationStatus: "PUBLISHED",
      })
      .onConflictDoUpdate({
        target: [schema.episodes.seasonId, schema.episodes.episodeNumber],
        set: { updatedAt: new Date() },
      });
  }

  console.log(
    `Seed OK: movie id=${movie.id} slug=${movie.slug}; series id=${series.id} slug=${series.slug}; genres=${seedGenres.length}; seasons=1; episodes=${seedSeriesEpisodes.length}; discoveryAdapters=${seedDiscoveryAdapters.length}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("Seed falló:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
