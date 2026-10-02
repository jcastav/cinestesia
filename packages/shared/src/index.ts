export type MediaType =
  | "MOVIE"
  | "SERIES"
  | "DOCUMENTARY"
  | "SHORT"
  | "CONCERT"
  | "CLIP"
  | "SPECIAL"
  | "OTHER";

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
  | "INTERNAL_ERROR";

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
}
