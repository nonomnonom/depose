import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Queue, type Job } from "bullmq";
import { appConfig } from "../../config/app.config.js";
import { INGEST_DOCUMENT_JOB_NAME, INGEST_QUEUE_NAME } from "./worker.constants.js";
import { IngestDocumentPayload } from "./worker.types.js";

@Injectable()
export class IngestQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestQueueService.name);
  private queue?: Queue<IngestDocumentPayload>;

  async onModuleInit() {
    this.queue = new Queue<IngestDocumentPayload>(INGEST_QUEUE_NAME, {
      connection: { connectionString: appConfig.databaseUrl, schema: "bullmq" },
    });
  }

  async onModuleDestroy() {
    await this.queue?.close();
  }

  async enqueue(documentId: string): Promise<Job<IngestDocumentPayload>> {
    if (!this.queue) {
      throw new Error("Ingest queue not initialized");
    }
    const job = await this.queue.add(INGEST_DOCUMENT_JOB_NAME, { documentId }, {
      jobId: documentId,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    });
    this.logger.log(`Enqueued ingest job for document ${documentId} (job id ${job.id})`);
    return job;
  }
}
