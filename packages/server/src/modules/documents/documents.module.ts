import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { SearchModule } from '../search/search.module.js';
import { VectorModule } from '../vector/vector.module.js';
import { WebhooksModule } from '../webhooks/webhooks.module.js';
import { DocumentChunkService } from './document-chunk.service.js';
import { DocumentTextService } from './document-text.service.js';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';

@Module({
  imports: [AccessControlModule, JobsModule, SearchModule, VectorModule, WebhooksModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentTextService, DocumentChunkService],
  exports: [DocumentsService, DocumentTextService, DocumentChunkService],
})
export class DocumentsModule {}
