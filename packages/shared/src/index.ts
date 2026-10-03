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
  episodesCount: number;
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
export type PageMeta = {
  page: number;
  limit: number;
  total: number;
};

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

/**
 * Discovery & Ingestion — contratos de dominio (§6.44 §3–§12).
 * Tipos compartidos entre API y futura UI; los DTO de fila (row → dto) se
 * resuelven en la capa de repositorio.
 */

/** §6.44 §5 — estados de un Discovery Run. */
export type DiscoveryRunStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "PARTIAL"
  | "FAILED"
  | "CANCELLED";

/** §6.44 §16 — disparador del run (v0.3 solo crea MANUAL). */
export type DiscoveryRunTrigger = "MANUAL" | "SCHEDULED";

/** §6.44 §16 — modo de ejecución del run. */
export type DiscoveryRunMode = "FULL" | "INCREMENTAL";

/** §6.44 §4 — kind inicial del candidato (EPISODE/PERSON/... no hasta necesidad). */
export type CandidateKind = "CONTENT" | "SOURCE";

/** §6.44 §12 — estados del candidato; las transiciones deben estar controladas. */
export type CandidateStatus =
  | "DISCOVERED"
  | "NORMALIZING"
  | "MATCHING"
  | "MATCHED"
  | "AMBIGUOUS"
  | "DEDUPLICATING"
  | "ENRICHING"
  | "VALIDATING"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "INGESTING"
  | "INGESTED"
  | "FAILED"
  | "STALE";

/** §6.44 §6 — contadores operacionales del run (no son fuente de verdad). */
export type DiscoveryRunCounters = {
  candidatesFound: number;
  processed: number;
  matched: number;
  newContent: number;
  ambiguous: number;
  rejected: number;
  sourcesDiscovered: number;
  errors: number;
};

/** §6.44 §5/§6 — Discovery Run. */
export interface DiscoveryRunDto {
  runId: string;
  adapterId: string;
  adapterVersion: string;
  trigger: DiscoveryRunTrigger;
  mode: DiscoveryRunMode;
  status: DiscoveryRunStatus;
  query?: string | null;
  maxItems?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number | null;
  counters: DiscoveryRunCounters;
  errorSummary?: string | null;
  createdAt: string;
}

/** §6.44 §7 — Match Result. */
export interface MatchResult {
  result: "MATCHED" | "NO_MATCH" | "AMBIGUOUS";
  entityType?: "MEDIA_ITEM";
  entityId?: string | null;
  confidence?: "HIGH" | "MEDIUM" | "LOW" | null;
  strategy?: string | null;
}

/** §6.44 §11 — Provenance Contract (toda incorporación lo conserva). */
export interface CandidateProvenance {
  provider: string;
  externalId: string;
  adapterId: string;
  adapterVersion: string;
  runId: string;
  discoveredAt: string;
  payloadChecksum: string;
}

/** §6.44 §3 — DiscoveryCandidate (superset operativo: status/version para admin §18–§20). */
export interface DiscoveryCandidateDto {
  candidateId: string;
  kind: CandidateKind;
  provider: string;
  externalId: string;
  adapter: { id: string; version: string };
  runId: string;
  status: CandidateStatus;
  discoveredAt: string;
  normalized?: Record<string, unknown> | null;
  rawPayload?: Record<string, unknown> | null;
  payloadChecksum: string;
  match?: MatchResult | null;
  rejectionReason?: string | null;
  version: number;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
  requestId: string;
}

export type ApiErrorCode =
  | "MEDIA_NOT_FOUND"
  | "SEASON_NOT_FOUND"
  | "SOURCE_NOT_FOUND"
  | "SOURCE_UNAVAILABLE"
  | "INVALID_ARGUMENT"
  | "UNAUTHORIZED"
  | "CONFLICT"
  | "RUN_NOT_FOUND"
  | "CANDIDATE_NOT_FOUND"
  | "ADAPTER_NOT_FOUND"
  | "ADAPTER_DISABLED"
  | "CANDIDATE_NOT_PENDING"
  | "RUN_ALREADY_RUNNING"
  | "INTERNAL_ERROR";

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
}
