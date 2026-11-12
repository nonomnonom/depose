import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  contradictions,
  facts,
  outputSources,
  outputVersions,
  outputs,
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

  async getOutput(actor: FirmActor, matterId: string, outputId: string) {
    await this.policy.assertMatter(actor, 'output.read', matterId);
    const [output] = await this.db
      .select()
      .from(outputs)
      .where(
        and(
          eq(outputs.id, outputId),
          eq(outputs.firmId, actor.firmId),
          eq(outputs.matterId, matterId),
        ),
      )
      .limit(1);
    if (!output) throw DomainError.notFound('Output not found');

    const [version] = await this.db
      .select()
      .from(outputVersions)
      .where(
        and(
          eq(outputVersions.outputId, output.id),
          eq(outputVersions.version, output.currentVersion),
        ),
      )
      .limit(1);

    const sources = version
      ? await this.db
          .select()
          .from(outputSources)
          .where(eq(outputSources.outputVersionId, version.id))
      : [];

    return {
      output: this.outputDto(output),
      version: version
        ? {
            id: version.id,
            version: version.version,
            content: version.content,
            contentMarkdown: version.contentMarkdown,
            finalizedBy: version.finalizedBy,
            finalizedAt: version.finalizedAt?.toISOString() ?? null,
            createdAt: version.createdAt.toISOString(),
          }
        : null,
      sources: sources.map((source) => ({
        id: source.id,
        factId: source.factId,
        citation: source.citationSnapshot,
      })),
    };
  }

  async create(
    actor: FirmActor,
    matterId: string,
    input: { kind: string; title: string; subsetId?: string },
  ) {
    await this.policy.assertMatter(actor, 'output.create', matterId);
    const [output] = await this.db.insert(outputs).values({
      firmId: actor.firmId,
      matterId,
      subsetId: input.subsetId ?? null,
      kind: input.kind,
      title: input.title,
      status: 'draft',
      createdBy: actor.userId,
    }).returning();
    await this.db.insert(outputVersions).values({
      firmId: actor.firmId,
      matterId,
      outputId: output.id,
      version: 1,
      content: { markdown: '' },
      contentMarkdown: '',
      createdBy: actor.userId,
    });
    await this.audit.log({
      firmId: actor.firmId,
      action: 'output.created',
      resourceType: 'output',
      resourceId: output.id,
      actor,
      metadata: { matterId, kind: input.kind },
    });
    return { output: this.outputDto(output) };
  }

  async generate(actor: FirmActor, matterId: string, outputId: string) {
    await this.policy.assertMatter(actor, 'output.create', matterId);
    const [output] = await this.db
      .select()
      .from(outputs)
      .where(and(eq(outputs.id, outputId), eq(outputs.firmId, actor.firmId), eq(outputs.matterId, matterId)))
      .limit(1);
    if (!output) throw DomainError.notFound('Output not found');
    const rows = await this.db
      .select({ fact: facts })
      .from(facts)
      .where(and(
        eq(facts.firmId, actor.firmId),
        eq(facts.matterId, matterId),
        eq(facts.status, 'confirmed'),
        isNull(facts.archivedAt),
        isNull(facts.mergedIntoId),
      ))
      .orderBy(facts.dateStart, desc(facts.confidence))
      .limit(500);
    const contradictionRows = output.kind.includes('inconsisten')
      ? await this.db
          .select()
          .from(contradictions)
          .where(and(eq(contradictions.firmId, actor.firmId), eq(contradictions.matterId, matterId)))
          .orderBy(desc(contradictions.severity))
          .limit(100)
      : [];
    const lines: string[] = [`# ${output.title}`, ''];
    if (output.kind.includes('chronolog')) {
      lines.push('## Chronology', '');
      rows.filter((row) => row.fact.dateStart).sort((left, right) =>
        (left.fact.dateStart ?? '').localeCompare(right.fact.dateStart ?? ''),
      ).forEach((row, index) => {
        lines.push(`${index + 1}. **${row.fact.dateStart}** — ${row.fact.text}`);
      });
    } else if (output.kind.includes('inconsisten')) {
      lines.push('## Inconsistencies', '');
      contradictionRows.forEach((row) => {
        lines.push(`### ${row.kind} · ${row.severity}`, '', row.summary, '');
      });
    } else {
      lines.push('## Confirmed facts', '');
      rows.forEach((row, index) => {
        lines.push(`${index + 1}. ${row.fact.dateStart ? `**${row.fact.dateStart}** — ` : ''}${row.fact.text}`);
      });
    }
    const markdown = lines.join('\n');
    const nextVersion = output.currentVersion + 1;
    const [version] = await this.db.transaction(async (tx) => {
      const [created] = await tx.insert(outputVersions).values({
        firmId: actor.firmId,
        matterId,
        outputId: output.id,
        version: nextVersion,
        content: { markdown, factCount: rows.length, contradictions: contradictionRows.length },
        contentMarkdown: markdown,
        createdBy: actor.userId,
      }).returning();
      await tx.update(outputs).set({ currentVersion: nextVersion, status: 'draft', updatedAt: new Date() })
        .where(eq(outputs.id, output.id));
      if (rows.length > 0) {
        await tx.insert(outputSources).values(rows.map((row) => ({
          firmId: actor.firmId,
          matterId,
          outputVersionId: created.id,
          factId: row.fact.id,
          citationSnapshot: {
            text: row.fact.text,
            dateStart: row.fact.dateStart,
            status: row.fact.status,
          },
        }))).onConflictDoNothing();
      }
      return [created];
    });
    await this.audit.log({
      firmId: actor.firmId,
      action: 'output.generated',
      resourceType: 'output',
      resourceId: output.id,
      actor,
      metadata: { matterId, version: nextVersion, facts: rows.length },
    });
    return { output: this.outputDto({ ...output, currentVersion: nextVersion, updatedAt: new Date() }), version };
  }

  async finalize(actor: FirmActor, matterId: string, outputId: string) {
    await this.policy.assertMatter(actor, 'output.finalize', matterId);
    const detail = await this.getOutput(actor, matterId, outputId);
    if (!detail.version) throw DomainError.notFound('Output version not found');
    await this.db.transaction(async (tx) => {
      await tx.update(outputVersions).set({ finalizedBy: actor.userId, finalizedAt: new Date() })
        .where(eq(outputVersions.id, detail.version!.id));
      await tx.update(outputs).set({ status: 'final', updatedAt: new Date() }).where(eq(outputs.id, outputId));
    });
    return this.getOutput(actor, matterId, outputId);
  }

  async exportOutput(actor: FirmActor, matterId: string, outputId: string) {
    const detail = await this.getOutput(actor, matterId, outputId);
    const markdown = detail.version?.contentMarkdown ?? '';
    return {
      fileName: `${detail.output.title.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase()}.md`,
      mimeType: 'text/markdown; charset=utf-8',
      content: markdown,
    };
  }

  async listProviderConnections() {
    /* BYOK has been removed: AI is operated through the instance config. */
    return { items: [] };
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
