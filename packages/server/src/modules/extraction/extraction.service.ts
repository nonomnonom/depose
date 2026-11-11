import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { FirmActor } from '../../common/request-context.service.js';
import { appConfig } from '../../config/app.config.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  documents,
  extractionRuns,
  factSources,
  facts,
} from '../../infrastructure/database/schema/index.js';
import { PolicyService } from '../access-control/policy.service.js';
import { ModelGatewayService } from '../ai/model-gateway.service.js';
import { DocumentTextService } from '../documents/document-text.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { EXTRACTION_QUEUE } from '../jobs/queue.constants.js';
import { VectorService } from '../search/vector.service.js';

const factTypeValues = [
  'event',
  'statement',
  'admission',
  'denial',
  'intent',
  'relationship',
  'amount',
  'location',
  'other',
] as const;

const datePrecisionValues = ['day', 'month', 'year', 'unknown'] as const;

const candidateSchema = z
  .object({
    text: z.string().trim().min(1).max(4_000),
    factType: z.enum(factTypeValues).default('other'),
    entity: z.string().trim().max(300).nullable().optional(),
    action: z.string().trim().max(300).nullable().optional(),
    object: z.string().trim().max(300).nullable().optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be ISO 8601 or null')
      .nullable()
      .optional(),
    dateText: z.string().trim().max(200).nullable().optional(),
    datePrecision: z.enum(datePrecisionValues).default('unknown'),
    sourceQuote: z.string().trim().min(1).max(8_000),
    confidence: z.coerce.number().min(0).max(1).default(0.5),
  })
  .strict();

