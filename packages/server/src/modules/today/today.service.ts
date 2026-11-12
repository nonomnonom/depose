import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  documents,
  matters,
  outputs,
  recentViews,
  subsets,
  threads,
} from '../../infrastructure/database/schema/index.js';
import type {
  ChatItem,
  ForYouItem,
  JumpBackItem,
  RecordRecentInput,
  TodayOverview,
  TodayQuery,
} from './today.dto.js';

const LIMITS = { jumpBack: 6, forYou: 6, chats: 12, perSource: 3 };

@Injectable()
export class TodayService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Record/refresh a recently viewed resource (PostHog Today "Jump back in"). */
  async recordRecent(actor: FirmActor, input: RecordRecentInput): Promise<void> {
    const openedAt = new Date();

    if (input.resourceType === 'matter') {
      const [matter] = await this.db
        .select({ id: matters.id })
        .from(matters)
        .where(and(eq(matters.id, input.resourceId), eq(matters.firmId, actor.firmId)))
        .limit(1);
      if (!matter) throw DomainError.notFound('Matter not found');
    }

    await this.db
      .insert(recentViews)
      .values({
        firmId: actor.firmId,
        userId: actor.userId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        openedAt,
      })
      .onConflictDoUpdate({
        target: [recentViews.userId, recentViews.resourceType, recentViews.resourceId],
        set: { openedAt, firmId: actor.firmId },
      });
  }

  /**
   * Home feed. Matter scope (PostHog: Today inside a project) when `matterId`
   * is given, otherwise a firm-level overview. Matter scope surfaces recently
   * touched documents, reports, and subsets plus the user's chats.
   */
  async overview(actor: FirmActor, query: TodayQuery): Promise<TodayOverview> {
    if (query.matterId) {
      await this.assertMatter(actor, query.matterId);
      const [jumpBackIn, chats] = await Promise.all([
        this.matterJumpBackIn(actor.firmId, query.matterId),
        this.matterChats(actor, query.matterId),
      ]);
      const forYou: ForYouItem[] = jumpBackIn.slice(0, LIMITS.forYou).map((item) => ({
        ...item,
        reason: 'Recent activity in this matter',
      }));
      return { scope: 'matter', jumpBackIn, forYou, chats };
    }

    const [jumpBackIn, forYou, chats] = await Promise.all([
      this.firmJumpBackIn(actor),
      this.firmForYou(actor),
      this.firmChats(actor),
    ]);
    return { scope: 'firm', jumpBackIn, forYou, chats };
  }

  private async assertMatter(actor: FirmActor, matterId: string): Promise<void> {
    const [matter] = await this.db
      .select({ id: matters.id })
      .from(matters)
      .where(and(eq(matters.id, matterId), eq(matters.firmId, actor.firmId)))
      .limit(1);
    if (!matter) throw DomainError.notFound('Matter not found');
  }

  /** Recently updated documents, reports, and subsets inside one matter. */
  private async matterJumpBackIn(firmId: string, matterId: string): Promise<JumpBackItem[]> {
    const [docs, reports, subs] = await Promise.all([
      this.db
        .select({ id: documents.id, title: documents.fileName, updatedAt: documents.updatedAt })
        .from(documents)
        .where(
          and(
            eq(documents.firmId, firmId),
            eq(documents.matterId, matterId),
            isNull(documents.deletedAt),
          ),
        )
        .orderBy(desc(documents.updatedAt))
        .limit(LIMITS.perSource),
      this.db
        .select({ id: outputs.id, title: outputs.title, updatedAt: outputs.updatedAt })
        .from(outputs)
        .where(and(eq(outputs.firmId, firmId), eq(outputs.matterId, matterId)))
        .orderBy(desc(outputs.updatedAt))
        .limit(LIMITS.perSource),
      this.db
        .select({ id: subsets.id, title: subsets.name, updatedAt: subsets.updatedAt })
        .from(subsets)
        .where(and(eq(subsets.firmId, firmId), eq(subsets.matterId, matterId)))
        .orderBy(desc(subsets.updatedAt))
        .limit(LIMITS.perSource),
    ]);

    return [
      ...docs.map((row) => ({ type: 'document' as const, ...row })),
      ...reports.map((row) => ({ type: 'report' as const, ...row })),
      ...subs.map((row) => ({ type: 'subset' as const, ...row })),
    ]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, LIMITS.jumpBack)
      .map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() }));
  }

  private async matterChats(actor: FirmActor, matterId: string): Promise<ChatItem[]> {
    const rows = await this.db
      .select({
        threadId: threads.id,
        matterId: threads.matterId,
        title: threads.title,
        updatedAt: threads.updatedAt,
      })
      .from(threads)
      .where(
        and(
          eq(threads.firmId, actor.firmId),
          eq(threads.userId, actor.userId),
          eq(threads.matterId, matterId),
        ),
      )
      .orderBy(desc(threads.updatedAt))
      .limit(LIMITS.chats);
    return rows.flatMap((row) =>
      row.matterId
        ? [{ threadId: row.threadId, matterId: row.matterId, title: row.title, updatedAt: row.updatedAt.toISOString() }]
        : [],
    );
  }

  private async firmJumpBackIn(actor: FirmActor): Promise<JumpBackItem[]> {
    const rows = await this.db
      .select({
        id: recentViews.resourceId,
        name: matters.name,
        status: matters.status,
        openedAt: recentViews.openedAt,
      })
      .from(recentViews)
      .innerJoin(matters, eq(matters.id, recentViews.resourceId))
      .where(
        and(
          eq(recentViews.firmId, actor.firmId),
          eq(recentViews.userId, actor.userId),
          eq(recentViews.resourceType, 'matter'),
        ),
      )
      .orderBy(desc(recentViews.openedAt))
      .limit(LIMITS.jumpBack);
    return rows.map((row) => ({
      type: 'matter' as const,
      id: row.id,
      title: row.name,
      updatedAt: row.openedAt.toISOString(),
    }));
  }

  private async firmForYou(actor: FirmActor): Promise<ForYouItem[]> {
    const rows = await this.db
      .select({ id: matters.id, name: matters.name, updatedAt: matters.updatedAt })
      .from(matters)
      .where(and(eq(matters.firmId, actor.firmId), eq(matters.status, 'active')))
      .orderBy(desc(matters.updatedAt))
      .limit(LIMITS.forYou);
    return rows.map((row) => ({
      type: 'matter' as const,
      id: row.id,
      title: row.name,
      reason: 'Recent activity in this matter',
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  private async firmChats(actor: FirmActor): Promise<ChatItem[]> {
    const rows = await this.db
      .select({
        threadId: threads.id,
        matterId: threads.matterId,
        title: threads.title,
        updatedAt: threads.updatedAt,
      })
      .from(threads)
      .where(
        and(
          eq(threads.firmId, actor.firmId),
          eq(threads.userId, actor.userId),
          isNotNull(threads.matterId),
        ),
      )
      .orderBy(desc(threads.updatedAt))
      .limit(LIMITS.chats);
    return rows.flatMap((row) =>
      row.matterId
        ? [{ threadId: row.threadId, matterId: row.matterId, title: row.title, updatedAt: row.updatedAt.toISOString() }]
        : [],
    );
  }
}
