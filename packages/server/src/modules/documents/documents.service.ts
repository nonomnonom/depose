import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { db } from "../../infrastructure/database/database.client.js";
import { documents } from "../../infrastructure/database/schema.js";
import { IngestQueueService } from "../../infrastructure/worker/ingest-queue.service.js";
import { MattersService } from "../matters/matters.service.js";
import type { IngestDocumentInput } from "./documents.dto.js";

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly mattersService: MattersService,
    private readonly ingestQueueService: IngestQueueService,
  ) {}

  async list(firmId: string, matterId: string) {
    await this.mattersService.findOne(firmId, matterId);
    return db
      .select({
        id: documents.id,
        name: documents.name,
        type: documents.type,
        source: documents.source,
        uploadedBy: documents.uploadedBy,
        uploadedAt: documents.uploadedAt,
        pageCount: documents.pageCount,
        processingStatus: documents.processingStatus,
        language: documents.language,
      })
      .from(documents)
      .where(eq(documents.matterId, matterId));
  }

  async ingest(
    firmId: string,
    matterId: string,
    userId: string,
    input: IngestDocumentInput,
  ) {
    await this.mattersService.findOne(firmId, matterId);

    const [document] = await db
      .insert(documents)
      .values({
        matterId,
        name: input.name,
        type: input.type,
        source: input.source,
        uploadedBy: userId,
        mimeType: input.mimeType,
        content: input.content,
        language: input.language,
        processingStatus: "queued",
      })
      .returning();

    if (!document) {
      throw new Error("Failed to store document");
    }

    try {
      await this.ingestQueueService.enqueue(document.id);
    } catch (error) {
      await db
        .update(documents)
        .set({ processingStatus: "failed" })
        .where(
          and(
            eq(documents.id, document.id),
            eq(documents.processingStatus, "queued"),
          ),
        );
      this.logger.error(`Failed to enqueue ingest job for document ${document.id}`, error as Error);
      throw new ServiceUnavailableException(
        "Failed to enqueue document processing. Retry later.",
      );
    }

    return { document };
  }
}
