import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, desc, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  factIssues,
  factRelevance,
  facts,
  issues,
  subsets,
} from '../../infrastructure/database/schema/index.js';
import { PolicyService } from '../access-control/policy.service.js';
import { AuditService } from '../audit/audit.service.js';

export const assignRelevanceSchema = z.object({
  factId: z.string().uuid(),
  scopeType: z.enum(['matter', 'subset']),
  scopeId: z.string(),
  label: z.enum(['key', 'relevant', 'disputed', 'maybe_relevant', 'not_relevant', 'unclassified']).default('unclassified'),
  reason: z.string().trim().max(2000).optional(),
});

export const bulkAssignRelevanceSchema = z.object({
  assignments: z.array(assignRelevanceSchema).min(1).max(100),
});

export type FactRelevanceDto = {
  id: string;
  factId: string;
  scopeType: 'matter' | 'subset';
  scopeId: string;
  label: 'key' | 'relevant' | 'disputed' | 'maybe_relevant' | 'not_relevant' | 'unclassified';
  reason: string | null;
  updatedBy: string;
  updatedAt: string;
};

@Injectable()
export class RelevanceService {
  private readonly logger = new Logger(RelevanceService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: FirmActor, matterId: string, scopeType: 'matter' | 'subset' | undefined, scopeId: string | undefined) {
    await this.policy.assertMatter(actor, 'fact.read', matterId);
    let where = and(eq(factRelevance.firmId, actor.firmId), eq(factRelevance.matterId, matterId));
    if (scopeType) where = and(where, eq(factRelevance.scopeType, scopeType));
    if (scopeId) where = and(where, eq(factRelevance.scopeId, scopeId));
    const rows = await this.db
      .select()
      .from(factRelevance)
      .where(where)
      .orderBy(desc(factRelevance.updatedAt));
    return { items: rows.map(this.toDto) };
  }

  async getForFact(actor: FirmActor, matterId: string, factId: string) {
    await this.policy.assertMatter(actor, 'fact.read', matterId);
    const rows = await this.db
      .select()
      .from(factRelevance)
      .where(
        and(
          eq(factRelevance.factId, factId),
          eq(factRelevance.firmId, actor.firmId),
          eq(factRelevance.matterId, matterId),
        ),
      )
      .orderBy(desc(factRelevance.updatedAt));
    return { items: rows.map(this.toDto) };
  }

