export type MediaType =
  | "MOVIE"
  | "SERIES"
  | "DOCUMENTARY"
  | "SHORT"
  | "CONCERT"
  | "CLIP"
  | "SPECIAL"
  | "OTHER";

/** §7.19 — estado de publicación en nuestra plataforma. */
export type PublicationStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

/** §7.20 — estado de la obra original (dimensión distinta de publication_status). */
export type ProductionStatus = "UPCOMING" | "ONGOING" | "ENDED" | "UNKNOWN";

export interface MediaSummary {
  id: string;
  slug: string;
  title: string;
  type: MediaType;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  releaseYear?: number | null;
}

export interface MediaDetail extends MediaSummary {
  synopsis?: string | null;
  originalTitle?: string | null;
  releaseDate?: string | null;
  runtimeSeconds?: number | null;
  status?: PublicationStatus;
  productionStatus?: ProductionStatus | null;
  genres?: string[];
  seasons?: SeasonSummary[];
}

/** §8.13 — resumen de temporada embebido en el detalle. */
export interface SeasonSummary {
  id: string;
  number: number;
  title?: string | null;
  episodeCount: number;
}

/** §8.14 — episodios de una temporada (Playback Targets display-only en v0.2). */
export interface SeasonEpisodes {
  season: { id: string; number: number; title?: string | null };
  episodes: EpisodeItem[];
}

export interface EpisodeItem {
  id: string;
  number: number;
  title: string;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  airDate?: string | null;
}

/** §8.6 — meta de colección paginada (§8.48). */
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
}

export interface MediaList {
  items: MediaSummary[];
}

export interface FeaturedSection {
  id: string;
  title: string;
  items: MediaSummary[];
}

export interface FeaturedContent {
  sections: FeaturedSection[];
}

export type SourceAvailability = "active" | "degraded" | "unavailable";

export interface SourceSummary {
  id: string;
  label?: string;
  language?: string;
  quality?: string;
  protocols?: string[];
  availability: SourceAvailability;
}

export interface SourceList {
  sources: SourceSummary[];
}

export interface PlaybackReference {
  mediaId: string;
  playbackUrl: string;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
  requestId: string;
}

export type ApiErrorCode =
  | "MEDIA_NOT_FOUND"
  | "SOURCE_NOT_FOUND"
  | "SOURCE_UNAVAILABLE"
  | "INVALID_ARGUMENT"
  | "UNAUTHORIZED"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
}
