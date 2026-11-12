import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  factIssues,
  facts,
  issues,
  summaries,
  themeFacts,
  themes,
} from '../../infrastructure/database/schema/index.js';
import { PolicyService } from '../access-control/policy.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class SummaryThemeService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  async listThemes(actor: FirmActor, matterId: string) {
    await this.policy.assertMatter(actor, 'matter.read', matterId);
    const rows = await this.db
      .select()
      .from(themes)
      .where(
        and(
          eq(themes.firmId, actor.firmId),
          eq(themes.matterId, matterId),
        ),
      )
      .orderBy(desc(themes.createdAt));
    return { items: rows.map((r) => this.themeDto(r)) };
  }

  async listSummaries(actor: FirmActor, matterId: string) {
    await this.policy.assertMatter(actor, 'matter.read', matterId);
    const rows = await this.db
      .select()
      .from(summaries)
      .where(
        and(
          eq(summaries.firmId, actor.firmId),
          eq(summaries.matterId, matterId),
        ),
      )
      .orderBy(desc(summaries.createdAt));
    return { items: rows.map((r) => this.summaryDto(r)) };
  }

  async generate(actor: FirmActor, matterId: string, subsetId?: string) {
    await this.policy.assertMatter(actor, 'summary.generate', matterId);
    const issueRows = await this.db
      .select()
      .from(issues)
      .where(and(eq(issues.firmId, actor.firmId), eq(issues.matterId, matterId), eq(issues.status, 'open')));
    const factRows = await this.db
      .select()
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
    const links = factRows.length
      ? await this.db
          .select({ factId: factIssues.factId, issueId: factIssues.issueId })
          .from(factIssues)
          .where(inArray(factIssues.factId, factRows.map((fact) => fact.id)))
      : [];
    const issueIdsByFact = new Map<string, string[]>();
    for (const link of links) {
      const bucket = issueIdsByFact.get(link.factId) ?? [];
      bucket.push(link.issueId);
      issueIdsByFact.set(link.factId, bucket);
    }
    const generated = await this.db.transaction(async (tx) => {
      await tx.delete(themes).where(and(eq(themes.firmId, actor.firmId), eq(themes.matterId, matterId)));
      const createdThemes = issueRows.length
        ? await tx.insert(themes).values(issueRows.map((issue) => ({
            firmId: actor.firmId,
            matterId,
            subsetId: subsetId ?? null,
            name: issue.name,
            description: issue.description,
            status: 'draft' as const,
            createdBy: actor.userId,
          }))).returning()
        : [];
      for (const [index, theme] of createdThemes.entries()) {
        const issueId = issueRows[index]?.id;
        const linked = issueId
          ? factRows.filter((fact) => (issueIdsByFact.get(fact.id) ?? []).includes(issueId)).slice(0, 100)
          : [];
        if (linked.length > 0) {
          await tx.insert(themeFacts).values(linked.map((fact) => ({
            firmId: actor.firmId,
            matterId,
            themeId: theme.id,
            factId: fact.id,
          }))).onConflictDoNothing();
        }
      }
      const [latest] = await tx
        .select({ version: sql<number>`coalesce(max(${summaries.version}), 0)::int` })
        .from(summaries)
        .where(and(eq(summaries.firmId, actor.firmId), eq(summaries.matterId, matterId)));
      const [summary] = await tx.insert(summaries).values({
        firmId: actor.firmId,
        matterId,
        subsetId: subsetId ?? null,
        version: (latest?.version ?? 0) + 1,
        status: 'draft',
        content: {
          generatedFrom: 'confirmed-facts',
          issues: issueRows.map((issue) => ({
            id: issue.id,
            name: issue.name,
            description: issue.description,
            facts: factRows.filter((fact) => (issueIdsByFact.get(fact.id) ?? []).includes(issue.id)).slice(0, 30).map((fact) => ({
              id: fact.id,
              text: fact.text,
              dateStart: fact.dateStart,
            })),
          })),
          keyFacts: factRows.slice(0, 30).map((fact) => ({
            id: fact.id,
            text: fact.text,
            dateStart: fact.dateStart,
          })),
        },
        model: 'deterministic',
        sourceHash: `${factRows.length}:${issueRows.length}`,
        generatedAt: new Date(),
      }).returning();
      return { themes: createdThemes, summary };
    });
    await this.audit.log({
      firmId: actor.firmId,
      action: 'summary.generated',
      resourceType: 'matter',
      resourceId: matterId,
      actor,
      metadata: { matterId, themes: generated.themes.length, facts: factRows.length },
    });
    return {
      themes: generated.themes.map((theme) => this.themeDto(theme)),
      summary: this.summaryDto(generated.summary),
    };
  }

  private themeDto(row: typeof themes.$inferSelect) {
    return {
      id: row.id,
      matterId: row.matterId,
      subsetId: row.subsetId,
      name: row.name,
      description: row.description,
      status: row.status,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private summaryDto(row: typeof summaries.$inferSelect) {
    return {
      id: row.id,
      matterId: row.matterId,
      subsetId: row.subsetId,
      version: row.version,
      status: row.status,
      content: row.content,
      model: row.model,
      promptHash: row.promptHash,
      sourceHash: row.sourceHash,
      generatedAt: row.generatedAt,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
