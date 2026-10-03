import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const mediaItems = pgTable(
  "media_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    mediaType: varchar("media_type", { length: 32 }).notNull(),
    canonicalTitle: varchar("canonical_title", { length: 500 }).notNull(),
    originalTitle: varchar("original_title", { length: 500 }),
    synopsis: text("synopsis"),
    releaseDate: date("release_date"),
    releaseYear: smallint("release_year"),
    runtimeSeconds: integer("runtime_seconds"),
    publicationStatus: varchar("publication_status", { length: 32 })
      .notNull()
      .default("DRAFT"),
    productionStatus: varchar("production_status", { length: 32 }),
    posterUrl: text("poster_url"),
    backdropUrl: text("backdrop_url"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxType: index("idx_media_items_type").on(t.mediaType),
    idxPublicationStatus: index("idx_media_items_publication_status").on(
      t.publicationStatus,
    ),
    idxReleaseYear: index("idx_media_items_release_year").on(t.releaseYear),
  }),
);

export const genres = pgTable("genres", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const mediaGenres = pgTable(
  "media_genres",
  {
    mediaItemId: uuid("media_item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    genreId: uuid("genre_id")
      .notNull()
      .references(() => genres.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.mediaItemId, t.genreId] }),
  }),
);

export const mediaExternalIds = pgTable(
  "media_external_ids",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mediaItemId: uuid("media_item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    namespace: varchar("namespace", { length: 64 }).notNull(),
    externalId: varchar("external_id", { length: 255 }).notNull(),
    externalUrl: text("external_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uqNamespaceExternalId: unique("uq_media_external_ids_namespace").on(
      t.namespace,
      t.externalId,
    ),
    idxMedia: index("idx_external_ids_media").on(t.mediaItemId),
  }),
);

export const seasons = pgTable(
  "seasons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mediaItemId: uuid("media_item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    seasonNumber: integer("season_number").notNull(),
    title: varchar("title", { length: 500 }),
    synopsis: text("synopsis"),
    releaseDate: date("release_date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // El UNIQUE(media_item_id, season_number) ya provee el índice de
    // consulta por media (prefijo) — no se duplica (§6.34k).
    uqMediaSeason: unique("uq_seasons_media_number").on(
      t.mediaItemId,
      t.seasonNumber,
    ),
  }),
);

