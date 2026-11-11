import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { RealtimeService } from './realtime.service.js';
import { RequestContextService } from '../../common/request-context.service.js';

@ApiTags('Realtime')
@Controller('v1/matters/:matterId/realtime')
export class RealtimeController {
  constructor(
    private readonly service: RealtimeService,
    private readonly context: RequestContextService,
  ) {}

  @Get('sessions')
  @ApiOperation({ summary: 'List realtime sessions in a matter' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Sessions list' })
  async listSessions(@Param('matterId', ParseUUIDPipe) matterId: string) {
    const actor = this.context.requireFirmActor();
    return this.service.listSessions(actor, matterId);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get a realtime session' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Session detail' })
  @ApiNotFoundResponse({ description: 'Session not found' })
  async getSession(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.getSession(actor, matterId, id);
  }

  @Get('sessions/:sessionId/alerts')
  @ApiOperation({ summary: 'List alerts for a session' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiOkResponse({ description: 'Alerts list' })
  async listAlerts(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.listAlerts(actor, matterId, sessionId);
  }
}
