import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { appConfig } from './config/app.config.js';
import { WorkerModule } from './worker.module.js';

/**
 * Background worker entrypoint. No HTTP listener: it only consumes BullMQ jobs
 * (document ingest, fact extraction, webhook delivery).
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Worker');
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['error', 'warn', 'log'],
  });
  app.enableShutdownHooks();

  logger.log(
    JSON.stringify({
      event: 'worker.started',
      concurrency: appConfig.worker.concurrency,
      environment: appConfig.nodeEnv,
    }),
  );
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger('Worker');
  logger.error(
    `Worker failed to start: ${error instanceof Error ? error.stack ?? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
