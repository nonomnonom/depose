import { Module } from '@nestjs/common';
import { ExtractionsModule } from '../ai/extractions/extractions.module.js';
import { ExtractionProcessor } from '../ai/extractions/extraction.processor.js';
import { OcrModule } from '../ai/ocr/ocr.module.js';
import { OcrProcessor } from '../ai/ocr/ocr.processor.js';
import { AiEmbedingModule } from '../ai/embeding/embedding.module.js';
import { EmbeddingProcessor } from '../ai/embeding/embedding.processor.js';
import { DocumentsModule } from '../documents/documents.module.js';
import { IngestProcessor } from '../documents/ingest.processor.js';
import { WebhookDeliveryProcessor } from '../webhooks/webhook-delivery.processor.js';
import { WebhooksModule } from '../webhooks/webhooks.module.js';
import { VectorModule } from '../vector/vector.module.js';
import { JobsModule } from './jobs.module.js';

/**
 * Every BullMQ consumer in one module. The HTTP app imports it only when
 * WORKER_ENABLED=true; a dedicated worker process imports it directly. This is
 * what lets API replicas stay free of background work without deleting the
 * processors from the codebase.
 */
@Module({
  imports: [JobsModule, DocumentsModule, OcrModule, AiEmbedingModule, ExtractionsModule, WebhooksModule, VectorModule],
  providers: [IngestProcessor, ExtractionProcessor, OcrProcessor, EmbeddingProcessor, WebhookDeliveryProcessor],
})
export class WorkerProcessorsModule {}
