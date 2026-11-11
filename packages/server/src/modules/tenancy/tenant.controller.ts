import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { and, eq } from 'drizzle-orm';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { appConfig } from '../../config/app.config.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import { firms } from '../../infrastructure/database/schema/index.js';
import { TenantResponseDto } from './tenant.response.js';

@ApiTags('Tenancy')
@Controller('v1/tenant')
export class TenantController {
  constructor(
    private readonly context: RequestContextService,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Resolve the current host',
    description:
      'Public. Resolves the firm bound to the request hostname and exposes the auth policy the UI must follow. Returns an empty hostname when the host is unmapped.',
  })
  @ApiOkResponse({ description: 'Resolved tenant', type: TenantResponseDto })
  async getTenant() {
    const tenant = this.context.getTenant();
    if (!tenant) return { hostname: '', requiresSetup: false };

    let firm: { name: string } | null = null;
    if (tenant.firmId) {
      const [row] = await this.db
        .select({ name: firms.name })
        .from(firms)
        .where(eq(firms.id, tenant.firmId))
        .limit(1);
      firm = row ?? null;
    }

    return {
      hostname: tenant.hostname,
      firm: firm ? { name: firm.name } : null,
      aiEnabled: Boolean(appConfig.ai.apiKey && appConfig.ai.model),
      domainType: tenant.domainType,
      isPrimary: tenant.isPrimary,
      isBootstrapHost: tenant.isBootstrapHost,
      requiresSetup: !tenant.firmId && tenant.isBootstrapHost,
      auth: {
        allowSelfSignup: appConfig.auth.allowSelfSignup,
        requireAdminApproval: appConfig.auth.requireAdminApproval,
        ssoEnabled: appConfig.auth.ssoEnabled,
        forceSso: appConfig.auth.forceSso,
        requireEmailVerification: appConfig.auth.requireEmailVerification,
        mailConfigured: appConfig.mail.transport === 'smtp',
        aiEnabled: Boolean(appConfig.ai.apiKey && appConfig.ai.model),
        mcpServerEnabled: Boolean(appConfig.mcp.token && appConfig.mcp.firmId),
      },
    };
  }
}
