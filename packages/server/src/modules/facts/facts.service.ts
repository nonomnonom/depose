import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../infrastructure/database/database.client.js";
import {
  documentChunks,
  documents,
  facts,
} from "../../infrastructure/database/schema.js";
import { extractedFactsSchema } from "../../infrastructure/mastra/agents/fact-extractor.js";
import { mastra } from "../../infrastructure/mastra/index.js";
import { MattersService } from "../matters/matters.service.js";
import type { CreateFactInput, ExtractFactsInput } from "./facts.dto.js";

const MAX_DOCUMENT_CHARS = 120_000;

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

@Injectable()
export class FactsService {
  constructor(private readonly mattersService: MattersService) {}

  async list(firmId: string, matterId: string) {
    await this.mattersService.findOne(firmId, matterId);
    return db
      .select()
      .from(facts)
      .where(eq(facts.matterId, matterId))
      .orderBy(desc(facts.createdAt));
  }

  async create(firmId: string, matterId: string, input: CreateFactInput) {
    await this.mattersService.findOne(firmId, matterId);
    const [fact] = await db
      .insert(facts)
      .values({
        matterId,
        documentId: input.documentId,
        text: input.text,
        entity: input.entity,
        action: input.action,
        date: input.date,
        page: input.page,
        sentenceIndex: input.sentenceIndex,
        confidence: input.confidence ?? 1,
      })
      .returning();
    return fact;
  }

  async extract(
    firmId: string,
    matterId: string,
    input: ExtractFactsInput,
  ) {
    await this.mattersService.findOne(firmId, matterId);

    const matterDocuments = await db
      .select()
      .from(documents)
      .where(
        input.documentId
          ? and(
              eq(documents.matterId, matterId),
              eq(documents.id, input.documentId),
            )
          : eq(documents.matterId, matterId),
      );

    if (matterDocuments.length === 0) {
      throw new BadRequestException(
        "No documents to extract facts from. Ingest a document first.",
      );
    }

    const agent = mastra.getAgentById("fact-extractor");
    const rows: (typeof facts.$inferInsert)[] = [];

    for (const document of matterDocuments) {
      const text = document.content
        .replace(/\f+/g, "\n")
        .slice(0, MAX_DOCUMENT_CHARS);

      let extracted: z.infer<typeof extractedFactsSchema>;
      try {
        const response = await agent.generate(
          `Extract every material fact from this document (${document.name}):\n\n${text}`,
          { structuredOutput: { schema: extractedFactsSchema } },
        );
        extracted = extractedFactsSchema.parse(response.object);
      } catch (error) {
        throw new BadGatewayException(
          `Fact extraction failed for ${document.name}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      const chunks = await db
        .select()
        .from(documentChunks)
        .where(eq(documentChunks.documentId, document.id));

      for (const fact of extracted) {
        if (!fact.text.trim()) continue;
        const citation = this.locateQuote(chunks, fact.sourceQuote);
        rows.push({
          matterId,
          documentId: document.id,
          text: fact.text.trim(),
          entity: fact.entity?.trim() || null,
          action: fact.action?.trim() || null,
          date: parseDate(fact.date),
          page: citation?.pageNumber ?? null,
          sentenceIndex: citation?.sentenceStart ?? null,
          confidence: Math.min(1, Math.max(0, fact.confidence)),
        });
      }
    }

    if (rows.length === 0) return [];
    return db.insert(facts).values(rows).returning();
  }

  private locateQuote(
    chunks: (typeof documentChunks.$inferSelect)[],
    quote: string | null,
  ) {
    const needle = quote?.trim();
    if (!needle) return undefined;
    return (
      chunks.find((chunk) => chunk.content.includes(needle)) ??
      chunks.find((chunk) => chunk.content.includes(needle.slice(0, 80)))
    );
  }
}
