import { Controller, Get, Post, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse, ApiCreatedResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { EntitiesService } from './entities.service.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { ZodBodyPipe } from '../../common/zod.pipe.js';
import { z } from 'zod';

const createEntitySchema = z
  .object({
    canonicalName: z.string().trim().min(1).max(200),
    normalizedName: z.string().trim().min(1).max(200).optional(),
    type: z.string().trim().min(1).max(100),
    description: z.string().trim().max(2000).optional(),
  })
  .strict();

const addAliasSchema = z.object({
  alias: z.string().trim().min(1).max(200),
});

@ApiTags('Entities')
@Controller('v1/matters/:matterId/entities')
export class EntitiesController {
  constructor(
    private readonly service: EntitiesService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List entities in a matter' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Entities list' })
  async list(@Param('matterId', ParseUUIDPipe) matterId: string) {
    const actor = this.context.requireFirmActor();
    return this.service.list(actor, matterId);
  }

  @Post()
  @ApiOperation({ summary: 'Create an entity' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Entity created' })
  async create(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body(new ZodBodyPipe(createEntitySchema)) body: z.infer<typeof createEntitySchema>,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.create(actor, matterId, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an entity' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Entity detail' })
  @ApiNotFoundResponse({ description: 'Entity not found' })
  async get(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.get(actor, matterId, id);
  }

  @Post(':id/aliases')
  @ApiOperation({ summary: 'Add an alias to an entity' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Alias added' })
  async addAlias(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodBodyPipe(addAliasSchema)) body: z.infer<typeof addAliasSchema>,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.addAlias(actor, matterId, id, body.alias);
  }
}
