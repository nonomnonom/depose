import {
  Body,
  Controller,
  Get,
  Patch,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
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
import {
  updateUserPreferencesSchema,
  type UpdateUserPreferencesInput,
} from './user-preferences.dto.js';
import { UserPreferencesService } from './user-preferences.service.js';
import { UserPreferencesResponseDto } from './user-preferences.response.js';

@ApiTags('User Preferences')
@ApiSessionAuth()
@Controller('v1/me/preferences')
export class UserPreferencesController {
  constructor(
    private readonly preferences: UserPreferencesService,
    private readonly policy: PolicyService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get current user preferences' })
  @ApiOkResponse({ description: 'User preferences', type: UserPreferencesResponseDto })
  async get() {
    const actor = this.context.requireActor();
    return { preferences: await this.preferences.get(actor.userId) };
  }

  @Patch()
  @ApiOperation({ summary: 'Update current user preferences' })
  @ApiBody({
    description: 'Preference fields to change',
    schema: zodToOpenApiSchema(updateUserPreferencesSchema),
  })
  @ApiOkResponse({ description: 'Updated user preferences', type: UserPreferencesResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid preferences payload', type: ErrorEnvelopeDto })
  async update(@Body(new ZodBodyPipe(updateUserPreferencesSchema)) body: UpdateUserPreferencesInput) {
    const actor = this.context.requireActor();
    return { preferences: await this.preferences.update(actor.userId, body) };
  }

}
