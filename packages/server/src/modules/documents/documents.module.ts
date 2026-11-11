import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { DocumentTextService } from './document-text.service.js';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';

@Module({
  imports: [AccessControlModule, JobsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentTextService],
  exports: [DocumentsService, DocumentTextService],
})
export class DocumentsModule {}
