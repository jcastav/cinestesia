import { client, db, schema } from "./index";

async function main(): Promise<void> {
  const media = await db.select().from(schema.mediaItems);
  const sources = await db.select().from(schema.sources);

  console.log(
    JSON.stringify(
      {
        mediaItems: media.length,
        sources: sources.length,
        sample: media[0] ?? null,
        playbackUrl: sources[0]?.playbackUrl ?? null,
      },
      null,
      2,
    ),
  );

  if (media.length === 0 || sources.length === 0) {
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
