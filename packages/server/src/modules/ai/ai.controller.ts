import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '../../common/openapi/error.model.js';
import { ApiSessionAuth } from '../../common/openapi/session-auth.decorator.js';
import { zodToOpenApiSchema } from '../../common/openapi/zod-schema.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { ZodBodyPipe } from '../../common/zod.pipe.js';
import {
  createThreadSchema,
  sendMessageSchema,
  type CreateThreadInput,
  type SendMessageInput,
} from './ai.dto.js';
import {
  AiMessageResponseDto,
  AiThreadDetailDto,
  AiThreadListDto,
  AiThreadDto,
} from './ai.response.js';
import { AiService } from './ai.service.js';

@ApiTags('Dep AI')
@ApiSessionAuth()
@Controller('v1/matters/:matterId/ai/threads')
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List your AI threads in a matter' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Threads', type: AiThreadListDto })
  async list(@Param('matterId', ParseUUIDPipe) matterId: string) {
    const actor = this.context.requireFirmActor();
    return { items: await this.ai.listThreads(actor, matterId) };
  }

  @Post()
  @ApiOperation({ summary: 'Start an AI conversation' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiBody({ schema: zodToOpenApiSchema(createThreadSchema) })
  @ApiCreatedResponse({ description: 'Thread created', type: AiThreadDto })
  async create(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body(new ZodBodyPipe(createThreadSchema)) body: CreateThreadInput,
  ) {
    const actor = this.context.requireFirmActor();
    return this.ai.createThread(actor, matterId, body.title);
  }

  @Get(':threadId')
  @ApiOperation({ summary: 'Get a thread and its messages' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'threadId', format: 'uuid' })
  @ApiOkResponse({ description: 'Thread', type: AiThreadDetailDto })
  @ApiNotFoundResponse({ description: 'Thread not found', type: ErrorEnvelopeDto })
  async get(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('threadId', ParseUUIDPipe) threadId: string,
  ) {
    const actor = this.context.requireFirmActor();
    return this.ai.getThread(actor, matterId, threadId);
  }

  @Post(':threadId/messages')
  @ApiOperation({
    summary: 'Ask Dep AI',
    description:
      'Runs the grounded retrieval agent over confirmed facts and returns the answer with citations and tool calls.',
  })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'threadId', format: 'uuid' })
  @ApiBody({ schema: zodToOpenApiSchema(sendMessageSchema) })
  @ApiCreatedResponse({ description: 'User and assistant messages', type: AiMessageResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid message', type: ErrorEnvelopeDto })
  async send(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @Body(new ZodBodyPipe(sendMessageSchema)) body: SendMessageInput,
  ) {
    const actor = this.context.requireFirmActor();
    return this.ai.sendMessage(actor, matterId, threadId, body.content);
  }

  @Delete(':threadId')
  @ApiOperation({ summary: 'Delete a thread' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'threadId', format: 'uuid' })
  @ApiOkResponse({ description: 'Thread deleted', schema: { type: 'object' } })
  async remove(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('threadId', ParseUUIDPipe) threadId: string,
  ) {
    const actor = this.context.requireFirmActor();
    return this.ai.deleteThread(actor, matterId, threadId);
  }
}
