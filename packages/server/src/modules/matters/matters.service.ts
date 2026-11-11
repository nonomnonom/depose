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
  matters,
  matterMembers,
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
      actor.role === 'admin'
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
    let statusAction: 'matter.close' | 'matter.reopen' | 'matter.archive' | null = null;
    let currentStatus: string | null = null;

    if (input.status) {
      const current = await this.policy.resolveMatterAccess(actor, matterId);
      currentStatus = current.status;
      if (input.status !== current.status) {
        if (!STATUS_TRANSITIONS[current.status]?.includes(input.status)) {
          throw DomainError.invalidTransition(current.status, input.status);
        }
        statusAction =
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