export const episodes = pgTable(
  "episodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mediaItemId: uuid("media_item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id").references(() => seasons.id, {
      onDelete: "cascade",
    }),
    episodeNumber: integer("episode_number").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    synopsis: text("synopsis"),
    thumbnailUrl: text("thumbnail_url"),
    durationSeconds: integer("duration_seconds"),
    releaseDate: date("release_date"),
    publicationStatus: varchar("publication_status", { length: 32 })
      .notNull()
      .default("DRAFT"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // UNIQUE(season_id, episode_number) según §6.34j; con season_id NULL
    // Postgres permite duplicados (NULLS distintos) — episodios sueltos.
    uqSeasonEpisode: unique("uq_episodes_season_number").on(
      t.seasonId,
      t.episodeNumber,
    ),
    // Justificado: conteo de episodios por media_item_id en el detalle (§6.34k).
    idxMedia: index("idx_episodes_media").on(t.mediaItemId),
  }),
);

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  mediaItemId: uuid("media_item_id")
    .notNull()
    .references(() => mediaItems.id, { onDelete: "cascade" }),
  playbackUrl: varchar("playback_url", { length: 1000 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Discovery & Ingestion (§6.44 §67, §7.89–7.95).
 *
 * Decisiones de esquema (Fase A de v0.3):
 * - Tabla `discovery_candidates` (nombre del motor 6.44 §67; §7.90 la llama
 *   `discovered_candidates` — misma entidad, se registra en BACKLOG).
 * - `provider`/`external_id` de §6.44 ≡ `discovery_source`/`external_reference`
 *   de §7.90; se usa la nomenclatura del motor por ser el documento de versión.
 * - `adapter_id` es la **clave lógica** estable del adapter (contrato §14/§5:
 *   `adapterId = "provider_x"`), no un FK: runs y candidatos son histórico
 *   inmutable con provenance (§18) y deben sobrevivir a cambios del registry.
 * - `available_at` de §6.44 ≡ `scheduled_at` de §7.93 (un solo campo).
 * - Candidatos: `UNIQUE(kind, provider, external_id)` = clave de
 *   deduplicación/idempotencia de §24.1 y §37.
 */
export const discoveryAdapters = pgTable(
  "discovery_adapters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adapterKey: varchar("adapter_key", { length: 100 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    version: varchar("version", { length: 50 }).notNull(),
    provider: varchar("provider", { length: 100 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    capabilities: jsonb("capabilities").$type<string[]>().notNull(),
    configuration: jsonb("configuration").$type<Record<string, unknown>>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const discoveryRuns = pgTable(
  "discovery_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adapterId: varchar("adapter_id", { length: 100 }).notNull(),
    adapterVersion: varchar("adapter_version", { length: 50 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("QUEUED"),
    trigger: varchar("trigger", { length: 32 }).notNull().default("MANUAL"),
    mode: varchar("mode", { length: 16 }).notNull().default("FULL"),
    query: text("query"),
    maxItems: integer("max_items"),
    // Contadores operacionales de §31/§6; no son fuente de verdad (§6).
    counters: jsonb("counters").$type<Record<string, number>>().notNull(),
    errorSummary: text("error_summary"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxStatus: index("idx_discovery_runs_status").on(t.status),
    idxCreatedAt: index("idx_discovery_runs_created_at").on(t.createdAt),
  }),
);

export const discoveryCandidates = pgTable(
  "discovery_candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Último run que observó este candidato (FK restrict: el run sostiene la
    // provenance y no debe borrarse por limpieza accidental).
    runId: uuid("run_id")
      .notNull()
      .references(() => discoveryRuns.id, { onDelete: "restrict" }),
    kind: varchar("kind", { length: 32 }).notNull(),
    provider: varchar("provider", { length: 100 }).notNull(),
    externalId: varchar("external_id", { length: 255 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("DISCOVERED"),
    adapterId: varchar("adapter_id", { length: 100 }).notNull(),
    adapterVersion: varchar("adapter_version", { length: 50 }).notNull(),
    normalizedData: jsonb("normalized_data").$type<Record<string, unknown>>(),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>(),
    payloadChecksum: varchar("payload_checksum", { length: 80 }).notNull(),
    matchReference: uuid("match_reference").references(
      () => mediaItems.id,
      { onDelete: "set null" },
    ),
    matchStrategy: varchar("match_strategy", { length: 64 }),
    confidence: varchar("confidence", { length: 16 }),
    rejectionReason: varchar("rejection_reason", { length: 64 }),
    // OCC de §35 (contratos): approve/reject detectan conflicto → 409.
    version: integer("version").notNull().default(1),
    discoveredAt: timestamp("discovered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // Deduplicación/idempotencia §24.1 + §37 (clave conceptual
    // kind + provider + externalId).
    uqKey: unique("uq_discovery_candidates_key").on(
      t.kind,
      t.provider,
      t.externalId,
    ),
    // Justificados (§6.34k): candidatos por run (detalle del run) y cola de
    // revisión por estado (Review Queue §58).
    idxRun: index("idx_discovery_candidates_run").on(t.runId),
    idxStatus: index("idx_discovery_candidates_status").on(t.status),
  }),
);

export const ingestionJobs = pgTable(
  "ingestion_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => discoveryCandidates.id, { onDelete: "cascade" }),
    jobType: varchar("job_type", { length: 64 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("PENDING"),
    attemptCount: integer("attempt_count").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // Un job por (candidato, tipo): reintentos reutilizan la fila (idempotia
    // §33) y el prefijo cubre la búsqueda por candidato (§6.34k).
    uqCandidateType: unique("uq_ingestion_jobs_candidate_type").on(
      t.candidateId,
      t.jobType,
    ),
    // Polling del dispatcher/retry: "PENDING con available_at vencido".
    idxStatusAvailable: index("idx_ingestion_jobs_status_available").on(
      t.status,
      t.availableAt,
    ),
  }),
);

export const ingestionErrors = pgTable(
  "ingestion_errors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Nullable: un error de adapter/run puede existir sin candidato ni job
    // (criterio de salida 10 de §12.7 desde la Fase C).
    candidateId: uuid("candidate_id").references(
      () => discoveryCandidates.id,
      { onDelete: "cascade" },
    ),
    runId: uuid("run_id").references(() => discoveryRuns.id, {
      onDelete: "cascade",
    }),
    jobId: uuid("job_id").references(() => ingestionJobs.id, {
      onDelete: "set null",
    }),
    // Taxonomía de errores §40 (DISCOVERY_ADAPTER_ERROR, VALIDATION_ERROR…).
    errorCode: varchar("error_code", { length: 64 }).notNull(),
    message: text("message").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>(),
    attempt: integer("attempt").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // Justificados (§6.34k): errores por candidato (detalle) y por run
    // (acción «Ver errores» §57).
    idxCandidate: index("idx_ingestion_errors_candidate").on(t.candidateId),
    idxRun: index("idx_ingestion_errors_run").on(t.runId),
  }),
);

export type MediaItemRow = typeof mediaItems.$inferSelect;
export type GenreRow = typeof genres.$inferSelect;
export type MediaGenreRow = typeof mediaGenres.$inferSelect;
export type MediaExternalIdRow = typeof mediaExternalIds.$inferSelect;
export type SeasonRow = typeof seasons.$inferSelect;
export type EpisodeRow = typeof episodes.$inferSelect;
export type SourceRow = typeof sources.$inferSelect;
export type DiscoveryAdapterRow = typeof discoveryAdapters.$inferSelect;
export type DiscoveryRunRow = typeof discoveryRuns.$inferSelect;
export type DiscoveryCandidateRow = typeof discoveryCandidates.$inferSelect;
export type IngestionJobRow = typeof ingestionJobs.$inferSelect;
export type IngestionErrorRow = typeof ingestionErrors.$inferSelect;