  async classify(actor: FirmActor, matterId: string) {
    await this.policy.assertMatter(actor, 'fact.relevance.update', matterId);
    const issueRows = await this.db
      .select()
      .from(issues)
      .where(and(eq(issues.firmId, actor.firmId), eq(issues.matterId, matterId), eq(issues.status, 'open')));
    if (issueRows.length === 0) return { classified: 0, issues: 0, reason: 'No open issues' };
    const factRows = await this.db
      .select()
      .from(facts)
      .where(and(
        eq(facts.firmId, actor.firmId),
        eq(facts.matterId, matterId),
        isNull(facts.archivedAt),
        isNull(facts.mergedIntoId),
      ))
      .limit(5_000);
    let classified = 0;
    for (const fact of factRows) {
      const text = `${fact.text} ${fact.entityLabel ?? ''} ${fact.action ?? ''} ${fact.object ?? ''}`.toLowerCase();
      const tokens = new Set(text.split(/[^a-z0-9]+/).filter((token) => token.length > 2));
      let best: { issueId: string; score: number } | undefined;
      for (const issue of issueRows) {
        const issueTokens = new Set(`${issue.name} ${issue.description ?? ''}`.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2));
        if (issueTokens.size === 0) continue;
        let shared = 0;
        for (const token of issueTokens) if (tokens.has(token)) shared += 1;
        const score = shared / issueTokens.size;
        if (!best || score > best.score) best = { issueId: issue.id, score };
      }
      if (!best) continue;
      const label = best.score >= 0.5 ? 'key' : best.score >= 0.2 ? 'relevant' : best.score >= 0.08 ? 'maybe_relevant' : 'not_relevant';
      await this.db.insert(factRelevance).values({
        firmId: actor.firmId,
        matterId,
        factId: fact.id,
        scopeType: 'matter',
        scopeId: matterId,
        label,
        reason: `Automatic overlap score ${best.score.toFixed(2)} with issue`,
        updatedBy: actor.userId,
      }).onConflictDoUpdate({
        target: [factRelevance.factId, factRelevance.scopeType, factRelevance.scopeId],
        set: { label, reason: `Automatic overlap score ${best.score.toFixed(2)} with issue`, updatedBy: actor.userId, updatedAt: new Date() },
      });
      if (label === 'key' || label === 'relevant' || label === 'maybe_relevant') {
        await this.db.insert(factIssues).values({
          firmId: actor.firmId,
          matterId,
          factId: fact.id,
          issueId: best.issueId,
          source: 'automatic',
        }).onConflictDoNothing();
      }
      classified += 1;
    }
    await this.audit.log({
      firmId: actor.firmId,
      action: 'relevance.classified',
      resourceType: 'matter',
      resourceId: matterId,
      actor,
      metadata: { matterId, classified, issues: issueRows.length },
    });
    return { classified, issues: issueRows.length };
  }

  async assign(actor: FirmActor, matterId: string, input: z.infer<typeof assignRelevanceSchema>) {
    await this.policy.assertMatter(actor, 'fact.update', matterId);

    const [fact] = await this.db
      .select({ id: facts.id })
      .from(facts)
      .where(
        and(
          eq(facts.id, input.factId),
          eq(facts.firmId, actor.firmId),
          eq(facts.matterId, matterId),
        ),
      )
      .limit(1);
    if (!fact) throw DomainError.validation('Fact is not in this matter');

    if (input.scopeType === 'subset') {
      const [subset] = await this.db
        .select({ id: subsets.id })
        .from(subsets)
        .where(
          and(
            eq(subsets.id, input.scopeId),
            eq(subsets.firmId, actor.firmId),
            eq(subsets.matterId, matterId),
          ),
        )
        .limit(1);
      if (!subset) throw DomainError.validation('Subset is not in this matter');
    }

    const [row] = await this.db.insert(factRelevance).values({
      firmId: actor.firmId,
      matterId,
      factId: input.factId,
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      label: input.label,
      reason: input.reason ?? null,
      updatedBy: actor.userId,
    }).onConflictDoUpdate({
      target: [factRelevance.factId, factRelevance.scopeType, factRelevance.scopeId],
      set: {
        label: input.label,
        reason: input.reason ?? null,
        updatedBy: actor.userId,
        updatedAt: new Date(),
      },
    }).returning();
    await this.audit.log({
      firmId: actor.firmId,
      action: 'relevance.assigned',
      resourceType: 'fact',
      resourceId: input.factId,
      actor,
      metadata: {
        matterId,
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        label: input.label,
      },
    });
    return { relevance: this.toDto(row) };
  }

  async bulkAssign(actor: FirmActor, matterId: string, input: z.infer<typeof bulkAssignRelevanceSchema>) {
    await this.policy.assertMatter(actor, 'fact.update', matterId);
    const results = await Promise.all(
      input.assignments.map(a =>
        this.assign(actor, matterId, a)
      ),
    );
    await this.audit.log({
      firmId: actor.firmId,
      action: 'relevance.bulk_assigned',
      resourceType: 'matter',
      resourceId: matterId,
      actor,
      metadata: { matterId, count: input.assignments.length },
    });
    return { assigned: results.map(r => r.relevance) };
  }

  async getByLabels(actor: FirmActor, matterId: string, labels: ('key' | 'relevant' | 'disputed' | 'maybe_relevant' | 'not_relevant' | 'unclassified')[]) {
    await this.policy.assertMatter(actor, 'fact.read', matterId);
    const rows = await this.db
      .select()
      .from(factRelevance)
      .where(and(
        eq(factRelevance.firmId, actor.firmId),
        eq(factRelevance.matterId, matterId),
        // Note: using array-contains would need pgArray extension; for now filter in app
      ))
      .orderBy(desc(factRelevance.updatedAt));
    const filtered = rows.filter(r => labels.includes(r.label));
    return { items: filtered.map(this.toDto) };
  }

  private toDto(row: typeof factRelevance.$inferSelect): FactRelevanceDto {
    return {
      id: row.id,
      factId: row.factId,
      scopeType: row.scopeType,
      scopeId: row.scopeId,
      label: row.label,
      reason: row.reason,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
