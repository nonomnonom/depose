import { Inject, Injectable } from '@nestjs/common';
import { Tool } from '@nestjs/mcp';
import { and, desc, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import { DomainError } from '../../common/domain-error.js';
import { appConfig } from '../../config/app.config.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  documents,
  factSources,
  facts,
  matters,
} from '../../infrastructure/database/schema/index.js';

const searchInput = z.object({
  matterId: z.uuid().describe('The matter to search'),
  query: z.string().min(2).describe('Plain-language search terms'),
});

const matterInput = z.object({
  matterId: z.uuid().describe('The matter to inspect'),
});

const factInput = z.object({
  factId: z.uuid().describe('The fact whose sources should be returned'),
});

@Injectable()
export class DeposeMcpTools {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  private firmId(): string {
    if (!appConfig.mcp.firmId) {
      throw new DomainError('FORBIDDEN', 403, 'MCP_SERVER_FIRM_ID is not configured');
    }
    return appConfig.mcp.firmId;
  }

  private async assertMatter(matterId: string): Promise<string> {
    const firmId = this.firmId();
    const [row] = await this.db
      .select({ id: matters.id })
      .from(matters)
      .where(and(eq(matters.firmId, firmId), eq(matters.id, matterId)))
      .limit(1);
    if (!row) throw DomainError.notFound('Matter not found');
    return firmId;
  }

  @Tool({
    name: 'search-facts',
    description:
      'Search confirmed facts in a matter. Returns fact text, dates, and the source document and quote when available.',
    inputSchema: searchInput,
    annotations: { readOnlyHint: true },
  })
  async searchFacts({ matterId, query }: z.infer<typeof searchInput>) {
    const firmId = await this.assertMatter(matterId);
    const terms = [
      ...new Set(
        query
          .toLowerCase()
          .split(/[^a-z0-9]+/i)
          .map((term) => term.trim())
          .filter((term) => term.length > 2),
      ),
    ].slice(0, 6);

    const rows =
      terms.length === 0
        ? []
        : await this.db
            .select({ id: facts.id, text: facts.text, dateStart: facts.dateStart })
            .from(facts)
            .where(
              and(
                eq(facts.firmId, firmId),
                eq(facts.matterId, matterId),
                eq(facts.status, 'confirmed'),
                or(...terms.map((term) => ilike(facts.text, `%${term}%`))),
              ),
            )
            .orderBy(desc(facts.dateStart), desc(facts.createdAt))
            .limit(10);

    if (rows.length === 0) return { facts: [], note: 'No confirmed facts matched.' };

    const sources = await this.db
      .select({
        factId: factSources.factId,
        documentId: factSources.documentId,
        documentName: documents.fileName,
        pageNumber: factSources.pageNumber,
        quote: factSources.quote,
      })
      .from(factSources)
      .innerJoin(documents, eq(documents.id, factSources.documentId))
      .where(
        and(eq(factSources.firmId, firmId), inArray(factSources.factId, rows.map((row) => row.id))),
      );

    return {
      facts: rows.map((fact) => {
        const source = sources.find((item) => item.factId === fact.id);
        return {
          id: fact.id,
          text: fact.text,
          date: fact.dateStart,
          document: source?.documentName ?? null,
          page: source?.pageNumber ?? null,
          quote: source?.quote ?? null,
        };
      }),
    };
  }

  @Tool({
    name: 'list-documents',
    description: 'List source documents in a matter, with processing status.',
    inputSchema: matterInput,
    annotations: { readOnlyHint: true },
  })
  async listDocuments({ matterId }: z.infer<typeof matterInput>) {
    const firmId = await this.assertMatter(matterId);
    const rows = await this.db
      .select({
        id: documents.id,
        fileName: documents.fileName,
        type: documents.type,
        status: documents.processingStatus,
        sizeBytes: documents.sizeBytes,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(
        and(
          eq(documents.firmId, firmId),
          eq(documents.matterId, matterId),
          isNull(documents.deletedAt),
        ),
      )
      .orderBy(desc(documents.createdAt))
      .limit(50);
    return { documents: rows };
  }

  @Tool({
    name: 'get-fact-sources',
    description: 'Return the document, page, and quote supporting a fact.',
    inputSchema: factInput,
    annotations: { readOnlyHint: true },
  })
  async getFactSources({ factId }: z.infer<typeof factInput>) {
    const firmId = this.firmId();
    const [fact] = await this.db
      .select({ id: facts.id, text: facts.text, matterId: facts.matterId })
      .from(facts)
      .where(and(eq(facts.id, factId), eq(facts.firmId, firmId)))
      .limit(1);
    if (!fact) throw DomainError.notFound('Fact not found');

    const sources = await this.db
      .select({
        documentId: factSources.documentId,
        documentName: documents.fileName,
        pageNumber: factSources.pageNumber,
        quote: factSources.quote,
        verification: factSources.verification,
      })
      .from(factSources)
      .innerJoin(documents, eq(documents.id, factSources.documentId))
      .where(eq(factSources.factId, fact.id));

    return { fact: fact.text, sources };
  }
}
