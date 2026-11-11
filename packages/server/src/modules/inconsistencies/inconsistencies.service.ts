import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  contradictionFacts,
  contradictions,
  facts,
} from '../../infrastructure/database/schema/index.js';
import { PolicyService } from '../access-control/policy.service.js';
import { AuditService } from '../audit/audit.service.js';
import { SystemOneService } from '../ai/system-one/system-one.service.js';

export const reviewContradictionSchema = z.object({
  status: z.enum(['candidate', 'open', 'confirmed', 'dismissed', 'stale']),
  reviewedBy: z.string().max(100),
  confidence: z.number().min(0).max(1).optional(),
});

export const updateSeveritySchema = z.object({
  severity: z.enum(['critical', 'serious', 'minor', 'informational']),
});

export const CONTRADICTION_SEVERITIES = [
  'critical',
  'serious',
  'minor',
  'informational',
] as const;

export type ContradictionSeverity = (typeof CONTRADICTION_SEVERITIES)[number];

/**
 * Dimensions the detector asks the decision route to choose between. The kind
 * decides severity: a disputed amount or party is worth more of a lawyer's
 * attention than two narrative statements that disagree in tone.
 */
const CONTRADICTION_KINDS = ['date', 'amount', 'party', 'event', 'statement'] as const;
export type ContradictionKind = (typeof CONTRADICTION_KINDS)[number];

const SEVERITY_BY_KIND: Record<ContradictionKind, ContradictionSeverity> = {
  amount: 'critical',
  date: 'serious',
  party: 'serious',
  event: 'minor',
  statement: 'minor',
};

const DETECT_FACT_LIMIT = 300;
const MAX_FACTS_PER_BUCKET = 20;
const MAX_PAIRS = 60;
const MIN_CONFIDENCE = 0.6;
const MAX_DECISION_FAILURES = 3;

type DetectableFact = {
  id: string;
  text: string;
  factType: string | null;
  entityLabel: string | null;
  dateStart: string | null;
  dateEnd: string | null;
  status: 'proposed' | 'confirmed' | 'rejected' | 'unsupported' | 'merged';
};

function isSeverity(value: string): value is ContradictionSeverity {
  return (CONTRADICTION_SEVERITIES as readonly string[]).includes(value);
}

function isKind(value: string): value is ContradictionKind {
  return (CONTRADICTION_KINDS as readonly string[]).includes(value);
}

