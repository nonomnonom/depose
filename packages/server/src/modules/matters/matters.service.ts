import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import {
  decodeCursor,
  encodeCursor,
  normalizeLimit,
} from '../../common/pagination.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  documents,
  facts,
  matters,
  matterMembers,
  subsets,
} from '../../infrastructure/database/schema/index.js';
import { AuditService } from '../audit/audit.service.js';
import { PolicyService } from '../access-control/policy.service.js';
import type {
  CreateMatterInput,
  ListMattersQuery,
  UpdateMatterInput,
} from './matters.dto.js';

const STATUS_TRANSITIONS: Record<string, string[]> = {
  active: ['closed', 'archived'],
  closed: ['active', 'archived'],
  archived: ['active'],
};

@Injectable()
export class MattersService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: FirmActor, query: ListMattersQuery) {
    const limit = normalizeLimit(query.limit);
    const cursor = decodeCursor(query.cursor);

    const conditions = [
      eq(matters.firmId, actor.firmId),
      isNull(matters.deletedAt),
      query.status ? eq(matters.status, query.status) : undefined,
      query.q ? ilike(matters.name, `%${query.q}%`) : undefined,
      cursor
        ? or(
            sql`${matters.updatedAt} < ${new Date(cursor.sortValue)}`,
            and(
              sql`${matters.updatedAt} = ${new Date(cursor.sortValue)}`,
              sql`${matters.id} < ${cursor.id}`,
            ),
          )
        : undefined,
      /* Admins and firm API keys see every matter in the firm. */
      actor.role === 'admin' || actor.apiKeyId
        ? undefined
        : sql`exists (select 1 from ${matterMembers} mm where mm.matter_id = ${matters.id} and mm.user_id = ${actor.userId})`,
    ].filter((value): value is NonNullable<typeof value> => value !== undefined);

    const rows = await this.db
      .select()
      .from(matters)
      .where(and(...conditions))
      .orderBy(desc(matters.updatedAt), desc(matters.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items.at(-1);

    return {
      items,
      nextCursor:
        hasMore && last
          ? encodeCursor({ sortValue: last.updatedAt.toISOString(), id: last.id })
          : null,
      hasMore,
      warnings: [],
    };
  }

  async overview(actor: FirmActor, matterId: string) {
    await this.policy.assertMatter(actor, 'matter.read', matterId);
    const firmId = actor.firmId;
    const base = and(
      eq(documents.firmId, firmId),
      eq(documents.matterId, matterId),
      isNull(documents.deletedAt),
    );

    const [documentCounts] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        ready: sql<number>`count(*) filter (where ${documents.processingStatus} = 'done')::int`,
        processing: sql<number>`count(*) filter (where ${documents.processingStatus} in ('queued','processing'))::int`,
        needsReview: sql<number>`count(*) filter (where ${documents.processingStatus} = 'needs_review')::int`,
        failed: sql<number>`count(*) filter (where ${documents.processingStatus} = 'failed')::int`,
      })
      .from(documents)
      .where(base);

