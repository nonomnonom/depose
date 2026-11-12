import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { DomainError } from '../../common/domain-error.js';
import { DocumentChunkService } from './document-chunk.service.js';
import { DocumentTextService } from './document-text.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { OcrService } from '../ai/ocr/ocr.service.js';
import { VectorService } from '../vector/vector.service.js';
import { WebhooksService } from '../webhooks/webhooks.service.js';
import { INGEST_QUEUE } from '../jobs/queue.constants.js';

abstract class TrackedProcessor extends WorkerHost {
  protected abstract readonly logger: Logger;

  constructor(protected readonly jobs: JobsService) {
    super();
  }

  protected async start(job: Job): Promise<{ jobId: string; documentId: string }> {
    const payload = job.data as { jobId?: string; documentId?: string };
    if (!payload.jobId || !payload.documentId) {
      throw new DomainError('VALIDATION_ERROR', 400, 'Job payload is missing ids');
    }
    await this.jobs.markRunning(payload.jobId, 'starting');
    return { jobId: payload.jobId, documentId: payload.documentId };
  }

  protected async finish(
    jobId: string,
    result: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    await this.jobs.succeed(jobId, result);
    return result;
  }

  protected async recordFailure(jobId: string, error: unknown) {
    const message = error instanceof Error ? error.message : 'Job failed';
    const code =
      error instanceof DomainError
        ? error.code
        : message.includes('DOCUMENT_TEXT_UNAVAILABLE')
          ? 'DOCUMENT_TEXT_UNAVAILABLE'
          : 'INTERNAL_ERROR';
    const retryable =
      !(error instanceof DomainError) ||
      error.code === 'EXTRACTION_UNAVAILABLE' ||
      error.code === 'INTERNAL_ERROR';
    await this.jobs.fail(jobId, code, message.slice(0, 500), retryable);
    this.logger.error(
      JSON.stringify({ event: 'job.failed', jobId, code, message: message.slice(0, 200) }),
    );
  }
}

@Processor(INGEST_QUEUE)
export class IngestProcessor extends TrackedProcessor {
  protected readonly logger = new Logger(IngestProcessor.name);

  constructor(
    jobs: JobsService,
    private readonly documentText: DocumentTextService,
    private readonly chunks: DocumentChunkService,
    private readonly vector: VectorService,
    private readonly ocr: OcrService,
    private readonly webhooks: WebhooksService,
  ) {
    super(jobs);
  }

  async process(job: Job): Promise<Record<string, unknown>> {
    const { jobId, documentId } = await this.start(job);
    try {
      const result = await this.documentText.ingest(documentId);

      if (result.status === 'needs_review' && result.ocrRequired) {
        if (this.ocr.configured) {
          await this.jobs.progress(jobId, 50, 'enqueueing-ocr');
          await this.jobs.enqueueOcrJob(documentId);
          await this.webhooks.dispatch(result.firmId, 'document.processed', {
            documentId,
            matterId: result.matterId,
            pageCount: result.pageCount,
            status: result.status,
            reason: result.reason,
            ocrQueued: true,
          });
          return await this.finish(jobId, {
            documentId,
            pageCount: result.pageCount,
            status: result.status,
            reason: result.reason,
            ocrQueued: true,
          });
        }
        await this.webhooks.dispatch(result.firmId, 'document.processed', {
          documentId,
          matterId: result.matterId,
          pageCount: result.pageCount,
          status: result.status,
          reason: result.reason,
          ocrQueued: false,
        });
        return await this.finish(jobId, {
          documentId,
          pageCount: result.pageCount,
          status: result.status,
          reason: result.reason,
          ocrQueued: false,
        });
      }

      let chunkCount = 0;
      let embeddingEnqueued = false;
      if (result.status === 'done') {
        await this.jobs.progress(jobId, 60, 'chunking');
        chunkCount = await this.chunks.rebuild(documentId);
        await this.jobs.progress(jobId, 80, 'enqueueing-embedding');
        await this.jobs.enqueueEmbeddingJob(result.matterId, result.firmId);
        embeddingEnqueued = true;
      }      await this.webhooks.dispatch(result.firmId, 'document.processed', {
        documentId,
        matterId: result.matterId,
        pageCount: result.pageCount,
        status: result.status,
        chunks: chunkCount,
      });

      return await this.finish(jobId, {
        documentId,
        pageCount: result.pageCount,
        status: result.status,
        chunks: chunkCount,
        embeddingEnqueued,
      });
    } catch (error) {
      await this.recordFailure(jobId, error);
      throw error;
    }
  }
}



