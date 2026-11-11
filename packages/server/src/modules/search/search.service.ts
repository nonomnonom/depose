import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  documentChunks,
  documents,
  factSources,
  facts,
  subsetDocuments,
  subsets,
} from '../../infrastructure/database/schema/index.js';
import { PolicyService } from '../access-control/policy.service.js';
import { VectorService } from '../vector/vector.service.js';

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'what', 'when', 'where', 'who',
  'does', 'did', 'was', 'were', 'are', 'from', 'into', 'about', 'yang', 'dan',
  'untuk', 'dengan', 'apa', 'kapan', 'siapa', 'apakah', 'adalah', 'pada',
]);

export interface ParsedQuery {
  text: string;
  terms: string[];
  excluded: string[];
  from?: string;
  to?: string;
  status?: string;
  documentId?: string;
  warnings: string[];
}

export function parseQuery(raw: string): ParsedQuery {
  const warnings: string[] = [];
  const terms: string[] = [];
  const excluded: string[] = [];
  let from: string | undefined;
  let to: string | undefined;
  let status: string | undefined;
  let documentId: string | undefined;

  const trimmed = raw.slice(0, 512);
  const tokens = trimmed.match(/-?"[^"]+"|\S+/g) ?? [];
  for (const token of tokens) {
    const negative = token.startsWith('-');
    const value = negative ? token.slice(1) : token;
    if (!value) continue;
    if (value.startsWith('from:')) {
      from = value.slice(5) || undefined;
      continue;
    }
    if (value.startsWith('to:')) {
      to = value.slice(3) || undefined;
      continue;
    }
    if (value.startsWith('status:')) {
      const candidate = value.slice(7);
      if (['proposed', 'confirmed', 'rejected', 'unsupported'].includes(candidate)) {
        status = candidate;
      } else warnings.push(`unknown_status:${candidate}`);
      continue;
    }
    if (value.startsWith('document:')) {
      documentId = value.slice(9) || undefined;
      continue;
    }
    if (/^[a-z]+:$/.test(value)) {
      warnings.push(`missing_value:${value.slice(0, -1)}`);
      continue;
    }
    const phrase = value.replace(/^"|"$/g, '').toLowerCase().trim();
    if (!phrase) continue;
    if (negative) excluded.push(phrase);
    else terms.push(...phrase.split(/\s+/).filter((word) => word.length > 1));
  }

  return {
    text: trimmed,
    terms: [...new Set(terms.filter((term) => !STOPWORDS.has(term)))].slice(0, 8),
    excluded: [...new Set(excluded)].slice(0, 6),
    from,
    to,
    status,
    documentId,
    warnings,
  };
}

function rrf(rank: number, weight: number): number {
  return weight / (60 + rank);
}

