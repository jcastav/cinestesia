import type {
  EpisodeItem,
  MediaDetail,
  MediaSummary,
  ProductionStatus,
  PublicationStatus,
  SeasonEpisodes,
  SeasonSummary,
} from "@cinestesia/shared";
import type { EpisodeRow, MediaItemRow, SeasonRow } from "../db/schema";

export type SeasonWithCount = SeasonRow & { episodesCount: number };

export function toMediaSummary(row: MediaItemRow): MediaSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.canonicalTitle,
    type: row.mediaType as MediaSummary["type"],
    posterUrl: row.posterUrl,
    backdropUrl: row.backdropUrl,
    releaseYear: row.releaseYear,
  };
}

export function toSeasonSummary(season: SeasonWithCount): SeasonSummary {
  return {
    id: season.id,
    number: season.seasonNumber,
    title: season.title,
    episodesCount: season.episodesCount,
  };
}

export function toMediaDetail(
  row: MediaItemRow,
  genres: string[],
  seasons: SeasonWithCount[],
): MediaDetail {
  return {
    ...toMediaSummary(row),
    synopsis: row.synopsis,
    originalTitle: row.originalTitle,
    releaseDate: row.releaseDate,
    runtimeSeconds: row.runtimeSeconds,
    status: row.publicationStatus as PublicationStatus,
    productionStatus: row.productionStatus as ProductionStatus | null,
    genres,
    seasons: seasons.map(toSeasonSummary),
  };
}

function toEpisodeItem(row: EpisodeRow): EpisodeItem {
  return {
    id: row.id,
    number: row.episodeNumber,
    title: row.title,
    thumbnailUrl: row.thumbnailUrl,
    durationSeconds: row.durationSeconds,
    airDate: row.releaseDate,
  };
}

export function toSeasonEpisodes(
  season: SeasonRow,
  episodes: EpisodeRow[],
): SeasonEpisodes {
  return {
    season: {
      id: season.id,
      number: season.seasonNumber,
      title: season.title,
    },
    episodes: episodes.map(toEpisodeItem),
  };
}
