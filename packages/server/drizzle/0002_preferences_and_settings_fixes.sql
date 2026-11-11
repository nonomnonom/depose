-- Create user_preferences table (spec 06 — user preferences)
CREATE TABLE "user_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "locale" text NOT NULL DEFAULT 'en',
  "timezone" text NOT NULL DEFAULT 'UTC',
  "theme" text NOT NULL DEFAULT 'system',
  "density" text NOT NULL DEFAULT 'comfortable',
  "notifications" jsonb NOT NULL DEFAULT '{"email": true, "inApp": true, "digest": false}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "user_preferences_user_id_unique" ON "user_preferences" USING btree ("user_id");

-- Fix firms table: remove country default from jurisdiction (spec 02/03 — free text, no country default)
ALTER TABLE "firms" ALTER COLUMN "jurisdiction" DROP DEFAULT;

-- Fix firms table: change primaryLanguage default to 'en' (spec 01 — English-only UI)
ALTER TABLE "firms" ALTER COLUMN "primary_language" SET DEFAULT 'en';
