import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '../../common/openapi/error.model.js';
import { ApiSessionAuth } from '../../common/openapi/session-auth.decorator.js';
import { zodToOpenApiSchema } from '../../common/openapi/zod-schema.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { ZodBodyPipe } from '../../common/zod.pipe.js';
import { PolicyService } from '../access-control/policy.service.js';
import {
  updateMatterSettingsSchema,
  type UpdateMatterSettingsInput,
} from './matter-settings.dto.js';
import { MatterSettingsService } from './matter-settings.service.js';
import { MatterSettingsResponseDto } from './matter-settings.response.js';

@ApiTags('Matter Settings')
@ApiSessionAuth()
@Controller('v1/matters/:matterId/settings')
export class MatterSettingsController {
  constructor(
    private readonly settings: MatterSettingsService,
    private readonly policy: PolicyService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get effective matter settings' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Matter settings', type: MatterSettingsResponseDto })
  @ApiNotFoundResponse({ description: 'Matter not found', type: ErrorEnvelopeDto })
  async get(@Param('matterId', ParseUUIDPipe) matterId: string) {
    const actor = this.context.requireFirmActor();
    await this.policy.assertMatter(actor, 'matter.read', matterId);
    return { settings: await this.settings.get(actor, matterId) };
  }

  @Patch()
  @ApiOperation({ summary: 'Update matter settings' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiBody({
    description: 'Settings fields to change',
    schema: zodToOpenApiSchema(updateMatterSettingsSchema),
  })
  @ApiOkResponse({ description: 'Updated matter settings', type: MatterSettingsResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid settings payload', type: ErrorEnvelopeDto })
  @ApiNotFoundResponse({ description: 'Matter not found', type: ErrorEnvelopeDto })
  async update(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body(new ZodBodyPipe(updateMatterSettingsSchema)) body: UpdateMatterSettingsInput,
  ) {
    const actor = this.context.requireFirmActor();
    await this.policy.assertMatter(actor, 'matter.update', matterId);
    return { settings: await this.settings.update(actor, matterId, body) };
  }

}
