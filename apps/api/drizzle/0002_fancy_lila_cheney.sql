CREATE TABLE "discovery_adapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adapter_key" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"version" varchar(50) NOT NULL,
	"provider" varchar(100) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"capabilities" jsonb NOT NULL,
	"configuration" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_adapters_adapter_key_unique" UNIQUE("adapter_key")
);
--> statement-breakpoint
CREATE TABLE "discovery_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"kind" varchar(32) NOT NULL,
	"provider" varchar(100) NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"status" varchar(32) DEFAULT 'DISCOVERED' NOT NULL,
	"adapter_id" varchar(100) NOT NULL,
	"adapter_version" varchar(50) NOT NULL,
	"normalized_data" jsonb,
	"raw_payload" jsonb,
	"payload_checksum" varchar(80) NOT NULL,
	"match_reference" uuid,
	"match_strategy" varchar(64),
	"confidence" varchar(16),
	"rejection_reason" varchar(64),
	"version" integer DEFAULT 1 NOT NULL,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_discovery_candidates_key" UNIQUE("kind","provider","external_id")
);
--> statement-breakpoint
CREATE TABLE "discovery_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adapter_id" varchar(100) NOT NULL,
	"adapter_version" varchar(50) NOT NULL,
	"status" varchar(32) DEFAULT 'QUEUED' NOT NULL,
	"trigger" varchar(32) DEFAULT 'MANUAL' NOT NULL,
	"mode" varchar(16) DEFAULT 'FULL' NOT NULL,
	"query" text,
	"max_items" integer,
	"counters" jsonb NOT NULL,
	"error_summary" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid,
	"run_id" uuid,
	"job_id" uuid,
	"error_code" varchar(64) NOT NULL,
	"message" text NOT NULL,
	"details" jsonb,
	"attempt" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"job_type" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'PENDING' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_ingestion_jobs_candidate_type" UNIQUE("candidate_id","job_type")
);
--> statement-breakpoint
ALTER TABLE "discovery_candidates" ADD CONSTRAINT "discovery_candidates_run_id_discovery_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."discovery_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_candidates" ADD CONSTRAINT "discovery_candidates_match_reference_media_items_id_fk" FOREIGN KEY ("match_reference") REFERENCES "public"."media_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_errors" ADD CONSTRAINT "ingestion_errors_candidate_id_discovery_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."discovery_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_errors" ADD CONSTRAINT "ingestion_errors_run_id_discovery_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."discovery_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_errors" ADD CONSTRAINT "ingestion_errors_job_id_ingestion_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."ingestion_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_jobs" ADD CONSTRAINT "ingestion_jobs_candidate_id_discovery_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."discovery_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_discovery_candidates_run" ON "discovery_candidates" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_discovery_candidates_status" ON "discovery_candidates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_discovery_runs_status" ON "discovery_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_discovery_runs_created_at" ON "discovery_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ingestion_errors_candidate" ON "ingestion_errors" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "idx_ingestion_errors_run" ON "ingestion_errors" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_ingestion_jobs_status_available" ON "ingestion_jobs" USING btree ("status","available_at");