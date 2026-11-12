import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { DomainError } from '../../../common/domain-error.js';
import { appConfig } from '../../../config/app.config.js';
import { DocumentTextService } from '../../documents/document-text.service.js';
import { JobsService } from '../../jobs/jobs.service.js';
import { OcrService } from './ocr.service.js';
import { OCR_QUEUE } from './ocr.types.js';
import type { Database } from '../../../infrastructure/database/database.client.js';
import { DATABASE } from '../../../infrastructure/database/database.module.js';
import { documentPages } from '../../../infrastructure/database/schema/index.js';

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

  protected async finish(jobId: string, result: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.jobs.succeed(jobId, result);
    return result;
  }

  protected async recordFailure(jobId: string, error: unknown) {
    const message = error instanceof Error ? error.message : 'Job failed';
    const code = error instanceof DomainError ? error.code : 'INTERNAL_ERROR';
    const retryable = !(error instanceof DomainError) || error.code === 'OCR_UNAVAILABLE' || error.code === 'INTERNAL_ERROR';
    await this.jobs.fail(jobId, code, message.slice(0, 500), retryable);
    this.logger.error(JSON.stringify({ event: 'job.failed', jobId, code, message: message.slice(0, 200) }));
  }
}

@Processor(OCR_QUEUE)
export class OcrProcessor extends TrackedProcessor {
  protected readonly logger = new Logger(OcrProcessor.name);

  constructor(
    jobs: JobsService,
    private readonly ocr: OcrService,
    private readonly documentText: DocumentTextService,
    @Inject(DATABASE) private readonly db: Database,
  ) {
    super(jobs);
  }

  async process(job: Job): Promise<Record<string, unknown>> {
    const { jobId, documentId } = await this.start(job);
    try {
      const result = await this.ocrDocumentPages(documentId, jobId);
      return await this.finish(jobId, result);
    } catch (error) {
      await this.recordFailure(jobId, error);
      throw error;
    }
  }

  private async ocrDocumentPages(documentId: string, jobId: string): Promise<Record<string, unknown>> {
    const pages = await this.db
      .select({
        id: documentPages.id,
        pageNumber: documentPages.pageNumber,
        text: documentPages.text,
        charCount: documentPages.charCount,
        firmId: documentPages.firmId,
        matterId: documentPages.matterId,
      })
      .from(documentPages)
      .where(eq(documentPages.documentId, documentId))
      .orderBy(documentPages.pageNumber);

    if (pages.length === 0) {
      await this.jobs.fail(jobId, 'NO_PAGES', 'Document has no pages to OCR', false);
      return { documentId, ocrProcessed: 0 };
    }

    let ocrProcessed = 0;
    let ocrQuoted = 0;
    const results: Array<{ pageNumber: number; text: string; confidence: number | null; source: 'text-layer' | 'ocr' }> = [];

    for (const page of pages) {
      if (page.charCount > appConfig.ocr.minTextChars) {
        results.push({
          pageNumber: page.pageNumber,
          text: page.text,
          confidence: null,
          source: 'text-layer',
        });
        continue;
      }

      const data = await this.documentText.getPageImageForOcr(documentId, page.pageNumber);
      if (!data) {
        results.push({
          pageNumber: page.pageNumber,
          text: page.text,
          confidence: null,
          source: 'text-layer',
        });
        continue;
      }

      const ocrResult = await this.ocr.ocrPage(page.firmId, page.pageNumber, data.image, data.mimeType);
      if (ocrResult.source === 'ocr' && ocrResult.text.trim().length > 0) {
        await this.db
          .update(documentPages)
          .set({
            text: ocrResult.text,
            charCount: ocrResult.text.length,
            ocrBlocks: ocrBlocksPayload(ocrResult),
            ocrConfidence: ocrResult.confidence,
          })
          .where(eq(documentPages.id, page.id));
        ocrProcessed += 1;
        ocrQuoted += ocrResult.text.trim().length > 0 ? 1 : 0;
      }
      results.push({
        pageNumber: page.pageNumber,
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        source: ocrResult.source,
      });
    }

    return {
      documentId,
      ocrProcessed,
      pagesTotal: pages.length,
      pagesWithOcrText: ocrQuoted,
      results,
    };
  }
}

function ocrBlocksPayload(result: { confidence: number | null; blockCount: number }) {
  return [
    {
      type: 'page',
      confidence: result.confidence,
      blockCount: result.blockCount,
    },
  ];
}
