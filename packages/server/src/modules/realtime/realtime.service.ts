import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  realtimeAlertFacts,
  realtimeAlerts,
  realtimeLines,
  realtimeSessions,
} from '../../infrastructure/database/schema/index.js';
import { PolicyService } from '../access-control/policy.service.js';
import { AuditService } from '../audit/audit.service.js';
import { IntelligenceService, type RealtimeVerdict } from '../intelligence/intelligence.service.js';

export type CreateRealtimeSessionInput = {
  language?: string;
  sensitivity?: string;
};

export type RecordRealtimeLineInput = {
  speaker?: string;
  text: string;
};

const SEVERITY_BY_VERDICT: Partial<Record<RealtimeVerdict, string>> = {
  contradicts: 'serious',
  silent: 'minor',
  unclear: 'informational',
};

const CONFIDENCE_VALUE: Record<'low' | 'medium' | 'high', number> = {
  low: 0.4,
  medium: 0.7,
  high: 0.9,
};

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

@Injectable()
export class RealtimeService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
    private readonly intelligence: IntelligenceService,
  ) {}

  async listSessions(actor: FirmActor, matterId: string) {
    await this.policy.assertMatter(actor, 'matter.read', matterId);
    const rows = await this.db
      .select()
      .from(realtimeSessions)
      .where(
        and(
          eq(realtimeSessions.firmId, actor.firmId),
          eq(realtimeSessions.matterId, matterId),
        ),
      )
      .orderBy(desc(realtimeSessions.createdAt));
    return { items: rows.map((r) => this.sessionDto(r)) };
  }

  async createSession(actor: FirmActor, matterId: string, input: CreateRealtimeSessionInput) {
    await this.policy.assertMatter(actor, 'realtime.start', matterId);
    const [row] = await this.db
      .insert(realtimeSessions)
      .values({
        firmId: actor.firmId,
        matterId,
        createdBy: actor.userId,
        status: 'active',
        language: input.language ?? null,
        sensitivity: input.sensitivity ?? 'balanced',
      })
      .returning();
    await this.audit.log({
      firmId: actor.firmId,
      action: 'realtime.session.started',
      resourceType: 'realtime_session',
      resourceId: row.id,
      actor,
      metadata: { matterId, language: row.language, sensitivity: row.sensitivity },
    });
    return { session: this.sessionDto(row) };
  }

  async endSession(actor: FirmActor, matterId: string, sessionId: string) {
    await this.policy.assertMatter(actor, 'realtime.end', matterId);
    const [row] = await this.db
      .update(realtimeSessions)
      .set({ status: 'ended', endedAt: new Date() })
      .where(
        and(
          eq(realtimeSessions.id, sessionId),
          eq(realtimeSessions.firmId, actor.firmId),
          eq(realtimeSessions.matterId, matterId),
        ),
      )
      .returning();
    if (!row) throw DomainError.notFound('Session not found');
    await this.audit.log({
      firmId: actor.firmId,
      action: 'realtime.session.ended',
      resourceType: 'realtime_session',
      resourceId: sessionId,
      actor,
      metadata: { matterId },
    });
    return { session: this.sessionDto(row) };
  }

  async getSession(actor: FirmActor, matterId: string, sessionId: string) {
    await this.policy.assertMatter(actor, 'matter.read', matterId);
    const row = await this.db
      .select()
      .from(realtimeSessions)
      .where(
        and(
          eq(realtimeSessions.id, sessionId),
          eq(realtimeSessions.firmId, actor.firmId),
          eq(realtimeSessions.matterId, matterId),
        ),
      )
      .limit(1);
    if (!row.length) throw DomainError.notFound('Session not found');
    return { session: this.sessionDto(row[0]) };
  }

  async listLines(actor: FirmActor, matterId: string, sessionId: string) {
    await this.policy.assertMatter(actor, 'matter.read', matterId);
    const rows = await this.db
      .select()
      .from(realtimeLines)
      .where(
        and(
          eq(realtimeLines.firmId, actor.firmId),
          eq(realtimeLines.matterId, matterId),
          eq(realtimeLines.sessionId, sessionId),
        ),
      )
      .orderBy(asc(realtimeLines.sequence));
    return { items: rows.map((r) => this.lineDto(r)) };
  }

  /**
   * Stores one transcript line and checks it against the fact bank. The line is
   * persisted before the check so a provider outage never loses testimony.
   */
  async recordLine(
    actor: FirmActor,
    matterId: string,
    sessionId: string,
    input: RecordRealtimeLineInput,
  ) {
    await this.policy.assertMatter(actor, 'realtime.send', matterId);
    const [session] = await this.db
      .select()
      .from(realtimeSessions)
      .where(
        and(
          eq(realtimeSessions.id, sessionId),
          eq(realtimeSessions.firmId, actor.firmId),
          eq(realtimeSessions.matterId, matterId),
        ),
      )
      .limit(1);
    if (!session) throw DomainError.notFound('Session not found');
    if (session.status !== 'active') {
      throw DomainError.validation('This live session has ended');
    }

    const [next] = await this.db
      .select({ sequence: sql<number>`coalesce(max(${realtimeLines.sequence}), 0)::int` })
      .from(realtimeLines)
      .where(eq(realtimeLines.sessionId, sessionId));
    const sequence = (next?.sequence ?? 0) + 1;

    const [line] = await this.db
      .insert(realtimeLines)
      .values({
        firmId: actor.firmId,
        matterId,
        sessionId,
        sequence,
        speaker: input.speaker?.trim() ? input.speaker.trim() : null,
        text: input.text,
        checkStatus: 'pending',
      })
      .returning();

    let check;
    try {
      const result = await this.intelligence.realtimeCheck(actor, matterId, input.text);
      check = result;

      const verdict: RealtimeVerdict = result.verdict ?? 'unclear';
      const [updated] = await this.db
        .update(realtimeLines)
        .set({ checkStatus: 'checked' })
        .where(eq(realtimeLines.id, line.id))
        .returning();
      if (updated) line.checkStatus = updated.checkStatus;

      const severity = SEVERITY_BY_VERDICT[verdict];
      let alerts: (typeof realtimeAlerts.$inferSelect)[] = [];

      if (severity) {
        const [alert] = await this.db
          .insert(realtimeAlerts)
          .values({
            firmId: actor.firmId,
            matterId,
            sessionId,
            lineId: line.id,
            kind: verdict,
            severity,
            confidence: CONFIDENCE_VALUE[result.confidence] ?? null,
            summary: truncate(result.answer, 1_500),
            status: 'open',
          })
          .returning();

        const factIds = result.sources
          .filter(
            (source) =>
              source.type === 'fact' && result.citedSourceIds.includes(source.id),
          )
          .map((source) => source.id);
        if (factIds.length > 0) {
          await this.db
            .insert(realtimeAlertFacts)
            .values(
              factIds.map((factId) => ({
                firmId: actor.firmId,
                matterId,
                alertId: alert.id,
                factId,
              })),
            )
            .onConflictDoNothing();
        }
        alerts = [alert];
      }

      await this.audit.log({
        firmId: actor.firmId,
        action: 'realtime.line.checked',
        resourceType: 'realtime_line',
        resourceId: line.id,
        actor,
        metadata: { matterId, sessionId, verdict, alerts: alerts.length },
      });

      return {
        line: this.lineDto(line),
        alerts: alerts.map((alert) => this.alertDto(alert)),
        check: {
          answer: result.answer,
          confidence: result.confidence,
          verdict,
          insufficientEvidence: result.insufficientEvidence,
          sources: result.sources,
          citedSourceIds: result.citedSourceIds,
        },
      };
    } catch (error) {
      await this.db
        .update(realtimeLines)
        .set({ checkStatus: 'unchecked' })
        .where(eq(realtimeLines.id, line.id));
      line.checkStatus = 'unchecked';
      return {
        line: this.lineDto(line),
        alerts: [],
        check: null,
        warning:
          error instanceof DomainError
            ? error.message
            : 'The record check did not run. The line was stored.',
      };
    }
  }

  async listAlerts(actor: FirmActor, matterId: string, sessionId: string) {
    await this.policy.assertMatter(actor, 'matter.read', matterId);
    const rows = await this.db
      .select()
      .from(realtimeAlerts)
      .where(
        and(
          eq(realtimeAlerts.firmId, actor.firmId),
          eq(realtimeAlerts.matterId, matterId),
          eq(realtimeAlerts.sessionId, sessionId),
        ),
      )
      .orderBy(desc(realtimeAlerts.createdAt));
    return { items: rows.map((r) => this.alertDto(r)) };
  }

  async reviewAlert(
    actor: FirmActor,
    matterId: string,
    sessionId: string,
    alertId: string,
    input: { status: 'open' | 'accepted' | 'dismissed'; note?: string },
  ) {
    await this.policy.assertMatter(actor, 'realtime.review', matterId);
    const [row] = await this.db
      .update(realtimeAlerts)
      .set({
        status: input.status,
        note: input.note ?? null,
        reviewedBy: actor.userId,
      })
      .where(
        and(
          eq(realtimeAlerts.id, alertId),
          eq(realtimeAlerts.firmId, actor.firmId),
          eq(realtimeAlerts.matterId, matterId),
          eq(realtimeAlerts.sessionId, sessionId),
        ),
      )
      .returning();
    if (!row) throw DomainError.notFound('Alert not found');
    await this.audit.log({
      firmId: actor.firmId,
      action: 'realtime.alert.reviewed',
      resourceType: 'realtime_alert',
      resourceId: alertId,
      actor,
      metadata: { matterId, sessionId, status: input.status },
    });
    return { alert: this.alertDto(row) };
  }

  private sessionDto(row: typeof realtimeSessions.$inferSelect) {
    return {
      id: row.id,
      matterId: row.matterId,
      createdBy: row.createdBy,
      status: row.status,
      language: row.language,
      sensitivity: row.sensitivity,
      createdAt: row.createdAt.toISOString(),
      endedAt: row.endedAt,
    };
  }

  private lineDto(row: typeof realtimeLines.$inferSelect) {
    return {
      id: row.id,
      sessionId: row.sessionId,
      sequence: row.sequence,
      speaker: row.speaker,
      text: row.text,
      checkStatus: row.checkStatus,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private alertDto(row: typeof realtimeAlerts.$inferSelect) {
    return {
      id: row.id,
      sessionId: row.sessionId,
      lineId: row.lineId,
      kind: row.kind,
      severity: row.severity,
      confidence: row.confidence,
      summary: row.summary,
      status: row.status,
      note: row.note,
      reviewedBy: row.reviewedBy,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
