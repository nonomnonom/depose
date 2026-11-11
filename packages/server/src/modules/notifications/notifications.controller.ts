import { Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '../../common/openapi/error.model.js';
import { ApiSessionAuth } from '../../common/openapi/session-auth.decorator.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { parseOrThrow } from '../../common/zod.pipe.js';
import {
  listNotificationsQuerySchema,
  type ListNotificationsQuery,
} from './notifications.dto.js';
import {
  NotificationListDto,
  UnreadCountDto,
} from './notifications.response.js';
import { NotificationsService } from './notifications.service.js';

@ApiTags('Notifications')
@ApiSessionAuth()
@Controller('v1/notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the current user' })
  @ApiQuery({ name: 'unreadOnly', required: false, schema: { type: 'boolean' } })
  @ApiQuery({ name: 'cursor', required: false, schema: { type: 'string' } })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', maximum: 50 } })
  @ApiOkResponse({ description: 'Notifications', type: NotificationListDto })
  async list(@Query() query: Record<string, unknown>) {
    const actor = this.context.requireFirmActor();
    const parsed: ListNotificationsQuery = parseOrThrow(listNotificationsQuerySchema, query);
    return this.notifications.list(actor, parsed);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Count unread notifications' })
  @ApiOkResponse({ description: 'Unread count', type: UnreadCountDto })
  async unreadCount() {
    const actor = this.context.requireFirmActor();
    return { count: await this.notifications.unreadCount(actor) };
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark every notification as read' })
  @ApiOkResponse({ description: 'Updated count', schema: { type: 'object' } })
  async markAllRead() {
    const actor = this.context.requireFirmActor();
    return this.notifications.markAllRead(actor);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Notification', schema: { type: 'object' } })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorEnvelopeDto })
  @ApiNotFoundResponse({ description: 'Notification not found', type: ErrorEnvelopeDto })
  async markRead(@Param('id', ParseUUIDPipe) id: string) {
    const actor = this.context.requireFirmActor();
    return { notification: await this.notifications.markRead(actor, id) };
  }
}
