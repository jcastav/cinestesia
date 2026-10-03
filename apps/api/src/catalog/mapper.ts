import type { MediaDetail, MediaSummary } from "@cinestesia/shared";
import type { MediaItemRow } from "../db/schema";

export function toMediaSummary(row: MediaItemRow): MediaSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.canonicalTitle,
    type: row.mediaType as MediaSummary["type"],
    releaseYear: row.releaseYear,
  };
}

export function toMediaDetail(row: MediaItemRow): MediaDetail {
  return {
    ...toMediaSummary(row),
    synopsis: row.synopsis,
  };
}
