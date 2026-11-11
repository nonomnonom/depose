import { Controller, Get, Post, Delete, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse, ApiCreatedResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { WEBHOOK_EVENTS, WebhooksService } from './webhooks.service.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { ZodBodyPipe } from '../../common/zod.pipe.js';
import { z } from 'zod';

const createWebhookSchema = z.object({
  url: z.string().trim().min(1).max(2000).url(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1).max(WEBHOOK_EVENTS.length),
  secret: z.string().trim().min(16).max(500).optional(),
  enabled: z.boolean().optional(),
});

@ApiTags('Webhooks')
@Controller('v1/matters/:matterId/webhooks')
export class WebhooksController {
  constructor(
    private readonly service: WebhooksService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List webhooks for the firm' })
  @ApiOkResponse({ description: 'Webhooks list' })
  async listWebhooks(@Param('matterId', ParseUUIDPipe) matterId: string) {
    const actor = this.context.requireFirmActor();
    return this.service.listWebhooks(actor, matterId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a webhook' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Webhook created' })
  async createWebhook(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body(new ZodBodyPipe(createWebhookSchema)) body: z.infer<typeof createWebhookSchema>,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.createWebhook(actor, matterId, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Webhook deleted' })
  @ApiNotFoundResponse({ description: 'Webhook not found' })
  async deleteWebhook(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.deleteWebhook(actor, matterId, id);
  }

  @Get(':webhookId/deliveries')
  @ApiOperation({ summary: 'List delivery attempts for a webhook' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'webhookId', format: 'uuid' })
  @ApiOkResponse({ description: 'Deliveries list' })
  async listDeliveries(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('webhookId', ParseUUIDPipe) webhookId: string,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.listDeliveries(actor, matterId, webhookId);
  }
}
