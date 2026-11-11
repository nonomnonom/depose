import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json, raw, urlencoded, type RequestHandler } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module.js';
import { AUTH_RATE_LIMIT } from './common/rate-limit.decorator.js';
import { clientIp } from './common/rate-limit.guard.js';
import { RateLimitService } from './common/rate-limit.service.js';
import { securityHeaders } from './common/security-headers.middleware.js';
import { appConfig } from './config/app.config.js';
import { AuthService } from './modules/auth/auth.service.js';

const UPLOAD_MIME_TYPES = [
  'application/octet-stream',
  'application/pdf',
  'text/*',
  'application/rtf',
  'message/rfc822',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/*',
];

/**
 * Builds the HTTP application. Shared by `main.ts` and the E2E harness so tests
 * exercise the same middleware order as production.
 *
 * Body parsing is deliberately scoped: only document upload routes may carry a
 * large raw body. Everything else is small JSON, which keeps an unauthenticated
 * request from allocating 100 MB per connection.
 */
export async function configureApp(app: NestExpressApplication): Promise<void> {
  const instance = app.getHttpAdapter().getInstance();
  instance.disable('x-powered-by');

  app.setGlobalPrefix('api');

  if (appConfig.tenancy.trustProxy) {
    instance.set('trust proxy', 1);
  }

  app.enableCors({
    origin: appConfig.auth.trustedOrigins,
    credentials: true,
    exposedHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  });

  instance.use(securityHeaders);

  /* Better Auth owns `/api/auth/*` and must see the raw request stream. */
  const auth = app.get(AuthService);
  const limiter = app.get(RateLimitService);
  const authLimiter: RequestHandler = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await limiter.hit(
        `${AUTH_RATE_LIMIT.scope}:${clientIp(request)}:${request.path.split('/').slice(0, 4).join('/')}`,
        AUTH_RATE_LIMIT.limit,
        AUTH_RATE_LIMIT.windowSeconds * 1_000,
      );
      response.setHeader('X-RateLimit-Limit', String(AUTH_RATE_LIMIT.limit));
      response.setHeader('X-RateLimit-Remaining', String(result.remaining));
      if (!result.allowed) {
        const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1_000));
        response.setHeader('Retry-After', String(retryAfter));
        response.status(429).json({
          statusCode: 429,
          code: 'RATE_LIMITED',
          message: `Too many authentication attempts. Try again in ${retryAfter}s.`,
          details: [],
          requestId: response.getHeader('X-Request-Id') ?? '',
        });
        return;
      }
      next();
    } catch {
      next();
    }
  };

  instance.use('/api/auth', authLimiter);
  instance.all('/api/auth/*splat', auth.nodeHandler);

  instance.use(
    '/api/v1/matters/:matterId/documents',
    raw({ type: UPLOAD_MIME_TYPES, limit: '100mb' }),
  );
  instance.use(json({ limit: '1mb' }));
  instance.use(urlencoded({ extended: true, limit: '1mb' }));
}

export interface HttpAppOptions {
  httpsOptions?: { key: Buffer; cert: Buffer };
}

export async function createHttpApp(
  options: HttpAppOptions = {},
): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    logger: ['error', 'warn', 'log'],
    ...options,
  });
  await configureApp(app);
  return app;
}