function normalize(value: string): string {
  return value
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashQuote(value: string): string {
  return createHash('sha256').update(normalize(value)).digest('hex');
}

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
    private readonly gateway: ModelGatewayService,
    private readonly documentText: DocumentTextService,
    private readonly jobs: JobsService,
    private readonly vector: VectorService,
  ) {}

  async request(
    actor: FirmActor,
    matterId: string,
    input: { documentId?: string },
  ) {
    await this.policy.assertMatter(actor, 'fact.create', matterId);

    const conditions = [
      eq(documents.firmId, actor.firmId),
      eq(documents.matterId, matterId),
      isNull(documents.deletedAt),
    ];
    if (input.documentId) conditions.push(eq(documents.id, input.documentId));

    const rows = await this.db
      .select({
        id: documents.id,
        sha256: documents.sha256,
      })
      .from(documents)
      .where(and(...conditions));

    if (rows.length === 0) {
      return { accepted: false, jobIds: [], message: 'No documents to extract' };
    }

    const version = appConfig.extraction.pipelineVersion;
    const jobIds: string[] = [];
    for (const row of rows) {
      const job = await this.jobs.enqueue({
        firmId: actor.firmId,
        matterId,
        type: EXTRACTION_QUEUE,
        idempotencyKey: `extract:${row.id}:${row.sha256}:${version}`,
        payload: { documentId: row.id, pipelineVersion: version },
        maxAttempts: 2,
        createdBy: actor.userId,
      });
      jobIds.push(job.id);
    }

    return { accepted: true, jobIds };
  }

  async run(documentId: string, jobId: string): Promise<Record<string, unknown>> {
    const [document] = await this.db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    if (!document) throw new Error('Document not found');

    const version = appConfig.extraction.pipelineVersion;
    const [run] = await this.db
      .insert(extractionRuns)
      .values({
        firmId: document.firmId,
        matterId: document.matterId,
        documentId: document.id,
        pipelineVersion: version,
        status: 'running',
        counts: {},
        startedAt: new Date(),
      })
      .returning();

    try {
      await this.jobs.progress(jobId, 15, 'extract_text');
      const ingested = await this.documentText.ingest(document.id);
      if (ingested.status !== 'done' || ingested.pages.length === 0) {
        await this.db
          .update(extractionRuns)
          .set({
            status: 'failed',
            errorCode: 'DOCUMENT_TEXT_UNAVAILABLE',
            finishedAt: new Date(),
            counts: { pages: ingested.pageCount },
          })
          .where(eq(extractionRuns.id, run.id));
        throw new Error('DOCUMENT_TEXT_UNAVAILABLE');
      }

      await this.jobs.progress(jobId, 35, 'candidate_extraction');
      const text = ingested.pages
        .map((page) => `--- page ${page.pageNumber} ---\n${page.text}`)
        .join('\n\n');
      const result = await this.gateway.extractFacts(document.firmId, text);

      await this.jobs.progress(jobId, 65, 'quote_verification');
      const counts = { candidates: result.candidates.length, quote_rejected: 0, schema_rejected: 0, stored: 0 };
      const verified: {
        candidate: z.infer<typeof candidateSchema>;
        pageNumber: number;
        charStart: number;
        charEnd: number;
        sentenceStart: number;
        sentenceEnd: number;
      }[] = [];
      const seen = new Set<string>();

      for (const raw of result.candidates) {
        const parsed = candidateSchema.safeParse(raw);
        if (!parsed.success) {
          counts.schema_rejected += 1;
          continue;
        }
        const candidate = parsed.data;
        const normalizedQuote = normalize(candidate.sourceQuote);
        if (normalizedQuote.length < 24 && candidate.factType !== 'amount' && !candidate.date) {
          counts.quote_rejected += 1;
          continue;
        }

        const page = ingested.pages.find((item) =>
          normalize(item.text).includes(normalizedQuote),
        );
        if (!page) {
          counts.quote_rejected += 1;
          continue;
        }

        const duplicateKey = normalize(candidate.text).toLowerCase();
        if (seen.has(duplicateKey)) continue;
        seen.add(duplicateKey);

        const rawIndex = page.text.indexOf(candidate.sourceQuote);
        const charStart = rawIndex >= 0
          ? rawIndex
          : normalize(page.text).indexOf(normalizedQuote);
        const charEnd = charStart + candidate.sourceQuote.length;
        const before = charStart > 0 ? normalize(page.text).slice(0, charStart) : '';
        const sentenceStart = (before.match(/[.!?](\s|$)/g)?.length ?? 0) + 1;
        const quoteSentences = candidate.sourceQuote.match(/[.!?](\s|$)/g)?.length ?? 0;
        verified.push({
          candidate,
          pageNumber: page.pageNumber,
          charStart: Math.max(0, charStart),
          charEnd: Math.max(0, charEnd),
          sentenceStart,
          sentenceEnd: sentenceStart + quoteSentences,
        });
      }

      await this.jobs.progress(jobId, 85, 'persist');
      const createdFactIds = await this.db.transaction(async (tx) => {
        const insertedIds: string[] = [];
        const existing = await tx
          .select({ id: facts.id })
          .from(facts)
          .innerJoin(factSources, eq(factSources.factId, facts.id))
          .where(
            and(
              eq(factSources.documentId, document.id),
              eq(facts.status, 'proposed'),
            ),
          );
        const proposedIds = [...new Set(existing.map((row) => row.id))];
        if (proposedIds.length > 0) {
          await tx.delete(facts).where(inArray(facts.id, proposedIds));
        }

        for (const item of verified) {
          const [fact] = await tx
            .insert(facts)
            .values({
              firmId: document.firmId,
              matterId: document.matterId,
              text: item.candidate.text,
              normalizedText: normalize(item.candidate.text),
              factType: item.candidate.factType,
              entityLabel: item.candidate.entity ?? null,
              action: item.candidate.action ?? null,
              object: item.candidate.object ?? null,
              dateStart: item.candidate.date ?? null,
              dateText: item.candidate.dateText ?? null,
              datePrecision: item.candidate.datePrecision,
              confidence: item.candidate.confidence,
              status: 'proposed',
              origin: 'extracted',
            })
            .returning();

          await tx.insert(factSources).values({
            firmId: document.firmId,
            matterId: document.matterId,
            factId: fact.id,
            documentId: document.id,
            pageNumber: item.pageNumber,
            sentenceStart: item.sentenceStart,
            sentenceEnd: item.sentenceEnd,
            charStart: item.charStart,
            charEnd: item.charEnd,
            quote: item.candidate.sourceQuote,
            quoteHash: hashQuote(item.candidate.sourceQuote),
            sourceKind: 'extracted',
            verification: 'verified',
            lastSeenAt: new Date(),
          });
          counts.stored += 1;
          insertedIds.push(fact.id);
        }
        return insertedIds;
      });

      await this.vector.indexFacts(createdFactIds);

      await this.db
        .update(extractionRuns)
        .set({
          status: counts.stored > 0 ? 'succeeded' : 'partial',
          counts,
          finishedAt: new Date(),
        })
        .where(eq(extractionRuns.id, run.id));

      return {
        documentId: document.id,
        pipelineVersion: version,
        model: result.model,
        ...counts,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Extraction failed';
      const code = message.includes('DOCUMENT_TEXT_UNAVAILABLE')
        ? 'DOCUMENT_TEXT_UNAVAILABLE'
        : message.includes('EXTRACTION')
          ? 'EXTRACTION_UNAVAILABLE'
          : 'EXTRACTION_FAILED';
      await this.db
        .update(extractionRuns)
        .set({ status: 'failed', errorCode: code, finishedAt: new Date() })
        .where(eq(extractionRuns.id, run.id));
      throw error;
    }
  }
}
