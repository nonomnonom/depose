import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  webhooks,
  webhookDeliveries,
} from '../../infrastructure/database/schema/index.js';
import { PolicyService } from '../access-control/policy.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class WebhooksService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  async listWebhooks(actor: FirmActor, matterId: string) {
    await this.policy.assertMatter(actor, 'output.read', matterId);
    const rows = await this.db
      .select()
      .from(webhooks)
      .where(eq(webhooks.firmId, actor.firmId))
      .orderBy(desc(webhooks.createdAt));
    return { items: rows.map((r) => this.webhookDto(r)) };
  }

  async createWebhook(
    actor: FirmActor,
    matterId: string,
    input: { url: string; events: string[]; secret?: string; enabled?: boolean },
  ) {
    await this.policy.assertMatter(actor, 'output.create', matterId);
    const secretHash =
      input.secret ? createHash('sha256').update(input.secret).digest('hex') : '';
    const [webhook] = await this.db
      .insert(webhooks)
      .values({
        firmId: actor.firmId,
        url: input.url.trim(),
        secretHash,
        events: input.events,
        enabled: input.enabled ?? true,
      })
      .returning();
    await this.audit.log({
      firmId: actor.firmId,
      action: 'webhook.created',
      resourceType: 'webhook',
      resourceId: webhook.id,
      actor,
      metadata: { matterId, url: webhook.url, events: webhook.events },
    });
    return { webhook: this.webhookDto(webhook) };
  }

  async deleteWebhook(actor: FirmActor, webhookId: string) {
    await this.policy.assertMatter(actor, 'output.delete', webhookId);
    const [webhook] = await this.db
      .delete(webhooks)
      .where(and(eq(webhooks.id, webhookId), eq(webhooks.firmId, actor.firmId)))
      .returning();
    if (!webhook) throw DomainError.notFound('Webhook not found');
    await this.audit.log({
      firmId: actor.firmId,
      action: 'webhook.deleted',
      resourceType: 'webhook',
      resourceId: webhookId,
      actor,
      metadata: { url: webhook.url },
    });
    return { deleted: true };
  }

  async listDeliveries(actor: FirmActor, webhookId: string) {
    await this.policy.assertMatter(actor, 'output.read', webhookId);
    const rows = await this.db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookId, webhookId))
      .orderBy(desc(webhookDeliveries.createdAt));
    return { items: rows.map((r) => this.deliveryDto(r)) };
  }

  private webhookDto(row: typeof webhooks.$inferSelect) {
    return {
      id: row.id,
      url: row.url,
      events: row.events,
      enabled: row.enabled,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private deliveryDto(row: typeof webhookDeliveries.$inferSelect) {
    return {
      id: row.id,
      webhookId: row.webhookId,
      event: row.event,
      status: row.status,
      attempts: row.attempts,
      lastError: row.lastError,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
