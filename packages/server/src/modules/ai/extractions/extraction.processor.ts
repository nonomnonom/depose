import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { DomainError } from '../../../common/domain-error.js';
import { JobsService } from '../../jobs/jobs.service.js';
import { EXTRACTION_QUEUE } from '../../jobs/queue.constants.js';
import { WebhooksService } from '../../webhooks/webhooks.service.js';
import { ExtractionService } from './extraction.service.js';

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

@Processor(EXTRACTION_QUEUE)
export class ExtractionProcessor extends TrackedProcessor {
  protected readonly logger = new Logger(ExtractionProcessor.name);

  constructor(
    jobs: JobsService,
    private readonly extraction: ExtractionService,
    private readonly webhooks: WebhooksService,
  ) {
    super(jobs);
  }

  async process(job: Job): Promise<Record<string, unknown>> {
    const { jobId, documentId } = await this.start(job);
    try {
      const result = await this.extraction.run(documentId, jobId);
      const firmId = result.firmId as string | undefined;
      const matterId = result.matterId as string | undefined;
      if (firmId) {
        await this.webhooks.dispatch(firmId, 'facts.extracted', {
          documentId,
          matterId,
          stored: result.stored,
          candidates: result.candidates,
        });
      }
      return await this.finish(jobId, result);
    } catch (error) {
      await this.recordFailure(jobId, error);
      throw error;
    }
  }
}