/** One contradiction per unordered fact pair, stable across re-runs. */
function pairKey(left: string, right: string): string {
  const [first, second] = [left, right].sort();
  return `pair:${createHash('sha1').update(`${first}:${second}`).digest('hex')}`;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/**
 * Facts are only compared inside a bucket, so the detector never spends a model
 * call on two unrelated facts. Same entity is the strongest signal; facts with
 * no entity fall back to their type.
 */
function bucketKey(fact: DetectableFact): string {
  const entity = fact.entityLabel?.trim().toLowerCase();
  if (entity) return `entity:${entity}`;
  return `type:${fact.factType ?? 'other'}`;
}

export type ContradictionDto = {
  id: string;
  matterId: string;
  kind: string;
  severity: ContradictionSeverity;
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
    private readonly decision: SystemOneService,
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
      .where(
        and(
          eq(contradictions.id, contradictionId),
          eq(contradictions.firmId, actor.firmId),
          eq(contradictions.matterId, matterId),
        ),
      )
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
      .where(
        and(
          eq(contradictions.id, contradictionId),
          eq(contradictions.firmId, actor.firmId),
          eq(contradictions.matterId, matterId),
        ),
      )
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
      .where(
        and(
          eq(contradictions.id, contradictionId),
          eq(contradictions.firmId, actor.firmId),
          eq(contradictions.matterId, matterId),
        ),
      )
      .returning();
    if (!row) throw DomainError.notFound('Contradiction not found');
    await this.audit.log({
      firmId: actor.firmId,
      action: 'inconsistencies.severity_updated',
      resourceType: 'contradiction',
      resourceId: contradictionId,
      actor,
      metadata: { matterId, severity },
    });
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
    const byStatus = await this.db
      .select({ status: contradictions.status, count: sql<number>`count(*)::int` })
      .from(contradictions)
      .where(and(eq(contradictions.firmId, actor.firmId), eq(contradictions.matterId, matterId)))
      .groupBy(contradictions.status);
    const byKind = await this.db
      .select({ kind: contradictions.kind, count: sql<number>`count(*)::int` })
      .from(contradictions)
      .where(and(eq(contradictions.firmId, actor.firmId), eq(contradictions.matterId, matterId)))
      .groupBy(contradictions.kind);

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
      byStatus,
      byKind,
      candidateCount: candidates?.count ?? 0,
    };
  }

  /**
   * Detect contradictions between the matter's live facts and persist every
   * confirmed pair as a `candidate` contradiction with its two `factId`s.
   *
   * Detection is deliberately kept in one place: this is the only writer of
   * `contradictions`, so `GET /inconsistencies` and the review workflow always
   * see rows that a detector actually produced.
   */
  async detect(actor: FirmActor, matterId: string) {
    await this.policy.assertMatter(actor, 'intelligence.detect', matterId);

    const rows = await this.db
      .select({
        id: facts.id,
        text: facts.text,
        factType: facts.factType,
        entityLabel: facts.entityLabel,
        dateStart: facts.dateStart,
        dateEnd: facts.dateEnd,
        status: facts.status,
      })
      .from(facts)
      .where(
        and(
          eq(facts.firmId, actor.firmId),
          eq(facts.matterId, matterId),
          isNull(facts.mergedIntoId),
          inArray(facts.status, ['proposed', 'confirmed']),
        ),
      )
      .limit(DETECT_FACT_LIMIT);

    if (rows.length < 2) {
      return {
        detected: 0,
        evaluated: 0,
        skipped: 0,
        failed: 0,
        items: [],
        degraded: false,
        warnings: [],
      };
    }

    const buckets = new Map<string, DetectableFact[]>();
    for (const row of rows) {
      const key = bucketKey(row);
      const bucket = buckets.get(key) ?? [];
      if (bucket.length < MAX_FACTS_PER_BUCKET) bucket.push(row);
      buckets.set(key, bucket);
    }

    const pairs: [DetectableFact, DetectableFact][] = [];
    for (const bucket of buckets.values()) {
      for (let i = 0; i < bucket.length && pairs.length < MAX_PAIRS; i += 1) {
        for (let j = i + 1; j < bucket.length && pairs.length < MAX_PAIRS; j += 1) {
          pairs.push([bucket[i], bucket[j]]);
        }
      }
      if (pairs.length >= MAX_PAIRS) break;
    }

    if (pairs.length === 0) {
      return {
        detected: 0,
        evaluated: 0,
        skipped: 0,
        failed: 0,
        items: [],
        degraded: false,
        warnings: [],
      };
    }

    const known = await this.db
      .select({ dedupKey: contradictions.dedupKey })
      .from(contradictions)
      .where(
        and(
          eq(contradictions.matterId, matterId),
          inArray(
            contradictions.dedupKey,
            pairs.map(([left, right]) => pairKey(left.id, right.id)),
          ),
        ),
      );
    const seen = new Set(known.map((row) => row.dedupKey));

    const items: ContradictionDto[] = [];
    const warnings: string[] = [];
    let evaluated = 0;
    let skipped = 0;
    let failed = 0;

    for (const [left, right] of pairs) {
      const dedupKey = pairKey(left.id, right.id);
      if (seen.has(dedupKey)) {
        skipped += 1;
        continue;
      }

      let answers;
      try {
        const decision = await this.decision.decide(
          actor.firmId,
          {
            text: `FACT A\n${left.text}\n\nFACT B\n${right.text}`,
            context: {
              factAId: left.id,
              factBId: right.id,
              factAType: left.factType,
              factBType: right.factType,
              entityLabel: left.entityLabel ?? right.entityLabel,
              dateA: left.dateStart,
              dateB: right.dateStart,
            },
          },
          {
            verdict: {
              type: 'choice',
              instructions:
                'Do these two statements conflict about the same subject, date, amount, or party? Adding detail or describing a different event is not a conflict.',
              options: ['contradiction', 'consistent', 'unrelated'],
            },
            dimension: {
              type: 'choice',
              instructions: 'Which dimension do the two statements conflict on?',
              options: [...CONTRADICTION_KINDS],
            },
          },
        );
        answers = decision.answers;
        evaluated += 1;
      } catch (error) {
        const code = error instanceof DomainError ? error.code : 'DECISION_UNAVAILABLE';
        if (code === 'DECISION_NOT_CONFIGURED') {
          throw new DomainError(
            'DECISION_NOT_CONFIGURED',
            503,
            'Contradiction detection needs a decision route. Configure DECISION_BASE_URL for this instance.',
          );
        }
        warnings.push(code);
        failed += 1;
        if (failed >= MAX_DECISION_FAILURES) break;
        continue;
      }

      const verdict = answers.verdict;
      const confidence = Number(verdict?.confidence ?? 0);
      if (verdict?.type !== 'choice' || verdict?.choice !== 'contradiction' || confidence < MIN_CONFIDENCE) {
        skipped += 1;
        continue;
      }

      const rawKind = answers.dimension?.type === 'choice' ? answers.dimension?.choice ?? 'statement' : 'statement';
      const kind: ContradictionKind = isKind(rawKind) ? rawKind : 'statement';
      const summary = truncate(
        `Fact A says "${left.text}" while fact B says "${right.text}" — conflict on ${kind}.`,
        1_000,
      );

      const [inserted] = await this.db
        .insert(contradictions)
        .values({
          firmId: actor.firmId,
          matterId,
          kind,
          severity: SEVERITY_BY_KIND[kind],
          confidence: Math.min(1, Math.max(0, confidence)),
          status: 'candidate',
          summary,
          detectedBy: 'contradiction-detector',
          dedupKey,
        })
        .onConflictDoNothing()
        .returning();

      seen.add(dedupKey);
      if (!inserted) {
        skipped += 1;
        continue;
      }

      await this.db
        .insert(contradictionFacts)
        .values([
          {
            firmId: actor.firmId,
            matterId,
            contradictionId: inserted.id,
            factId: left.id,
            role: 'source',
          },
          {
            firmId: actor.firmId,
            matterId,
            contradictionId: inserted.id,
            factId: right.id,
            role: 'conflicting',
          },
        ])
        .onConflictDoNothing();

      items.push(this.toDto(inserted));
    }

    if (items.length > 0) {
      await this.audit.log({
        firmId: actor.firmId,
        action: 'inconsistencies.detected',
        resourceType: 'matter',
        resourceId: matterId,
        actor,
        metadata: {
          detected: items.length,
          evaluated,
          pairs: pairs.length,
        },
      });
    }

    return {
      detected: items.length,
      evaluated,
      skipped,
      failed,
      items,
      degraded: failed > 0,
      warnings: [...new Set(warnings)],
    };
  }

  private toDto(row: typeof contradictions.$inferSelect): ContradictionDto {
    return {
      id: row.id,
      matterId: row.matterId,
      kind: row.kind,
      severity: isSeverity(row.severity) ? row.severity : 'informational',
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
