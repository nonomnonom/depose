import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  outputs,
  aiProviderConnections,
  threads,
  messages,
} from '../../infrastructure/database/schema/index.js';
import { PolicyService } from '../access-control/policy.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class OutputsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  async listOutputs(actor: FirmActor, matterId: string) {
    await this.policy.assertMatter(actor, 'output.read', matterId);
    const rows = await this.db
      .select()
      .from(outputs)
      .where(
        and(
          eq(outputs.firmId, actor.firmId),
          eq(outputs.matterId, matterId),
        ),
      )
      .orderBy(desc(outputs.createdAt));
    return { items: rows.map((r) => this.outputDto(r)) };
  }

  async listProviderConnections(actor: FirmActor) {
    this.policy.assertFirm(actor, 'firm.api_key.manage');
    const rows = await this.db
      .select()
      .from(aiProviderConnections)
      .where(eq(aiProviderConnections.firmId, actor.firmId))
      .orderBy(desc(aiProviderConnections.createdAt));
    return { items: rows.map((r) => this.connectionDto(r)) };
  }

  async listThreads(actor: FirmActor, matterId: string) {
    await this.policy.assertMatter(actor, 'matter.read', matterId);
    const rows = await this.db
      .select()
      .from(threads)
      .where(
        and(
          eq(threads.firmId, actor.firmId),
          eq(threads.matterId, matterId),
        ),
      )
      .orderBy(desc(threads.createdAt));
    return { items: rows.map((r) => this.threadDto(r)) };
  }

  async listMessages(actor: FirmActor, threadId: string) {
    this.policy.assertFirm(actor, 'matter.read');
    const [thread] = await this.db
      .select({ id: threads.id, matterId: threads.matterId })
      .from(threads)
      .where(and(eq(threads.id, threadId), eq(threads.firmId, actor.firmId)))
      .limit(1);
    if (!thread) throw DomainError.notFound('Thread not found');
    /* A thread that belongs to no matter is firm-scoped; the firm check above is
     * then the whole authorization. Matter threads still need matter access. */
    if (thread.matterId) {
      await this.policy.assertMatter(actor, 'matter.read', thread.matterId);
    }
    const rows = await this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.firmId, actor.firmId),
          eq(messages.threadId, threadId),
        ),
      )
      .orderBy(desc(messages.createdAt));
    return { items: rows.map((r) => this.messageDto(r)) };
  }

  private outputDto(row: typeof outputs.$inferSelect) {
    return {
      id: row.id,
      matterId: row.matterId,
      subsetId: row.subsetId,
      kind: row.kind,
      title: row.title,
      status: row.status,
      currentVersion: row.currentVersion,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private connectionDto(row: typeof aiProviderConnections.$inferSelect) {
    return {
      id: row.id,
      kind: row.kind,
      label: row.label,
      baseUrl: row.baseUrl,
      models: row.models,
      status: row.status,
      lastTestedAt: row.lastTestedAt,
      lastError: row.lastError,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private threadDto(row: typeof threads.$inferSelect) {
    return {
      id: row.id,
      matterId: row.matterId,
      subsetId: row.subsetId,
      userId: row.userId,
      scope: row.scope,
      title: row.title,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private messageDto(row: typeof messages.$inferSelect) {
    return {
      id: row.id,
      matterId: row.matterId,
      threadId: row.threadId,
      role: row.role,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
