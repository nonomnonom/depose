import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  documents,
  documentPages,
} from '../../infrastructure/database/schema/index.js';
import { StorageService } from '../../infrastructure/storage/storage.service.js';

export interface IngestedDocument {
  documentId: string;
  firmId: string;
  matterId: string;
  pageCount: number;
  pages: { pageNumber: number; text: string; charCount: number }[];
  status: 'done' | 'needs_review';
  reason?: string;
  ocrRequired: boolean;
}

const TEXT_MIME = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/rtf',
  'message/rfc822',
]);

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PDF_MIME = 'application/pdf';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const XLS_MIME = 'application/vnd.ms-excel';
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const ZIP_MIME = 'application/zip';
const EML_MIME = 'message/rfc822';
const MSG_MIME = 'application/vnd.ms-outlook';

const IMAGE_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/tiff',
  'image/gif',
]);

function isImageMime(mime: string): boolean {
  return IMAGE_MIME.has(mime) || (mime.startsWith('image/') && !mime.includes('svg'));
}

function splitPages(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, '\n').replaceAll('\u0000', '');
  const byFormFeed = normalized.split('\f');
  if (byFormFeed.length > 1) return byFormFeed;
  if (normalized.length <= 40_000) return [normalized];

  const pages: string[] = [];
  let cursor = 0;
  while (cursor < normalized.length) {
    let end = Math.min(cursor + 40_000, normalized.length);
    if (end < normalized.length) {
      const breakAt = normalized.lastIndexOf('\n', end);
      if (breakAt > cursor + 1_000) end = breakAt;
    }
    pages.push(normalized.slice(cursor, end));
    cursor = end;
  }
  return pages;
}

@Injectable()
export class DocumentTextService {
  private readonly logger = new Logger(DocumentTextService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly storage: StorageService,
  ) {}

