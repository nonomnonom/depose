import { readFileSync } from 'node:fs';
import { Logger } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import type { RequestHandler } from 'express';
import { createHttpApp } from './app.bootstrap.js';
import { buildOpenApiConfig } from './common/openapi/document.js';
import { appConfig } from './config/app.config.js';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const httpsOptions =
    appConfig.tls.mode === 'files' && appConfig.tls.keyPath && appConfig.tls.certPath
      ? {
          key: readFileSync(appConfig.tls.keyPath),
          cert: readFileSync(appConfig.tls.certPath),
        }
      : undefined;

  const app = await createHttpApp(httpsOptions ? { httpsOptions } : {});

  if (appConfig.openapi.enabled) {
    const document = SwaggerModule.createDocument(app, buildOpenApiConfig());
    const serveSpec: RequestHandler = (_req, res) => {
      res.type('application/json').send(document);
    };
    app.getHttpAdapter().getInstance().get('/api/v1/openapi.json', serveSpec);
    SwaggerModule.setup('api/docs', app, document, { customSiteTitle: 'Depose API' });
  }

  app.enableShutdownHooks();
  await app.listen(appConfig.port);

  logger.log(
    JSON.stringify({
      event: 'server.started',
      port: appConfig.port,
      environment: appConfig.nodeEnv,
      workers: appConfig.worker.enabled,
      openapi: appConfig.openapi.enabled,
    }),
  );
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error(
    `Server failed to start: ${error instanceof Error ? error.stack ?? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
