import {
  Body,
  Controller,
  Get,
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
import {
  createMatterSchema,
  listMattersQuerySchema,
  matterStatusValues,
  updateMatterSchema,
  type CreateMatterInput,
  type UpdateMatterInput,
} from './matters.dto.js';
import { MatterListDto, MatterResponseDto } from './matters.response.js';
import { MattersService } from './matters.service.js';

@ApiTags('Matters')
@ApiSessionAuth()
@Controller('v1/matters')
export class MattersController {
  constructor(
    private readonly matters: MattersService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List matters',
    description:
      'Cursor paginated and ordered by last update, newest first. Admins see every matter in the firm; other roles see only matters they belong to.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: matterStatusValues,
    description: 'Filter by matter status',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Case-insensitive search on the matter name',
    schema: { type: 'string', maxLength: 200 },
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Opaque cursor returned as nextCursor by the previous page',
    schema: { type: 'string' },
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Page size, default 20, maximum 100',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  })
  @ApiOkResponse({ description: 'Page of matters', type: MatterListDto })
  @ApiBadRequestResponse({ description: 'Invalid query', type: ErrorEnvelopeDto })
  async list(@Query() query: Record<string, unknown>) {
    const actor = this.context.requireFirmActor();
    const parsed = parseOrThrow(listMattersQuerySchema, query);
    return this.matters.list(actor, parsed);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a matter',
    description:
      'The caller becomes a full member and, unless another lead is given, the lead lawyer.',
  })
  @ApiBody({ description: 'New matter', schema: zodToOpenApiSchema(createMatterSchema) })
  @ApiCreatedResponse({ description: 'Matter created', type: MatterResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid payload', type: ErrorEnvelopeDto })
  async create(@Body(new ZodBodyPipe(createMatterSchema)) body: CreateMatterInput) {
    const actor = this.context.requireFirmActor();
    return { matter: await this.matters.create(actor, body) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a matter' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Matter id' })
  @ApiOkResponse({ description: 'Matter', type: MatterResponseDto })
  @ApiBadRequestResponse({ description: 'Matter id is not a UUID', type: ErrorEnvelopeDto })
  @ApiNotFoundResponse({ description: 'Matter not found', type: ErrorEnvelopeDto })
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const actor = this.context.requireFirmActor();
    return { matter: await this.matters.get(actor, id) };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a matter',
    description:
      'Field changes and status transitions in one call. Allowed transitions are active/closed/archived per spec 05; anything else returns 409.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Matter id' })
  @ApiBody({ description: 'Fields to change', schema: zodToOpenApiSchema(updateMatterSchema) })
  @ApiOkResponse({ description: 'Updated matter', type: MatterResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid payload or matter id',
    type: ErrorEnvelopeDto,
  })
  @ApiNotFoundResponse({ description: 'Matter not found', type: ErrorEnvelopeDto })
  @ApiConflictResponse({ description: 'Invalid status transition', type: ErrorEnvelopeDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodBodyPipe(updateMatterSchema)) body: UpdateMatterInput,
  ) {
    const actor = this.context.requireFirmActor();
    return { matter: await this.matters.update(actor, id, body) };
  }
}
