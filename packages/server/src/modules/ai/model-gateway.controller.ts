import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import {
  createProviderSchema,
  updateProviderSchema,
  type CreateProviderInput,
  type UpdateProviderInput,
} from './model-gateway.dto.js';
import {
  AiProviderListDto,
  AiProviderResponseDto,
  AiProviderTestDto,
} from './model-gateway.response.js';
import { ModelGatewayService } from './model-gateway.service.js';

@ApiTags('Firm AI')
@ApiSessionAuth()
@Controller('v1/firm/ai/providers')
export class ModelGatewayController {
  constructor(
    private readonly gateway: ModelGatewayService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the firm AI provider connections (keys masked)' })
  @ApiOkResponse({ description: 'Provider connections', type: AiProviderListDto })
  async list() {
    const actor = this.context.requireFirmActor();
    return { items: await this.gateway.list(actor) };
  }

  @Post()
  @ApiOperation({ summary: 'Add a BYOK completion provider' })
  @ApiBody({ schema: zodToOpenApiSchema(createProviderSchema) })
  @ApiCreatedResponse({ description: 'Provider created', type: AiProviderResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid payload', type: ErrorEnvelopeDto })
  @ApiConflictResponse({ description: 'Label already used', type: ErrorEnvelopeDto })
  async create(@Body(new ZodBodyPipe(createProviderSchema)) body: CreateProviderInput) {
    const actor = this.context.requireFirmActor();
    return { provider: await this.gateway.create(actor, body) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a provider connection' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ schema: zodToOpenApiSchema(updateProviderSchema) })
  @ApiOkResponse({ description: 'Provider updated', type: AiProviderResponseDto })
  @ApiNotFoundResponse({ description: 'Provider not found', type: ErrorEnvelopeDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodBodyPipe(updateProviderSchema)) body: UpdateProviderInput,
  ) {
    const actor = this.context.requireFirmActor();
    return { provider: await this.gateway.update(actor, id, body) };
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test credentials and refresh the model list' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Test result', type: AiProviderTestDto })
  @ApiNotFoundResponse({ description: 'Provider not found', type: ErrorEnvelopeDto })
  async test(@Param('id', ParseUUIDPipe) id: string) {
    const actor = this.context.requireFirmActor();
    return this.gateway.test(actor, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a provider connection' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Provider removed', schema: { type: 'object' } })
  @ApiNotFoundResponse({ description: 'Provider not found', type: ErrorEnvelopeDto })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const actor = this.context.requireFirmActor();
    return this.gateway.remove(actor, id);
  }
}
