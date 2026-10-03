import { and, count, desc, eq } from "drizzle-orm";
import { db, schema } from "../db";

export const FEATURED_LIMIT = 20;

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
