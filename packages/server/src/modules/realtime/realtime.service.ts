import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  realtimeSessions,
  realtimeLines,
  realtimeAlerts,
} from '../../infrastructure/database/schema/index.js';
import { PolicyService } from '../access-control/policy.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class RealtimeService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
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

  async getSession(actor: FirmActor, matterId: string, sessionId: string) {
    await this.policy.assertMatter(actor, 'matter.read', matterId);
    const row = await this.db
      .select()
      .from(realtimeSessions)
      .where(
        and(
          eq(realtimeSessions.id, sessionId),
          eq(realtimeSessions.firmId, actor.firmId),
        ),
      )
      .limit(1);
    if (!row.length) throw DomainError.notFound('Session not found');
    return { session: this.sessionDto(row[0]) };
  }

  async listAlerts(actor: FirmActor, matterId: string, sessionId: string) {
    await this.policy.assertMatter(actor, 'matter.read', matterId);
    const rows = await this.db
      .select()
      .from(realtimeAlerts)
      .where(
        and(
          eq(realtimeAlerts.firmId, actor.firmId),
          eq(realtimeAlerts.sessionId, sessionId),
        ),
      )
      .orderBy(desc(realtimeAlerts.createdAt));
    return { items: rows.map((r) => this.alertDto(r)) };
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
