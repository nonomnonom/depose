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
 * bootstrap mirrors `src/main.ts` (global prefix, better-auth handler, body
 * parsers) so the specs exercise the same request pipeline as production.
 *
 * Everything the app reads from the environment is applied first; the app is
 * imported dynamically because `app.config.ts` validates the env at import.
 */
export async function createE2EApp(overrides: TestEnvOverrides = {}): Promise<E2EApp> {
  applyTestEnv(overrides);
  await setupTestDatabase();
  await setupTestRedis();

  const { NestFactory } = await import('@nestjs/core');
  const { raw, json, urlencoded } = await import('express');
  const { AppModule } = await import('../../src/app.module.js');
  const { AuthService } = await import('../../src/modules/auth/auth.service.js');
  const { appConfig } = await import('../../src/config/app.config.js');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    logger: ['error', 'warn'],
  });

  app.setGlobalPrefix('api');

  if (appConfig.tenancy.trustProxy) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  /* Better Auth owns `/api/auth/*` and must see the raw request stream. */
  const auth = app.get(AuthService);
  app.getHttpAdapter().getInstance().all('/api/auth/*splat', auth.nodeHandler);

  app.use(
    raw({
      type: [
        'application/octet-stream',
        'application/pdf',
        'text/*',
        'application/rtf',
        'message/rfc822',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/*',
      ],
      limit: '100mb',
    }),
  );
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));

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
