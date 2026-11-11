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
  ApiConflictResponse,
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
import { createMcpServerSchema, type CreateMcpServerInput } from './mcp.dto.js';
import {
  McpServerListDto,
  McpServerResponseDto,
  McpTestResponseDto,
} from './mcp.response.js';
import { McpService } from './mcp.service.js';

@ApiTags('MCP')
@ApiSessionAuth()
@Controller('v1/firm/mcp/servers')
export class McpController {
  constructor(
    private readonly mcp: McpService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List MCP servers' })
  @ApiOkResponse({ description: 'Servers', type: McpServerListDto })
  async list() {
    const actor = this.context.requireFirmActor();
    return { items: await this.mcp.list(actor) };
  }

  @Post()
  @ApiOperation({ summary: 'Register an MCP server' })
  @ApiBody({ schema: zodToOpenApiSchema(createMcpServerSchema) })
  @ApiCreatedResponse({ description: 'Server registered', type: McpServerResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid payload', type: ErrorEnvelopeDto })
  @ApiConflictResponse({ description: 'Name already used', type: ErrorEnvelopeDto })
  async create(
    @Body(new ZodBodyPipe(createMcpServerSchema)) body: CreateMcpServerInput,
  ) {
    const actor = this.context.requireFirmActor();
    return { server: await this.mcp.create(actor, body) };
  }

  @Post(':id/test')
  @ApiOperation({
    summary: 'Connect and list tools',
    description: 'Performs an MCP initialize and tools/list request against the server URL.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Connection result', type: McpTestResponseDto })
  @ApiNotFoundResponse({ description: 'Server not found', type: ErrorEnvelopeDto })
  async test(@Param('id', ParseUUIDPipe) id: string) {
    const actor = this.context.requireFirmActor();
    return this.mcp.test(actor, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove an MCP server' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Server removed', schema: { type: 'object' } })
  @ApiNotFoundResponse({ description: 'Server not found', type: ErrorEnvelopeDto })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const actor = this.context.requireFirmActor();
    return this.mcp.remove(actor, id);
  }
}
