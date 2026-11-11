import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  documentChunks,
  documentPages,
  documents,
} from '../../infrastructure/database/schema/index.js';

const TARGET_CHARS = 1_400;
const CHUNK_VERSION = 1;

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function splitSentences(text: string): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  const pattern = /[^.!?\n]+[.!?]*/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const value = match[0];
    if (value.trim().length === 0) continue;
    const start = match.index + value.search(/\S/);
    ranges.push({ start, end: match.index + value.length });
  }
  return ranges;
}

@Injectable()
export class DocumentChunkService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async rebuild(documentId: string): Promise<number> {
    const [document] = await this.db
      .select({
        id: documents.id,
        firmId: documents.firmId,
        matterId: documents.matterId,
      })
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    if (!document) throw new Error('Document not found');

    const pages = await this.db
      .select({
        pageNumber: documentPages.pageNumber,
        text: documentPages.text,
      })
      .from(documentPages)
      .where(eq(documentPages.documentId, documentId))
      .orderBy(documentPages.pageNumber);

    const rows: (typeof documentChunks.$inferInsert)[] = [];
    let chunkIndex = 0;

    for (const page of pages) {
      const sentences = splitSentences(page.text);
      if (sentences.length === 0) continue;
      let cursor = 0;
      while (cursor < sentences.length) {
        const first = sentences[cursor];
        let last = cursor;
        while (
          last + 1 < sentences.length &&
          sentences[last + 1].end - first.start <= TARGET_CHARS
        ) {
          last += 1;
        }
        const content = page.text.slice(first.start, sentences[last].end).trim();
        if (content.length > 0) {
          rows.push({
            firmId: document.firmId,
            matterId: document.matterId,
            documentId,
            chunkIndex,
            pageNumber: page.pageNumber,
            sentenceStart: cursor + 1,
            sentenceEnd: last + 1,
            charStart: first.start,
            charEnd: sentences[last].end,
            content,
            contentHash: hash(content),
            chunkVersion: CHUNK_VERSION,
            embeddingStatus: 'pending',
          });
          chunkIndex += 1;
        }

        if (last >= sentences.length - 1) break;
        cursor = last + 1;
      }
    }

    await this.db.transaction(async (tx) => {
      await tx
        .delete(documentChunks)
        .where(
          and(
            eq(documentChunks.documentId, documentId),
            eq(documentChunks.chunkVersion, CHUNK_VERSION),
          ),
        );
      if (rows.length > 0) {
        for (let offset = 0; offset < rows.length; offset += 500) {
          await tx.insert(documentChunks).values(rows.slice(offset, offset + 500));
        }
      }
    });

    return rows.length;
  }
}