@Injectable()
export class SearchService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
    private readonly vector: VectorService,
  ) {}

  async search(
    actor: FirmActor,
    matterId: string,
    input: { q: string; subsetId?: string; limit?: number; includeUnsupported?: boolean },
  ) {
    await this.policy.assertMatter(actor, 'search.read', matterId);
    const parsed = parseQuery(input.q ?? '');
    const limit = Math.min(input.limit ?? 20, 50);
    const documentIds = await this.scopeDocumentIds(
      actor,
      matterId,
      input.subsetId,
      parsed.documentId,
    );

    const [lexicalFacts, lexicalChunks] = await Promise.all([
      this.lexicalFacts(actor, matterId, parsed, documentIds, limit),
      this.lexicalChunks(actor, matterId, parsed, documentIds, 12),
    ]);

    const includeProposed = parsed.status === 'proposed';
    const [vectorFacts, vectorChunks] = await Promise.all([
      parsed.terms.length > 0
        ? this.vector.search({
            kind: 'facts',
            firmId: actor.firmId,
            matterId,
            query: parsed.text,
            documentIds,
            limit: 50,
            includeProposed,
          })
        : Promise.resolve([]),
      parsed.terms.length > 0
        ? this.vector.search({
            kind: 'chunks',
            firmId: actor.firmId,
            matterId,
            query: parsed.text,
            documentIds,
            limit: 50,
          })
        : Promise.resolve([]),
    ]);

    const warnings = [...parsed.warnings];
    if (this.vector.configured && !this.vector.available) {
      warnings.push('vector_unavailable');
    }

    const factScores = new Map<string, number>();
    vectorFacts.forEach((hit, index) =>
      factScores.set(hit.id, (factScores.get(hit.id) ?? 0) + rrf(index + 1, 0.6)),
    );
    lexicalFacts.forEach((fact, index) =>
      factScores.set(fact.id, (factScores.get(fact.id) ?? 0) + rrf(index + 1, 0.4)),
    );

    const chunkScores = new Map<string, number>();
    vectorChunks.forEach((hit, index) =>
      chunkScores.set(hit.id, (chunkScores.get(hit.id) ?? 0) + rrf(index + 1, 0.6)),
    );
    lexicalChunks.forEach((chunk, index) =>
      chunkScores.set(chunk.id, (chunkScores.get(chunk.id) ?? 0) + rrf(index + 1, 0.4)),
    );

    const factIds = [...factScores.keys()];
    const chunkIds = [...chunkScores.keys()];

    const factRows = factIds.length
      ? await this.db
          .select()
          .from(facts)
          .where(
            and(
              eq(facts.firmId, actor.firmId),
              eq(facts.matterId, matterId),
              inArray(facts.id, factIds),
              input.includeUnsupported || parsed.status === 'unsupported'
                ? undefined
                : sql`${facts.status} <> 'unsupported'`,
            ),
          )
      : [];
    const sourceRows = factRows.length
      ? await this.db
          .select({
            factId: factSources.factId,
            sourceId: factSources.id,
            documentId: factSources.documentId,
            documentName: documents.fileName,
            pageNumber: factSources.pageNumber,
            quote: factSources.quote,
            quoteHash: factSources.quoteHash,
            verification: factSources.verification,
            orphaned: factSources.orphaned,
          })
          .from(factSources)
          .innerJoin(documents, eq(documents.id, factSources.documentId))
          .where(
            inArray(
              factSources.factId,
              factRows.map((fact) => fact.id),
            ),
          )
      : [];

    const factItems = factRows
      .map((fact) => {
        const sources = sourceRows.filter((source) => source.factId === fact.id);
        let score = factScores.get(fact.id) ?? 0;
        if (fact.status === 'confirmed') score += 0.01;
        if (fact.status === 'proposed') score -= 0.005;
        return {
          id: fact.id,
          text: fact.text,
          dateStart: fact.dateStart,
          dateEnd: fact.dateEnd,
          factType: fact.factType,
          status: fact.status,
          origin: fact.origin,
          confidence: fact.confidence,
          score: Number(score.toFixed(5)),
          sources: sources.map((source) => ({
            sourceId: source.sourceId,
            documentId: source.documentId,
            documentName: source.documentName,
            pageNumber: source.pageNumber,
            quote: source.quote,
            quoteHash: source.quoteHash,
            verification: source.verification,
            orphaned: source.orphaned,
          })),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const chunkRows = chunkIds.length
      ? await this.db
          .select({
            id: documentChunks.id,
            documentId: documentChunks.documentId,
            documentName: documents.fileName,
            pageNumber: documentChunks.pageNumber,
            content: documentChunks.content,
          })
          .from(documentChunks)
          .innerJoin(documents, eq(documents.id, documentChunks.documentId))
          .where(
            and(
              eq(documentChunks.firmId, actor.firmId),
              eq(documentChunks.matterId, matterId),
              isNull(documents.deletedAt),
              inArray(documentChunks.id, chunkIds),
            ),
          )
      : [];

    return {
      query: parsed.text,
      facts: factItems,
      chunks: chunkRows
        .map((chunk) => ({
          id: chunk.id,
          documentId: chunk.documentId,
          documentName: chunk.documentName,
          pageNumber: chunk.pageNumber,
          text: chunk.content,
          score: Number((chunkScores.get(chunk.id) ?? 0).toFixed(5)),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 12),
      warnings,
    };
  }

  private async scopeDocumentIds(
    actor: FirmActor,
    matterId: string,
    subsetId?: string,
    documentId?: string,
  ): Promise<string[] | undefined> {
    if (subsetId) {
      const [subset] = await this.db
        .select({ id: subsets.id })
        .from(subsets)
        .where(
          and(
            eq(subsets.id, subsetId),
            eq(subsets.firmId, actor.firmId),
            eq(subsets.matterId, matterId),
          ),
        )
        .limit(1);
      if (!subset) return [];
      const rows = await this.db
        .select({ documentId: subsetDocuments.documentId })
        .from(subsetDocuments)
        .where(eq(subsetDocuments.subsetId, subsetId));
      return rows.map((row) => row.documentId);
    }
    if (documentId) return [documentId];
    return undefined;
  }

  private async lexicalFacts(
    actor: FirmActor,
    matterId: string,
    parsed: ParsedQuery,
    documentIds: string[] | undefined,
    limit: number,
  ) {
    const conditions = [
      eq(facts.firmId, actor.firmId),
      eq(facts.matterId, matterId),
      parsed.status
        ? eq(facts.status, parsed.status as 'proposed' | 'confirmed' | 'rejected' | 'unsupported')
        : eq(facts.status, 'confirmed'),
    ];
    if (parsed.from) conditions.push(gte(facts.dateStart, parsed.from));
    if (parsed.to) conditions.push(lte(facts.dateStart, parsed.to));
    if (parsed.terms.length > 0) {
      const matches = parsed.terms.map((term) => ilike(facts.text, `%${term}%`));
      conditions.push(or(...matches)!);
    }
    if (documentIds) {
      conditions.push(
        sql`exists (
          select 1 from ${factSources}
          where ${factSources.factId} = ${facts.id}
            and ${factSources.documentId} in (${sql.join(
              documentIds.map((id) => sql`${id}`),
              sql`, `,
            )})
        )`,
      );
    }
    const rows = await this.db
      .select()
      .from(facts)
      .where(and(...conditions))
      .orderBy(desc(facts.dateStart), desc(facts.createdAt))
      .limit(limit);
    return parsed.excluded.length > 0
      ? rows.filter(
          (row) =>
            !parsed.excluded.some((term) => row.text.toLowerCase().includes(term)),
        )
      : rows;
  }

  private async lexicalChunks(
    actor: FirmActor,
    matterId: string,
    parsed: ParsedQuery,
    documentIds: string[] | undefined,
    limit: number,
  ) {
    const conditions = [
      eq(documentChunks.firmId, actor.firmId),
      eq(documentChunks.matterId, matterId),
      isNull(documents.deletedAt),
    ];
    if (parsed.terms.length > 0) {
      conditions.push(or(...parsed.terms.map((term) => ilike(documentChunks.content, `%${term}%`)))!);
    }
    if (documentIds) conditions.push(inArray(documentChunks.documentId, documentIds));
    const rows = await this.db
      .select({
        id: documentChunks.id,
        documentId: documentChunks.documentId,
        documentName: documents.fileName,
        pageNumber: documentChunks.pageNumber,
        content: documentChunks.content,
      })
      .from(documentChunks)
      .innerJoin(documents, eq(documents.id, documentChunks.documentId))
      .where(and(...conditions))
      .limit(limit);
    return parsed.excluded.length > 0
      ? rows.filter(
          (row) => !parsed.excluded.some((term) => row.content.toLowerCase().includes(term)),
        )
      : rows;
  }
}
