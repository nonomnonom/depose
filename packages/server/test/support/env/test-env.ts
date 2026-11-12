import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse as parseEnv } from 'dotenv';

/**
 * Environment the E2E app boots with. It must be applied before `AppModule`
 * (and therefore `app.config.ts`) is imported: the config module validates the
 * whole environment once, at import time.
 */
export const TEST_AUTH_ORIGIN = 'http://app.depose.test';
export const TEST_AUTH_SECRET = 'depose-e2e-secret-0123456789abcdef0123456789';
export const TEST_SECRET_KEY = 'depose-e2e-ai-secret-key-0123456789abcdef';

export interface TestEnvOverrides {
  [key: string]: string | undefined;
}

function tempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

/** Values already exported by the shell win over the test env file. */
function loadTestEnvFile(): void {
  for (const file of ['.env.test', '.env.test.local']) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const [key, value] of Object.entries(parseEnv(readFileSync(path)))) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

export function applyTestEnv(overrides: TestEnvOverrides = {}): void {
  loadTestEnvFile();
  process.env.NODE_ENV = 'test';
  /* Validated by the config schema; the E2E app listens on port 0 anyway. */
  process.env.PORT = '3001';
  process.env.OPENAPI_ENABLED = 'false';

  process.env.BETTER_AUTH_URL = TEST_AUTH_ORIGIN;
  process.env.BETTER_AUTH_SECRET = TEST_AUTH_SECRET;
  process.env.AUTH_TRUSTED_ORIGINS = TEST_AUTH_ORIGIN;
  process.env.AUTH_ALLOW_SELF_SIGNUP = 'true';
  process.env.AUTH_REQUIRE_EMAIL_VERIFICATION = 'false';
  process.env.AUTH_REQUIRE_ADMIN_APPROVAL = 'false';

  /* Requests carry the tenant in `x-forwarded-host`, like a proxied deployment. */
  process.env.TENANCY_MODE = 'single';
  process.env.BASE_DOMAIN = 'depose.test';
  process.env.TRUST_PROXY = 'true';
  process.env.TLS_MODE = 'external';

  process.env.STORAGE_TYPE = 'local';
  process.env.STORAGE_LOCAL_PATH = tempDir('depose-e2e-storage-');
  process.env.MAIL_TRANSPORT = 'file';
  process.env.MAIL_DIRECTORY = tempDir('depose-e2e-mail-');

  /* No Qdrant, no embedding provider: retrieval falls back to keyword search. */
  process.env.VECTOR_SEARCH_ENABLED = 'false';
  delete process.env.QDRANT_URL;
  delete process.env.EMBEDDING_BASE_URL;

  process.env.AI_SECRET_ENCRYPTION_KEY = TEST_SECRET_KEY;
  process.env.WEBHOOK_ENCRYPTION_KEY = TEST_SECRET_KEY;
  process.env.WORKER_CONCURRENCY = '1';

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
