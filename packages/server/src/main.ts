import { readFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { json, raw, urlencoded, type RequestHandler } from 'express';
import { AppModule } from './app.module.js';
import { buildOpenApiConfig } from './common/openapi/document.js';
import { appConfig } from './config/app.config.js';
import { AuthService } from './modules/auth/auth.service.js';

async function bootstrap() {
  const httpsOptions =
    appConfig.tls.mode === 'files' && appConfig.tls.keyPath && appConfig.tls.certPath
      ? {
          key: readFileSync(appConfig.tls.keyPath),
          cert: readFileSync(appConfig.tls.certPath),
        }
      : undefined;

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    ...(httpsOptions ? { httpsOptions } : {}),
    logger: ['error', 'warn', 'log'],
  });

  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  if (appConfig.tenancy.trustProxy) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.enableCors({
    origin: appConfig.auth.trustedOrigins,
    credentials: true,
  });

  // Better Auth owns `/api/auth/*` and must see the raw request stream.
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

  if (appConfig.openapi.enabled) {
    const document = SwaggerModule.createDocument(app, buildOpenApiConfig());
    const serveSpec: RequestHandler = (_req, res) => {
      res.type('application/json').send(document);
    };
    app.getHttpAdapter().getInstance().get('/api/v1/openapi.json', serveSpec);
    SwaggerModule.setup('api/docs', app, document, { customSiteTitle: 'Depose API' });
  }

  await app.listen(appConfig.port);
}

void bootstrap();
