import { Inject, Injectable, Logger } from '@nestjs/common';
import { appConfig } from '../../../config/app.config.js';
import type { Database } from '../../../infrastructure/database/database.client.js';
import { DATABASE } from '../../../infrastructure/database/database.module.js';
import { documentChunks } from '../../../infrastructure/database/schema/index.js';
import { and, eq, inArray } from 'drizzle-orm';

export interface EmbedResult {
  vectors: number[][];
  model: string;
  provider: string;
  latencyMs: number;
}

export interface EmbeddingConfig {
  baseUrl?: string;
  apiKey?: string;
  model: string;
  dimension: number;
  timeoutMs: number;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(@Inject(DATABASE) private readonly db: Database) {}

  get configured(): boolean {
    const c = appConfig.retrieval;
    return Boolean(c.vectorEnabled && c.embeddingBaseUrl);
  }

  async embed(texts: string[]): Promise<number[][] | null> {
    if (!this.configured) return null;
    return this.callEmbed(texts.map((t) => t.slice(0, 8_000)));
  }

  async embedResult(texts: string[]): Promise<EmbedResult | null> {
    if (!this.configured) return null;
    const startedAt = Date.now();
    const vectors = await this.callEmbed(texts.map((t) => t.slice(0, 8_000)));
    if (!vectors) return null;
    const c = appConfig.retrieval;
    return {
      vectors,
      model: c.embeddingModel,
      provider: 'embedding-route',
      latencyMs: Date.now() - startedAt,
    };
  }

  private async callEmbed(texts: string[]): Promise<number[][] | null> {
    const config = appConfig.retrieval;
    if (!config.embeddingBaseUrl) return null;
    const timeoutMs = Math.max(5_000, appConfig.ai.timeoutMs);
    const results: number[][] = [];
    for (let offset = 0; offset < texts.length; offset += 32) {
      const batch = texts.slice(offset, offset + 32);
      const response = await fetch(`${config.embeddingBaseUrl.replace(/\/$/, '')}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.embeddingApiKey ? { Authorization: `Bearer ${config.embeddingApiKey}` } : {}),
        },
        body: JSON.stringify({ model: config.embeddingModel, input: batch }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        this.logger.warn(`Embedding route returned ${response.status}`);
        return null;
      }
      const payload = (await response.json()) as { data?: { embedding?: number[] }[] };
      for (const item of payload.data ?? []) {
        if (!item.embedding) return null;
        results.push(item.embedding);
      }
    }
    return results.length === texts.length ? results : null;
  }

  async pendingChunkIds(firmId: string, matterId: string, limit = 256): Promise<string[]> {
    const rows = await this.db
      .select({ id: documentChunks.id })
      .from(documentChunks)
      .where(
        and(
          eq(documentChunks.firmId, firmId),
          eq(documentChunks.matterId, matterId),
          eq(documentChunks.embeddingStatus, 'pending'),
        ),
      )
      .limit(limit);
    return rows.map((r) => r.id);
  }

  async markChunkFailed(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db
      .update(documentChunks)
      .set({ embeddingStatus: 'failed' })
      .where(inArray(documentChunks.id, ids));
  }

  async markChunksIndexed(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db
      .update(documentChunks)
      .set({ embeddingStatus: 'indexed' })
      .where(inArray(documentChunks.id, ids));
  }
}
