import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { createHash } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import { assertSafeOutboundUrl } from '../../common/outbound-url.js';
import type { FirmActor } from '../../common/request-context.service.js';
import { appConfig } from '../../config/app.config.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  webhooks,
  webhookDeliveries,
} from '../../infrastructure/database/schema/index.js';
import { encryptSecret } from '../../common/secret-box.js';
import { PolicyService } from '../access-control/policy.service.js';
import { AuditService } from '../audit/audit.service.js';
import { WEBHOOK_QUEUE } from '../jobs/queue.constants.js';

export const WEBHOOK_EVENTS = [
  'document.processed',
  'facts.extracted',
  'inconsistencies.detected',
  'output.finalized',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface CreateWebhookInput {
  url: string;
  events: string[];
  secret?: string;
  enabled?: boolean;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
    @InjectQueue(WEBHOOK_QUEUE) private readonly queue: Queue,
  ) {}

  async listWebhooks(actor: FirmActor, matterId: string) {
    await this.policy.assertMatter(actor, 'output.read', matterId);
    const rows = await this.db
      .select()
      .from(webhooks)
      .where(eq(webhooks.firmId, actor.firmId))
      .orderBy(desc(webhooks.createdAt));
    return { items: rows.map((row) => this.webhookDto(row)) };
  }

  async createWebhook(actor: FirmActor, matterId: string, input: CreateWebhookInput) {
    await this.policy.assertMatter(actor, 'output.read', matterId);
    this.policy.assertFirm(actor, 'firm.mcp.manage');

    const url = await assertSafeOutboundUrl(input.url.trim());
    const events = [...new Set(input.events)];
    const unknownEvent = events.find(
      (event) => !(WEBHOOK_EVENTS as readonly string[]).includes(event),
    );
    if (unknownEvent) {
      throw DomainError.validation(`Unknown webhook event: ${unknownEvent}`);
    }

    let secretCiphertext: string | null = null;
    if (input.secret) {
      const encryptionKey = appConfig.webhooks.encryptionKey;
      if (!encryptionKey) {
        throw DomainError.internalServerError(
          'AI_SECRET_ENCRYPTION_KEY is required before a webhook secret can be stored',
        );
      }
      secretCiphertext = encryptSecret(input.secret, encryptionKey);
    }

    const [webhook] = await this.db
      .insert(webhooks)
      .values({
        firmId: actor.firmId,
        url: url.toString(),
        secretHash: input.secret
          ? createHash('sha256').update(input.secret).digest('hex')
          : '',
        secretCiphertext,
        events,
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

  async deleteWebhook(actor: FirmActor, matterId: string, webhookId: string) {
    await this.policy.assertMatter(actor, 'output.read', matterId);
    this.policy.assertFirm(actor, 'firm.mcp.manage');

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

  async listDeliveries(actor: FirmActor, matterId: string, webhookId: string) {
    await this.policy.assertMatter(actor, 'output.read', matterId);
    const [webhook] = await this.db
      .select({ id: webhooks.id })
      .from(webhooks)
      .where(and(eq(webhooks.id, webhookId), eq(webhooks.firmId, actor.firmId)))
      .limit(1);
    if (!webhook) throw DomainError.notFound('Webhook not found');

    const rows = await this.db
      .select()
      .from(webhookDeliveries)
      .where(
        and(
          eq(webhookDeliveries.webhookId, webhookId),
          eq(webhookDeliveries.firmId, actor.firmId),
        ),
      )
      .orderBy(desc(webhookDeliveries.createdAt));
    return { items: rows.map((row) => this.deliveryDto(row)) };
  }

  /**
   * Fan an event out to every enabled webhook that subscribes to it. Delivery is
   * queued, so a slow customer endpoint never blocks the domain operation. This
   * method never throws: a webhook failure must not fail the ingest or analysis
   * that produced the event.
   */
  async dispatch(
    firmId: string,
    event: WebhookEvent,
    data: Record<string, unknown>,
  ): Promise<void> {
    try {
      const rows = await this.db
        .select({ id: webhooks.id })
        .from(webhooks)
        .where(
          and(
            eq(webhooks.firmId, firmId),
            eq(webhooks.enabled, true),
            sql`${webhooks.events} @> ARRAY[${event}]::text[]`,
          ),
        );

      for (const webhook of rows) {
        const [delivery] = await this.db
          .insert(webhookDeliveries)
          .values({
            firmId,
            webhookId: webhook.id,
            event,
            payload: data,
            status: 'pending',
          })
          .returning();

        await this.queue.add(
          'webhook.delivery',
          { deliveryId: delivery.id },
          {
            jobId: delivery.id,
            attempts: 5,
            backoff: { type: 'exponential', delay: 10_000 },
            removeOnComplete: 1_000,
            removeOnFail: 1_000,
          },
        );
      }
    } catch (error) {
      this.logger.warn(
        `Webhook dispatch failed for ${event}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private webhookDto(row: typeof webhooks.$inferSelect) {
    return {
      id: row.id,
      url: row.url,
      events: row.events,
      enabled: row.enabled,
      hasSecret: Boolean(row.secretCiphertext),
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
      responseStatus: row.responseStatus,
      lastError: row.lastError,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
