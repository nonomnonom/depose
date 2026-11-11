import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  themes,
  themeFacts,
  summaries,
  summaryFacts,
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
