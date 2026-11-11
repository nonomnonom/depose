import { Inject, Injectable } from '@nestjs/common';
import { AgentFunction, type AgentFunctionContext } from '@nestjs/ai';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { z } from 'zod';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  documents,
  factSources,
  facts,
} from '../../infrastructure/database/schema/index.js';
import { PolicyService } from '../access-control/policy.service.js';

interface AgentUser extends FirmActor {
  matterId: string;
}

const searchInput = z.object({
  query: z.string().describe('What to look for in the confirmed facts, in plain language'),
});

const documentInput = z.object({
  query: z
    .string()
    .optional()
    .describe('Optional file-name fragment, for example "agreement" or "invoice"'),
});

@Injectable()
export class MatterAgentTools {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
  ) {}

  @AgentFunction({
    name: 'search-confirmed-facts',
    description:
      'Search confirmed facts in the current matter. Returns the fact text, its date, and the source document and quote when one exists. Use this before answering.',
    inputSchema: searchInput,
  })
  async searchFacts({ query }: z.infer<typeof searchInput>, ctx: AgentFunctionContext) {
    const user = ctx.user as AgentUser | undefined;
    if (!user?.matterId) throw new Error('No matter context');
    await this.policy.assertMatter(user, 'ai.ask', user.matterId);

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
            .select({
              id: facts.id,
              text: facts.text,
              dateStart: facts.dateStart,
            })
            .from(facts)
            .where(
              and(
                eq(facts.firmId, user.firmId),
                eq(facts.matterId, user.matterId),
                eq(facts.status, 'confirmed'),
                or(...terms.map((term) => ilike(facts.text, `%${term}%`))),
              ),
            )
            .orderBy(desc(facts.dateStart), desc(facts.createdAt))
            .limit(6);

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
        and(
          eq(factSources.firmId, user.firmId),
          eq(factSources.matterId, user.matterId),
        ),
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

  @AgentFunction({
    name: 'list-matter-documents',
    description:
      'List source documents in the current matter, optionally filtered by a file-name fragment. Use this when the question is about what evidence exists rather than what a fact says.',
    inputSchema: documentInput,
  })
  async listDocuments(
    { query }: z.infer<typeof documentInput>,
    ctx: AgentFunctionContext,
  ) {
    const user = ctx.user as AgentUser | undefined;
    if (!user?.matterId) throw new Error('No matter context');
    await this.policy.assertMatter(user, 'document.read', user.matterId);

    const conditions = [
      eq(documents.firmId, user.firmId),
      eq(documents.matterId, user.matterId),
    ];
    if (query) conditions.push(ilike(documents.fileName, `%${query}%`));

    const rows = await this.db
      .select({
        fileName: documents.fileName,
        type: documents.type,
        status: documents.processingStatus,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt))
      .limit(20);

    return { documents: rows };
  }
}
