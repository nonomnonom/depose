import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { RealtimeService } from './realtime.service.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { ZodBodyPipe } from '../../common/zod.pipe.js';

const createSessionSchema = z
  .object({
    language: z.string().trim().min(1).max(32).optional(),
    sensitivity: z.enum(['calm', 'balanced', 'strict']).optional(),
  })
  .strict();

const recordLineSchema = z
  .object({
    speaker: z.string().trim().max(120).optional(),
    text: z.string().trim().min(1).max(4_000),
  })
  .strict();

const reviewAlertSchema = z
  .object({
    status: z.enum(['open', 'accepted', 'dismissed']),
    note: z.string().trim().max(1_000).optional(),
  })
  .strict();

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

  @Post('sessions')
  @ApiOperation({ summary: 'Start a live checking session' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Created session' })
  async createSession(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body(new ZodBodyPipe(createSessionSchema)) input: z.infer<typeof createSessionSchema>,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.createSession(actor, matterId, input);
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

  @Patch('sessions/:id/end')
  @ApiOperation({ summary: 'End a realtime session' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Ended session' })
  @ApiNotFoundResponse({ description: 'Session not found' })
  async endSession(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.endSession(actor, matterId, id);
  }

  @Get('sessions/:sessionId/lines')
  @ApiOperation({ summary: 'List transcript lines for a session' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiOkResponse({ description: 'Lines list' })
  async listLines(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.listLines(actor, matterId, sessionId);
  }

  @Post('sessions/:sessionId/lines')
  @ApiOperation({
    summary: 'Record a transcript line and check it against the record',
    description:
      'Stores the line before checking. Alerts are created for statements the record contradicts, is silent on, or cannot resolve.',
  })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiOkResponse({ description: 'Stored line with its check and alerts' })
  async recordLine(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body(new ZodBodyPipe(recordLineSchema)) input: z.infer<typeof recordLineSchema>,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.recordLine(actor, matterId, sessionId, input);
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

  @Patch('sessions/:sessionId/alerts/:alertId')
  @ApiOperation({ summary: 'Review a live alert' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiParam({ name: 'alertId', format: 'uuid' })
  @ApiOkResponse({ description: 'Reviewed alert' })
  @ApiNotFoundResponse({ description: 'Alert not found' })
  async reviewAlert(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('alertId', ParseUUIDPipe) alertId: string,
    @Body(new ZodBodyPipe(reviewAlertSchema)) input: z.infer<typeof reviewAlertSchema>,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.reviewAlert(actor, matterId, sessionId, alertId, input);
  }
}
