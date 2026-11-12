import { Controller, Get, Post, Param, ParseUUIDPipe, Body, Query } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse } from '@nestjs/swagger';
import { RelevanceService, assignRelevanceSchema, bulkAssignRelevanceSchema } from './relevance.service.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { ZodBodyPipe } from '../../common/zod.pipe.js';

@ApiTags('Relevance')
@Controller('v1/matters/:matterId/relevance')
export class RelevanceController {
  constructor(
    private readonly service: RelevanceService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List relevance assignments in a matter' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Relevance assignments' })
  async list(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Query('scopeType') scopeType?: string,
    @Query('scopeId') scopeId?: string,
  ) {
    const actor = this.context.requireFirmActor();
    const scope = scopeType === 'matter' || scopeType === 'subset' ? scopeType : undefined;
    return this.service.list(actor, matterId, scope, scopeId);
  }

  @Get('fact/:factId')
  @ApiOperation({ summary: 'Get relevance for a fact' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'factId', format: 'uuid' })
  @ApiOkResponse({ description: 'Relevance assignments' })
  async getForFact(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('factId', ParseUUIDPipe) factId: string,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.getForFact(actor, matterId, factId);
  }

  @Post('classify')
  @ApiOperation({ summary: 'Classify facts against open matter issues' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  async classify(@Param('matterId', ParseUUIDPipe) matterId: string) {
    return this.service.classify(this.context.requireFirmActor(), matterId);
  }

  @Post()
  @ApiOperation({ summary: 'Assign relevance to a fact' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Relevance assigned' })
  async assign(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body(new ZodBodyPipe(assignRelevanceSchema)) input: z.infer<typeof assignRelevanceSchema>,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.assign(actor, matterId, input);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk assign relevance to facts' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Relevance assigned' })
  async bulkAssign(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body(new ZodBodyPipe(bulkAssignRelevanceSchema)) input: z.infer<typeof bulkAssignRelevanceSchema>,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.bulkAssign(actor, matterId, input);
  }

  @Get('by-labels')
  @ApiOperation({ summary: 'Get relevance by labels' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Relevance assignments' })
  async getByLabels(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Query('labels') labels: string,
  ) {
    const actor = this.context.requireFirmActor();
    const labelArray = (labels || '')
      .split(',')
      .filter(Boolean) as Parameters<RelevanceService['getByLabels']>[2];
    return this.service.getByLabels(actor, matterId, labelArray);
  }
}
