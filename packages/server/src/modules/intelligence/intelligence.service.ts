import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { and, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { appConfig } from "../../config/app.config.js";
import { db } from "../../infrastructure/database/database.client.js";
import {
  documentChunks,
  documents,
  facts,
} from "../../infrastructure/database/schema.js";
import { mastra } from "../../infrastructure/mastra/index.js";
import {
  DOCUMENT_CHUNKS_INDEX,
  embedTexts,
  isVectorSearchEnabled,
  vectorStore,
} from "../../infrastructure/mastra/vector-store.js";
import { MattersService } from "../matters/matters.service.js";

const answerSchema = z.object({
  answer: z.string(),
  citedSourceIds: z.array(z.string()),
  confidence: z.enum(["low", "medium", "high"]),
  insufficientEvidence: z.boolean(),
});

const contradictionsSchema = z.object({
  contradictions: z.array(
    z.object({
      factIds: z.array(z.string()).min(2),
      explanation: z.string(),
      severity: z.enum(["low", "medium", "high"]),
    }),
  ),
});

export interface EvidenceSource {
  id: string;
  type: "chunk" | "fact";
  documentId?: string;
  fileName?: string;
  chunkIndex?: number;
  pageNumber?: number;
  sentenceStart?: number;
  sentenceEnd?: number;
  excerpt: string;
}

interface MemoryScope {
  thread: string;
  resource: string;
}

function searchTerms(question: string): string[] {
  return [
    ...new Set(
      question
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((term) => term.length > 3),
    ),
  ].slice(0, 8);
}

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(private readonly mattersService: MattersService) {}

  async chronology(organizationId: string, matterId: string) {
    await this.mattersService.findOne(organizationId, matterId);
    return db
      .select()
      .from(facts)
      .where(eq(facts.matterId, matterId))
      .orderBy(sql`${facts.date} asc nulls last`);
  }

  async contradictions(organizationId: string, matterId: string) {
    await this.mattersService.findOne(organizationId, matterId);
    const matterFacts = await db
      .select()
      .from(facts)
      .where(eq(facts.matterId, matterId))
      .limit(200);

    if (matterFacts.length < 2) {
      return { contradictions: [] };
    }

    const evidence = matterFacts
      .map(
        (fact) =>
          `[fact:${fact.id}] date=${fact.date?.toISOString() ?? "unknown"} text=${fact.text}${
            fact.entity ? ` entity="${fact.entity}"` : ""
          }${fact.action ? ` action="${fact.action}"` : ""}`,
      )
      .join("\n");

    return this.analyze(
      `Compare these facts and identify pairs that contradict each other.
Only report genuine factual conflicts (different who/what/when/where). If two facts are merely incomplete, do not report them.

Facts:
${evidence}`,
      contradictionsSchema,
    );
  }

  async ask(
    organizationId: string,
    matterId: string,
    userId: string,
    question: string,
    threadId?: string,
  ) {
    await this.mattersService.findOne(organizationId, matterId);
    const sources = await this.retrieve(matterId, question);
    const scope = this.memoryScope(userId, threadId);

    if (sources.length === 0) {
      return {
        answer:
          "No indexed evidence matches this question yet. Ingest documents for this matter and try again.",
        confidence: "low" as const,
        insufficientEvidence: true,
        sources: [],
        threadId: scope?.thread,
      };
    }

    const result = await this.analyze(
      `Answer the question using only the evidence below.

Question: ${question}

Evidence:
${this.renderEvidence(sources)}`,
      answerSchema,
      scope,
    );

    return {
      ...this.withCitedSources(result, sources),
      threadId: scope?.thread,
    };
  }

  async realtimeCheck(
    organizationId: string,
    matterId: string,
    userId: string,
    question: string,
    threadId?: string,
  ) {
    await this.mattersService.findOne(organizationId, matterId);
    const sources = await this.retrieve(matterId, question);
    const scope = this.memoryScope(userId, threadId);

    if (sources.length === 0) {
      return {
        answer:
          "No indexed evidence is available for this check. Do not rely on an unsourced answer in the hearing.",
        confidence: "low" as const,
        insufficientEvidence: true,
        sources: [],
        threadId: scope?.thread,
      };
    }

    const result = await this.analyze(
      `You are supporting a lawyer during a hearing or deposition. Give a short, direct answer the lawyer can use immediately.
State what the evidence supports, flag anything that must be verified before relying on it, and never speculate.

Question: ${question}

Evidence:
${this.renderEvidence(sources)}`,
      answerSchema,
      scope,
    );

    return {
      ...this.withCitedSources(result, sources),
      threadId: scope?.thread,
    };
  }

  private memoryScope(
    userId: string,
    requestedThreadId?: string,
  ): MemoryScope | undefined {
    if (!appConfig.memory.enabled) return undefined;
    return {
      thread: requestedThreadId ?? randomUUID(),
      resource: userId,
    };
  }

  private withCitedSources(
    result: z.infer<typeof answerSchema>,
    sources: EvidenceSource[],
  ) {
    const citedIds = new Set(result.citedSourceIds);
    const cited = sources.filter((source) => citedIds.has(source.id));
    return {
      ...result,
      sources: cited.length > 0 ? cited : sources,
    };
  }

  private renderEvidence(sources: EvidenceSource[]): string {
    return sources
      .map((source) => {
        const citation = source.pageNumber
          ? source.type === "chunk"
            ? ` (page ${source.pageNumber}, sentences ${source.sentenceStart ?? "?"}-${source.sentenceEnd ?? "?"})`
            : ` (page ${source.pageNumber}, sentence ${source.sentenceStart ?? "?"})`
          : "";
        return `[${source.type}:${source.id}]${citation} (${source.fileName ?? source.type}) ${source.excerpt}`;
      })
      .join("\n\n");
  }

  private async retrieve(
    matterId: string,
    question: string,
  ): Promise<EvidenceSource[]> {
    const semantic = await this.retrieveSemantic(matterId, question);
    if (semantic.length > 0) return semantic;
    return this.retrieveKeyword(matterId, question);
  }

  private async retrieveSemantic(
    matterId: string,
    question: string,
  ): Promise<EvidenceSource[]> {
    if (!isVectorSearchEnabled) return [];

    try {
      const [queryVector] = await embedTexts([question]);
      if (!queryVector) return [];

      const matches = await vectorStore.query({
        indexName: DOCUMENT_CHUNKS_INDEX,
        queryVector,
        topK: 6,
        filter: { matterId },
      });
      if (matches.length === 0) return [];

      const rows = await db
        .select({
          id: documentChunks.id,
          documentId: documentChunks.documentId,
          fileName: documents.name,
          chunkIndex: documentChunks.chunkIndex,
          pageNumber: documentChunks.pageNumber,
          sentenceStart: documentChunks.sentenceStart,
          sentenceEnd: documentChunks.sentenceEnd,
          content: documentChunks.content,
        })
        .from(documentChunks)
        .innerJoin(documents, eq(documentChunks.documentId, documents.id))
        .where(
          and(
            eq(documentChunks.matterId, matterId),
            inArray(
              documentChunks.id,
              matches.map((match) => match.id),
            ),
          ),
        );

      const byId = new Map(rows.map((row) => [row.id, row]));
      return matches
        .map((match) => byId.get(match.id))
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
        .map((row) => ({
          id: row.id,
          type: "chunk" as const,
          documentId: row.documentId,
          fileName: row.fileName,
          chunkIndex: row.chunkIndex,
          pageNumber: row.pageNumber,
          sentenceStart: row.sentenceStart,
          sentenceEnd: row.sentenceEnd,
          excerpt: row.content.slice(0, 800),
        }));
    } catch (error) {
      this.logger.warn(
        `Semantic retrieval failed, falling back to keywords: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  }

  private async retrieveKeyword(
    matterId: string,
    question: string,
  ): Promise<EvidenceSource[]> {
    const terms = searchTerms(question);

    const chunkRows = await db
      .select({
        id: documentChunks.id,
        documentId: documentChunks.documentId,
        fileName: documents.name,
        chunkIndex: documentChunks.chunkIndex,
        pageNumber: documentChunks.pageNumber,
        sentenceStart: documentChunks.sentenceStart,
        sentenceEnd: documentChunks.sentenceEnd,
        content: documentChunks.content,
      })
      .from(documentChunks)
      .innerJoin(documents, eq(documentChunks.documentId, documents.id))
      .where(
        and(
          eq(documentChunks.matterId, matterId),
          terms.length > 0
            ? or(
                ...terms.map((term) =>
                  ilike(documentChunks.content, `%${term}%`),
                ),
              )
            : undefined,
        ),
      )
      .limit(6);

    const sources: EvidenceSource[] = chunkRows.map((chunk) => ({
      id: chunk.id,
      type: "chunk",
      documentId: chunk.documentId,
      fileName: chunk.fileName,
      chunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber,
      sentenceStart: chunk.sentenceStart,
      sentenceEnd: chunk.sentenceEnd,
      excerpt: chunk.content.slice(0, 800),
    }));

    if (sources.length === 0) {
      const matterFacts = await db
        .select()
        .from(facts)
        .where(eq(facts.matterId, matterId))
        .limit(20);
      for (const fact of matterFacts) {
        sources.push({
          id: fact.id,
          type: "fact",
          pageNumber: fact.page ?? undefined,
          sentenceStart: fact.sentenceIndex ?? undefined,
          excerpt: [
            fact.date?.toISOString(),
            fact.text,
            fact.entity ? `entity: ${fact.entity}` : undefined,
            fact.action ? `action: ${fact.action}` : undefined,
          ]
            .filter(Boolean)
            .join(" — "),
        });
      }
    }

    return sources;
  }

  private async analyze<T>(
    prompt: string,
    schema: z.ZodType<T>,
    memory?: MemoryScope,
  ): Promise<T> {
    const agent = mastra.getAgentById("case-analyst");
    try {
      const result = await agent.generate(prompt, {
        structuredOutput: { schema },
        ...(memory ? { memory } : {}),
      });
      return schema.parse(result.object);
    } catch (error) {
      throw new BadGatewayException(
        `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
