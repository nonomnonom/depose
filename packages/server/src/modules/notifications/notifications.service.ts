import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, lt, sql } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import { notifications } from '../../infrastructure/database/schema/index.js';
import type { ListNotificationsQuery } from './notifications.dto.js';

@Injectable()
export class NotificationsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(actor: FirmActor, query: ListNotificationsQuery) {
    const limit = query.limit ?? 20;
    const conditions = [
      eq(notifications.firmId, actor.firmId),
      eq(notifications.userId, actor.userId),
    ];
    if (query.unreadOnly) conditions.push(isNull(notifications.readAt));
    if (query.cursor) conditions.push(lt(notifications.createdAt, new Date(query.cursor)));

    const rows = await this.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);
    return {
      items,
      nextCursor: hasMore ? items.at(-1)?.createdAt.toISOString() ?? null : null,
    };
  }

  async unreadCount(actor: FirmActor) {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.firmId, actor.firmId),
          eq(notifications.userId, actor.userId),
          isNull(notifications.readAt),
        ),
      );
    return row?.count ?? 0;
  }

  async markRead(actor: FirmActor, id: string) {
    const [updated] = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.firmId, actor.firmId),
          eq(notifications.userId, actor.userId),
        ),
      )
      .returning();
    if (!updated) throw DomainError.notFound('Notification not found');
    return updated;
  }

  async markAllRead(actor: FirmActor) {
    const rows = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.firmId, actor.firmId),
          eq(notifications.userId, actor.userId),
          isNull(notifications.readAt),
        ),
      )
      .returning({ id: notifications.id });
    return { updated: rows.length };
  }
}
