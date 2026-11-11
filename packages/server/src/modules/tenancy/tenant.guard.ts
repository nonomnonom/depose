import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import { DomainError } from '../../common/domain-error.js';
import { RequestContextService } from '../../common/request-context.service.js';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly context: RequestContextService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const tenant = this.context.getTenant();
    if (!tenant || tenant.unresolved) {
      throw DomainError.tenantNotFound();
    }
    return true;
  }
}
