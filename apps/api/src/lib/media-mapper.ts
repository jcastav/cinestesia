import type { MediaDetail, MediaSummary, SourceSummary } from "@cinestesia/shared";
import type { MediaItemRow, SourceRow } from "../db/schema";

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

export function toSourceSummary(row: SourceRow): SourceSummary {
  const isHls = row.playbackUrl.includes(".m3u8");
  return {
    id: row.id,
    availability: row.isActive ? "active" : "unavailable",
    protocols: isHls ? ["HLS"] : [],
  };
}

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
