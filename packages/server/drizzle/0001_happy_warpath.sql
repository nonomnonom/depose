DROP INDEX "jobs_firm_job_key_unique";--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "result" jsonb;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "progress" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "stage" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "created_by" text DEFAULT 'system' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_firm_type_idempotency_unique" ON "jobs" USING btree ("firm_id","job_key","idempotency_key");--> statement-breakpoint
CREATE INDEX "jobs_status_created_idx" ON "jobs" USING btree ("status","created_at");