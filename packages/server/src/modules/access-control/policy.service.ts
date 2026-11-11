import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import {
  matters,
  matterMembers,
} from '../../infrastructure/database/schema/index.js';
import type { MatterAccess } from '../../infrastructure/database/schema/enums.js';
import type { FirmActor } from '../../common/request-context.service.js';
import { DomainError } from '../../common/domain-error.js';
import {
  type Action,
  matterAccessSatisfies,
  requiredMatterAccess,
  roleAllows,
} from './permissions.js';

const WRITE_ACTIONS = new Set<Action>([
  'matter.update',
  'matter.close',
  'matter.reopen',
  'matter.archive',
  'matter.delete',
  'matter.member.manage',
  'matter.share.manage',
  'document.upload',
  'document.delete',
  'document.reprocess',
  'transcript.edit',
  'fact.create',
  'fact.update',
  'fact.confirm',
  'fact.reject',
  'fact.merge',
  'fact.split',
  'fact.delete',
  'fact.relevance.update',
  'subset.create',
  'subset.update',
  'subset.delete',
  'subset.manage_documents',
  'issue.create',
  'issue.update',
  'issue.delete',
  'theme.update',
  'summary.generate',
  'event.create',
  'event.update',
  'event.confirm',
  'event.reject',
  'intelligence.review',
  'intelligence.detect',
  'output.create',
  'output.update',
  'output.finalize',
  'output.export',
  'output.delete',
  'realtime.start',
  'realtime.review',
  'realtime.send',
  'realtime.end',
]);

export interface MatterAccessResult {
  access: MatterAccess;
  status: 'active' | 'closed' | 'archived';
}

/**
 * Single authorization resolver (spec 08). Controllers and services must use
 * this service instead of ad-hoc role checks.
 */
@Injectable()
export class PolicyService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  canFirm(actor: FirmActor, action: Action): boolean {
    /* API keys carry an explicit action whitelist; role does not apply. */
    if (actor.apiKeyId) return actor.scopes?.includes(action) ?? false;
    return roleAllows(actor.role, action);
  }

  assertFirm(actor: FirmActor, action: Action): void {
    if (!this.canFirm(actor, action)) {
      throw DomainError.forbidden(`Role ${actor.role} cannot perform ${action}`);
    }
  }

  async resolveMatterAccess(actor: FirmActor, matterId: string): Promise<MatterAccessResult> {
    const [matter] = await this.db
      .select({ id: matters.id, status: matters.status })
      .from(matters)
      .where(
        and(
          eq(matters.id, matterId),
          eq(matters.firmId, actor.firmId),
          isNull(matters.deletedAt),
        ),
      )
      .limit(1);

    if (!matter) {
      throw DomainError.notFound('Matter not found');
    }

    /* Firm API keys are machine credentials scoped by action, not by matter
     * membership; the firm check above is the tenant boundary. */
    if (actor.role === 'admin' || actor.apiKeyId) {
      return { access: 'full', status: matter.status };
    }

    const [membership] = await this.db
      .select({ access: matterMembers.access })
      .from(matterMembers)
      .where(
        and(
          eq(matterMembers.firmId, actor.firmId),
          eq(matterMembers.matterId, matterId),
          eq(matterMembers.userId, actor.userId),
        ),
      )
      .limit(1);

    if (!membership) {
      // Do not reveal existence to actors without matter access.
      throw DomainError.notFound('Matter not found');
    }

    return { access: membership.access, status: matter.status };
  }

  async assertMatter(actor: FirmActor, action: Action, matterId: string): Promise<MatterAccess> {
    if (!this.canFirm(actor, action)) {
      throw DomainError.forbidden(`Role ${actor.role} cannot perform ${action}`);
    }

    const { access, status } = await this.resolveMatterAccess(actor, matterId);
    if (!matterAccessSatisfies(access, requiredMatterAccess(action))) {
      throw DomainError.forbidden(`Matter access ${access} cannot perform ${action}`);
    }

    if (status !== 'active' && actor.role !== 'admin' && WRITE_ACTIONS.has(action)) {
      throw DomainError.forbidden('Matter is closed');
    }

    return access;
  }
}
