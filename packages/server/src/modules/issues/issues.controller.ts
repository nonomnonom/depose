import { Controller, Get, Post, Patch, Param, ParseUUIDPipe, Body, Delete } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse, ApiNotFoundResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { IssuesService, createIssueSchema, updateIssueStatusSchema } from './issues.service.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { ZodBodyPipe } from '../../common/zod.pipe.js';

@ApiTags('Issues')
@Controller('v1/matters/:matterId/issues')
export class IssuesController {
  constructor(
    private readonly service: IssuesService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List issues in a matter' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Issues list' })
  async list(@Param('matterId', ParseUUIDPipe) matterId: string) {
    const actor = this.context.requireFirmActor();
    return this.service.list(actor, matterId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an issue' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Issue detail' })
  @ApiNotFoundResponse({ description: 'Issue not found' })
  async get(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.get(actor, matterId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an issue' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Created issue' })
  async create(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body(new ZodBodyPipe(createIssueSchema)) input: z.infer<typeof createIssueSchema>,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.create(actor, matterId, input);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update issue status' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Updated issue' })
  @ApiNotFoundResponse({ description: 'Issue not found' })
  async updateStatus(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodBodyPipe(updateIssueStatusSchema)) input: z.infer<typeof updateIssueStatusSchema>,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.updateStatus(actor, matterId, id, input.status);
  }

  @Get(':id/facts')
  @ApiOperation({ summary: 'List facts linked to an issue' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Linked facts' })
  async getFacts(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.getFacts(actor, matterId, id);
  }

  @Post(':id/facts/:factId')
  @ApiOperation({ summary: 'Link a fact to an issue' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'factId', format: 'uuid' })
  @ApiOkResponse({ description: 'Fact linked' })
  @ApiBadRequestResponse({ description: 'Already linked' })
  async addFact(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('factId', ParseUUIDPipe) factId: string,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.addFactToIssue(actor, matterId, id, factId);
  }

  @Delete(':id/facts/:factId')
  @ApiOperation({ summary: 'Unlink a fact from an issue' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'factId', format: 'uuid' })
  @ApiOkResponse({ description: 'Fact unlinked' })
  @ApiNotFoundResponse({ description: 'Not linked' })
  async removeFact(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('factId', ParseUUIDPipe) factId: string,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.removeFactFromIssue(actor, matterId, id, factId);
  }
}
