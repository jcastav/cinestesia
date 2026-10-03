CREATE TABLE "episodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_item_id" uuid NOT NULL,
	"season_id" uuid,
	"episode_number" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"synopsis" text,
	"thumbnail_url" text,
	"duration_seconds" integer,
	"release_date" date,
	"publication_status" varchar(32) DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_episodes_season_number" UNIQUE("season_id","episode_number")
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "genres_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "media_external_ids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_item_id" uuid NOT NULL,
	"namespace" varchar(64) NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"external_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_media_external_ids_namespace" UNIQUE("namespace","external_id")
);
--> statement-breakpoint
CREATE TABLE "media_genres" (
	"media_item_id" uuid NOT NULL,
	"genre_id" uuid NOT NULL,
	CONSTRAINT "media_genres_media_item_id_genre_id_pk" PRIMARY KEY("media_item_id","genre_id")
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_item_id" uuid NOT NULL,
	"season_number" integer NOT NULL,
	"title" varchar(500),
	"synopsis" text,
	"release_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_seasons_media_number" UNIQUE("media_item_id","season_number")
);
--> statement-breakpoint
ALTER TABLE "media_items" ADD COLUMN "original_title" varchar(500);--> statement-breakpoint
ALTER TABLE "media_items" ADD COLUMN "release_date" date;--> statement-breakpoint
ALTER TABLE "media_items" ADD COLUMN "runtime_seconds" integer;--> statement-breakpoint
ALTER TABLE "media_items" ADD COLUMN "publication_status" varchar(32) DEFAULT 'DRAFT' NOT NULL;--> statement-breakpoint
ALTER TABLE "media_items" ADD COLUMN "production_status" varchar(32);--> statement-breakpoint
ALTER TABLE "media_items" ADD COLUMN "poster_url" text;--> statement-breakpoint
ALTER TABLE "media_items" ADD COLUMN "backdrop_url" text;--> statement-breakpoint
ALTER TABLE "media_items" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_external_ids" ADD CONSTRAINT "media_external_ids_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_genres" ADD CONSTRAINT "media_genres_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_genres" ADD CONSTRAINT "media_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_episodes_media" ON "episodes" USING btree ("media_item_id");--> statement-breakpoint
CREATE INDEX "idx_external_ids_media" ON "media_external_ids" USING btree ("media_item_id");--> statement-breakpoint
CREATE INDEX "idx_media_items_type" ON "media_items" USING btree ("media_type");--> statement-breakpoint
CREATE INDEX "idx_media_items_publication_status" ON "media_items" USING btree ("publication_status");--> statement-breakpoint
CREATE INDEX "idx_media_items_release_year" ON "media_items" USING btree ("release_year");