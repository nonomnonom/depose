import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./infrastructure/worker/worker.module.js";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ["log", "warn", "error"],
  });
  app.enableShutdownHooks();
  await app.init();
  await app.close();
}

bootstrap().catch((error) => {
  console.error("Failed to start ingest worker:", error);
  process.exit(1);
});
