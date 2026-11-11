import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { and, eq } from 'drizzle-orm';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import { DomainError } from '../../common/domain-error.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { firms, member } from '../../infrastructure/database/schema/index.js';
import type { FirmRole } from '../../infrastructure/database/schema/enums.js';
import { Inject } from '@nestjs/common';
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
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const request = ctx.switchToHttp().getRequest<Request>();
    const session = await this.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session?.user) {
      throw DomainError.unauthorized();
    }

    const tenant = this.context.getTenant();
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
        throw DomainError.forbidden('You are not a member of this firm');
      }

      role = normalizeRole(row.role);
      memberId = row.memberId;
      firmId = row.firmId;
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
