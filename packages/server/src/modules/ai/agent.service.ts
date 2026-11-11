import { Inject, Injectable, Logger } from '@nestjs/common';
import { AiService } from '@nestjs/ai';
import { and, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import type { FirmActor } from '../../common/request-context.service.js';
import { appConfig } from '../../config/app.config.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  documents,
  factSources,
  facts,
} from '../../infrastructure/database/schema/index.js';
import { MatterAgentTools } from './matter-agent.tools.js';

export interface AgentCitation {
  factId: string;
  factText: string;
  documentId: string | null;
  documentName: string | null;
  pageNumber: number | null;
  quote: string | null;
}

export interface AgentToolCall {
  name: string;
  arguments: Record<string, unknown>;
  summary: string;
}

export interface AgentResult {
  content: string;
  citations: AgentCitation[];
  toolCalls: AgentToolCall[];
  mode: 'model' | 'retrieval';
  model?: string;
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'what', 'when', 'where', 'who',
  'does', 'did', 'was', 'were', 'are', 'from', 'into', 'about', 'yang', 'dan',
  'untuk', 'dengan', 'apa', 'kapan', 'siapa', 'apakah', 'adalah', 'pada',
]);

function searchTerms(query: string): string[] {
  return [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .map((term) => term.trim())
        .filter((term) => term.length > 2 && !STOPWORDS.has(term)),
    ),
  ].slice(0, 6);
}

/**
 * MVP agent run. Retrieval is deterministic and grounded: it searches
 * confirmed facts, attaches their primary sources, and never invents an answer
 * when the matter record is empty. External model routing is a later layer.
 */
@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly ai: AiService,
  ) {}

  async run(actor: FirmActor, matterId: string, query: string): Promise<AgentResult> {
    if (!appConfig.ai.enabled) return this.retrieval(actor.firmId, matterId, query);

    try {
      return await this.modelRun(actor, matterId, query);
    } catch (error) {
      this.logger.warn(
        `Model call failed, using grounded retrieval: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return this.retrieval(actor.firmId, matterId, query);
    }
  }

  private async modelRun(
    actor: FirmActor,
    matterId: string,
    query: string,
  ): Promise<AgentResult> {
    const grounded = await this.retrieval(actor.firmId, matterId, query);
    const result = await this.ai.generateText({
      model: 'default',
      label: 'ask-dep-ai',
      instructions: [
        'You are Dep AI, a fact-intelligence assistant for a legal matter.',
        'Answer only from the results of the provided tools.',
        'Never invent facts, names, dates, or documents.',
        'If the tools return nothing useful, say so plainly and suggest what evidence to confirm.',
        'Cite sources inline as [1], [2] in the order the facts are returned.',
        'Be concise and use the matter record only.',
      ].join(' '),
      prompt: query,
      tools: [MatterAgentTools],
      caller: { user: { ...actor, matterId } },
      maxSteps: 6,
      maxOutputTokens: 900,
    });

    if (!result.text.trim()) throw new Error('The model returned an empty answer');

    return {
      content: result.text.trim(),
      citations: grounded.citations,
      toolCalls: result.toolCalls.map((call, index) => {
        const toolResult = result.toolResults.find(
          (item) => item.toolCallId === call.toolCallId,
        );
        return {
          name: call.toolName,
          arguments: (call.input as Record<string, unknown>) ?? {},
          summary: toolResult?.error
            ? `Failed: ${toolResult.error}`
            : summarizeToolOutput(toolResult?.output),
        };
      }),
      mode: 'model',
      model: result.model.modelId,
    };
  }

  private async retrieval(firmId: string, matterId: string, query: string): Promise<AgentResult> {
    const toolCalls: AgentToolCall[] = [];
    const terms = searchTerms(query);

    const factRows =
      terms.length > 0
        ? await this.db
            .select({
              id: facts.id,
              text: facts.text,
              dateStart: facts.dateStart,
            })
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
            .limit(5)
        : [];

    toolCalls.push({
      name: 'search_facts',
      arguments: { query, terms },
      summary: `${factRows.length} confirmed ${factRows.length === 1 ? 'fact' : 'facts'} matched`,
    });

    if (factRows.length === 0) {
      const [docRow] = await this.db
        .select({ count: documents.id })
        .from(documents)
        .where(
          and(
            eq(documents.firmId, firmId),
            eq(documents.matterId, matterId),
          ),
        )
        .limit(1);
      toolCalls.push({
        name: 'list_documents',
        arguments: { matterId },
        summary: docRow ? 'Matter has documents, but no confirmed facts matched' : 'No documents in matter',
      });

      return {
        content:
          'I could not find confirmed facts that answer that. Dep AI only answers from the confirmed record, so nothing was invented. Confirm relevant facts, or ask about a different part of the matter.',
        citations: [],
        toolCalls,
        mode: 'retrieval',
      };
    }

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
        inArray(
          factSources.factId,
          factRows.map((fact) => fact.id),
        ),
      )
      .orderBy(factSources.pageNumber);

    const citations: AgentCitation[] = factRows.map((fact) => {
      const source = sources.find((item) => item.factId === fact.id);
      return {
        factId: fact.id,
        factText: fact.text,
        documentId: source?.documentId ?? null,
        documentName: source?.documentName ?? null,
        pageNumber: source?.pageNumber ?? null,
        quote: source?.quote ?? null,
      };
    });

    toolCalls.push({
      name: 'load_citations',
      arguments: { factIds: citations.map((citation) => citation.factId) },
      summary: `${citations.filter((citation) => citation.documentId).length} sourced citations`,
    });

    const lines = citations.map(
      (citation, index) =>
        `${index + 1}. ${citation.factText}${
          citation.documentName
            ? ` [${citation.documentName}${
                citation.pageNumber ? `, p. ${citation.pageNumber}` : ''
              }]`
            : ''
        }`,
    );

    return {
      content: [
        `Here is what the confirmed record says, based on ${citations.length} ${
          citations.length === 1 ? 'fact' : 'facts'
        }:`,
        '',
        ...lines,
        '',
        'Every point above is tied to a confirmed fact. Open a citation to check the source before relying on it.',
      ].join('\n'),
      citations,
      toolCalls,
      mode: 'retrieval',
    };
  }
}

function summarizeToolOutput(output: unknown): string {
  if (!output || typeof output !== 'object') return 'Completed';
  const value = output as { facts?: unknown[]; documents?: unknown[]; note?: string };
  if (Array.isArray(value.facts)) {
    return `${value.facts.length} confirmed ${value.facts.length === 1 ? 'fact' : 'facts'}`;
  }
  if (Array.isArray(value.documents)) {
    return `${value.documents.length} ${value.documents.length === 1 ? 'document' : 'documents'}`;
  }
  return value.note ?? 'Completed';
}
