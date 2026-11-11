import { Inject, Injectable } from '@nestjs/common';
import { AgentFunction, type AgentFunctionContext } from '@nestjs/ai';
import { and, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import { z } from 'zod';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  documents,
  documentPages,
  factSources,
  facts,
} from '../../infrastructure/database/schema/index.js';
import { PolicyService } from '../access-control/policy.service.js';
import { ModelGatewayService, type DecisionQuestion } from './model-gateway.service.js';

interface AgentUser extends FirmActor {
  matterId: string;
}

const searchInput = z.object({
  query: z.string().describe('What to look for in the confirmed facts, in plain language'),
});

const factInput = z.object({
  factId: z.string().describe('Fact UUID from a previous search result'),
});

const documentInput = z.object({
  query: z
    .string()
    .optional()
    .describe('Optional file-name fragment, for example "agreement" or "invoice"'),
});

const pageInput = z.object({
  documentId: z.string().describe('Document UUID from documents.list'),
  pageNumber: z.number().int().min(1).describe('1-based page number'),
});

const DECISION_KEYS = [
  'citation_supported',
  'answer_scope_ok',
  'tool_write_safe',
  'contradiction_present',
  'issue_relevance',
] as const;

const decisionInput = z.object({
  decisionKey: z.enum(DECISION_KEYS),
  text: z.string().min(1).max(8_000).describe('The claim, quote, or question to evaluate'),
  context: z
    .string()
    .max(12_000)
    .optional()
    .describe('Relevant evidence, scope, or the second fact for contradictions'),
});

