import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { createHmac } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { appConfig } from '../../config/app.config.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  webhooks,
  webhookDeliveries,
} from '../../infrastructure/database/schema/index.js';
import { decryptSecret } from '../ai/platform/secret-box.js';
import { WEBHOOK_QUEUE } from '../jobs/queue.constants.js';

const DELIVERY_TIMEOUT_MS = 10_000;

@Processor(WEBHOOK_QUEUE)
export class WebhookDeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookDeliveryProcessor.name);

  constructor(@Inject(DATABASE) private readonly db: Database) {
    super();
  }

  async process(job: Job<{ deliveryId: string }>): Promise<Record<string, unknown>> {
    const deliveryId = job.data?.deliveryId;
    if (!deliveryId) throw new Error('Webhook delivery payload is missing deliveryId');

    const [row] = await this.db
      .select({ delivery: webhookDeliveries, webhook: webhooks })
      .from(webhookDeliveries)
      .innerJoin(webhooks, eq(webhooks.id, webhookDeliveries.webhookId))
      .where(
        and(
          eq(webhookDeliveries.id, deliveryId),
          eq(webhookDeliveries.firmId, webhooks.firmId),
        ),
      )
      .limit(1);
    if (!row) {
      this.logger.warn(`Webhook delivery ${deliveryId} no longer exists`);
      return { skipped: true };
    }
    if (row.delivery.status === 'delivered') return { skipped: true, delivered: true };
    if (!row.webhook.enabled) {
      await this.mark(deliveryId, 'dead', row.delivery.attempts + 1, null, 'Webhook disabled');
      return { skipped: true, disabled: true };
    }

    await this.mark(deliveryId, 'delivering', row.delivery.attempts + 1, null, null);

    const timestamp = Math.floor(Date.now() / 1_000).toString();
    const body = JSON.stringify({
      event: row.delivery.event,
      deliveryId,
      createdAt: new Date().toISOString(),
      data: row.delivery.payload,
    });
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Depose-Webhooks/1.0',
      'X-Depose-Event': row.delivery.event,
      'X-Depose-Delivery': deliveryId,
      'X-Depose-Timestamp': timestamp,
    };

    if (row.webhook.secretCiphertext) {
      const encryptionKey = appConfig.ai.encryptionKey;
      if (encryptionKey) {
        const secret = decryptSecret(row.webhook.secretCiphertext, encryptionKey);
        headers['X-Depose-Signature'] = `sha256=${createHmac('sha256', secret)
          .update(`${timestamp}.${body}`)
          .digest('hex')}`;
      }
    }

    let responseStatus: number | null = null;
    try {
      const response = await fetch(row.webhook.url, {
        method: 'POST',
        headers,
        body,
        redirect: 'manual',
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      });
      responseStatus = response.status;
      if (!response.ok) {
        throw new Error(`Endpoint returned ${response.status}`);
      }
      await this.mark(deliveryId, 'delivered', row.delivery.attempts + 1, responseStatus, null);
      return { delivered: true, status: response.status };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delivery failed';
      const attempts = row.delivery.attempts + 1;
      const maxAttempts = Number(job.opts.attempts ?? 5);
      const nextAttempt =
        attempts < maxAttempts ? new Date(Date.now() + 10_000 * 2 ** (attempts - 1)) : null;
      await this.mark(
        deliveryId,
        attempts >= maxAttempts ? 'dead' : 'pending',
        attempts,
        responseStatus,
        message,
        nextAttempt,
      );
      this.logger.warn(
        JSON.stringify({ event: 'webhook.delivery_failed', deliveryId, attempts, message }),
      );
      throw error;
    }
  }

  private async mark(
    deliveryId: string,
    status: 'pending' | 'delivering' | 'delivered' | 'failed' | 'dead',
    attempts: number,
    responseStatus: number | null,
    lastError: string | null,
    nextAttemptAt: Date | null = null,
  ): Promise<void> {
    await this.db
      .update(webhookDeliveries)
      .set({ status, attempts, responseStatus, lastError, nextAttemptAt })
      .where(eq(webhookDeliveries.id, deliveryId));
  }
}
