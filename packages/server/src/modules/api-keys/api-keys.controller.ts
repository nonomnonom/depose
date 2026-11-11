import { Controller, Get, Post, Delete, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse, ApiCreatedResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { ZodBodyPipe } from '../../common/zod.pipe.js';
import { z } from 'zod';

const createKeySchema = z.object({
  name: z.string().trim().min(1).max(100),
  scopes: z.array(z.string().trim().min(1).max(50)).optional(),
});

@ApiTags('API Keys')
@Controller('v1/api-keys')
export class ApiKeysController {
  constructor(
    private readonly service: ApiKeysService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List API keys for the firm' })
  @ApiOkResponse({ description: 'API keys list' })
  async list() {
    const actor = this.context.requireFirmActor();
    return this.service.list(actor);
  }

  @Post()
  @ApiOperation({ summary: 'Create an API key' })
  @ApiCreatedResponse({ description: 'API key created' })
  async create(
    @Body(new ZodBodyPipe(createKeySchema)) body: z.infer<typeof createKeySchema>,
  ) {
    const actor = this.context.requireFirmActor();
    return this.service.create(actor, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'API key revoked' })
  @ApiNotFoundResponse({ description: 'API key not found' })
  async revoke(@Param('id', ParseUUIDPipe) id: string) {
    const actor = this.context.requireFirmActor();
    return this.service.revoke(actor, id);
  }
}
