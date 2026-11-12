import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { and, desc, eq, lt } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import { documents, jobs } from '../../infrastructure/database/schema/index.js';
import { AuditService } from '../audit/audit.service.js';import {
  EMBEDDING_QUEUE,
  EXTRACTION_QUEUE,
  INGEST_QUEUE,
  OCR_QUEUE,
} from './queue.constants.js';



export interface EnqueueJobInput {
  firmId: string;
  matterId?: string | null;
  type: typeof INGEST_QUEUE | typeof EXTRACTION_QUEUE | typeof OCR_QUEUE | typeof EMBEDDING_QUEUE;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  maxAttempts?: number;
  createdBy?: string;
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @InjectQueue(INGEST_QUEUE) private readonly ingestQueue: Queue,
    @InjectQueue(EXTRACTION_QUEUE) private readonly extractionQueue: Queue,
    @InjectQueue(OCR_QUEUE) private readonly ocrQueue: Queue,
    @InjectQueue(EMBEDDING_QUEUE) private readonly embeddingQueue: Queue,
    private readonly audit: AuditService,
  ) {}

  async enqueue(input: EnqueueJobInput) {
    const [existing] = await this.db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.firmId, input.firmId),
          eq(jobs.jobKey, input.type),
          eq(jobs.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);

    if (existing) {
      if (existing.status === 'succeeded') return this.toDto(existing);
      if (existing.status === 'dead') {
        throw DomainError.conflict(
          'JOB_DEAD',
          'This job is dead-lettered. Re-run with a new idempotency key after review.',
        );
      }
      return this.toDto(existing);
    }

    /* Two requests with the same idempotency key can race between the lookup
     * above and this insert; the unique index decides, not the reader. */
    const [created] = await this.db
      .insert(jobs)
      .values({
        firmId: input.firmId,
        matterId: input.matterId ?? null,
        jobKey: input.type,
        queueName: input.type,
        idempotencyKey: input.idempotencyKey,
        payload: input.payload,
        status: 'queued',
        maxAttempts: input.maxAttempts ?? (input.type === EXTRACTION_QUEUE ? 2 : 3),
        createdBy: input.createdBy ?? 'system',
      })
      .onConflictDoNothing()
      .returning();

    if (!created) {
      const [winner] = await this.db
        .select()
        .from(jobs)
        .where(
          and(
            eq(jobs.firmId, input.firmId),
            eq(jobs.jobKey, input.type),
            eq(jobs.idempotencyKey, input.idempotencyKey),
          ),
        )
        .limit(1);
      if (!winner) throw DomainError.internalServerError('Could not enqueue job');
      return this.toDto(winner);
    }

    const queue =
      input.type === INGEST_QUEUE
        ? this.ingestQueue
        : input.type === EXTRACTION_QUEUE
          ? this.extractionQueue
          : input.type === OCR_QUEUE
            ? this.ocrQueue
            : this.embeddingQueue;
    try {
      await queue.add(input.type, { jobId: created.id, ...input.payload }, {
        jobId: created.id,
        attempts: created.maxAttempts,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: false,
        removeOnFail: false,
      });
    } catch (error) {
      await this.db
        .update(jobs)
        .set({
          status: 'dead',
          stage: 'dead',
          errorCode: 'INTERNAL_ERROR',
          errorMessage: 'Could not reach the job queue',
          finishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, created.id));
      throw error;
    }

    this.logger.log(
      JSON.stringify({
        event: 'job.enqueued',
        jobId: created.id,
        firmId: created.firmId,
        matterId: created.matterId,
        type: input.type,
      }),
    );
    return this.toDto(created);
  }

  async enqueueOcrJob(documentId: string): Promise<void> {
    const [doc] = await this.db
      .select({ firmId: documents.firmId, matterId: documents.matterId })
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    await this.enqueue({
      firmId: doc?.firmId ?? '00000000-0000-0000-0000-000000000000',
      matterId: doc?.matterId ?? null,
      type: OCR_QUEUE,
      idempotencyKey: `ocr:${documentId}`,
      payload: { documentId },
      maxAttempts: 3,
      createdBy: 'system',
    });
  }

  async enqueueEmbeddingJob(matterId: string, firmId: string): Promise<void> {
    await this.enqueue({
      firmId,
      matterId,
      type: EMBEDDING_QUEUE,
      idempotencyKey: `embedding:${matterId}`,
      payload: { matterId },
      maxAttempts: 3,
      createdBy: 'system',
    });
  }

  async get(actor: FirmActor, jobId: string) {
    const [row] = await this.db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.firmId, actor.firmId)))
      .limit(1);
    if (!row) throw DomainError.notFound('Job not found');
    return this.toDto(row);
  }

  async list(
    actor: FirmActor,
    query: { status?: string; type?: string; cursor?: string; limit?: number },
  ) {
    const limit = query.limit ?? 30;
    const conditions = [eq(jobs.firmId, actor.firmId)];
    if (query.status) {
      conditions.push(
        eq(jobs.status, query.status as typeof jobs.$inferSelect.status),
      );
    }
    if (query.type) conditions.push(eq(jobs.jobKey, query.type));
    if (query.cursor) conditions.push(lt(jobs.createdAt, new Date(query.cursor)));

    const rows = await this.db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(jobs.createdAt))
      .limit(limit + 1);
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);
    return {
      items: items.map((row) => this.toDto(row)),
      nextCursor: hasMore ? items.at(-1)?.createdAt.toISOString() ?? null : null,
    };
  }

  async cancel(actor: FirmActor, jobId: string) {
    const [row] = await this.db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.firmId, actor.firmId)))
      .limit(1);
    if (!row) throw DomainError.notFound('Job not found');
    if (row.status !== 'queued' && row.status !== 'running') {
      return this.toDto(row);
    }
    const [updated] = await this.db
      .update(jobs)
      .set({ status: 'cancelled', finishedAt: new Date(), updatedAt: new Date() })
      .where(eq(jobs.id, row.id))
      .returning();
    const queue =
      row.queueName === INGEST_QUEUE
        ? this.ingestQueue
        : row.queueName === EXTRACTION_QUEUE
          ? this.extractionQueue
          : row.queueName === OCR_QUEUE
            ? this.ocrQueue
            : this.embeddingQueue;
    await queue.remove(jobId).catch(() => undefined);
    await this.audit.log({
      firmId: actor.firmId,
      action: 'job.cancelled',
      resourceType: 'job',
      resourceId: jobId,
      actor,
    });
    return this.toDto(updated);
  }

  async markRunning(jobId: string, stage: string) {
    await this.db
      .update(jobs)
      .set({
        status: 'running',
        stage,
        progress: 5,
        startedAt: new Date(),
        attempts: (await this.currentAttempts(jobId)) + 1,
        leaseExpiresAt: new Date(Date.now() + 5 * 60_000),
        leaseOwner: 'worker',
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId));
  }

  async progress(jobId: string, progress: number, stage: string) {
    await this.db
      .update(jobs)
      .set({
        progress,
        stage,
        leaseExpiresAt: new Date(Date.now() + 5 * 60_000),
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId));
  }

  async succeed(jobId: string, result: Record<string, unknown>) {
    await this.db
      .update(jobs)
      .set({
        status: 'succeeded',
        progress: 100,
        stage: 'succeeded',
        result,
        finishedAt: new Date(),
        updatedAt: new Date(),
        leaseOwner: null,
        leaseExpiresAt: null,
      })
      .where(eq(jobs.id, jobId));
  }

  async fail(jobId: string, code: string, message: string, retryable: boolean) {
    const [row] = await this.db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);
    if (!row) return;
    const attemptsLeft = row.attempts < row.maxAttempts;
    await this.db
      .update(jobs)
      .set({
        status: retryable && attemptsLeft ? 'queued' : 'dead',
        stage: retryable && attemptsLeft ? 'retry' : 'dead',
        errorCode: code,
        errorMessage: message,
        finishedAt: retryable && attemptsLeft ? null : new Date(),
        leaseOwner: null,
        leaseExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId));
  }

  toDto(row: typeof jobs.$inferSelect) {
    return {
      id: row.id,
      type: row.jobKey,
      matterId: row.matterId,
      status: row.status,
      progress: row.progress,
      stage: row.stage,
      attempts: row.attempts,
      maxAttempts: row.maxAttempts,
      result: row.result ?? null,
      error: row.errorCode
        ? { code: row.errorCode, message: row.errorMessage }
        : null,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async currentAttempts(jobId: string): Promise<number> {
    const [row] = await this.db
      .select({ attempts: jobs.attempts })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);
    return row?.attempts ?? 0;
  }
}