@Injectable()
export class MatterAgentTools {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
    private readonly gateway: ModelGatewayService,
  ) {}

  @AgentFunction({
    name: 'retrieval_search',
    description:
      'Search confirmed facts in the current matter. Returns fact text, date, and the source document and verbatim quote. Use this before answering.',
    inputSchema: searchInput,
  })
  async retrievalSearch({ query }: z.infer<typeof searchInput>, ctx: AgentFunctionContext) {
    return this.searchFacts(query, ctx);
  }

  @AgentFunction({
    name: 'facts_search',
    description:
      'Search confirmed facts with a plain-language query. Same evidence as retrieval.search.',
    inputSchema: searchInput,
  })
  async factsSearch({ query }: z.infer<typeof searchInput>, ctx: AgentFunctionContext) {
    return this.searchFacts(query, ctx);
  }

  @AgentFunction({
    name: 'facts_get',
    description:
      'Get one confirmed fact with all of its source citations. Use the fact id from a search result.',
    inputSchema: factInput,
  })
  async factsGet({ factId }: z.infer<typeof factInput>, ctx: AgentFunctionContext) {
    const user = this.user(ctx);
    await this.policy.assertMatter(user, 'ai.ask', user.matterId);

    const [fact] = await this.db
      .select()
      .from(facts)
      .where(
        and(
          eq(facts.id, factId),
          eq(facts.firmId, user.firmId),
          eq(facts.matterId, user.matterId),
          eq(facts.status, 'confirmed'),
        ),
      )
      .limit(1);
    if (!fact) return { fact: null, note: 'No confirmed fact with that id.' };

    const sources = await this.db
      .select({
        documentId: factSources.documentId,
        documentName: documents.fileName,
        pageNumber: factSources.pageNumber,
        sentenceStart: factSources.sentenceStart,
        sentenceEnd: factSources.sentenceEnd,
        quote: factSources.quote,
        quoteHash: factSources.quoteHash,
      })
      .from(factSources)
      .innerJoin(documents, eq(documents.id, factSources.documentId))
      .where(eq(factSources.factId, fact.id));

    return {
      fact: {
        id: fact.id,
        text: fact.text,
        date: fact.dateStart,
        factType: fact.factType,
        sources,
      },
    };
  }

  @AgentFunction({
    name: 'documents_list',
    description:
      'List source documents in the current matter, optionally filtered by a file-name fragment.',
    inputSchema: documentInput,
  })
  async listDocuments(
    { query }: z.infer<typeof documentInput>,
    ctx: AgentFunctionContext,
  ) {
    const user = this.user(ctx);
    await this.policy.assertMatter(user, 'document.read', user.matterId);

    const conditions = [
      eq(documents.firmId, user.firmId),
      eq(documents.matterId, user.matterId),
    ];
    if (query) conditions.push(ilike(documents.fileName, `%${query}%`));

    const rows = await this.db
      .select({
        id: documents.id,
        fileName: documents.fileName,
        type: documents.type,
        status: documents.processingStatus,
        pageCount: documents.pageCount,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt))
      .limit(20);

    return { documents: rows };
  }

  @AgentFunction({
    name: 'documents_readPage',
    description:
      'Read the extracted text of one page in a source document. Use this only when the fact quotes are not enough.',
    inputSchema: pageInput,
  })
  async readPage(
    { documentId, pageNumber }: z.infer<typeof pageInput>,
    ctx: AgentFunctionContext,
  ) {
    const user = this.user(ctx);
    await this.policy.assertMatter(user, 'document.read', user.matterId);

    const [page] = await this.db
      .select({
        documentId: documentPages.documentId,
        pageNumber: documentPages.pageNumber,
        text: documentPages.text,
      })
      .from(documentPages)
      .innerJoin(documents, eq(documents.id, documentPages.documentId))
      .where(
        and(
          eq(documentPages.documentId, documentId),
          eq(documentPages.pageNumber, pageNumber),
          eq(documents.firmId, user.firmId),
          eq(documents.matterId, user.matterId),
        ),
      )
      .limit(1);

    if (!page) return { page: null, note: 'That page is not available.' };
    return { page: { ...page, text: page.text.slice(0, 8_000) } };
  }

  @AgentFunction({
    name: 'currentTime',
    description: 'Return the current server time in ISO 8601. Use it for “today” or date arithmetic.',
    inputSchema: z.object({}),
  })
  async currentTime(_input: Record<string, never>, ctx: AgentFunctionContext) {
    const user = this.user(ctx);
    await this.policy.assertMatter(user, 'ai.ask', user.matterId);
    return { now: new Date().toISOString() };
  }

  @AgentFunction({
    name: 'decision_evaluate',
    description:
      'Ask the typed decision model one allowlisted question. Returns a probability, confidence, threshold, and recommended action. It never writes data and does not replace your answer.',
    inputSchema: decisionInput,
  })
  async decisionEvaluate(
    { decisionKey, text, context }: z.infer<typeof decisionInput>,
    ctx: AgentFunctionContext,
  ) {
    const user = this.user(ctx);
    await this.policy.assertMatter(user, 'ai.ask', user.matterId);

    let question: DecisionQuestion;
    if (decisionKey === 'issue_relevance') {
      question = {
        type: 'choice',
        instructions: 'How relevant is the fact to the issue described in the context?',
        options: ['key', 'relevant', 'maybe_relevant', 'not_relevant'],
      };
    } else {
      const prompts: Record<string, string> = {
        citation_supported: 'Does the quote in text support the claim?',
        answer_scope_ok: 'Is the proposed answer within the matter or subset scope?',
        tool_write_safe: 'Is this write action unambiguous and safe without extra approval?',
        contradiction_present: 'Do the two facts in text and context truly contradict each other?',
      };
      question = {
        type: 'noul',
        instructions: prompts[decisionKey],
        criteria: {
          true: 'The evidence clearly supports a yes answer.',
          false: 'The evidence is absent, weak, or contradicts a yes answer.',
        },
      };
    }

    try {
      const result = await this.gateway.decide({
        firmId: user.firmId,
        state: {
          text: context ? `${text}\n\nContext:\n${context}` : text,
          context: { decisionKey, matterId: user.matterId },
        },
        questions: { evaluate: question },
      });
      const answer = result.answers.evaluate;
      const value = answer.type === 'choice' ? answer.choice : answer.noul;
      const recommendedAction =
        answer.type === 'noul'
          ? (answer.noul ?? 0) >= answer.threshold
            ? 'accept'
            : 'review'
          : value;
      return {
        decisionKey,
        value,
        confidence: answer.confidence,
        threshold: answer.threshold,
        recommendedAction,
        model: result.model,
        degraded: result.degraded,
      };
    } catch (error) {
      return {
        decisionKey,
        available: false,
        note:
          error instanceof Error
            ? error.message
            : 'The decision route is not available. Do not invent a probability.',
      };
    }
  }

  private async searchFacts(query: string, ctx: AgentFunctionContext) {
    const user = this.user(ctx);
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
              factType: facts.factType,
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
            .limit(8);

    if (rows.length === 0) return { facts: [], note: 'No confirmed facts matched.' };

    const sources = await this.db
      .select({
        factId: factSources.factId,
        documentId: factSources.documentId,
        documentName: documents.fileName,
        pageNumber: factSources.pageNumber,
        sentenceStart: factSources.sentenceStart,
        sentenceEnd: factSources.sentenceEnd,
        quote: factSources.quote,
        quoteHash: factSources.quoteHash,
      })
      .from(factSources)
      .innerJoin(documents, eq(documents.id, factSources.documentId))
      .where(
        inArray(
          factSources.factId,
          rows.map((fact) => fact.id),
        ),
      );

    return {
      facts: rows.map((fact) => ({
        id: fact.id,
        text: fact.text,
        date: fact.dateStart,
        factType: fact.factType,
        sources: sources.filter((source) => source.factId === fact.id),
      })),
    };
  }

  private user(ctx: AgentFunctionContext): AgentUser {
    const user = ctx.user as AgentUser | undefined;
    if (!user?.matterId) throw new Error('No matter context');
    return user;
  }
}
