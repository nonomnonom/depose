import { NestFactory } from "@nestjs/core";
import { MASTRA } from "@mastra/nestjs";
import type { Mastra } from "@mastra/core/mastra";
import { AppModule } from "./app.module.js";
import { appConfig } from "./config/app.config.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  app.enableShutdownHooks();
  await app.listen(appConfig.port);
  await app.get<Mastra>(MASTRA).startWorkers();
}

bootstrap().catch((error: unknown) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
