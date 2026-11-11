import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import { contradictions } from '../../infrastructure/database/schema/index.js';
import { PolicyService } from '../access-control/policy.service.js';
import { AuditService } from '../audit/audit.service.js';

export const reviewContradictionSchema = z.object({
  status: z.enum(['candidate', 'open', 'confirmed', 'dismissed', 'stale']),
  reviewedBy: z.string().max(100),
  confidence: z.number().min(0).max(1).optional(),
});

export const updateSeveritySchema = z.object({
  severity: z.enum(['critical', 'serious', 'minor', 'informational']),
});

export type ContradictionDto = {
  id: string;
  matterId: string;
  kind: string;
  severity: 'critical' | 'serious' | 'minor' | 'informational';
  confidence: number | null;
  status: 'candidate' | 'open' | 'confirmed' | 'dismissed' | 'stale';
  summary: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  detectedBy: string;
  dedupKey: string;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class InconsistenciesService {
  private readonly logger = new Logger(InconsistenciesService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: FirmActor, matterId: string, status: 'candidate' | 'open' | 'confirmed' | 'dismissed' | 'stale' | 'all' = 'all') {
    await this.policy.assertMatter(actor, 'fact.read', matterId);
    const conditions = [and(eq(contradictions.firmId, actor.firmId), eq(contradictions.matterId, matterId))];
    if (status !== 'all') conditions.push(eq(contradictions.status, status));
    const rows = await this.db
      .select()
      .from(contradictions)
      .where(and(...conditions))
      .orderBy(desc(contradictions.createdAt));
    return { items: rows.map(this.toDto) };
  }

  async get(actor: FirmActor, matterId: string, contradictionId: string) {
    await this.policy.assertMatter(actor, 'fact.read', matterId);
    const [row] = await this.db
      .select()
      .from(contradictions)
      .where(and(eq(contradictions.id, contradictionId), eq(contradictions.firmId, actor.firmId)))
      .limit(1);
    if (!row) throw DomainError.notFound('Contradiction not found');
    return { contradiction: this.toDto(row) };
  }

  async review(actor: FirmActor, matterId: string, contradictionId: string, input: z.infer<typeof reviewContradictionSchema>) {
    await this.policy.assertMatter(actor, 'fact.update', matterId);
    const [row] = await this.db
      .update(contradictions)
      .set({
        status: input.status,
        reviewedBy: input.reviewedBy,
        reviewedAt: new Date(),
        confidence: input.confidence ?? undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(contradictions.id, contradictionId), eq(contradictions.firmId, actor.firmId)))
      .returning();
    if (!row) throw DomainError.notFound('Contradiction not found');
    await this.audit.log({
      firmId: actor.firmId,
      action: 'inconsistencies.reviewed',
      resourceType: 'contradiction',
      resourceId: contradictionId,
      actor,
      metadata: { matterId, status: input.status },
    });
    return { contradiction: this.toDto(row) };
  }

  async updateSeverity(actor: FirmActor, matterId: string, contradictionId: string, severity: 'critical' | 'serious' | 'minor' | 'informational') {
    await this.policy.assertMatter(actor, 'fact.update', matterId);
    const [row] = await this.db
      .update(contradictions)
      .set({ severity, updatedAt: new Date() })
      .where(and(eq(contradictions.id, contradictionId), eq(contradictions.firmId, actor.firmId)))
      .returning();
    if (!row) throw DomainError.notFound('Contradiction not found');
    return { contradiction: this.toDto(row) };
  }

  async listByKind(actor: FirmActor, matterId: string, kind: string) {
    await this.policy.assertMatter(actor, 'fact.read', matterId);
    const rows = await this.db
      .select()
      .from(contradictions)
      .where(and(
        eq(contradictions.firmId, actor.firmId),
        eq(contradictions.matterId, matterId),
        eq(contradictions.kind, kind),
      ))
      .orderBy(desc(contradictions.createdAt));
    return { items: rows.map(this.toDto) };
  }

  async summary(actor: FirmActor, matterId: string) {
    await this.policy.assertMatter(actor, 'fact.read', matterId);
    const [total] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(contradictions)
      .where(and(eq(contradictions.firmId, actor.firmId), eq(contradictions.matterId, matterId)))
      .limit(1);
    const [byStatus] = await this.db
      .select({ status: contradictions.status, count: sql<number>`count(*)::int` })
      .from(contradictions)
      .where(and(eq(contradictions.firmId, actor.firmId), eq(contradictions.matterId, matterId)))
      .groupBy(contradictions.status)
      .limit(20);
    const [byKind] = await this.db
      .select({ kind: contradictions.kind, count: sql<number>`count(*)::int` })
      .from(contradictions)
      .where(and(eq(contradictions.firmId, actor.firmId), eq(contradictions.matterId, matterId)))
      .groupBy(contradictions.kind)
      .limit(20);

    // candidate count
    const [candidates] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(contradictions)
      .where(and(
        eq(contradictions.firmId, actor.firmId),
        eq(contradictions.matterId, matterId),
        eq(contradictions.status, 'candidate'),
      ))
      .limit(1);

    return {
      total: total?.count ?? 0,
      byStatus: byStatus ?? [],
      byKind: byKind ?? [],
      candidateCount: candidates?.count ?? 0,
    };
  }

  private toDto(row: typeof contradictions.$inferSelect): ContradictionDto {
    return {
      id: row.id,
      matterId: row.matterId,
      kind: row.kind,
      severity: row.severity as any,
      confidence: row.confidence,
      status: row.status,
      summary: row.summary,
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      detectedBy: row.detectedBy,
      dedupKey: row.dedupKey,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
