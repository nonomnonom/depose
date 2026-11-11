import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { eq } from 'drizzle-orm';
import {
  RequestContextService,
  type FirmActor,
} from '../../common/request-context.service.js';
import { appConfig } from '../../config/app.config.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import { firms } from '../../infrastructure/database/schema/index.js';
import { actionsForRole } from '../access-control/permissions.js';
import { ApiSessionAuth } from '../../common/openapi/session-auth.decorator.js';
import { MeResponseDto, PermissionsResponseDto } from './me.response.js';

@ApiTags('Identity')
@ApiSessionAuth()
@Controller('v1/me')
export class MeController {
  constructor(
    private readonly context: RequestContextService,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get the signed-in user',
    description:
      'Returns the identity, firm membership details, current tenant, and auth policy in one call. `firm` is null until the user completes setup.',
  })
  @ApiOkResponse({ description: 'Current identity', type: MeResponseDto })
  async me() {
    const actor = this.context.requireActor();
    const tenant = this.context.getTenant();

    let firm: Record<string, unknown> | null = null;
    if (actor.firmId) {
      const [row] = await this.db
        .select({
          id: firms.id,
          name: firms.name,
          primaryLanguage: firms.primaryLanguage,
          jurisdiction: firms.jurisdiction,
          defaultTimezone: firms.defaultTimezone,
          settings: firms.settings,
        })
        .from(firms)
        .where(eq(firms.id, actor.firmId))
        .limit(1);
      if (row) {
        firm = { ...row, role: actor.role, memberId: actor.memberId };
      }
    }

    return {
      user: {
        id: actor.userId,
        email: actor.email,
        name: actor.name,
      },
      firm,
      tenant: tenant
        ? {
            hostname: tenant.hostname,
            domainType: tenant.domainType,
            isPrimary: tenant.isPrimary,
            isBootstrapHost: tenant.isBootstrapHost,
          }
        : null,
      setupRequired: !actor.firmId,
      auth: {
        allowSelfSignup: appConfig.auth.allowSelfSignup,
        forceSso: appConfig.auth.forceSso,
        ssoEnabled: appConfig.auth.ssoEnabled,
        requireEmailVerification: appConfig.auth.requireEmailVerification,
      },
    };
  }

  @Get('permissions')
  @ApiOperation({
    summary: 'List permissions for the current role',
    description: 'Empty when the user has no firm membership yet.',
  })
  @ApiOkResponse({ description: 'Allowed actions', type: PermissionsResponseDto })
  permissions() {
    const actor = this.context.requireActor();
    if (!actor.firmId || !actor.role) {
      return { permissions: [] };
    }
    return { permissions: actionsForRole((actor as FirmActor).role) };
  }
}
