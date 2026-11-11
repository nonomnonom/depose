import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import type { ActorContext, TenantContext } from '../../common/request-context.service.js';
import { appConfig } from '../../config/app.config.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  firmDomains,
  firms,
  member,
} from '../../infrastructure/database/schema/index.js';
import { AuthService } from '../auth/auth.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  DEFAULT_FIRM_SETTINGS,
  slugify,
  type SetupFirmInput,
  type UpdateFirmInput,
} from './firms.dto.js';

@Injectable()
export class FirmsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  async setup(actor: ActorContext, input: SetupFirmInput, tenant: TenantContext) {
    if (actor.firmId) {
      throw DomainError.conflict('CONFLICT', 'You already belong to a firm');
    }
    if (!appConfig.auth.allowSelfSignup) {
      throw DomainError.forbidden('Self sign-up is disabled; contact your administrator');
    }

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(firms);

    if (count > 0) {
      throw DomainError.conflict('CONFLICT', 'This instance is already configured');
    }

    const slug = input.slug ?? slugify(input.name);
    const primaryHost = `${slug}.${appConfig.tenancy.baseDomain}`;

    let organizationId: string;
    try {
      const organization = await this.auth.api.createOrganization({
        body: { name: input.name, slug, userId: actor.userId },
      });
      organizationId = organization.id;
    } catch (error) {
      throw DomainError.conflict(
        'CONFLICT',
        error instanceof Error ? error.message : 'Could not create firm',
      );
    }

    const result = await this.db.transaction(async (tx) => {
      const [firm] = await tx
        .insert(firms)
        .values({
          organizationId,
          name: input.name,
          slug,
          primaryLanguage: input.primaryLanguage,
          jurisdiction: input.jurisdiction,
          defaultTimezone: input.timezone,
          ownerId: actor.userId,
          settings: DEFAULT_FIRM_SETTINGS as unknown as Record<string, unknown>,
        })
        .returning();

      await tx.insert(firmDomains).values({
        firmId: firm.id,
        hostname: primaryHost,
        domainType: 'subdomain',
        isPrimary: true,
        status: 'active',
        verifiedAt: new Date(),
        sslStatus: appConfig.tls.mode === 'external' ? 'external' : 'pending',
        createdBy: actor.userId,
      });

      // Local development: keep the current host usable so the admin can log in
      // without a working wildcard subdomain. Explicitly mapped, never implicit.
      if (
        !appConfig.isProduction &&
        tenant.hostname &&
        tenant.hostname !== primaryHost
      ) {
        await tx.insert(firmDomains).values({
          firmId: firm.id,
          hostname: tenant.hostname,
          domainType: 'custom',
          isPrimary: false,
          status: 'active',
          verifiedAt: new Date(),
          sslStatus: 'external',
          createdBy: actor.userId,
        });
      }

      await tx
        .update(member)
        .set({ role: 'admin' })
        .where(
          and(
            eq(member.organizationId, organizationId),
            eq(member.userId, actor.userId),
          ),
        );

      return firm;
    });

    await this.audit.log({
      firmId: result.id,
      action: 'firm.created',
      resourceType: 'firm',
      resourceId: result.id,
      actor,
      metadata: { slug, primaryHost },
    });

    const frontendOrigin = appConfig.auth.trustedOrigins[0] ?? '';
    const loginUrl = appConfig.isProduction
      ? `${frontendOrigin.includes('https') ? 'https' : 'https'}://${primaryHost}`
      : frontendOrigin;

    return {
      firm: result,
      primaryHost,
      loginUrl,
      currentHostEnabled: !appConfig.isProduction,
    };
  }

  async getCurrent(actor: ActorContext) {
    if (!actor.firmId) throw DomainError.notFound('Firm not configured');
    const [firm] = await this.db
      .select()
      .from(firms)
      .where(eq(firms.id, actor.firmId))
      .limit(1);
    if (!firm) throw DomainError.notFound('Firm not found');
    return firm;
  }

  async update(actor: ActorContext, input: UpdateFirmInput) {
    if (!actor.firmId) throw DomainError.notFound('Firm not configured');
    const [firm] = await this.db
      .update(firms)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(firms.id, actor.firmId))
      .returning();
    if (!firm) throw DomainError.notFound('Firm not found');
    await this.audit.log({
      firmId: actor.firmId,
      action: 'firm.updated',
      resourceType: 'firm',
      resourceId: actor.firmId,
      actor,
      metadata: { fields: Object.keys(input) },
    });
    return firm;
  }

  async listDomains(actor: ActorContext) {
    if (!actor.firmId) throw DomainError.notFound('Firm not configured');
    return this.db
      .select({
        id: firmDomains.id,
        hostname: firmDomains.hostname,
        domainType: firmDomains.domainType,
        isPrimary: firmDomains.isPrimary,
        status: firmDomains.status,
        sslStatus: firmDomains.sslStatus,
        lastCheckedAt: firmDomains.lastCheckedAt,
        lastError: firmDomains.lastError,
      })
      .from(firmDomains)
      .where(eq(firmDomains.firmId, actor.firmId));
  }
}
