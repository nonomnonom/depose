import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { and, eq } from 'drizzle-orm';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { ALLOW_NON_MEMBER_KEY } from '../../common/decorators/allow-non-member.decorator.js';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import { DomainError } from '../../common/domain-error.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { firms, member } from '../../infrastructure/database/schema/index.js';
import type { FirmRole } from '../../infrastructure/database/schema/enums.js';
import { Inject } from '@nestjs/common';
import { ApiKeysService } from '../api-keys/api-keys.service.js';
import { AuthService } from './auth.service.js';

function normalizeRole(role: string | undefined): FirmRole {
  switch (role) {
    case 'admin':
    case 'owner':
      return 'admin';
    case 'lawyer':
    case 'paralegal':
    case 'viewer':
    case 'guest':
      return role;
    default:
      return 'viewer';
  }
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly context: RequestContextService,
    private readonly auth: AuthService,
    private readonly apiKeys: ApiKeysService,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const allowNonMember = this.reflector.getAllAndOverride<boolean>(ALLOW_NON_MEMBER_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const request = ctx.switchToHttp().getRequest<Request>();
    const tenant = this.context.getTenant();

    const authorization = request.headers.authorization;
    const bearer =
      typeof authorization === 'string' && authorization.startsWith('Bearer ')
        ? authorization.slice(7).trim()
        : '';
    if (bearer) {
      const key = await this.apiKeys.validate(bearer);
      if (!key) throw DomainError.unauthorized('Invalid API key');
      if (tenant?.firmId && tenant.firmId !== key.firmId) {
        throw DomainError.forbidden('API key does not belong to this firm');
      }
      this.context.setActor({
        userId: `api-key:${key.id}`,
        email: '',
        name: key.name,
        sessionId: `api-key:${key.id}`,
        firmId: key.firmId,
        role: 'viewer',
        memberId: key.id,
        apiKeyId: key.id,
        scopes: key.scopes,
      });
      return true;
    }

    const session = await this.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session?.user) {
      throw DomainError.unauthorized();
    }
    let role: FirmRole | null = null;
    let memberId: string | null = null;
    let firmId: string | null = null;

    if (tenant?.firmId) {
      const [row] = await this.db
        .select({
          memberId: member.id,
          role: member.role,
          firmId: firms.id,
        })
        .from(member)
        .innerJoin(firms, eq(firms.organizationId, member.organizationId))
        .where(and(eq(firms.id, tenant.firmId), eq(member.userId, session.user.id)))
        .limit(1);

      if (!row) {
        if (!allowNonMember) {
          throw DomainError.forbidden('You are not a member of this firm');
        }
      } else {
        role = normalizeRole(row.role);
        memberId = row.memberId;
        firmId = row.firmId;
      }
    }

    this.context.setActor({
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
      sessionId: session.session.id,
      firmId,
      role,
      memberId,
    });

    return true;
  }
}
