export type MediaType = "movie" | "series";

export interface MediaItem {
  id: string;
  slug: string;
  title: string;
  type: MediaType;
  synopsis?: string | null;
  posterUrl?: string | null;
  releaseYear?: number | null;
  playbackUrl: string;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
  requestId: string;
}

export type ApiErrorCode =
  | "MEDIA_NOT_FOUND"
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
