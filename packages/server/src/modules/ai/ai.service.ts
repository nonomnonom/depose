import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  messageSources,
  messages,
  threads,
} from '../../infrastructure/database/schema/index.js';
import { PolicyService } from '../access-control/policy.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AgentService, type AgentCitation, type AgentToolCall } from './agent.service.js';

@Injectable()
export class AiService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly agent: AgentService,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  async listThreads(actor: FirmActor, matterId: string) {
    await this.policy.assertMatter(actor, 'ai.ask', matterId);
    return this.db
      .select()
      .from(threads)
      .where(
        and(
          eq(threads.firmId, actor.firmId),
          eq(threads.matterId, matterId),
          eq(threads.userId, actor.userId),
        ),
      )
      .orderBy(desc(threads.updatedAt));
  }

  async createThread(actor: FirmActor, matterId: string, title?: string) {
    await this.policy.assertMatter(actor, 'ai.ask', matterId);
    const [thread] = await this.db
      .insert(threads)
      .values({
        firmId: actor.firmId,
        matterId,
        userId: actor.userId,
        scope: 'matter',
        title: title?.trim() || 'New conversation',
      })
      .returning();
    return thread;
  }

  async getThread(actor: FirmActor, matterId: string, threadId: string) {
    await this.policy.assertMatter(actor, 'ai.ask', matterId);
    const thread = await this.requireThread(actor, matterId, threadId);
    const rows = await this.db
      .select()
      .from(messages)
      .where(eq(messages.threadId, thread.id))
      .orderBy(asc(messages.createdAt));

    const assistantIds = rows.filter((row) => row.role === 'assistant').map((row) => row.id);
    const sources =
      assistantIds.length > 0
        ? await this.db
            .select()
            .from(messageSources)
            .where(
              and(
                eq(messageSources.firmId, actor.firmId),
                eq(messageSources.matterId, matterId),
              ),
            )
        : [];

    return {
      thread: this.toThreadDto(thread),
      messages: rows.map((row) =>
        this.toMessageDto(
          row,
          sources
            .filter((source) => source.messageId === row.id)
            .map((source) => source.citationSnapshot as unknown as AgentCitation),
        ),
      ),
    };
  }

  async sendMessage(actor: FirmActor, matterId: string, threadId: string, content: string) {
    await this.policy.assertMatter(actor, 'ai.ask', matterId);
    const thread = await this.requireThread(actor, matterId, threadId);

    const [userMessage] = await this.db
      .insert(messages)
      .values({
        firmId: actor.firmId,
        matterId,
        threadId: thread.id,
        role: 'user',
        content,
      })
      .returning();

    const result = await this.agent.run(actor, matterId, content);

    const [assistantMessage] = await this.db.transaction(async (tx) => {
      const [assistant] = await tx
        .insert(messages)
        .values({
          firmId: actor.firmId,
          matterId,
          threadId: thread.id,
          role: 'assistant',
          content: result.content,
          runMetadata: {
            toolCalls: result.toolCalls,
            mode: result.mode,
            model: result.model ?? null,
          },
        })
        .returning();

      if (result.citations.length > 0) {
        await tx.insert(messageSources).values(
          result.citations.map((citation) => ({
            firmId: actor.firmId,
            matterId,
            messageId: assistant.id,
            factId: citation.factId,
            citationSnapshot: citation as unknown as Record<string, unknown>,
          })),
        );
      }

      await tx
        .update(threads)
        .set({
          title:
            thread.title && thread.title !== 'New conversation'
              ? thread.title
              : content.slice(0, 80),
          updatedAt: new Date(),
        })
        .where(eq(threads.id, thread.id));

      return [assistant];
    });

    await this.audit.log({
      firmId: actor.firmId,
      action: 'ai.message_sent',
      resourceType: 'thread',
      resourceId: thread.id,
      actor,
      metadata: {
        matterId,
        citations: result.citations.length,
        tools: result.toolCalls.map((call) => call.name),
      },
    });

    return {
      userMessage: this.toMessageDto(userMessage, []),
      message: this.toMessageDto(assistantMessage, result.citations),
    };
  }

  async deleteThread(actor: FirmActor, matterId: string, threadId: string) {
    await this.policy.assertMatter(actor, 'ai.ask', matterId);
    const thread = await this.requireThread(actor, matterId, threadId);
    await this.db.delete(threads).where(eq(threads.id, thread.id));
    return { deleted: true };
  }

  private async requireThread(actor: FirmActor, matterId: string, threadId: string) {
    const [thread] = await this.db
      .select()
      .from(threads)
      .where(
        and(
          eq(threads.id, threadId),
          eq(threads.firmId, actor.firmId),
          eq(threads.matterId, matterId),
          eq(threads.userId, actor.userId),
        ),
      )
      .limit(1);
    if (!thread) throw DomainError.notFound('Thread not found');
    return thread;
  }

  private toThreadDto(row: typeof threads.$inferSelect) {
    return {
      id: row.id,
      title: row.title,
      matterId: row.matterId!,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toMessageDto(
    row: typeof messages.$inferSelect,
    citations: AgentCitation[],
  ) {
    const cleanCitations = citations.filter(Boolean);
    return {
      id: row.id,
      role: row.role,
      content: row.content,
      citations: cleanCitations,
      toolCalls: ((row.runMetadata?.toolCalls ?? []) as AgentToolCall[]).filter(Boolean),
      mode: (row.runMetadata?.mode as string | undefined) ?? 'retrieval',
      model: (row.runMetadata?.model as string | null | undefined) ?? null,
      createdAt: row.createdAt,
    };
  }
}
