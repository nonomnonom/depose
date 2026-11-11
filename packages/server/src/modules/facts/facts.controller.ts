import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '../../common/openapi/error.model.js';
import { ApiSessionAuth } from '../../common/openapi/session-auth.decorator.js';
import { zodToOpenApiSchema } from '../../common/openapi/zod-schema.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { parseOrThrow, ZodBodyPipe } from '../../common/zod.pipe.js';
import { ExtractionService } from '../extraction/extraction.service.js';
import {
  createFactSchema,
  factStatusValues,
  listFactsQuerySchema,
  updateFactSchema,
  type CreateFactInput,
  type ListFactsQuery,
  type UpdateFactInput,
} from './facts.dto.js';
import { extractFactsSchema } from '../extraction/extraction.dto.js';
import type { ExtractFactsInput } from '../extraction/extraction.dto.js';
import {
  FactDetailResponseDto,
  FactListDto,
  FactResponseDto,
} from './facts.response.js';
import { FactsService } from './facts.service.js';

@ApiTags('Facts')
@ApiSessionAuth()
@Controller('v1/matters/:matterId/facts')
export class FactsController {
  constructor(
    private readonly facts: FactsService,
    private readonly extraction: ExtractionService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List facts in a matter' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiQuery({ name: 'status', required: false, enum: factStatusValues })
  @ApiQuery({ name: 'q', required: false, schema: { type: 'string' } })
  @ApiQuery({ name: 'cursor', required: false, schema: { type: 'string' } })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', maximum: 100 } })
  @ApiOkResponse({ description: 'Facts', type: FactListDto })
  async list(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Query() query: Record<string, unknown>,
  ) {
    const actor = this.context.requireFirmActor();
    const parsed: ListFactsQuery = parseOrThrow(listFactsQuerySchema, query);
    return this.facts.list(actor, matterId, parsed);
  }

  @Post('extract')
  @HttpCode(202)
  @ApiOperation({
    summary: 'Run fact extraction',
    description:
      'Queues the fact extraction pipeline for one document or every document in the matter. Returns job ids; poll GET /v1/jobs/:jobId for progress.',
  })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiBody({ schema: zodToOpenApiSchema(extractFactsSchema) })
  @ApiOkResponse({ description: 'Accepted' })
  async extract(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body(new ZodBodyPipe(extractFactsSchema)) body: ExtractFactsInput,
  ) {
    const actor = this.context.requireFirmActor();
    return this.extraction.request(actor, matterId, body);
  }

  @Post()
  @ApiOperation({ summary: 'Add a manual fact' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiBody({ schema: zodToOpenApiSchema(createFactSchema) })
  @ApiCreatedResponse({ description: 'Fact created', type: FactResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid payload or source', type: ErrorEnvelopeDto })
  async create(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body(new ZodBodyPipe(createFactSchema)) body: CreateFactInput,
  ) {
    const actor = this.context.requireFirmActor();
    return { fact: await this.facts.create(actor, matterId, body) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a fact with its sources' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Fact', type: FactDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Fact not found', type: ErrorEnvelopeDto })
  async get(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const actor = this.context.requireFirmActor();
    return { fact: await this.facts.get(actor, matterId, id) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a proposed fact' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ schema: zodToOpenApiSchema(updateFactSchema) })
  @ApiOkResponse({ description: 'Updated fact', type: FactResponseDto })
  @ApiConflictResponse({ description: 'Confirmed facts are immutable', type: ErrorEnvelopeDto })
  async update(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodBodyPipe(updateFactSchema)) body: UpdateFactInput,
  ) {
    const actor = this.context.requireFirmActor();
    return { fact: await this.facts.update(actor, matterId, id, body) };
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm a proposed fact' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Confirmed fact', type: FactResponseDto })
  async confirm(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const actor = this.context.requireFirmActor();
    return { fact: await this.facts.confirm(actor, matterId, id) };
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a fact' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Rejected fact', type: FactResponseDto })
  async reject(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const actor = this.context.requireFirmActor();
    return { fact: await this.facts.reject(actor, matterId, id) };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a fact' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Fact deleted', schema: { type: 'object' } })
  @ApiNotFoundResponse({ description: 'Fact not found', type: ErrorEnvelopeDto })
  async remove(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const actor = this.context.requireFirmActor();
    return this.facts.remove(actor, matterId, id);
  }
}
