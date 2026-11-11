import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { and, desc, eq, ilike, isNull, lt, sql } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  documents,
  factSources,
  facts,
} from '../../infrastructure/database/schema/index.js';
import { PolicyService } from '../access-control/policy.service.js';
import { AuditService } from '../audit/audit.service.js';
import { VectorService } from '../search/vector.service.js';
import type {
  CreateFactInput,
  ListFactsQuery,
  UpdateFactInput,
} from './facts.dto.js';

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

@Injectable()
export class FactsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
    private readonly vector: VectorService,
  ) {}

  async list(actor: FirmActor, matterId: string, query: ListFactsQuery) {
    await this.policy.assertMatter(actor, 'fact.read', matterId);
    const limit = query.limit ?? 30;
    const conditions = [eq(facts.firmId, actor.firmId), eq(facts.matterId, matterId)];
    if (query.status) conditions.push(eq(facts.status, query.status));
    if (query.q) conditions.push(ilike(facts.text, `%${query.q}%`));
    if (query.cursor) conditions.push(lt(facts.createdAt, new Date(query.cursor)));

    const rows = await this.db
      .select({
        fact: facts,
        sourceCount: sql<number>`(select count(*) from ${factSources} where ${factSources.factId} = ${facts.id})::int`,
      })
      .from(facts)
      .where(and(...conditions))
      .orderBy(desc(facts.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);
    return {
      items: items.map(({ fact, sourceCount }) => this.toDto(fact, sourceCount)),
      nextCursor: hasMore ? items.at(-1)?.fact.createdAt.toISOString() ?? null : null,
    };
  }

  async get(actor: FirmActor, matterId: string, factId: string) {
    await this.policy.assertMatter(actor, 'fact.read', matterId);
    const fact = await this.requireFact(actor, matterId, factId);
    const sources = await this.db
      .select({
        id: factSources.id,
        documentId: factSources.documentId,
        documentName: documents.fileName,
        pageNumber: factSources.pageNumber,
        quote: factSources.quote,
        verification: factSources.verification,
      })
      .from(factSources)
      .innerJoin(documents, eq(documents.id, factSources.documentId))
      .where(eq(factSources.factId, fact.id))
      .orderBy(factSources.pageNumber);
    return { ...this.toDto(fact, sources.length), sources };
  }

  async create(actor: FirmActor, matterId: string, input: CreateFactInput) {
    await this.policy.assertMatter(actor, 'fact.create', matterId);

    if (input.source) {
      const [document] = await this.db
        .select({ id: documents.id })
        .from(documents)
        .where(
          and(
            eq(documents.id, input.source.documentId),
            eq(documents.firmId, actor.firmId),
            eq(documents.matterId, matterId),
            isNull(documents.deletedAt),
          ),
        )
        .limit(1);
      if (!document) throw DomainError.validation('Source document is not in this matter');
    }

    const created = await this.db.transaction(async (tx) => {
      const [fact] = await tx
        .insert(facts)
        .values({
          firmId: actor.firmId,
          matterId,
          text: input.text,
          normalizedText: normalize(input.text),
          factType: input.factType,
          dateStart: input.dateStart,
          dateEnd: input.dateEnd,
          status: 'proposed',
          origin: 'manual',
          createdBy: actor.userId,
        })
        .returning();

      if (input.source) {
        await tx.insert(factSources).values({
          firmId: actor.firmId,
          matterId,
          factId: fact.id,
          documentId: input.source.documentId,
          pageNumber: input.source.pageNumber,
          quote: input.source.quote,
          quoteHash: createHash('sha256').update(input.source.quote).digest('hex'),
          sourceKind: 'manual',
          verification: 'verified',
          lastSeenAt: new Date(),
        });
      }
      return fact;
    });

    await this.vector.indexFacts([created.id]);

    await this.audit.log({
      firmId: actor.firmId,
      action: 'fact.created',
      resourceType: 'fact',
      resourceId: created.id,
      actor,
      metadata: { matterId, sourceCount: input.source ? 1 : 0 },
    });

    return this.toDto(created, input.source ? 1 : 0);
  }

  async update(actor: FirmActor, matterId: string, factId: string, input: UpdateFactInput) {
    await this.policy.assertMatter(actor, 'fact.update', matterId);
    const fact = await this.requireFact(actor, matterId, factId);
    if (fact.status === 'confirmed' && input.text && normalize(input.text) !== fact.normalizedText) {
      throw DomainError.conflict('CONFLICT', 'Confirmed facts are immutable');
    }

    const [updated] = await this.db
      .update(facts)
      .set({
        ...(input.text
          ? { text: input.text, normalizedText: normalize(input.text) }
          : {}),
        ...(input.factType !== undefined ? { factType: input.factType } : {}),
        ...(input.dateStart !== undefined ? { dateStart: input.dateStart } : {}),
        ...(input.dateEnd !== undefined ? { dateEnd: input.dateEnd } : {}),
        updatedAt: new Date(),
      })
      .where(eq(facts.id, fact.id))
      .returning();

    await this.audit.log({
      firmId: actor.firmId,
      action: 'fact.updated',
      resourceType: 'fact',
      resourceId: fact.id,
      actor,
      metadata: { matterId, fields: Object.keys(input) },
    });

    return this.toDto(updated, await this.sourceCount(fact.id));
  }

  async confirm(actor: FirmActor, matterId: string, factId: string) {
    await this.policy.assertMatter(actor, 'fact.confirm', matterId);
    return this.changeStatus(actor, matterId, factId, 'confirmed', ['proposed', 'unsupported']);
  }

  async reject(actor: FirmActor, matterId: string, factId: string) {
    await this.policy.assertMatter(actor, 'fact.reject', matterId);
    return this.changeStatus(actor, matterId, factId, 'rejected', ['proposed', 'confirmed']);
  }

  async remove(actor: FirmActor, matterId: string, factId: string) {
    await this.policy.assertMatter(actor, 'fact.delete', matterId);
    const fact = await this.requireFact(actor, matterId, factId);
    await this.db.delete(facts).where(eq(facts.id, fact.id));
    await this.vector.removeFact(fact.id);
    await this.audit.log({
      firmId: actor.firmId,
      action: 'fact.deleted',
      resourceType: 'fact',
      resourceId: fact.id,
      actor,
      metadata: { matterId },
    });
    return { deleted: true };
  }

  private async changeStatus(
    actor: FirmActor,
    matterId: string,
    factId: string,
    status: 'confirmed' | 'rejected',
    allowedFrom: string[],
  ) {
    const fact = await this.requireFact(actor, matterId, factId);
    if (!allowedFrom.includes(fact.status)) {
      throw DomainError.invalidTransition(fact.status, status);
    }
    const [updated] = await this.db
      .update(facts)
      .set({ status, updatedAt: new Date() })
      .where(eq(facts.id, fact.id))
      .returning();
    if (status === 'confirmed') await this.vector.indexFacts([fact.id]);
    else await this.vector.removeFact(fact.id);
    await this.audit.log({
      firmId: actor.firmId,
      action: status === 'confirmed' ? 'fact.confirmed' : 'fact.rejected',
      resourceType: 'fact',
      resourceId: fact.id,
      actor,
      metadata: { matterId, from: fact.status },
    });
    return this.toDto(updated, await this.sourceCount(fact.id));
  }

  private async sourceCount(factId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(factSources)
      .where(eq(factSources.factId, factId));
    return row?.count ?? 0;
  }

  private async requireFact(actor: FirmActor, matterId: string, factId: string) {
    const [fact] = await this.db
      .select()
      .from(facts)
      .where(
        and(
          eq(facts.id, factId),
          eq(facts.firmId, actor.firmId),
          eq(facts.matterId, matterId),
        ),
      )
      .limit(1);
    if (!fact) throw DomainError.notFound('Fact not found');
    return fact;
  }

  private toDto(row: typeof facts.$inferSelect, sourceCount: number) {
    return {
      id: row.id,
      matterId: row.matterId,
      text: row.text,
      factType: row.factType,
      dateStart: row.dateStart,
      dateEnd: row.dateEnd,
      status: row.status,
      origin: row.origin,
      confidence: row.confidence,
      sourceCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
