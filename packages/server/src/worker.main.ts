import { exit } from 'node:process';
import { writeFileSync } from 'node:fs';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { appConfig } from './config/app.config.js';
import { WorkerModule } from './worker.module.js';

const PID_PATH = process.env.PID_FILE ?? 'var/run/worker.pid';

function writePid(): void {
  try {
    writeFileSync(PID_PATH, `${process.pid}\n`, { mode: 0o644 });
  } catch {
    /* Best-effort. */
  }
}

function exitGracefully(signal: string): void {
  const logger = new Logger('Worker');
  logger.warn(`Received ${signal}, shutting down`);
  void exit(0);
}

async function bootstrap(): Promise<void> {
  writePid();

  const logger = new Logger('Worker');
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['error', 'warn', 'log'],
  });
  app.enableShutdownHooks();

  logger.log(
    JSON.stringify({
      event: 'worker.started',
      pid: process.pid,
      concurrency: appConfig.worker.concurrency,
      environment: appConfig.nodeEnv,
    }),
  );
}

process.on('uncaughtException', (error: Error) => {
  const logger = new Logger('Worker');
  logger.error(`Uncaught exception: ${error.stack ?? error.message}`);
  void exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  const logger = new Logger('Worker');
  logger.error(
    `Unhandled rejection: ${reason instanceof Error ? reason.stack ?? reason.message : String(reason)}`,
  );
  void exit(1);
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => exitGracefully(signal));
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger('Worker');
  logger.error(
    `Worker failed to start: ${error instanceof Error ? error.stack ?? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
