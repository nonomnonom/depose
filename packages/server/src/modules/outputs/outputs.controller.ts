import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
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
