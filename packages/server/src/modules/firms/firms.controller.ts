import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AllowNonMember } from '../../common/decorators/allow-non-member.decorator.js';
import { ErrorEnvelopeDto } from '../../common/openapi/error.model.js';
import { ApiSessionAuth } from '../../common/openapi/session-auth.decorator.js';
import { zodToOpenApiSchema } from '../../common/openapi/zod-schema.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { ZodBodyPipe } from '../../common/zod.pipe.js';
import { PolicyService } from '../access-control/policy.service.js';
import {
  setupFirmSchema,
  updateFirmSchema,
  type SetupFirmInput,
  type UpdateFirmInput,
} from './firms.dto.js';
import { FirmsService } from './firms.service.js';
import {
  FirmDomainsResponseDto,
  FirmResponseDto,
  FirmSetupResponseDto,
} from './firms.response.js';

@ApiTags('Firm')
@ApiSessionAuth()
@Controller('v1/firm')
export class FirmsController {
  constructor(
    private readonly firms: FirmsService,
    private readonly policy: PolicyService,
    private readonly context: RequestContextService,
  ) {}

  @Post()
  @AllowNonMember()
  @ApiOperation({
    summary: 'Create the first firm',
    description:
      'One-time bootstrap for this instance. Requires an authenticated user without a firm and self sign-up enabled. Creates the firm, its primary subdomain, and promotes the caller to admin.',
  })
  @ApiBody({ description: 'Firm setup payload', schema: zodToOpenApiSchema(setupFirmSchema) })
  @ApiCreatedResponse({ description: 'Firm created', type: FirmSetupResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid payload', type: ErrorEnvelopeDto })
  @ApiConflictResponse({
    description: 'The instance is already configured or the hostname is taken',
    type: ErrorEnvelopeDto,
  })
  async setup(@Body(new ZodBodyPipe(setupFirmSchema)) body: SetupFirmInput) {
    const actor = this.context.requireActor();
    const tenant = this.context.getTenant();
    if (!tenant) {
      throw new Error('Tenant context missing');
    }
    return this.firms.setup(actor, body, tenant);
  }

  @Get()
  @ApiOperation({ summary: 'Get the current firm' })
  @ApiOkResponse({ description: 'Current firm', type: FirmResponseDto })
  @ApiNotFoundResponse({ description: 'Firm not configured', type: ErrorEnvelopeDto })
  async current() {
    const actor = this.context.requireFirmActor();
    this.policy.assertFirm(actor, 'firm.read');
    return { firm: await this.firms.getCurrent(actor) };
  }

  @Patch()
  @ApiOperation({ summary: 'Update firm settings' })
  @ApiBody({ description: 'Fields to change', schema: zodToOpenApiSchema(updateFirmSchema) })
  @ApiOkResponse({ description: 'Updated firm', type: FirmResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid payload', type: ErrorEnvelopeDto })
  @ApiNotFoundResponse({ description: 'Firm not configured', type: ErrorEnvelopeDto })
  async update(@Body(new ZodBodyPipe(updateFirmSchema)) body: UpdateFirmInput) {
    const actor = this.context.requireFirmActor();
    this.policy.assertFirm(actor, 'firm.update');
    return { firm: await this.firms.update(actor, body) };
  }

  @Get('domains')
  @ApiOperation({ summary: 'List firm domains' })
  @ApiOkResponse({ description: 'Domains bound to the firm', type: FirmDomainsResponseDto })
  @ApiNotFoundResponse({ description: 'Firm not configured', type: ErrorEnvelopeDto })
  async domains() {
    const actor = this.context.requireFirmActor();
    this.policy.assertFirm(actor, 'firm.read');
    return { domains: await this.firms.listDomains(actor) };
  }
}
