import { eq } from "drizzle-orm";
import { db, schema } from "../db";

export const FEATURED_LIMIT = 20;

export function findFeaturedMedia(limit: number = FEATURED_LIMIT) {
  return db
    .select()
    .from(schema.mediaItems)
    .orderBy(schema.mediaItems.createdAt)
    .limit(limit);
}

export function findMediaById(mediaId: string) {
  return db.query.mediaItems.findFirst({
    where: eq(schema.mediaItems.id, mediaId),
  });
}
