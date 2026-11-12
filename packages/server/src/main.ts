import { exit } from 'node:process';
import { readFileSync, writeFileSync } from 'node:fs';
import { Logger } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import type { RequestHandler } from 'express';
import { createHttpApp } from './app.bootstrap.js';
import { buildOpenApiConfig } from './common/openapi/document.js';
import { appConfig } from './config/app.config.js';

const PID_PATH = process.env.PID_FILE ?? 'var/run/server.pid';

function writePid(): void {
  try {
    writeFileSync(PID_PATH, `${process.pid}\n`, { mode: 0o644 });
  } catch {
    /* Best-effort: a missing writable path in development is not fatal. */
  }
}

function exitGracefully(signal: string): void {
  const logger = new Logger('Bootstrap');
  logger.warn(`Received ${signal}, shutting down`);
  void exit(0);
}

async function bootstrap(): Promise<void> {
  writePid();

  const logger = new Logger('Bootstrap');

  const httpsOptions =
    appConfig.tls.mode === 'files' && appConfig.tls.keyPath && appConfig.tls.certPath
      ? {
          key: readFileSync(appConfig.tls.keyPath),
          cert: readFileSync(appConfig.tls.certPath),
        }
      : undefined;

  const app = await createHttpApp(httpsOptions ? { httpsOptions } : {});

  if (appConfig.openapi.enabled && !appConfig.isProduction) {
    const document = SwaggerModule.createDocument(app, buildOpenApiConfig());
    const serveSpec: RequestHandler = (_req, res) => {
      res.type('application/json').send(document);
    };
    app.getHttpAdapter().getInstance().get('/api/v1/openapi.json', serveSpec);
    SwaggerModule.setup('api/docs', app, document, { customSiteTitle: 'Depose API' });
  }

  app.enableShutdownHooks();
  await app.listen(appConfig.port, appConfig.host);

  logger.log(
    JSON.stringify({
      event: 'server.started',
      pid: process.pid,
      port: appConfig.port,
      environment: appConfig.nodeEnv,
      workers: appConfig.worker.enabled,
      openapi: appConfig.openapi.enabled,
    }),
  );
}

process.on('uncaughtException', (error: Error) => {
  const logger = new Logger('Bootstrap');
  logger.error(`Uncaught exception: ${error.stack ?? error.message}`);
  void exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error(
    `Unhandled rejection: ${reason instanceof Error ? reason.stack ?? reason.message : String(reason)}`,
  );
  void exit(1);
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => exitGracefully(signal));
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error(
    `Server failed to start: ${error instanceof Error ? error.stack ?? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
