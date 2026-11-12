import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { appConfig } from '../../config/app.config.js';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';
import {
  EMBEDDING_QUEUE,
  EXTRACTION_QUEUE,
  INGEST_QUEUE,
  OCR_QUEUE,
} from './queue.constants.js';

@Module({
  imports: [
    BullModule.forRoot({
      connection: { url: appConfig.redisUrl },
      defaultJobOptions: {
        removeOnComplete: 500,
        removeOnFail: 500,
      },
    }),
    BullModule.registerQueue(
      { name: INGEST_QUEUE },
      { name: EXTRACTION_QUEUE },
      { name: OCR_QUEUE },
      { name: EMBEDDING_QUEUE },
    ),
    DatabaseModule,
    AccessControlModule,
    AuditModule,
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService, BullModule],
})
export class JobsModule {}
