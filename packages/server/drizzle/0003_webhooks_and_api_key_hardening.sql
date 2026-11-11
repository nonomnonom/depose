-- Webhooks can now sign deliveries: store the AES-256-GCM ciphertext of the
-- signing secret. secret_hash remains only as a "secret configured" marker.
ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "secret_ciphertext" text;
ALTER TABLE "webhooks" ALTER COLUMN "secret_hash" SET DEFAULT '';

-- API keys are looked up by SHA-256 digest. Enforce uniqueness so a collision or
-- duplicate insertion cannot shadow a live key.
CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_secret_hash_unique" ON "api_keys" USING btree ("secret_hash");

-- Delivery history is queried per firm and per webhook.
CREATE INDEX IF NOT EXISTS "webhook_deliveries_firm_created_idx" ON "webhook_deliveries" USING btree ("firm_id", "created_at");
