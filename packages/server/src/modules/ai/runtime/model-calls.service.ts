import { Inject, Injectable } from '@nestjs/common';
import type { Database } from '../../../infrastructure/database/database.client.js';
import { DATABASE } from '../../../infrastructure/database/database.module.js';
import { modelCalls } from '../../../infrastructure/database/schema/index.js';

export interface ModelCallRecord {
  firmId: string;
  routeKey: string;
  capability: 'completion' | 'decision' | 'extraction' | 'ocr' | 'transcription';
  connectionId?: string | null;
  provider: string;
  model: string;
  status: 'succeeded' | 'failed';
  latencyMs?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsd?: string | null;
  degraded?: boolean;
  errorCode?: string | null;
  workflowRunId?: string | null;
  messageId?: string | null;
}

/**
 * Model call accounting. This is the only writer of `model_calls`, so usage
 * and cost reporting has one owner instead of every caller inserting rows.
 */
@Injectable()
export class ModelCallsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async record(record: ModelCallRecord): Promise<void> {
    await this.db.insert(modelCalls).values({
      firmId: record.firmId,
      routeKey: record.routeKey,
      capability: record.capability,
      provider: record.provider,
      model: record.model,
      status: record.status,
      latencyMs: record.latencyMs ?? null,
      inputTokens: record.inputTokens ?? null,
      outputTokens: record.outputTokens ?? null,
      costUsd: record.costUsd ?? null,
      degraded: record.degraded ?? false,
      errorCode: record.errorCode ?? null,
      workflowRunId: record.workflowRunId ?? null,
      messageId: record.messageId ?? null,
    });
  }
}
