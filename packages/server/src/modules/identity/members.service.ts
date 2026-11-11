import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  firms,
  member,
  user,
} from '../../infrastructure/database/schema/index.js';
import type { FirmRole } from '../../infrastructure/database/schema/enums.js';
import { PolicyService } from '../access-control/policy.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class MembersService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  private async organizationId(firmId: string): Promise<string> {
    const [firm] = await this.db
      .select({ organizationId: firms.organizationId })
      .from(firms)
      .where(eq(firms.id, firmId))
      .limit(1);
    if (!firm) throw DomainError.notFound('Firm not found');
    return firm.organizationId;
  }

  async list(actor: FirmActor) {
    this.policy.assertFirm(actor, 'firm.read');
    const organizationId = await this.organizationId(actor.firmId);
    return this.db
      .select({
        id: member.id,
        userId: member.userId,
        name: user.name,
        email: user.email,
        role: member.role,
        emailVerified: user.emailVerified,
        joinedAt: member.createdAt,
      })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(eq(member.organizationId, organizationId))
      .orderBy(asc(member.createdAt));
  }

  async updateRole(actor: FirmActor, memberId: string, role: FirmRole) {
    this.policy.assertFirm(actor, 'firm.member.manage');
    const organizationId = await this.organizationId(actor.firmId);

    const [target] = await this.db
      .select({ id: member.id, userId: member.userId, role: member.role })
      .from(member)
      .where(and(eq(member.id, memberId), eq(member.organizationId, organizationId)))
      .limit(1);
    if (!target) throw DomainError.notFound('Member not found');

    if (target.userId === actor.userId && role !== 'admin') {
      throw DomainError.conflict('CONFLICT', 'You cannot remove your own admin role');
    }

    if (target.role === 'admin' && role !== 'admin') {
      await this.assertNotLastAdmin(organizationId, target.id);
    }

    await this.db.update(member).set({ role }).where(eq(member.id, target.id));

    await this.audit.log({
      firmId: actor.firmId,
      action: 'firm.member.role_updated',
      resourceType: 'member',
      resourceId: memberId,
      actor,
      metadata: { from: target.role, to: role },
    });

    const [row] = await this.db
      .select({
        id: member.id,
        userId: member.userId,
        name: user.name,
        email: user.email,
        role: member.role,
        emailVerified: user.emailVerified,
        joinedAt: member.createdAt,
      })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(eq(member.id, target.id))
      .limit(1);
    return row;
  }

  async remove(actor: FirmActor, memberId: string) {
    this.policy.assertFirm(actor, 'firm.member.manage');
    const organizationId = await this.organizationId(actor.firmId);

    const [target] = await this.db
      .select({ id: member.id, userId: member.userId, role: member.role })
      .from(member)
      .where(and(eq(member.id, memberId), eq(member.organizationId, organizationId)))
      .limit(1);
    if (!target) throw DomainError.notFound('Member not found');

    if (target.userId === actor.userId) {
      throw DomainError.conflict('CONFLICT', 'You cannot remove yourself from the firm');
    }
    if (target.role === 'admin') {
      await this.assertNotLastAdmin(organizationId, target.id);
    }

    await this.db.delete(member).where(eq(member.id, target.id));

    await this.audit.log({
      firmId: actor.firmId,
      action: 'firm.member.removed',
      resourceType: 'member',
      resourceId: memberId,
      actor,
      metadata: { userId: target.userId, role: target.role },
    });

    return { removed: true };
  }

  private async assertNotLastAdmin(organizationId: string, excludingMemberId: string) {
    const rows = await this.db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.organizationId, organizationId), eq(member.role, 'admin')));
    if (rows.length <= 1 || !rows.some((row) => row.id === excludingMemberId)) {
      throw DomainError.conflict('CONFLICT', 'The firm must keep at least one admin');
    }
  }
}
