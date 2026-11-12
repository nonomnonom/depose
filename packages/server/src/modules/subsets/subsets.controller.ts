import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
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
import {
  createSubsetSchema,
  setSubsetDocumentsSchema,
  subsetFactsQuerySchema,
  subsetFromSourcesSchema,
  updateSubsetSchema,
  type CreateSubsetInput,
  type SetSubsetDocumentsInput,
  type SubsetFactsQuery,
  type SubsetFromSourcesInput,
  type UpdateSubsetInput,
} from './subsets.dto.js';
import {
  SubsetFactListDto,
  SubsetListDto,
  SubsetResponseDto,
} from './subsets.response.js';
import { SubsetsService } from './subsets.service.js';

@ApiTags('Subsets')
@ApiSessionAuth()
@Controller('v1/matters/:matterId/subsets')
export class SubsetsController {
  constructor(
    private readonly subsets: SubsetsService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List subsets in a matter' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Subsets', type: SubsetListDto })
  async list(@Param('matterId', ParseUUIDPipe) matterId: string) {
    return this.subsets.list(this.context.requireFirmActor(), matterId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a subset from documents' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiBody({ schema: zodToOpenApiSchema(createSubsetSchema) })
  @ApiCreatedResponse({ description: 'Subset created', type: SubsetResponseDto })
  async create(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body(new ZodBodyPipe(createSubsetSchema)) body: CreateSubsetInput,
  ) {
    return this.subsets.create(this.context.requireFirmActor(), matterId, body);
  }

  @Post('from-sources')
  @ApiOperation({ summary: 'Create a subset from citations or documents' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiBody({ schema: zodToOpenApiSchema(subsetFromSourcesSchema) })
  @ApiCreatedResponse({ description: 'Subset created', type: SubsetResponseDto })
  async fromSources(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body(new ZodBodyPipe(subsetFromSourcesSchema)) body: SubsetFromSourcesInput,
  ) {
    return this.subsets.fromSources(this.context.requireFirmActor(), matterId, body);
  }

  @Get(':subsetId')
  @ApiOperation({ summary: 'Get a subset' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'subsetId', format: 'uuid' })
  @ApiOkResponse({ description: 'Subset', type: SubsetResponseDto })
  @ApiNotFoundResponse({ description: 'Subset not found', type: ErrorEnvelopeDto })
  async get(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('subsetId', ParseUUIDPipe) subsetId: string,
  ) {
    return this.subsets.get(this.context.requireFirmActor(), matterId, subsetId);
  }

  @Patch(':subsetId')
  @ApiOperation({ summary: 'Rename a subset or change its issue mode' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'subsetId', format: 'uuid' })
  @ApiBody({ schema: zodToOpenApiSchema(updateSubsetSchema) })
  @ApiOkResponse({ description: 'Subset updated' })
  async update(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('subsetId', ParseUUIDPipe) subsetId: string,
    @Body(new ZodBodyPipe(updateSubsetSchema)) body: UpdateSubsetInput,
  ) {
    return this.subsets.update(
      this.context.requireFirmActor(),
      matterId,
      subsetId,
      body,
    );
  }

  @Put(':subsetId/documents')
  @ApiOperation({ summary: 'Replace the documents in a subset' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'subsetId', format: 'uuid' })
  @ApiBody({ schema: zodToOpenApiSchema(setSubsetDocumentsSchema) })
  @ApiOkResponse({ description: 'Documents set' })
  async setDocuments(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('subsetId', ParseUUIDPipe) subsetId: string,
    @Body(new ZodBodyPipe(setSubsetDocumentsSchema)) body: SetSubsetDocumentsInput,
  ) {
    return this.subsets.setDocuments(
      this.context.requireFirmActor(),
      matterId,
      subsetId,
      body,
    );
  }

  @Get(':subsetId/facts')
  @ApiOperation({ summary: 'List facts in a subset' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'subsetId', format: 'uuid' })
  @ApiQuery({ name: 'includeManual', required: false, enum: ['true', 'false'] })
  @ApiQuery({ name: 'cursor', required: false, schema: { type: 'string' } })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', maximum: 100 } })
  @ApiOkResponse({ description: 'Subset facts', type: SubsetFactListDto })
  async facts(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('subsetId', ParseUUIDPipe) subsetId: string,
    @Query() query: Record<string, unknown>,
  ) {
    const parsed: SubsetFactsQuery = parseOrThrow(subsetFactsQuerySchema, query);
    return this.subsets.facts(
      this.context.requireFirmActor(),
      matterId,
      subsetId,
      parsed,
    );
  }

  @Delete(':subsetId')
  @ApiOperation({ summary: 'Delete a subset' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'subsetId', format: 'uuid' })
  @ApiOkResponse({ description: 'Subset deleted' })
  async remove(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('subsetId', ParseUUIDPipe) subsetId: string,
  ) {
    return this.subsets.remove(this.context.requireFirmActor(), matterId, subsetId);
  }
}
