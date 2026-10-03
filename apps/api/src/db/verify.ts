import { client, db, schema } from "./index";

async function main(): Promise<void> {
  const media = await db.select().from(schema.mediaItems);
  const sources = await db.select().from(schema.sources);
  const genres = await db.select().from(schema.genres);
  const mediaGenres = await db.select().from(schema.mediaGenres);
  const externalIds = await db.select().from(schema.mediaExternalIds);
  const seasons = await db.select().from(schema.seasons);
  const episodes = await db.select().from(schema.episodes);
  const discoveryAdapters = await db
    .select()
    .from(schema.discoveryAdapters);
  const discoveryRuns = await db.select().from(schema.discoveryRuns);
  const discoveryCandidates = await db
    .select()
    .from(schema.discoveryCandidates);
  const ingestionJobs = await db.select().from(schema.ingestionJobs);
  const ingestionErrors = await db.select().from(schema.ingestionErrors);

  const published = media.filter(
    (row) => row.publicationStatus === "PUBLISHED",
  );

  console.log(
    JSON.stringify(
      {
        mediaItems: media.length,
        published: published.length,
        sources: sources.length,
        genres: genres.length,
        mediaGenres: mediaGenres.length,
        externalIds: externalIds.length,
        seasons: seasons.length,
        episodes: episodes.length,
        discoveryAdapters: discoveryAdapters.length,
        discoveryRuns: discoveryRuns.length,
        discoveryCandidates: discoveryCandidates.length,
        ingestionJobs: ingestionJobs.length,
        ingestionErrors: ingestionErrors.length,
        sample: media[0] ?? null,
        playbackUrl: sources[0]?.playbackUrl ?? null,
      },
      null,
      2,
    ),
  );

  if (
    media.length === 0 ||
    sources.length === 0 ||
    genres.length === 0 ||
    seasons.length === 0 ||
    episodes.length === 0 ||
    discoveryAdapters.length < 2
  ) {
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    console.error("Verificación falló:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
