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
import {
  AgentService,
  type AgentSource,
  type AgentToolCall,
  type AgentRunInput,
} from './agent.service.js';

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

  async createThread(
    actor: FirmActor,
    matterId: string,
    title?: string,
    subsetId?: string,
  ) {
    await this.policy.assertMatter(actor, 'ai.ask', matterId);
    const [thread] = await this.db
      .insert(threads)
      .values({
        firmId: actor.firmId,
        matterId,
        subsetId: subsetId ?? null,
        userId: actor.userId,
        scope: subsetId ? 'subset' : 'matter',
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
            .map((source) => source.citationSnapshot as unknown as AgentSource),
        ),
      ),
    };
  }

  async sendMessage(
    actor: FirmActor,
    matterId: string,
    threadId: string,
    input: AgentRunInput,
  ) {
    await this.policy.assertMatter(actor, 'ai.ask', matterId);
    const thread = await this.requireThread(actor, matterId, threadId);
    const content = input.content ?? 'Summarize the attached context.';

    const [userMessage] = await this.db
      .insert(messages)
      .values({
        firmId: actor.firmId,
        matterId,
        threadId: thread.id,
        role: 'user',
        content,
        runMetadata: { mode: input.mode ?? 'ask', context: input.context ?? [] },
      })
      .returning();

    const result = await this.agent.run(actor, matterId, {
      ...input,
      content,
      subsetId: input.subsetId ?? thread.subsetId ?? undefined,
    });

    const [assistantMessage] = await this.db.transaction(async (tx) => {
      const [assistant] = await tx
        .insert(messages)
        .values({
          firmId: actor.firmId,
          matterId,
          threadId: thread.id,
          role: 'assistant',
          content: result.answer,
          responseEnvelope: {
            answer: result.answer,
            sources: result.sources,
            evidenceScore: result.evidenceScore,
            insufficientEvidence: result.insufficientEvidence,
            unverifiedCitations: result.unverifiedCitations,
            warnings: result.warnings,
          },
          runMetadata: {
            toolCalls: result.toolCalls,
            mode: result.mode,
            engine: result.engine,
            model: result.model ?? null,
            usage: result.usage,
          },
        })
        .returning();

      if (result.sources.length > 0) {
        await tx.insert(messageSources).values(
          result.sources.map((source) => ({
            firmId: actor.firmId,
            matterId,
            messageId: assistant.id,
            factId: source.factId,
            citationSnapshot: source as unknown as Record<string, unknown>,
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
        sources: result.sources.length,
        tools: result.toolCalls.map((call) => call.name),
        insufficientEvidence: result.insufficientEvidence,
      },
    });

    return {
      userMessage: this.toMessageDto(userMessage, []),
      message: this.toMessageDto(assistantMessage, result.sources),
      answer: result.answer,
      sources: result.sources,
      evidenceScore: result.evidenceScore,
      insufficientEvidence: result.insufficientEvidence,
      unverifiedCitations: result.unverifiedCitations,
      warnings: result.warnings,
      mode: result.mode,
      model: result.model,
      toolCalls: result.toolCalls,
    };
  }

  async cancelRun(actor: FirmActor, matterId: string, threadId: string) {
    await this.policy.assertMatter(actor, 'ai.ask', matterId);
    const thread = await this.requireThread(actor, matterId, threadId);
    /* Runs are synchronous within the request; a finished run is already stopped. */
    return { cancelled: false, state: 'idle', threadId: thread.id };
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
    sources: AgentSource[],
  ) {
    const cleanSources = sources.filter(Boolean);
    const envelope = (row.responseEnvelope ?? {}) as Record<string, unknown>;
    return {
      id: row.id,
      role: row.role,
      content: row.content,
      sources: cleanSources,
      citations: cleanSources,
      answer: typeof envelope.answer === 'string' ? envelope.answer : row.content,
      evidenceScore:
        typeof envelope.evidenceScore === 'number' ? envelope.evidenceScore : null,
      insufficientEvidence: Boolean(envelope.insufficientEvidence),
      unverifiedCitations: Array.isArray(envelope.unverifiedCitations)
        ? (envelope.unverifiedCitations as string[])
        : [],
      warnings: Array.isArray(envelope.warnings) ? (envelope.warnings as string[]) : [],
      toolCalls: ((row.runMetadata?.toolCalls ?? []) as AgentToolCall[]).filter(Boolean),
      mode: (row.runMetadata?.mode as string | undefined) ?? 'ask',
      engine: (row.runMetadata?.engine as string | undefined) ?? 'model',
      model: (row.runMetadata?.model as string | null | undefined) ?? null,
      createdAt: row.createdAt,
    };
  }
}
