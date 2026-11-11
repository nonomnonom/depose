import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksService } from './webhooks.service.js';

/**
 * Webhooks — webhook endpoint management and delivery tracking.
 *
 * Schema tables (owned here, defined in platform.ts):
 *  - webhooks (firm-level webhook registrations with secretHash)
 *  - webhookDeliveries (delivery attempt logs per webhook)
 *
 * Dependencies:
 *  - AccessControlModule (policy assertions)
 *  - AuditModule (change logging + secret hashing)
 *
 * This module does NOT own event dispatch — that is triggered by domain
 * events in other modules. It only owns endpoint CRUD and delivery logs.
 */
@Module({
  imports: [AccessControlModule, AuditModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
