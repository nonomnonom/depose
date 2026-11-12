import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, forwardRef, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { inArray, eq } from 'drizzle-orm';
import { DomainError } from '../../../common/domain-error.js';
import { JobsService } from '../../jobs/jobs.service.js';
import { EmbeddingService } from './embedding.service.js';
import { EMBEDDING_QUEUE } from '../../jobs/queue.constants.js';
import { VectorService } from '../../vector/vector.service.js';
import type { Database } from '../../../infrastructure/database/database.client.js';
import { DATABASE } from '../../../infrastructure/database/database.module.js';
import { matters, documentChunks } from '../../../infrastructure/database/schema/index.js';

// VectorService is provided by VectorModule which imports this module via
// forwardRef; inject it through forwardRef to break the cycle.
function InjectVector(): ParameterDecorator {
  return Inject(forwardRef(() => VectorService));
}

abstract class TrackedProcessor extends WorkerHost {
  protected abstract readonly logger: Logger;

  constructor(protected readonly jobs: JobsService) {
    super();
  }

  protected async start(job: Job): Promise<{ jobId: string; matterId: string }> {
    const payload = job.data as { jobId?: string; matterId?: string };
    if (!payload.jobId || !payload.matterId) {
      throw new DomainError('VALIDATION_ERROR', 400, 'Job payload is missing ids');
    }
    await this.jobs.markRunning(payload.jobId, 'starting');
    return { jobId: payload.jobId, matterId: payload.matterId };
  }

  protected async finish(jobId: string, result: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.jobs.succeed(jobId, result);
    return result;
  }

  protected async recordFailure(jobId: string, error: unknown) {
    const message = error instanceof Error ? error.message : 'Job failed';
    const code = error instanceof DomainError ? error.code : 'INTERNAL_ERROR';
    const retryable = !(error instanceof DomainError) || error.code === 'INTERNAL_ERROR';
    await this.jobs.fail(jobId, code, message.slice(0, 500), retryable);
    this.logger.error(JSON.stringify({ event: 'job.failed', jobId, code, message: message.slice(0, 200) }));
  }
}

@Processor(EMBEDDING_QUEUE)
export class EmbeddingProcessor extends TrackedProcessor {
  protected readonly logger = new Logger(EmbeddingProcessor.name);

  constructor(
    jobs: JobsService,
    private readonly embedding: EmbeddingService,
    @InjectVector() private readonly vector: VectorService,
    @Inject(DATABASE) private readonly db: Database,
  ) {
    super(jobs);
  }

  async process(job: Job): Promise<Record<string, unknown>> {
    const { jobId, matterId } = await this.start(job);
    try {
      const result = await this.processMatterEmbedding(matterId, jobId);
      return await this.finish(jobId, result);
    } catch (error) {
      await this.recordFailure(jobId, error);
      throw error;
    }
  }

  private async processMatterEmbedding(matterId: string, jobId: string): Promise<Record<string, unknown>> {
    const [matter] = await this.db
      .select({ firmId: matters.firmId })
      .from(matters)
      .where(eq(matters.id, matterId))
      .limit(1);
    if (!matter) throw new DomainError('NOT_FOUND', 404, 'Matter not found');

    const chunkIds = await this.embedding.pendingChunkIds(matter.firmId, matterId);
    if (chunkIds.length === 0) {
      return { matterId, chunkIds: 0, embedded: 0 };
    }

    await this.jobs.progress(jobId, 20, 'reading-chunks');

    const batch = await this.db
      .select({
        id: documentChunks.id,
        content: documentChunks.content,
        firmId: documentChunks.firmId,
        matterId: documentChunks.matterId,
        documentId: documentChunks.documentId,
        pageNumber: documentChunks.pageNumber,
        chunkVersion: documentChunks.chunkVersion,
      })
      .from(documentChunks)
      .where(inArray(documentChunks.id, chunkIds));

    if (batch.length === 0) {
      return { matterId, chunkIds: 0, embedded: 0 };
    }

    await this.jobs.progress(jobId, 40, 'embedding');
    const embedResult = await this.embedding.embedResult(batch.map((r) => r.content));
    if (!embedResult) {
      await this.embedding.markChunkFailed(chunkIds);
      await this.jobs.fail(jobId, 'EMBEDDING_UNAVAILABLE', 'Embedding route unavailable', true);
      throw new DomainError('EMBEDDING_UNAVAILABLE', 503, 'Embedding route unavailable');
    }

    try {
      await this.vector.upsertPoints('chunks', batch.map((chunk, index) => ({
        id: chunk.id,
        vector: { dense: embedResult.vectors[index] },
        payload: {
          firmId: chunk.firmId,
          matterId: chunk.matterId,
          documentId: chunk.documentId,
          chunkId: chunk.id,
          pageNumber: chunk.pageNumber,
          chunkVersion: chunk.chunkVersion,
          documentName: null,
          documentStatus: null,
          isPrivileged: false,
          text: chunk.content,
        },
      })));
    } catch (error) {
      await this.embedding.markChunkFailed(chunkIds);
      throw new DomainError(
        'VECTOR_UNAVAILABLE',
        503,
        'The vector index did not accept the embedded chunks',
      );
    }

    await this.embedding.markChunksIndexed(chunkIds);
    await this.jobs.progress(jobId, 100, 'done');
    return { matterId, chunkIds: batch.length, embedded: batch.length };
  }
}
