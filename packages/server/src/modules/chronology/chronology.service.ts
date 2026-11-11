import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
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
    ];

    if (query.q) {
      const terms = query.q
        .toLowerCase()
        .split(/[ ,;.\u2013\u2014\u2019]+/)
        .filter((term) => term.length >= 2);
      if (terms.length > 0) {
        conditions.push(or(...terms.map((term) => ilike(facts.text, `%${term}%`))));
      }
    }

    const datedRows = await this.db
      .select({
        fact: facts,
        sourceCount: sql<number>`(
          select count(*)
          from ${factSources}
          where ${factSources.factId} = ${facts.id}
        )::int`,
      })
      .from(facts)
      .where(and(...conditions, sql`not isnull(facts.date_start)`))
      .limit(limit + 1);

    const hasMore = datedRows.length > limit;
    const datedItems = datedRows.slice(0, limit).map(({ fact, sourceCount }) => {
      const dateStart = fact.dateStart;
      if (!dateStart) throw new DomainError(INTERNAL_ERROR, 500, 'chronology query returned null dateStart');
      return this.toDto(fact, sourceCount, dateStart);
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
        ),
      )
      .limit(1);

    const undatedCount = undatedRow[0]?.count ?? 0;

    return {
      items: datedItems,
      nextCursor: hasMore ? datedItems.at(-1)!.createdAt : null,
      undatedCount,
    };
  }

  private toDto(fact: typeof facts.$inferSelect, sourceCount: number, dateStart: Date): ChronologyRowDto {
    return {
      id: fact.id,
      matterId: fact.matterId,
      text: fact.text,
      factType: fact.factType,
      dateStart: dateStart.toISOString().slice(0, 10),
      dateEnd: fact.dateEnd ? fact.dateEnd.toISOString().slice(0, 10) : null,
      dateText: fact.dateText,
      status: fact.status,
      origin: fact.origin,
      sourceCount,
      createdAt: fact.createdAt.toISOString(),
      updatedAt: fact.updatedAt.toISOString(),
    };
  }
}
