import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse } from '@nestjs/swagger';
import { OutputsService } from './outputs.service.js';
import { RequestContextService } from '../../common/request-context.service.js';

@ApiTags('Outputs')
@Controller('v1/matters/:matterId/outputs')
export class OutputsController {
  constructor(
    private readonly service: OutputsService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List outputs in a matter' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Outputs list' })
  async list(@Param('matterId', ParseUUIDPipe) matterId: string) {
    const actor = this.context.requireFirmActor();
    return this.service.listOutputs(actor, matterId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a draft output' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  async create(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body() body: { kind: string; title: string; subsetId?: string },
  ) {
    return this.service.create(this.context.requireFirmActor(), matterId, body);
  }

  @Post(':id/generate')
  @ApiOperation({ summary: 'Generate the next cited version of an output' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async generate(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.generate(this.context.requireFirmActor(), matterId, id);
  }

  @Post(':id/finalize')
  @ApiOperation({ summary: 'Finalize the current output version' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async finalize(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.finalize(this.context.requireFirmActor(), matterId, id);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export the current output as Markdown' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async export(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.exportOutput(this.context.requireFirmActor(), matterId, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an output and its current version' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Output detail' })
  async get(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.getOutput(actor, matterId, id);
  }
}
