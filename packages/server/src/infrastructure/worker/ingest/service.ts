import { Injectable, Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { TextChunk } from "../../../infrastructure/ingest/chunk-text.js";
import { db } from "../../../infrastructure/database/database.client.js";
import { documentChunks, documents } from "../../../infrastructure/database/schema.js";
import { chunkText } from "../../../infrastructure/ingest/chunk-text.js";
import { TextExtractorService } from "../../../infrastructure/ingest/text-extractor.service.js";
import {
  DOCUMENT_CHUNKS_INDEX,
  embedTexts,
  ensureVectorIndex,
  isVectorSearchEnabled,
  vectorStore,
} from "../../../infrastructure/mastra/vector-store.js";
import type { IngestDocumentPayload, IngestDocumentResult } from "../worker.types.js";

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(private readonly textExtractor: TextExtractorService) {}

  async process(payload: IngestDocumentPayload): Promise<IngestDocumentResult> {
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, payload.documentId))
      .limit(1);

    if (!document) {
      throw new Error(`Document not found: ${payload.documentId}`);
    }

    await db
      .update(documents)
      .set({ processingStatus: "processing" })
      .where(eq(documents.id, document.id));

    try {
      const text = this.textExtractor.extract(document.mimeType, document.content);
      const chunks = chunkText(text);
      const pageCount = Math.max(1, text.split("\f").length);

      const insertedChunks = await db.transaction(async (tx: any) => {
        await tx
          .delete(documentChunks)
          .where(eq(documentChunks.documentId, document.id));

        const inserted =
          chunks.length > 0
            ? await tx
                .insert(documentChunks)
                .values(
                  chunks.map((chunk: TextChunk, chunkIndex: number) => ({
                    documentId: document.id,
                    matterId: document.matterId,
                    chunkIndex,
                    pageNumber: chunk.pageNumber,
                    sentenceStart: chunk.sentenceStart,
                    sentenceEnd: chunk.sentenceEnd,
                    content: chunk.content,
                  })),
                )
                .returning()
            : [];

        await tx
          .update(documents)
          .set({
            content: text,
            pageCount,
            processingStatus: "done",
          })
          .where(eq(documents.id, document.id));

        return inserted;
      });

      if (isVectorSearchEnabled && insertedChunks.length > 0) {
        await this.indexChunks(document.id, insertedChunks);
      }

      return {
        documentId: document.id,
        chunkCount: chunks.length,
        status: "done",
      };
    } catch (error) {
      await db
        .update(documents)
        .set({ processingStatus: "failed" })
        .where(eq(documents.id, document.id));
      throw error;
    }
  }

  private async indexChunks(
    documentId: string,
    chunks: (typeof documentChunks.$inferSelect)[],
  ): Promise<void> {
    try {
      await ensureVectorIndex();
      const vectors = await embedTexts(chunks.map((chunk) => chunk.content));
      await vectorStore.upsert({
        indexName: DOCUMENT_CHUNKS_INDEX,
        ids: chunks.map((chunk) => chunk.id),
        vectors,
        metadata: chunks.map((chunk) => ({
          matterId: chunk.matterId,
          documentId: chunk.documentId,
          chunkId: chunk.id,
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber,
          sentenceStart: chunk.sentenceStart,
          sentenceEnd: chunk.sentenceEnd,
        })),
      });
    } catch (error) {
      this.logger.warn(
        `Vector indexing failed for document ${documentId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
