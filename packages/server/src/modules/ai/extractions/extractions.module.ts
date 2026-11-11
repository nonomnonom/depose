import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../access-control/access-control.module.js';
import { AuditModule } from '../../audit/audit.module.js';
import { VectorModule } from '../../vector/vector.module.js';
import { PlatformAiModule } from '../platform/platform-ai.module.js';
import { SystemOneModule } from '../system-one/system-one.module.js';
import { DocumentsModule } from '../../documents/documents.module.js';
import { JobsModule } from '../../jobs/jobs.module.js';
import { ExtractionProcessor } from './extraction.processor.js';
import { ExtractionService } from './extraction.service.js';

/**
 * Extractions — run extraction against source documents and commit extracted
 * facts to the matter.
 *
 * Owns:
 *  - ExtractionService: HTTP API to request/lifecycle extraction runs.
 *  - ExtractionProcessor: background job processor (EXTRACTION_QUEUE).
 *
 * Schema tables (owned here, defined in platform.ts):
 *  - extractionRuns (lifecycle tracking)
 *  - facts + factSources (written by the extraction pipeline)
 *
 * Dependencies:
 *  - PlatformAiModule (ModelGatewayService for extraction model calls)
 *  - AgentModule (not direct, but the pipeline produces facts that the agent reads)
 *  - VectorModule (index extracted facts for semantic search)
 *  - AccessControlModule + AuditModule (policy + audit)
 *
 * This replaces modules/extraction/ — extraction now lives under ai/ as an
 * AI-owned capability, not a standalone module.
 */
@Module({
  imports: [
    AccessControlModule,
    AuditModule,
    VectorModule,
    PlatformAiModule,
    SystemOneModule,
    DocumentsModule,
    JobsModule,
  ],
  providers: [ExtractionService, ExtractionProcessor],
  exports: [ExtractionService],
})
export class ExtractionsModule {}
