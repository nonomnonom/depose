import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { DomainError } from '../../common/domain-error.js';
import { RequestContextService } from '../../common/request-context.service.js';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly context: RequestContextService) {}

  canActivate(_ctx: ExecutionContext): boolean {
    const tenant = this.context.getTenant();
    if (!tenant || tenant.unresolved) {
      throw DomainError.tenantNotFound();
    }
    return true;
  }
}