    const [factCounts] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        proposed: sql<number>`count(*) filter (where ${facts.status} = 'proposed')::int`,
        confirmed: sql<number>`count(*) filter (where ${facts.status} = 'confirmed')::int`,
        rejected: sql<number>`count(*) filter (where ${facts.status} = 'rejected')::int`,
      })
      .from(facts)
      .where(and(eq(facts.firmId, firmId), eq(facts.matterId, matterId)));

    const [subsetCount] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(subsets)
      .where(and(eq(subsets.firmId, firmId), eq(subsets.matterId, matterId)));

    const [reviewQueue, recentDocuments, recentFacts] = await Promise.all([
      this.db
        .select({
          id: facts.id,
          text: facts.text,
          dateStart: facts.dateStart,
          confidence: facts.confidence,
          createdAt: facts.createdAt,
        })
        .from(facts)
        .where(
          and(
            eq(facts.firmId, firmId),
            eq(facts.matterId, matterId),
            eq(facts.status, 'proposed'),
          ),
        )
        .orderBy(desc(facts.createdAt))
        .limit(5),
      this.db
        .select({
          id: documents.id,
          fileName: documents.fileName,
          type: documents.type,
          processingStatus: documents.processingStatus,
          pageCount: documents.pageCount,
          createdAt: documents.createdAt,
        })
        .from(documents)
        .where(base)
        .orderBy(desc(documents.createdAt))
        .limit(5),
      this.db
        .select({
          id: facts.id,
          text: facts.text,
          dateStart: facts.dateStart,
          factType: facts.factType,
        })
        .from(facts)
        .where(
          and(
            eq(facts.firmId, firmId),
            eq(facts.matterId, matterId),
            eq(facts.status, 'confirmed'),
          ),
        )
        .orderBy(desc(facts.dateStart), desc(facts.createdAt))
        .limit(5),
    ]);

    return {
      documents:
        documentCounts ?? { total: 0, ready: 0, processing: 0, needsReview: 0, failed: 0 },
      facts: factCounts ?? { total: 0, proposed: 0, confirmed: 0, rejected: 0 },
      subsets: subsetCount?.total ?? 0,
      reviewQueue,
      recentDocuments,
      recentFacts,
    };
  }

  async get(actor: FirmActor, matterId: string) {
    await this.policy.assertMatter(actor, 'matter.read', matterId);
    const [matter] = await this.db
      .select()
      .from(matters)
      .where(and(eq(matters.id, matterId), eq(matters.firmId, actor.firmId)))
      .limit(1);
    if (!matter) throw DomainError.notFound('Matter not found');
    return matter;
  }

  async create(actor: FirmActor, input: CreateMatterInput) {
    this.policy.assertFirm(actor, 'matter.create');

    const matter = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(matters)
        .values({
          firmId: actor.firmId,
          name: input.name,
          matterNumber: input.matterNumber,
          type: input.type,
          description: input.description,
          openedDate: input.openedDate ?? new Date().toISOString().slice(0, 10),
          leadLawyerId: input.leadLawyerId ?? actor.userId,
          tags: input.tags,
          createdBy: actor.userId,
        })
        .returning();

      await tx.insert(matterMembers).values({
        firmId: actor.firmId,
        matterId: created.id,
        userId: actor.userId,
        access: 'full',
        createdBy: actor.userId,
      });

      return created;
    });

    await this.audit.log({
      firmId: actor.firmId,
      action: 'matter.created',
      resourceType: 'matter',
      resourceId: matter.id,
      actor,
    });

    return matter;
  }

  async update(actor: FirmActor, matterId: string, input: UpdateMatterInput) {
    let currentStatus: string | null = null;

    if (input.status) {
      const current = await this.policy.resolveMatterAccess(actor, matterId);
      currentStatus = current.status;
      if (input.status !== current.status) {
        if (!STATUS_TRANSITIONS[current.status]?.includes(input.status)) {
          throw DomainError.invalidTransition(current.status, input.status);
        }
        const statusAction =
          input.status === 'closed'
            ? 'matter.close'
            : input.status === 'archived'
              ? 'matter.archive'
              : 'matter.reopen';
        await this.policy.assertMatter(actor, statusAction, matterId);
      }
    }

    await this.policy.assertMatter(actor, 'matter.update', matterId);

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of [
      'name',
      'matterNumber',
      'type',
      'description',
      'leadLawyerId',
      'tags',
    ] as const) {
      if (input[key] !== undefined) patch[key] = input[key];
    }
    if (input.status && input.status !== currentStatus) {
      patch.status = input.status;
      patch.closedDate =
        input.status === 'closed' ? new Date().toISOString().slice(0, 10) : null;
    }

    const [matter] = await this.db
      .update(matters)
      .set(patch)
      .where(and(eq(matters.id, matterId), eq(matters.firmId, actor.firmId)))
      .returning();

    if (!matter) throw DomainError.notFound('Matter not found');

    await this.audit.log({
      firmId: actor.firmId,
      action: 'matter.updated',
      resourceType: 'matter',
      resourceId: matterId,
      actor,
      metadata: { fields: Object.keys(input) },
    });

    return matter;
  }
}
