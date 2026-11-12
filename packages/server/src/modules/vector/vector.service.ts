import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { appConfig } from '../../config/app.config.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  documentChunks,
  documents,
  factSources,
  facts,
} from '../../infrastructure/database/schema/index.js';
import { EmbeddingService } from '../ai/embeding/embedding.service.js';

export interface VectorHit {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

interface Point {
  id: string;
  vector: { dense: number[] };
  payload: Record<string, unknown>;
}

const FACTS = 'facts' as const;
const CHUNKS = 'chunks' as const;

@Injectable()
export class VectorService {
  private readonly logger = new Logger(VectorService.name);
  private ready = false;
  private degradedUntil = 0;

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(forwardRef(() => EmbeddingService)) private readonly embedding: EmbeddingService,
  ) {}

  get configured(): boolean {
    const config = appConfig.retrieval;
    return Boolean(
      config.vectorEnabled &&
        config.embeddingEnabled &&
        config.qdrantUrl &&
        config.embeddingBaseUrl,
    );
  }

  get available(): boolean {
    return this.configured && Date.now() > this.degradedUntil;
  }

  async indexDocument(documentId: string): Promise<{ indexed: number; warning?: string }> {
    if (!this.available) return { indexed: 0, warning: 'vector_unavailable' };
    try {
      await this.ensureCollections();
      const chunks = await this.db
        .select({
          id: documentChunks.id,
          firmId: documentChunks.firmId,
          matterId: documentChunks.matterId,
          documentId: documentChunks.documentId,
          pageNumber: documentChunks.pageNumber,
          content: documentChunks.content,
          chunkVersion: documentChunks.chunkVersion,
        })
        .from(documentChunks)
        .where(eq(documentChunks.documentId, documentId));

      if (chunks.length === 0) return { indexed: 0 };

      const [document] = await this.db
        .select({
          fileName: documents.fileName,
          processingStatus: documents.processingStatus,
        })
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);

      const embeddings = await this.embed(chunks.map((chunk) => chunk.content));
      if (!embeddings) {
        await this.db
          .update(documentChunks)
          .set({ embeddingStatus: 'failed' })
          .where(eq(documentChunks.documentId, documentId));
        return { indexed: 0, warning: 'vector_unavailable' };
      }

      const points: Point[] = chunks.map((chunk, index) => ({
        id: chunk.id,
        vector: { dense: embeddings[index] },
        payload: {
          firmId: chunk.firmId,
          matterId: chunk.matterId,
          documentId: chunk.documentId,
          chunkId: chunk.id,
          pageNumber: chunk.pageNumber,
          chunkVersion: chunk.chunkVersion,
          documentName: document?.fileName ?? null,
          documentStatus: document?.processingStatus ?? null,
          isPrivileged: false,
          text: chunk.content,
        },
      }));
      await this.upsert(CHUNKS, points);
      await this.db
        .update(documentChunks)
        .set({ embeddingStatus: 'indexed' })
        .where(
          inArray(
            documentChunks.id,
            chunks.map((chunk) => chunk.id),
          ),
        );
      return { indexed: points.length };
    } catch (error) {
      this.markDegraded(error);
      return { indexed: 0, warning: 'vector_unavailable' };
    }
  }

  async indexFacts(factIds: string[]): Promise<{ indexed: number; warning?: string }> {
    if (factIds.length === 0) return { indexed: 0 };
    if (!this.available) return { indexed: 0, warning: 'vector_unavailable' };
    try {
      await this.ensureCollections();
      const rows = await this.db
        .select()
        .from(facts)
        .where(inArray(facts.id, factIds));
      if (rows.length === 0) return { indexed: 0 };

      const sourceRows = await this.db
        .select({ factId: factSources.factId, documentId: factSources.documentId })
        .from(factSources)
        .where(
          inArray(
            factSources.factId,
            rows.map((row) => row.id),
          ),
        );

      const embeddings = await this.embed(rows.map((row) => row.text));
      if (!embeddings) return { indexed: 0, warning: 'vector_unavailable' };

      const points: Point[] = rows.map((fact, index) => ({
        id: fact.id,
        vector: { dense: embeddings[index] },
        payload: {
          firmId: fact.firmId,
          matterId: fact.matterId,
          factId: fact.id,
          status: fact.status,
          factType: fact.factType,
          dateStart: fact.dateStart,
          dateEnd: fact.dateEnd,
          confidence: fact.confidence,
          sourceDocumentIds: [
            ...new Set(
              sourceRows
                .filter((source) => source.factId === fact.id)
                .map((source) => source.documentId),
            ),
          ],
          isPrivileged: false,
          text: fact.text,
        },
      }));
      await this.upsert(FACTS, points);
      return { indexed: points.length };
    } catch (error) {
      this.markDegraded(error);
      return { indexed: 0, warning: 'vector_unavailable' };
    }
  }

  async removeFact(factId: string) {
    if (!this.available) return;
    try {
      await this.ensureCollections();
      await this.request('POST', `/collections/${this.collection(FACTS)}/points/delete?wait=true`, {
        points: [factId],
      });
    } catch (error) {
      this.markDegraded(error);
    }
  }

  async search(input: {
    kind: 'facts' | 'chunks';
    firmId: string;
    matterId: string;
    query: string;
    documentIds?: string[];
    limit: number;
    includeProposed?: boolean;
  }): Promise<VectorHit[]> {
    if (!this.available) return [];
    try {
      await this.ensureCollections();
      const embeddings = await this.embed([input.query]);
      if (!embeddings) return [];

      const must: Record<string, unknown>[] = [
        { key: 'firmId', match: { value: input.firmId } },
        { key: 'matterId', match: { value: input.matterId } },
      ];
      if (input.kind === 'facts') {
        must.push({
          key: 'status',
          match: { any: input.includeProposed ? ['confirmed', 'proposed'] : ['confirmed'] },
        });
        if (input.documentIds?.length) {
          must.push({ key: 'sourceDocumentIds', match: { any: input.documentIds } });
        }
      } else if (input.documentIds?.length) {
        must.push({ key: 'documentId', match: { any: input.documentIds } });
      }

      const filter = {
        must,
        must_not: input.kind === 'facts'
          ? [{ key: 'status', match: { any: ['rejected', 'merged'] } }]
          : [],
      };

      const payload = {
        query: embeddings[0],
        using: 'dense',
        filter,
        limit: input.limit,
        with_payload: true,
      };
      const data = await this.request(
        'POST',
        `/collections/${this.collection(input.kind)}/points/query`,
        payload,
      );
      const points = (data.result as { points?: unknown[] })?.points ?? data.result;
      if (!Array.isArray(points)) return [];
      return points.map((point) => {
        const row = point as { id: string; score?: number; payload?: Record<string, unknown> };
        return { id: String(row.id), score: row.score ?? 0, payload: row.payload ?? {} };
      });
    } catch (error) {
      this.markDegraded(error);
      return [];
    }
  }

  private async ensureCollections() {
    if (this.ready) return;
    const size = appConfig.retrieval.embeddingDimension;
    for (const kind of [FACTS, CHUNKS]) {
      const collection = this.collection(kind);
      const existing = await fetch(`${this.baseUrl()}/collections/${collection}`, {
        headers: this.headers(),
      });
      if (!existing.ok) {
        await this.request('PUT', `/collections/${collection}`, {
          vectors: {
            dense: {
              size,
              distance: 'Cosine',
              hnsw_config: { m: 16, ef_construct: 64 },
            },
          },
        });
      }
      await this.request('PUT', '/aliases', {
        actions: [
          {
            create_alias: {
              collection_name: collection,
              alias_name: `${appConfig.retrieval.collectionPrefix}_${kind}_active`,
            },
          },
        ],
      }).catch(() => undefined);
    }
    this.ready = true;
  }

  private collection(kind: 'facts' | 'chunks'): string {
    return `${appConfig.retrieval.collectionPrefix}_${kind}_v1`;
  }

  private baseUrl(): string {
    return (appConfig.retrieval.qdrantUrl ?? '').replace(/\/$/, '');
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(appConfig.retrieval.qdrantApiKey
        ? { 'api-key': appConfig.retrieval.qdrantApiKey }
        : {}),
    };
  }

  private async request(method: string, path: string, body?: unknown) {
    const response = await fetch(`${this.baseUrl()}${path}`, {
      method,
      headers: this.headers(),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Qdrant ${response.status}: ${text.slice(0, 200)}`);
    }
    return (await response.json().catch(() => ({}))) as { result?: unknown };
  }

  private async upsert(kind: 'facts' | 'chunks', points: Point[]) {
    for (let offset = 0; offset < points.length; offset += 64) {
      await this.request(
        'PUT',
        `/collections/${this.collection(kind)}/points?wait=false`,
        { points: points.slice(offset, offset + 64) },
      );
    }
  }

  async embed(texts: string[]): Promise<number[][] | null> {
    return this.embedding.embed(texts);
  }

  async upsertPoints(
    kind: 'facts' | 'chunks',
    points: Array<{
      id: string;
      vector: { dense: number[] };
      payload: Record<string, unknown>;
    }>,
  ): Promise<void> {
    if (!this.available) return;
    try {
      await this.ensureCollections();
      for (let offset = 0; offset < points.length; offset += 64) {
        await this.request(
          'PUT',
          `/collections/${this.collection(kind)}/points?wait=false`,
          { points: points.slice(offset, offset + 64) },
        );
      }
    } catch (error) {
      this.markDegraded(error);
    }
  }

  private markDegraded(error: unknown) {
    this.ready = false;
    this.degradedUntil = Date.now() + 60_000;
    this.logger.warn(
      `Vector search degraded: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
  }
}

export async function factSourceDocuments(db: Database, factId: string) {
  const rows = await db
    .select({ documentId: factSources.documentId })
    .from(factSources)
    .innerJoin(documents, eq(documents.id, factSources.documentId))
    .where(and(eq(factSources.factId, factId), isNull(documents.deletedAt)));
  return rows.map((row) => row.documentId);
}
