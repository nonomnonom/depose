import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { WEBHOOK_QUEUE } from '../jobs/queue.constants.js';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksService } from './webhooks.service.js';

/**
 * Webhooks — firm-level endpoint registration, delivery logs, and event fan-out.
 *
 * `WebhookDeliveryProcessor` lives in WorkerProcessorsModule so an API replica
 * can run with WORKER_ENABLED=false and leave delivery to a worker process.
 */
@Module({
  imports: [
    AccessControlModule,
    AuditModule,
    JobsModule,
    BullModule.registerQueue({ name: WEBHOOK_QUEUE }),
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService, BullModule],
})
export class WebhooksModule {}