  async ingest(documentId: string): Promise<IngestedDocument> {
    const [document] = await this.db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    if (!document) throw new Error('Document not found');

    await this.db
      .update(documents)
      .set({ processingStatus: 'processing', updatedAt: new Date() })
      .where(eq(documents.id, document.id));

    try {
      const data = await this.storage.get(document.storageKey);
      const parsed = await this.extract(document.mimeType, data);

      if (parsed.pages.length === 0) {
        if (isImageMime(document.mimeType)) {
          await this.finish(document.id, 'needs_review', 1, 'OCR_REQUIRED');
          return {
            documentId: document.id,
            firmId: document.firmId,
            matterId: document.matterId,
            pageCount: 1,
            pages: [{ pageNumber: 1, text: '', charCount: 0 }],
            status: 'needs_review',
            reason: 'OCR_REQUIRED',
            ocrRequired: true,
          };
        }
        await this.finish(document.id, 'needs_review', null, 'DOCUMENT_TEXT_UNAVAILABLE');
        return {
          documentId: document.id,
          firmId: document.firmId,
          matterId: document.matterId,
          pageCount: 0,
          pages: [],
          status: 'needs_review',
          reason: 'DOCUMENT_TEXT_UNAVAILABLE',
          ocrRequired: false,
        };
      }        await this.db.transaction(async (tx) => {
        await tx.delete(documentPages).where(eq(documentPages.documentId, document.id));
        await tx.insert(documentPages).values(
          parsed.pages.map((page, index) => ({
            firmId: document.firmId,
            matterId: document.matterId,
            documentId: document.id,
            pageNumber: index + 1,
            text: page,
            charCount: page.length,
            ocrConfidence: null,
            ocrBlocks: null,
          })),
        );
      });

      await this.finish(document.id, 'done', parsed.pages.length, null);
      return {
        documentId: document.id,
        firmId: document.firmId,
        matterId: document.matterId,
        pageCount: parsed.pages.length,
        pages: parsed.pages.map((text, index) => ({
          pageNumber: index + 1,
          text,
          charCount: text.length,
        })),
        status: 'done',
        ocrRequired: false,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Text extraction failed';
      this.logger.warn(`Document ingest failed for ${document.id}: ${reason}`);
      await this.finish(document.id, 'failed', null, reason.slice(0, 240));
      return {
        documentId: document.id,
        firmId: document.firmId,
        matterId: document.matterId,
        pageCount: 0,
        pages: [],
        status: 'failed',
        reason,
        ocrRequired: false,
      } as unknown as IngestedDocument;
    }
  }

  async pages(documentId: string) {
    return this.db
      .select({
        pageNumber: documentPages.pageNumber,
        text: documentPages.text,
      })
      .from(documentPages)
      .where(eq(documentPages.documentId, documentId))
      .orderBy(documentPages.pageNumber);
  }

  async getPageImageForOcr(
    documentId: string,
    pageNumber: number,
  ): Promise<{ image: Buffer; mimeType: string } | null> {
    const [document] = await this.db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    if (!document) return null;

    const data = await this.storage.get(document.storageKey);
    const mime = document.mimeType;

    if (isImageMime(mime)) {
      return { image: data, mimeType: mime };
    }

    if (mime === PDF_MIME) {
      return this.pdfPageImage(data, pageNumber);
    }

    return null;
  }

  private async pdfPageImage(data: Buffer, pageNumber: number): Promise<{ image: Buffer; mimeType: string } | null> {
    const { pdf } = await import('pdf-to-img');
    const pages = await pdf(new Uint8Array(data), { scale: 2 });
    let index = 1;
    for await (const image of pages) {
      if (index === pageNumber) return { image: Buffer.from(image), mimeType: 'image/png' };
      index += 1;
    }
    return null;
  }

  async markNeedsReview(documentId: string, reason: string) {
    await this.db
      .update(documents)
      .set({
        processingStatus: 'needs_review',
        processingError: reason.slice(0, 240),
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
  }

  private async extract(mimeType: string, data: Buffer): Promise<{ pages: string[] }> {
    if (TEXT_MIME.has(mimeType) || mimeType.startsWith('text/')) {
      return { pages: splitPages(data.toString('utf8')) };
    }
    if (mimeType === PDF_MIME) {
      const { extractText, getDocumentProxy } = await import('unpdf');
      const pdf = await getDocumentProxy(new Uint8Array(data));
      const result = await extractText(pdf, { mergePages: false });
      const pages = Array.isArray(result.text) ? result.text : [result.text];
      return { pages: pages.map((page) => splitPages(page).join('\n')).filter(Boolean) };
    }
    if (mimeType === DOCX_MIME) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer: data });
      return { pages: splitPages(result.value) };
    }
    if (mimeType === XLSX_MIME || mimeType === XLS_MIME) {
      const XLSX = await import('xlsx');
      const book = XLSX.read(data, { type: 'buffer', cellDates: true });
      const text = book.SheetNames.map((name) => {
        const sheet = book.Sheets[name];
        return `--- sheet: ${name} ---\n${XLSX.utils.sheet_to_csv(sheet, { blankrows: false })}`;
      }).join('\n\n');
      return { pages: splitPages(text).filter((page) => page.trim().length > 0) };
    }
    if (mimeType === PPTX_MIME) {
      const AdmZip = (await import('adm-zip')).default;
      const archive = new AdmZip(data);
      const slides = archive.getEntries()
        .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/.test(entry.entryName))
        .sort((left, right) => left.entryName.localeCompare(right.entryName, undefined, { numeric: true }));
      const text = slides.map((entry, index) => {
        const body = this.xmlText(archive.readAsText(entry));
        return `--- slide ${index + 1} ---\n${body}`;
      }).join('\n\n');
      return { pages: splitPages(text).filter((page) => page.trim().length > 0) };
    }
    if (mimeType === ZIP_MIME) {
      return { pages: splitPages(await this.extractZip(data, 0)) };
    }
    if (mimeType === EML_MIME) {
      const { simpleParser } = await import('mailparser');
      const parsed = await simpleParser(data);
      const headers = [
        `From: ${parsed.from?.text ?? ''}`,
        `To: ${parsed.to && !Array.isArray(parsed.to) ? parsed.to.text : ''}`,
        `Subject: ${parsed.subject ?? ''}`,
        `Date: ${parsed.date?.toISOString() ?? ''}`,
      ].join('\n');
      const body = parsed.text || (parsed.html ? this.xmlText(parsed.html) : '');
      const attachments = (parsed.attachments ?? []).map((attachment) =>
        `--- attachment: ${attachment.filename ?? 'unnamed'} ---\n${attachment.content.toString('utf8').slice(0, 40_000)}`,
      );
      return { pages: splitPages([headers, body, ...attachments].join('\n\n')) };
    }
    if (mimeType === MSG_MIME) {
      const readerModule = await import('@kenjiuno/msgreader');
      const MsgReader = readerModule.default as unknown as new (input: Buffer) => {
        getFileData(): {
          senderName?: string;
          recipients?: { name?: string }[];
          subject?: string;
          messageDeliveryTime?: string;
          body?: string;
        };
      };
      const parsed = new MsgReader(data).getFileData();
      const headers = [
        `From: ${parsed.senderName ?? ''}`,
        `To: ${parsed.recipients?.map((recipient: { name?: string }) => recipient.name).join(', ') ?? ''}`,
        `Subject: ${parsed.subject ?? ''}`,
        `Date: ${parsed.messageDeliveryTime ?? ''}`,
      ].join('\n');
      return { pages: splitPages([headers, parsed.body ?? ''].join('\n\n')) };
    }
    return { pages: [] };
  }

  private xmlText(xml: string): string {
    return xml
      .replace(/<w:p[ >]/g, '\n<w:p ')
      .replace(/<\/a:p>/g, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private async extractZip(data: Buffer, depth: number): Promise<string> {
    if (depth > 2) return '[nested archive omitted]';
    const AdmZip = (await import('adm-zip')).default;
    const archive = new AdmZip(data);
    const entries = archive.getEntries().slice(0, 500);
    const parts: string[] = [];
    let total = 0;
    for (const entry of entries) {
      if (entry.isDirectory || total > 20 * 1024 * 1024) continue;
      const content = archive.readFile(entry);
      if (!content) continue;
      total += content.length;
      const name = entry.entryName.toLowerCase();
      if (name.endsWith('.zip')) {
        parts.push(`--- archive: ${entry.entryName} ---\n${await this.extractZip(content, depth + 1)}`);
      } else if (name.endsWith('.pdf')) {
        const { extractText, getDocumentProxy } = await import('unpdf');
        const parsed = await getDocumentProxy(new Uint8Array(content));
        const result = await extractText(parsed, { mergePages: false });
        const pages = Array.isArray(result.text) ? result.text : [result.text];
        parts.push(`--- file: ${entry.entryName} ---\n${pages.join('\n')}`);
      } else if (/\.(txt|md|csv|json|xml|html?)$/i.test(name)) {
        parts.push(`--- file: ${entry.entryName} ---\n${content.toString('utf8').slice(0, 40_000)}`);
      }
    }
    return parts.join('\n\n');
  }

  private async finish(
    documentId: string,
    status: 'done' | 'failed' | 'needs_review',
    pageCount: number | null,
    error: string | null,
  ) {
    await this.db
      .update(documents)
      .set({
        processingStatus: status,
        pageCount,
        processingError: error,
        updatedAt: new Date(),
      })
      .where(and(eq(documents.id, documentId)));
  }
}
