import { Controller, Get, Patch, Post, Param, ParseUUIDPipe, Body, Query } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { InconsistenciesService, reviewContradictionSchema, updateSeveritySchema } from './inconsistencies.service.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { ZodBodyPipe } from '../../common/zod.pipe.js';

@ApiTags('Inconsistencies')
@Controller('v1/matters/:matterId/inconsistencies')
export class InconsistenciesController {
  constructor(
    private readonly service: InconsistenciesService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List inconsistencies in a matter' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Inconsistencies list' })
  async list(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Query('status') status?: string,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.list(actor, matterId, status as any ?? 'all');
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get inconsistency summary for a matter' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Summary statistics' })
  async summary(@Param('matterId', ParseUUIDPipe) matterId: string) {
    const actor = this.context.requireFirmActor();
    return this.service.summary(actor, matterId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an inconsistency' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Contradiction detail' })
  @ApiNotFoundResponse({ description: 'Not found' })
  async get(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.get(actor, matterId, id);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Review an inconsistency' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Reviewed' })
  @ApiNotFoundResponse({ description: 'Not found' })
  async review(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodBodyPipe(reviewContradictionSchema)) input: z.infer<typeof reviewContradictionSchema>,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.review(actor, matterId, id, input);
  }

  @Patch(':id/severity')
  @ApiOperation({ summary: 'Update inconsistency severity' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Updated' })
  @ApiNotFoundResponse({ description: 'Not found' })
  async updateSeverity(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodBodyPipe(updateSeveritySchema)) input: z.infer<typeof updateSeveritySchema>,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.updateSeverity(actor, matterId, id, input.severity);
  }

  @Get('kind/:kind')
  @ApiOperation({ summary: 'List inconsistencies by kind' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'kind' })
  @ApiOkResponse({ description: 'Inconsistencies by kind' })
  async listByKind(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('kind') kind: string,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.listByKind(actor, matterId, kind);
  }
}
