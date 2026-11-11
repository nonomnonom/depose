import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import { z } from 'zod';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import { documentChunks, documents, facts } from '../../infrastructure/database/schema/index.js';
import { PolicyService } from '../access-control/policy.service.js';
import { VectorService } from '../vector/vector.service.js';

const answerSchema = z.object({
  answer: z.string(),
  citedSourceIds: z.array(z.string()),
  confidence: z.enum(['low', 'medium', 'high']),
  insufficientEvidence: z.boolean(),
});

export interface EvidenceSource {
  id: string;
  type: 'chunk' | 'fact';
  documentId?: string;
  fileName?: string;
  chunkIndex?: number | null;
  pageNumber?: number | null;
  sentenceStart?: number | null;
  sentenceEnd?: number | null;
  excerpt: string;
}

function searchTerms(q: string): string[] {
  return [...new Set(q.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(t => t.length > 3))].slice(0, 8);
}

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
    private readonly vector: VectorService,
  ) {}

  async chronology(actor: FirmActor, matterId: string) {
    await this.policy.assertMatter(actor, 'fact.read', matterId);
    const rows = await this.db
      .select()
      .from(facts)
      .where(and(eq(facts.firmId, actor.firmId), eq(facts.matterId, matterId)))
      .orderBy(desc(facts.createdAt))
      .limit(200);
    return {
      items: rows.map(f => ({
        id: f.id,
        text: f.text,
        factType: f.factType,
        entityLabel: f.entityLabel,
        dateStart: f.dateStart,
        dateEnd: f.dateEnd,
        datePrecision: f.datePrecision,
        dateText: f.dateText,
        confidence: f.confidence,
        status: f.status,
        createdBy: f.createdBy,
        createdAt: f.createdAt.toISOString(),
      })),
    };
  }

  async contradictions(actor: FirmActor, matterId: string) {
    await this.policy.assertMatter(actor, 'fact.read', matterId);
    const matterFacts = await this.db
      .select()
      .from(facts)
      .where(and(eq(facts.firmId, actor.firmId), eq(facts.matterId, matterId)))
      .limit(200);
    return { contradictions: matterFacts.length >= 2 ? [] : [] };
  }

  async ask(actor: FirmActor, matterId: string, question: string, threadId?: string) {
    await this.policy.assertMatter(actor, 'fact.read', matterId);
    const sources = await this.retrieve(matterId, question);
    if (sources.length === 0) {
      return { answer: 'No indexed evidence matches this question yet.', confidence: 'low' as const, insufficientEvidence: true, sources: [], threadId };
    }
    const result = await this.analyze(question, answerSchema);
    return { ...result, sources, threadId };
  }

  async realtimeCheck(actor: FirmActor, matterId: string, question: string, threadId?: string) {
    await this.policy.assertMatter(actor, 'fact.read', matterId);
    const sources = await this.retrieve(matterId, question);
    if (sources.length === 0) {
      return { answer: 'No indexed evidence available for this check.', confidence: 'low' as const, insufficientEvidence: true, sources: [], threadId };
    }
    const result = await this.analyze(question, answerSchema);
    return { ...result, sources, threadId };
  }

  private async retrieve(matterId: string, question: string): Promise<EvidenceSource[]> {
    const semantic = await this.retrieveSemantic(matterId, question);
    if (semantic.length > 0) return semantic;
    return this.retrieveKeyword(matterId, question);
  }

  private async retrieveSemantic(matterId: string, question: string): Promise<EvidenceSource[]> {
    if (!this.vector.available) return [];
    try {
      const hits = await this.vector.search({ kind: 'chunks', firmId: 'firm-id', matterId, query: question, limit: 6 });
      if (hits.length === 0) return [];
      const chunkIds = hits.map(h => h.id);
      const rows = await this.db
        .select({
          id: documentChunks.id,
          documentId: documentChunks.documentId,
          fileName: documents.fileName,
          chunkIndex: documentChunks.chunkIndex,
          pageNumber: documentChunks.pageNumber,
          content: documentChunks.content,
        })
        .from(documentChunks)
        .innerJoin(documents, eq(documentChunks.documentId, documents.id))
        .where(and(eq(documentChunks.matterId, matterId), inArray(documentChunks.id, chunkIds)));
      const byId = new Map(rows.map(r => [r.id, r]));
      return hits.map(hit => byId.get(hit.id)).filter((r): r is NonNullable<typeof r> => Boolean(r)).map(r => ({
        id: r.id, type: 'chunk' as const, documentId: r.documentId, fileName: r.fileName ?? undefined,
        chunkIndex: r.chunkIndex, pageNumber: r.pageNumber, excerpt: r.content.slice(0, 800),
      }));
    } catch (error) {
      this.logger.warn('Semantic retrieval failed: ' + (error instanceof Error ? error.message : String(error)));
      return [];
    }
  }

  private async retrieveKeyword(matterId: string, question: string): Promise<EvidenceSource[]> {
    const terms = searchTerms(question);
    const chunkRows = await this.db
      .select({
        id: documentChunks.id,
        documentId: documentChunks.documentId,
        fileName: documents.fileName,
        chunkIndex: documentChunks.chunkIndex,
        pageNumber: documentChunks.pageNumber,
        content: documentChunks.content,
      })
      .from(documentChunks)
      .innerJoin(documents, eq(documentChunks.documentId, documents.id))
      .where(and(
        eq(documentChunks.matterId, matterId),
        terms.length > 0 ? or(...terms.map(t => ilike(documentChunks.content, '%' + t + '%'))) : undefined,
      ))
      .limit(6);
    const sources: EvidenceSource[] = chunkRows.map(c => ({
      id: c.id, type: 'chunk' as const, documentId: c.documentId, fileName: c.fileName ?? undefined,
      chunkIndex: c.chunkIndex, pageNumber: c.pageNumber, excerpt: c.content.slice(0, 800),
    }));
    if (sources.length === 0) {
      const matterFacts = await this.db.select().from(facts).where(eq(facts.matterId, matterId)).limit(20);
      for (const f of matterFacts) {
        sources.push({
          id: f.id, type: 'fact' as const, excerpt: [
            f.dateStart, f.text,
            f.entityLabel ? 'entityLabel: ' + f.entityLabel : undefined,
            f.action ? 'action: ' + f.action : undefined,
            f.object ? 'object: ' + f.object : undefined,
          ].filter(Boolean).join(' — '),
        });
      }
    }
    return sources;
  }

  private async analyze<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
    throw new DomainError('AI_PROVIDER_UNAVAILABLE', 503, 'LLM analysis is not configured. Set up the AI platform module first.');
  }
}
