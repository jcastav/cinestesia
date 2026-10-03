import { and, count, desc, eq } from "drizzle-orm";
import { db, schema } from "../db";
import type {
  AdminExternalIdInput,
  AdminGenreInput,
} from "./validation";

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const FEATURED_LIMIT = 20;

export function runTransaction<T>(
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(fn);
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

export function findFeaturedMedia(limit: number = FEATURED_LIMIT) {
  return db
    .select()
    .from(schema.mediaItems)
    .where(eq(schema.mediaItems.publicationStatus, "PUBLISHED"))
    .orderBy(schema.mediaItems.createdAt)
    .limit(limit);
}

export function findMediaById(mediaId: string) {
  return db.query.mediaItems.findFirst({
    where: eq(schema.mediaItems.id, mediaId),
  });
}

export function findMediaBySlug(slug: string) {
  return db.query.mediaItems.findFirst({
    where: eq(schema.mediaItems.slug, slug),
  });
}

export async function listPublishedMedia(page: number, limit: number) {
  const where = eq(schema.mediaItems.publicationStatus, "PUBLISHED");

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(schema.mediaItems)
      .where(where)
      .orderBy(
        desc(schema.mediaItems.createdAt),
        desc(schema.mediaItems.id),
      )
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ value: count() }).from(schema.mediaItems).where(where),
  ]);

  return { rows, total: totalRows[0]?.value ?? 0 };
}

export async function findGenreNamesForMedia(mediaId: string) {
  const rows = await db
    .select({ name: schema.genres.name })
    .from(schema.mediaGenres)
    .innerJoin(schema.genres, eq(schema.mediaGenres.genreId, schema.genres.id))
    .where(eq(schema.mediaGenres.mediaItemId, mediaId))
    .orderBy(schema.genres.name);

  return rows.map((row) => row.name);
}

export async function findSeasonsForMedia(mediaId: string) {
  const [seasonRows, episodeCounts] = await Promise.all([
    db
      .select()
      .from(schema.seasons)
      .where(eq(schema.seasons.mediaItemId, mediaId))
      .orderBy(schema.seasons.seasonNumber),
    db
      .select({
        seasonId: schema.episodes.seasonId,
        value: count(),
      })
      .from(schema.episodes)
      .where(
        and(
          eq(schema.episodes.mediaItemId, mediaId),
          eq(schema.episodes.publicationStatus, "PUBLISHED"),
        ),
      )
      .groupBy(schema.episodes.seasonId),
  ]);

  const countBySeason = new Map(
    episodeCounts.map((row) => [row.seasonId, row.value]),
  );

  return seasonRows.map((row) => ({
    ...row,
    episodesCount: countBySeason.get(row.id) ?? 0,
  }));
}

export function findSeason(mediaId: string, seasonNumber: number) {
  return db.query.seasons.findFirst({
    where: and(
      eq(schema.seasons.mediaItemId, mediaId),
      eq(schema.seasons.seasonNumber, seasonNumber),
    ),
  });
}

export function findPublishedEpisodesForSeason(seasonId: string) {
  return db.query.episodes.findMany({
    where: and(
      eq(schema.episodes.seasonId, seasonId),
      eq(schema.episodes.publicationStatus, "PUBLISHED"),
    ),
    orderBy: schema.episodes.episodeNumber,
  });
}

export function findMediaByIdWithin(tx: Transaction, mediaId: string) {
  return tx.query.mediaItems.findFirst({
    where: eq(schema.mediaItems.id, mediaId),
  });
}

export function findMediaBySlugWithin(tx: Transaction, slug: string) {
  return tx.query.mediaItems.findFirst({
    where: eq(schema.mediaItems.slug, slug),
  });
}

export function findExternalIdWithin(
  tx: Transaction,
  namespace: string,
  externalId: string,
) {
  return tx.query.mediaExternalIds.findFirst({
    where: and(
      eq(schema.mediaExternalIds.namespace, namespace),
      eq(schema.mediaExternalIds.externalId, externalId),
    ),
  });
}

export async function insertMedia(
  tx: Transaction,
  values: typeof schema.mediaItems.$inferInsert,
) {
  const [row] = await tx
    .insert(schema.mediaItems)
    .values(values)
    .returning();

  if (!row) {
    throw new Error("No se pudo crear el media_item");
  }

  return row;
}

export async function updateMedia(
  tx: Transaction,
  mediaId: string,
  values: Partial<typeof schema.mediaItems.$inferInsert>,
) {
  const [row] = await tx
    .update(schema.mediaItems)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(schema.mediaItems.id, mediaId))
    .returning();

  if (!row) {
    throw new Error(`No se pudo actualizar el media_item ${mediaId}`);
  }

  return row;
}

export async function replaceGenres(
  tx: Transaction,
  mediaId: string,
  genreList: AdminGenreInput[],
): Promise<void> {
  await tx
    .delete(schema.mediaGenres)
    .where(eq(schema.mediaGenres.mediaItemId, mediaId));

  for (const genre of genreList) {
    const [row] = await tx
      .insert(schema.genres)
      .values({ slug: genre.slug, name: genre.name })
      .onConflictDoUpdate({
        target: schema.genres.slug,
        set: { name: genre.name },
      })
      .returning();

    if (!row) {
      throw new Error(`No se pudo crear el género ${genre.slug}`);
    }

    await tx
      .insert(schema.mediaGenres)
      .values({ mediaItemId: mediaId, genreId: row.id })
      .onConflictDoNothing();
  }
}

export async function replaceExternalIds(
  tx: Transaction,
  mediaId: string,
  externalIds: AdminExternalIdInput[],
): Promise<void> {
  await tx
    .delete(schema.mediaExternalIds)
    .where(eq(schema.mediaExternalIds.mediaItemId, mediaId));

  if (externalIds.length > 0) {
    await tx
      .insert(schema.mediaExternalIds)
      .values(
        externalIds.map((item) => ({
          mediaItemId: mediaId,
          ...item,
        })),
      );
  }
}
