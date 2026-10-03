import {
  boolean,
  date,
  index,
  integer,
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

export type MediaItemRow = typeof mediaItems.$inferSelect;
export type GenreRow = typeof genres.$inferSelect;
export type MediaGenreRow = typeof mediaGenres.$inferSelect;
export type MediaExternalIdRow = typeof mediaExternalIds.$inferSelect;
export type SeasonRow = typeof seasons.$inferSelect;
export type EpisodeRow = typeof episodes.$inferSelect;
export type SourceRow = typeof sources.$inferSelect;
