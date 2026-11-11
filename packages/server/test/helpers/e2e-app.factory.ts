import type { NestExpressApplication } from '@nestjs/platform-express';
import type { INestApplication } from '@nestjs/common';
import { applyTestEnv, type TestEnvOverrides } from './test-env.js';
import { setupTestDatabase, teardownTestDatabase } from './test-database.js';
import { setupTestRedis, teardownTestRedis } from './test-redis.js';

export interface E2EApp {
  app: INestApplication;
  baseUrl: string;
  close: () => Promise<void>;
}

/**
 * Boots the production `AppModule` with a throwaway Postgres and Redis. The
 * bootstrap is shared with `src/main.ts`, so middleware order, body limits,
 * security headers, and auth rate limiting are exactly what production runs.
 *
 * Everything the app reads from the environment is applied first; the app is
 * imported dynamically because `app.config.ts` validates the env at import.
 */
export async function createE2EApp(overrides: TestEnvOverrides = {}): Promise<E2EApp> {
  applyTestEnv(overrides);
  await setupTestDatabase();
  await setupTestRedis();

  const [{ NestFactory }, { configureApp }, { AppModule }] = await Promise.all([
    import('@nestjs/core'),
    import('../../src/app.bootstrap.js'),
    import('../../src/app.module.js'),
  ]);

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    logger: ['error', 'warn'],
  });
  await configureApp(app);

  await app.listen(0, '127.0.0.1');
  const baseUrl = await app.getUrl();

  return {
    app,
    baseUrl,
    close: async () => {
      await app.close();
      await teardownTestRedis();
      await teardownTestDatabase();
    },
  };
}

/** App-level services and helpers a spec needs, resolved after boot. */
export async function e2eHelpers() {
  const [{ db }, authUtils, http] = await Promise.all([
    import('../../src/infrastructure/database/database.client.js'),
    import('./auth.test-utils.js'),
    import('./http.js'),
  ]);
  return { db, ...authUtils, ...http };
}
