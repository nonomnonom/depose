CREATE TABLE "recent_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"resource_type" text DEFAULT 'matter' NOT NULL,
	"resource_id" uuid NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recent_views" ADD CONSTRAINT "recent_views_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recent_views_user_resource_unique" ON "recent_views" USING btree ("user_id","resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "recent_views_user_opened_idx" ON "recent_views" USING btree ("user_id","opened_at");