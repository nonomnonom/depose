import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import { decodeCursor, encodeCursor } from '../../common/pagination.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import { factSources, facts } from '../../infrastructure/database/schema/index.js';
import { PolicyService } from '../access-control/policy.service.js';
import type { ChronologyQuery } from './chronology.dto.js';
import type { ChronologyTimelineDto } from './chronology.dto.js';
import type { ChronologyRowDto } from './chronology.dto.js';

@Injectable()
export class ChronologyService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
  ) {}

  async timeline(
    actor: FirmActor,
    matterId: string,
    query: ChronologyQuery,
  ): Promise<ChronologyTimelineDto> {
    await this.policy.assertMatter(actor, 'fact.read', matterId);

    const limit = query.limit ?? 60;

    const conditions = [
      eq(facts.firmId, actor.firmId),
      eq(facts.matterId, matterId),
      eq(facts.status, 'confirmed'),
      isNull(facts.mergedIntoId),
      isNull(facts.archivedAt),
    ];

    if (query.q) {
      const terms = query.q
        .toLowerCase()
        .split(/[ ,;.\u2013\u2014\u2019]+/)
        .filter((term) => term.length >= 2);
      const search = or(...terms.map((term) => ilike(facts.text, `%${term}%`)));
      if (search) conditions.push(search);
    }

    const cursor = decodeCursor(query.cursor);
    if (cursor) {
      conditions.push(
        or(
          sql`${facts.dateStart} > ${cursor.sortValue}`,
          and(
            eq(facts.dateStart, cursor.sortValue),
            sql`${facts.id} > ${cursor.id}`,
          ),
        )!,
      );
    }

    const datedConditions = and(...conditions, sql`${facts.dateStart} is not null`);

    const datedRows = await this.db
      .select()
      .from(facts)
      .where(datedConditions)
      .orderBy(asc(facts.dateStart), asc(facts.id))
      .limit(limit + 1);

    const hasMore = datedRows.length > limit;
    const page = datedRows.slice(0, limit);
    const sourceCounts = await this.sourceCounts(page.map((fact) => fact.id));

    const datedItems = page.map((fact) => {
      const dateStart = fact.dateStart;
      if (!dateStart) {
        throw new DomainError('INTERNAL_ERROR', 500, 'chronology query returned null dateStart');
      }
      return this.toDto(fact, sourceCounts.get(fact.id) ?? 0, dateStart, fact.dateEnd ?? null);
    });

    const undatedRow = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(facts)
      .where(
        and(
          eq(facts.firmId, actor.firmId),
          eq(facts.matterId, matterId),
          eq(facts.status, 'confirmed'),
          isNull(facts.dateStart),
          isNull(facts.archivedAt),
        ),
      )
      .limit(1);

    const undatedCount = (undatedRow[0]?.count as number) ?? 0;

    const last = datedItems.at(-1);
    return {
      items: datedItems,
      nextCursor:
        hasMore && last
          ? encodeCursor({ sortValue: last.dateStart, id: last.id })
          : null,
      undatedCount,
    };
  }

  private async sourceCounts(factIds: string[]): Promise<Map<string, number>> {
    if (factIds.length === 0) return new Map();
    const rows = await this.db
      .select({
        factId: factSources.factId,
        count: sql<number>`count(*)::int`,
      })
      .from(factSources)
      .where(inArray(factSources.factId, factIds))
      .groupBy(factSources.factId);
    return new Map(rows.map((row) => [row.factId, row.count]));
  }

  private toDto(
    fact: typeof facts.$inferSelect,
    sourceCount: number,
    dateStart: string,
    dateEnd: string | null = null,
  ): ChronologyRowDto {
    return {
      id: fact.id,
      matterId: fact.matterId,
      text: fact.text,
      factType: fact.factType,
      dateStart: dateStart,
      dateEnd: dateEnd,
      dateText: fact.dateText,
      status: fact.status,
      origin: fact.origin,
      sourceCount,
      createdAt: fact.createdAt.toISOString(),
      updatedAt: fact.updatedAt.toISOString(),
    };
  }
}
