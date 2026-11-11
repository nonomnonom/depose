import {
  Body,
  Controller,
  Get,
  Patch,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '../../common/openapi/error.model.js';
import { ApiSessionAuth } from '../../common/openapi/session-auth.decorator.js';
import { zodToOpenApiSchema } from '../../common/openapi/zod-schema.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { ZodBodyPipe } from '../../common/zod.pipe.js';
import { PolicyService } from '../access-control/policy.service.js';
import { updateFirmSettingsSchema, type UpdateFirmSettingsInput } from './firm-settings.dto.js';
import { FirmSettingsService } from './firm-settings.service.js';
import { FirmSettingsResponseDto } from './firm-settings.response.js';

@ApiTags('Firm Settings')
@ApiSessionAuth()
@Controller('v1/firm/settings')
export class FirmSettingsController {
  constructor(
    private readonly settings: FirmSettingsService,
    private readonly policy: PolicyService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get effective firm settings' })
  @ApiOkResponse({ description: 'Firm settings', type: FirmSettingsResponseDto })
  @ApiNotFoundResponse({ description: 'Firm not found', type: ErrorEnvelopeDto })
  @ApiBadRequestResponse({ description: 'Invalid settings schema', type: ErrorEnvelopeDto })
  async get() {
    const actor = this.context.requireFirmActor();
    this.policy.assertFirm(actor, 'firm.read');
    return { settings: await this.settings.get(actor.firmId) };
  }

  @Patch()
  @ApiOperation({ summary: 'Update firm settings' })
  @ApiBody({ description: 'Settings fields to change', schema: zodToOpenApiSchema(updateFirmSettingsSchema) })
  @ApiOkResponse({ description: 'Updated firm settings', type: FirmSettingsResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid settings payload', type: ErrorEnvelopeDto })
  @ApiNotFoundResponse({ description: 'Firm not found', type: ErrorEnvelopeDto })
  async update(@Body(new ZodBodyPipe(updateFirmSettingsSchema)) body: UpdateFirmSettingsInput) {
    const actor = this.context.requireFirmActor();
    this.policy.assertFirm(actor, 'firm.update');
    return { settings: await this.settings.update(actor.firmId, body, actor) };
  }

}
