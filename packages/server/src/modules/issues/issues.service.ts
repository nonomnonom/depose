import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import { factIssues, issues } from '../../infrastructure/database/schema/index.js';
import { PolicyService } from '../access-control/policy.service.js';
import { AuditService } from '../audit/audit.service.js';

export const createIssueSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  subsetId: z.string().uuid().optional(),
});

export const updateIssueStatusSchema = z.object({
  status: z.enum(['open', 'closed']),
});

export type IssueDto = {
  id: string;
  matterId: string;
  subsetId: string | null;
  name: string;
  description: string | null;
  status: 'open' | 'closed';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  factCount: number;
};

@Injectable()
export class IssuesService {
  private readonly logger = new Logger(IssuesService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: FirmActor, matterId: string) {
    await this.policy.assertMatter(actor, 'matter.read', matterId);
    const rows = await this.db
      .select()
      .from(issues)
      .where(and(eq(issues.firmId, actor.firmId), eq(issues.matterId, matterId)))
      .orderBy(desc(issues.createdAt));
    const items: IssueDto[] = [];
    for (const row of rows) {
      const factCount = await this.countFacts(row.id);
      items.push(this.toDto(row, factCount));
    }
    return { items };
  }

  async get(actor: FirmActor, matterId: string, issueId: string) {
    await this.policy.assertMatter(actor, 'matter.read', matterId);
    const [row] = await this.db
      .select()
      .from(issues)
      .where(and(eq(issues.id, issueId), eq(issues.firmId, actor.firmId)))
      .limit(1);
    if (!row) throw DomainError.notFound('Issue not found');
    const factCount = await this.countFacts(row.id);
    return { issue: this.toDto(row, factCount) };
  }

  async create(actor: FirmActor, matterId: string, input: z.infer<typeof createIssueSchema>) {
    await this.policy.assertMatter(actor, 'matter.update', matterId);
    const [row] = await this.db.insert(issues).values({
      firmId: actor.firmId,
      matterId,
      subsetId: input.subsetId ?? null,
      name: input.name,
      description: input.description ?? null,
      createdBy: actor.userId,
    }).returning();
    const factCount = await this.countFacts(row.id);
    await this.audit.log({
      firmId: actor.firmId,
      action: 'issues.created',
      resourceType: 'issue',
      resourceId: row.id,
      actor,
      metadata: { matterId, name: row.name },
    });
    return { issue: this.toDto(row, factCount) };
  }

  async updateStatus(actor: FirmActor, matterId: string, issueId: string, status: 'open' | 'closed') {
    await this.policy.assertMatter(actor, 'matter.update', matterId);
    const [row] = await this.db
      .update(issues)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(issues.id, issueId), eq(issues.firmId, actor.firmId)))
      .returning();
    if (!row) throw DomainError.notFound('Issue not found');
    await this.audit.log({
      firmId: actor.firmId,
      action: 'issues.status_updated',
      resourceType: 'issue',
      resourceId: issueId,
      actor,
      metadata: { matterId, status },
    });
    return { issue: this.toDto(row, 0) };
  }

  async getFacts(actor: FirmActor, matterId: string, issueId: string) {
    await this.policy.assertMatter(actor, 'fact.read', matterId);
    const rows = await this.db
      .select({ factId: factIssues.factId, source: factIssues.source })
      .from(factIssues)
      .where(and(eq(factIssues.issueId, issueId), eq(factIssues.firmId, actor.firmId)))
      .limit(1000);
    return { items: rows.map(r => ({ factId: r.factId, source: r.source })) };
  }

  async addFactToIssue(actor: FirmActor, matterId: string, issueId: string, factId: string, source: 'manual' | 'extraction' | 'workflow' = 'manual') {
    await this.policy.assertMatter(actor, 'fact.update', matterId);
    // Check if already linked
    const existing = await this.db
      .select({ id: factIssues.id })
      .from(factIssues)
      .where(and(eq(factIssues.factId, factId), eq(factIssues.issueId, issueId), eq(factIssues.firmId, actor.firmId)))
      .limit(1);
    if (existing.length > 0) throw DomainError.conflict('CONFLICT', 'Fact already linked to this issue');
    await this.db.insert(factIssues).values({
      firmId: actor.firmId,
      matterId,
      issueId,
      factId,
      source,
    });
    // Fetch the inserted row
    const [row] = await this.db
      .select()
      .from(factIssues)
      .where(and(
        eq(factIssues.firmId, actor.firmId),
        eq(factIssues.issueId, issueId),
        eq(factIssues.factId, factId),
      ))
      .limit(1);
    await this.audit.log({
      firmId: actor.firmId,
      action: 'issues.fact_added',
      resourceType: 'issue',
      resourceId: issueId,
      actor,
      metadata: { matterId, factId, source },
    });
    return { linked: true };
  }

  async removeFactFromIssue(actor: FirmActor, matterId: string, issueId: string, factId: string) {
    await this.policy.assertMatter(actor, 'fact.update', matterId);
    const deleted = await this.db.delete(factIssues)
      .where(and(eq(factIssues.issueId, issueId), eq(factIssues.factId, factId), eq(factIssues.firmId, actor.firmId)))
      .returning();
    if (!deleted.length) throw DomainError.notFound('Fact not linked to this issue');
    await this.audit.log({
      firmId: actor.firmId,
      action: 'issues.fact_removed',
      resourceType: 'issue',
      resourceId: issueId,
      actor,
      metadata: { matterId, factId },
    });
    return { removed: true };
  }

  private async countFacts(issueId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(factIssues)
      .where(eq(factIssues.issueId, issueId))
      .limit(1);
    return row?.count ?? 0;
  }

  private toDto(row: typeof issues.$inferSelect, factCount: number): IssueDto {
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
      factCount,
    };
  }
}
