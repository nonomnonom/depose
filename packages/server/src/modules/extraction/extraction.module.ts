import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EXTRACTION_QUEUE, INGEST_QUEUE } from '../jobs/queue.constants.js';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { AiModule } from '../ai/ai.module.js';
import { DocumentsModule } from '../documents/documents.module.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { ExtractionProcessor, IngestProcessor } from './extraction.processor.js';
import { ExtractionService } from './extraction.service.js';

@Module({
  imports: [
    BullModule.registerQueue({ name: INGEST_QUEUE }, { name: EXTRACTION_QUEUE }),
    AccessControlModule,
    AiModule,
    DocumentsModule,
    JobsModule,
  ],
  providers: [ExtractionService, ExtractionProcessor, IngestProcessor],
  exports: [ExtractionService],
})
export class ExtractionModule {}
