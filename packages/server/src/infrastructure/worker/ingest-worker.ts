import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Worker } from "bullmq";
import { appConfig } from "../../config/app.config.js";
import { INGEST_QUEUE_NAME } from "./worker.constants.js";
import { IngestDocumentPayload } from "./worker.types.js";
import { IngestService } from "./ingest/service.js";

@Injectable()
export class IngestWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestWorker.name);
  private worker?: Worker<IngestDocumentPayload>;

  constructor(private readonly ingestService: IngestService) {}

  async onModuleInit() {
    this.worker = new Worker<IngestDocumentPayload>(
      INGEST_QUEUE_NAME,
      async (job) => {
        this.logger.log(`Processing ingest job ${job.id} for document ${job.data.documentId}`);
        return this.ingestService.process(job.data);
      },
      {
        connection: { connectionString: appConfig.databaseUrl, schema: "bullmq" },
        concurrency: appConfig.worker.concurrency,
      },
    );

    this.worker.on("completed", (job) => {
      this.logger.log(`Ingest job ${job.id} completed`);
    });

    this.worker.on("failed", (job, err) => {
      this.logger.error(`Ingest job ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
