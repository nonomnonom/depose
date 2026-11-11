import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { and, desc, eq, ilike, isNull, lt } from 'drizzle-orm';
import { basename, extname } from 'node:path';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  documents,
  documentPages,
} from '../../infrastructure/database/schema/index.js';
import { StorageService } from '../../infrastructure/storage/storage.service.js';
import { PolicyService } from '../access-control/policy.service.js';
import { AuditService } from '../audit/audit.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { INGEST_QUEUE } from '../jobs/queue.constants.js';
import type { ListDocumentsQuery, UploadDocumentInput } from './documents.dto.js';

const MAX_BYTES = 100 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.rtf': 'application/rtf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.eml': 'message/rfc822',
  '.msg': 'application/vnd.ms-outlook',
};

const ALLOWED_MIME = new Set(Object.values(MIME_BY_EXTENSION));

function safeFileName(value: string): string {
  const name = basename(value)
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim();
  return name.slice(0, 240) || 'document';
}

function inferMime(fileName: string, provided: string | undefined): string {
  if (provided && ALLOWED_MIME.has(provided)) return provided;
  return MIME_BY_EXTENSION[extname(fileName).toLowerCase()] ?? provided ?? '';
}

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly storage: StorageService,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
    private readonly jobs: JobsService,
  ) {}

  async list(actor: FirmActor, matterId: string, query: ListDocumentsQuery) {
    await this.policy.assertMatter(actor, 'document.read', matterId);
    const limit = query.limit ?? 30;
    const conditions = [
      eq(documents.firmId, actor.firmId),
      eq(documents.matterId, matterId),
      isNull(documents.deletedAt),
    ];
    if (query.status) conditions.push(eq(documents.processingStatus, query.status));
    if (query.q) conditions.push(ilike(documents.fileName, `%${query.q}%`));
    if (query.cursor) conditions.push(lt(documents.createdAt, new Date(query.cursor)));

    const rows = await this.db
      .select()
      .from(documents)
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);
    return {
      items: items.map((row) => this.toDto(row, false)),
      nextCursor: hasMore ? items.at(-1)?.createdAt.toISOString() ?? null : null,
    };
  }

  async get(actor: FirmActor, matterId: string, documentId: string) {
    await this.policy.assertMatter(actor, 'document.read', matterId);
    const row = await this.requireDocument(actor, matterId, documentId);
    return this.toDto(row, false);
  }

  async upload(actor: FirmActor, matterId: string, input: UploadDocumentInput) {
    await this.policy.assertMatter(actor, 'document.upload', matterId);
    if (input.data.length === 0) throw DomainError.validation('The file is empty');
    if (input.data.length > MAX_BYTES) {
      throw DomainError.validation('Files are limited to 100 MB');
    }

    const fileName = safeFileName(input.fileName);
    const mimeType = inferMime(fileName, input.mimeType);
    if (!ALLOWED_MIME.has(mimeType)) {
      throw DomainError.validation('Unsupported file type');
    }

    const sha256 = createHash('sha256').update(input.data).digest('hex');
    const [existing] = await this.db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.firmId, actor.firmId),
          eq(documents.matterId, matterId),
          eq(documents.sha256, sha256),
          isNull(documents.deletedAt),
        ),
      )
      .limit(1);
    if (existing) return { document: this.toDto(existing, true) };

    const extension = extname(fileName).toLowerCase();
    const type = extension ? extension.slice(1) : 'file';
    const storageKey = `${actor.firmId}/${matterId}/${randomUUID()}${extension}`;
    await this.storage.put(storageKey, input.data);

    const [created] = await this.db
      .insert(documents)
      .values({
        firmId: actor.firmId,
        matterId,
        fileName,
        storageKey,
        sha256,
        mimeType,
        sizeBytes: input.data.length,
        type,
        source: 'upload',
        uploadedBy: actor.userId,
        processingStatus: 'queued',
      })
      .returning();

    await this.audit.log({
      firmId: actor.firmId,
      action: 'document.uploaded',
      resourceType: 'document',
      resourceId: created.id,
      actor,
      metadata: { matterId, fileName, sizeBytes: input.data.length, mimeType },
    });

    const job = await this.jobs.enqueue({
      firmId: actor.firmId,
      matterId,
      type: INGEST_QUEUE,
      idempotencyKey: `ingest:${created.id}:${sha256}`,
      payload: { documentId: created.id },
      createdBy: actor.userId,
    });

    return { document: this.toDto(created, false), jobId: job.id };
  }

  async page(
    actor: FirmActor,
    matterId: string,
    documentId: string,
    pageNumber: number,
  ) {
    await this.policy.assertMatter(actor, 'document.read', matterId);
    const row = await this.requireDocument(actor, matterId, documentId);
    const [page] = await this.db
      .select({
        pageNumber: documentPages.pageNumber,
        text: documentPages.text,
        charCount: documentPages.charCount,
        ocrConfidence: documentPages.ocrConfidence,
      })
      .from(documentPages)
      .where(
        and(
          eq(documentPages.documentId, row.id),
          eq(documentPages.pageNumber, pageNumber),
        ),
      )
      .limit(1);
    if (!page) throw DomainError.notFound('Page not found');
    return { documentId: row.id, ...page };
  }

  async download(actor: FirmActor, matterId: string, documentId: string) {
    await this.policy.assertMatter(actor, 'document.download', matterId);
    const row = await this.requireDocument(actor, matterId, documentId);
    const data = await this.storage.get(row.storageKey);
    return { document: row, data };
  }

  async remove(actor: FirmActor, matterId: string, documentId: string) {
    await this.policy.assertMatter(actor, 'document.delete', matterId);
    const row = await this.requireDocument(actor, matterId, documentId);
    await this.db
      .update(documents)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(documents.id, row.id));
    await this.audit.log({
      firmId: actor.firmId,
      action: 'document.deleted',
      resourceType: 'document',
      resourceId: row.id,
      actor,
      metadata: { matterId, fileName: row.fileName },
    });
    return { deleted: true };
  }

  async reprocess(actor: FirmActor, matterId: string, documentId: string) {
    await this.policy.assertMatter(actor, 'document.reprocess', matterId);
    const row = await this.requireDocument(actor, matterId, documentId);
    const [updated] = await this.db
      .update(documents)
      .set({
        processingStatus: 'queued',
        processingError: null,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, row.id))
      .returning();
    const job = await this.jobs.enqueue({
      firmId: actor.firmId,
      matterId,
      type: INGEST_QUEUE,
      idempotencyKey: `reprocess:${row.id}:${Date.now()}`,
      payload: { documentId: row.id },
      createdBy: actor.userId,
    });
    await this.audit.log({
      firmId: actor.firmId,
      action: 'document.reprocess_requested',
      resourceType: 'document',
      resourceId: row.id,
      actor,
      metadata: { matterId, jobId: job.id },
    });
    return { ...this.toDto(updated, false), jobId: job.id };
  }

  private async requireDocument(actor: FirmActor, matterId: string, documentId: string) {
    const [row] = await this.db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.firmId, actor.firmId),
          eq(documents.matterId, matterId),
          isNull(documents.deletedAt),
        ),
      )
      .limit(1);
    if (!row) throw DomainError.notFound('Document not found');
    return row;
  }

  private toDto(row: typeof documents.$inferSelect, duplicate: boolean) {
    return {
      id: row.id,
      matterId: row.matterId,
      fileName: row.fileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      type: row.type,
      status: row.processingStatus,
      processingError: row.processingError,
      pageCount: row.pageCount,
      duplicate,
      deletedAt: row.deletedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
