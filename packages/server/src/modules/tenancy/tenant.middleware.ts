import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { appConfig } from '../../config/app.config.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { TenantService } from './tenant.service.js';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantService: TenantService,
    private readonly context: RequestContextService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    void res;
    const forwarded = appConfig.tenancy.trustProxy
      ? (req.headers['x-forwarded-host'] as string | undefined)
      : undefined;
    const rawHost = forwarded ?? req.headers.host;
    const hostname = this.tenantService.normalizeHost(rawHost);
    const tenant = await this.tenantService.resolve(hostname);
    this.context.setTenant(tenant);
    next();
  }
}
