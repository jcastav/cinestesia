import { eq } from "drizzle-orm";
import { client, db, schema } from "./index";

const seedMedia = {
  slug: "big-buck-bunny",
  mediaType: "MOVIE" as const,
  canonicalTitle: "Big Buck Bunny",
  synopsis:
    "Un conejo gigante y amable se enfrenta a tres roedores molestos en el bosque.",
  releaseYear: 2008,
};

const seedPlaybackUrl = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

async function main(): Promise<void> {
  const [media] = await db
    .insert(schema.mediaItems)
    .values(seedMedia)
    .onConflictDoUpdate({
      target: schema.mediaItems.slug,
      set: { ...seedMedia, updatedAt: new Date() },
    })
    .returning();

  if (!media) {
    throw new Error("No se pudo crear el media_item de prueba");
  }

  const existingSource = await db.query.sources.findFirst({
    where: eq(schema.sources.mediaItemId, media.id),
  });

  if (!existingSource) {
    await db.insert(schema.sources).values({
      mediaItemId: media.id,
      playbackUrl: seedPlaybackUrl,
    });
  }

  console.log(`Seed OK: media_item id=${media.id} slug=${media.slug}`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed falló:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
