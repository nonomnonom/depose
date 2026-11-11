import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import { appConfig } from '../../config/app.config.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import { MailService } from '../../infrastructure/mail/mail.service.js';
import {
  firms,
  invitation,
  member,
  user,
} from '../../infrastructure/database/schema/index.js';
import type { FirmRole } from '../../infrastructure/database/schema/enums.js';
import { PolicyService } from '../access-control/policy.service.js';
import { AuditService } from '../audit/audit.service.js';

const INVITATION_TTL_DAYS = 7;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() <= Date.now();
}

@Injectable()
export class InvitationsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  async list(actor: FirmActor) {
    this.policy.assertFirm(actor, 'firm.invitation.manage');
    const organizationId = await this.firmOrganization(actor.firmId);
    const rows = await this.db
      .select({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
        inviterName: user.name,
      })
      .from(invitation)
      .innerJoin(user, eq(user.id, invitation.inviterId))
      .where(eq(invitation.organizationId, organizationId))
      .orderBy(desc(invitation.createdAt));

    return rows.map((row) => ({
      ...row,
      status:
        row.status === 'pending' && isExpired(row.expiresAt) ? 'expired' : row.status,
    }));
  }

  async create(actor: FirmActor, input: { email: string; role: FirmRole }) {
    this.policy.assertFirm(actor, 'firm.invitation.manage');
    const firm = await this.firm(actor.firmId);
    const email = input.email.toLowerCase();

    const [existingMember] = await this.db
      .select({ id: member.id })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(and(eq(member.organizationId, firm.organizationId), eq(user.email, email)))
      .limit(1);
    if (existingMember) {
      throw DomainError.conflict('MEMBER_ALREADY_EXISTS', 'That person already belongs to this firm');
    }

    const [pending] = await this.db
      .select({ id: invitation.id })
      .from(invitation)
      .where(
        and(
          eq(invitation.organizationId, firm.organizationId),
          eq(invitation.email, email),
          eq(invitation.status, 'pending'),
        ),
      )
      .limit(1);
    if (pending) {
      throw DomainError.conflict('CONFLICT', 'An invitation is already pending for that email');
    }

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
    const [created] = await this.db
      .insert(invitation)
      .values({
        id: randomUUID(),
        organizationId: firm.organizationId,
        email,
        role: input.role,
        status: 'pending',
        tokenHash: hashToken(token),
        expiresAt,
        inviterId: actor.userId,
      })
      .returning();

    await this.sendEmail(token, email, actor.name, firm.name);
    await this.audit.log({
      firmId: actor.firmId,
      action: 'firm.invitation.created',
      resourceType: 'invitation',
      resourceId: created.id,
      actor,
      metadata: { email, role: input.role },
    });

    return this.toDto(created, actor.name);
  }

  async resend(actor: FirmActor, invitationId: string) {
    this.policy.assertFirm(actor, 'firm.invitation.manage');
    const firm = await this.firm(actor.firmId);
    const [existing] = await this.db
      .select()
      .from(invitation)
      .where(
        and(
          eq(invitation.id, invitationId),
          eq(invitation.organizationId, firm.organizationId),
        ),
      )
      .limit(1);
    if (!existing) throw DomainError.notFound('Invitation not found');
    if (existing.status === 'accepted' || existing.status === 'revoked') {
      throw DomainError.conflict('CONFLICT', 'This invitation can no longer be resent');
    }

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
    const [updated] = await this.db
      .update(invitation)
      .set({ tokenHash: hashToken(token), expiresAt, status: 'pending' })
      .where(eq(invitation.id, existing.id))
      .returning();

    await this.sendEmail(token, existing.email, actor.name, firm.name);
    await this.audit.log({
      firmId: actor.firmId,
      action: 'firm.invitation.resent',
      resourceType: 'invitation',
      resourceId: existing.id,
      actor,
    });

    return this.toDto(updated, actor.name);
  }

  async revoke(actor: FirmActor, invitationId: string) {
    this.policy.assertFirm(actor, 'firm.invitation.manage');
    const firm = await this.firm(actor.firmId);
    const [updated] = await this.db
      .update(invitation)
      .set({ status: 'revoked' })
      .where(
        and(
          eq(invitation.id, invitationId),
          eq(invitation.organizationId, firm.organizationId),
          eq(invitation.status, 'pending'),
        ),
      )
      .returning();
    if (!updated) throw DomainError.notFound('Pending invitation not found');

    await this.audit.log({
      firmId: actor.firmId,
      action: 'firm.invitation.revoked',
      resourceType: 'invitation',
      resourceId: invitationId,
      actor,
    });

    return { revoked: true };
  }

  async getPublic(token: string) {
    const [row] = await this.db
      .select({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        firmName: firms.name,
        firmSlug: firms.slug,
        inviterName: user.name,
      })
      .from(invitation)
      .innerJoin(firms, eq(firms.organizationId, invitation.organizationId))
      .innerJoin(user, eq(user.id, invitation.inviterId))
      .where(eq(invitation.tokenHash, hashToken(token)))
      .limit(1);
    if (!row) throw DomainError.notFound('Invitation not found');

    const status =
      row.status === 'pending' && isExpired(row.expiresAt) ? 'expired' : row.status;
    return { ...row, status };
  }

  async accept(actor: FirmActor | { userId: string; email: string; name: string }, token: string) {
    const [invitationRow] = await this.db
      .select()
      .from(invitation)
      .where(eq(invitation.tokenHash, hashToken(token)))
      .limit(1);
    if (!invitationRow) throw DomainError.notFound('Invitation not found');
    if (invitationRow.status !== 'pending' || isExpired(invitationRow.expiresAt)) {
      throw DomainError.conflict('CONFLICT', 'This invitation is no longer valid');
    }
    if (invitationRow.email.toLowerCase() !== actor.email.toLowerCase()) {
      throw DomainError.forbidden('This invitation was sent to a different email address');
    }

    if (appConfig.auth.requireEmailVerification) {
      const [account] = await this.db
        .select({ emailVerified: user.emailVerified })
        .from(user)
        .where(eq(user.id, actor.userId))
        .limit(1);
      if (!account?.emailVerified) {
        throw DomainError.forbidden('Verify your email before accepting the invitation');
      }
    }

    const [firm] = await this.db
      .select({ id: firms.id, slug: firms.slug })
      .from(firms)
      .where(eq(firms.organizationId, invitationRow.organizationId))
      .limit(1);
    if (!firm) throw DomainError.notFound('Firm not found');

    const result = await this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: member.id, role: member.role })
        .from(member)
        .where(
          and(
            eq(member.organizationId, invitationRow.organizationId),
            eq(member.userId, actor.userId),
          ),
        )
        .limit(1);

      const [row] = existing
        ? [existing]
        : await tx
            .insert(member)
            .values({
              id: randomUUID(),
              organizationId: invitationRow.organizationId,
              userId: actor.userId,
              role: invitationRow.role as FirmRole,
            })
            .returning({ id: member.id, role: member.role });

      await tx
        .update(invitation)
        .set({ status: 'accepted' })
        .where(eq(invitation.id, invitationRow.id));

      return row;
    });

    await this.audit.log({
      firmId: firm.id,
      action: 'firm.invitation.accepted',
      resourceType: 'invitation',
      resourceId: invitationRow.id,
      actor: { userId: actor.userId, role: result.role as FirmRole },
      metadata: { email: actor.email },
    });

    return {
      member: {
        id: result.id,
        userId: actor.userId,
        name: actor.name,
        email: actor.email,
        role: result.role,
        emailVerified: true,
        joinedAt: new Date(),
      },
      firmSlug: firm.slug,
    };
  }

  private async firm(firmId: string) {
    const [row] = await this.db
      .select({ name: firms.name, organizationId: firms.organizationId })
      .from(firms)
      .where(eq(firms.id, firmId))
      .limit(1);
    if (!row) throw DomainError.notFound('Firm not found');
    return row;
  }

  private async firmOrganization(firmId: string): Promise<string> {
    return (await this.firm(firmId)).organizationId;
  }

  private async sendEmail(token: string, email: string, inviterName: string, firmName: string) {
    const origin = appConfig.auth.trustedOrigins[0] ?? appConfig.auth.baseUrl;
    await this.mail.sendTemplate('invitation', email, {
      inviterName,
      firmName,
      url: `${origin.replace(/\/$/, '')}/invitations/${token}`,
    });
  }

  private toDto(
    row: typeof invitation.$inferSelect,
    inviterName: string,
  ) {
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      status: row.status,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      inviterName,
    };
  }
}
