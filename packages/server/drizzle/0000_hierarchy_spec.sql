CREATE TABLE "document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"matter_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"page_number" integer DEFAULT 1 NOT NULL,
	"sentence_start" integer NOT NULL,
	"sentence_end" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"source" text DEFAULT 'upload' NOT NULL,
	"uploaded_by" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"mime_type" text NOT NULL,
	"content" text NOT NULL,
	"page_count" integer DEFAULT 1 NOT NULL,
	"processing_status" text DEFAULT 'queued' NOT NULL,
	"language" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" uuid NOT NULL,
	"document_id" uuid,
	"text" text NOT NULL,
	"entity" text,
	"action" text,
	"date" timestamp with time zone,
	"page" integer,
	"sentence_index" integer,
	"confidence" real DEFAULT 1 NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "firms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"primary_language" text DEFAULT 'id' NOT NULL,
	"jurisdiction" text DEFAULT 'ID' NOT NULL,
	"plan" text DEFAULT 'solo' NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "firms_organization_id_unique" UNIQUE("organization_id"),
	CONSTRAINT "firms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "matters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" text NOT NULL,
	"name" text NOT NULL,
	"matter_number" text,
	"type" text DEFAULT 'other' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"opened_date" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_date" timestamp with time zone,
	"description" text,
	"lead_lawyer_id" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"dismissed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_firm_id_firms_organization_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_chunks_matter_id_idx" ON "document_chunks" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "documents_matter_id_idx" ON "documents" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "facts_matter_id_idx" ON "facts" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "facts_date_idx" ON "facts" USING btree ("date");--> statement-breakpoint
CREATE INDEX "matters_firm_id_idx" ON "matters" USING btree ("firm_id");--> statement-breakpoint
CREATE UNIQUE INDEX "onboarding_progress_user_org_idx" ON "onboarding_progress" USING btree ("user_id","organization_id");