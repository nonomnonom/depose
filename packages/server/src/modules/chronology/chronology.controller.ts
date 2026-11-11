import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiSessionAuth } from '../../common/openapi/session-auth.decorator.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { parseOrThrow } from '../../common/zod.pipe.js';
import { ChronologyTimelineDto } from './chronology.dto.js';
import { ChronologyService } from './chronology.service.js';
import type { ChronologyQuery } from './chronology.dto.js';
import { chronologyQuerySchema } from './chronology.dto.js';

@ApiTags('Chronology')
@ApiSessionAuth()
@Controller('v1/matters/:matterId/chronology')
export class ChronologyController {
  constructor(
    private readonly chronology: ChronologyService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Matter chronology timeline',
    description:
      'Ordered, dated confirmed facts for a matter, with an undated count. A server-side search is optional via q.',
  })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiQuery({ name: 'q', required: false, schema: { type: 'string', maxLength: 200 } })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', maximum: 100 } })
  @ApiQuery({ name: 'hasDateStart', required: false, schema: { type: 'string', enum: ['true', 'false'] } })
  @ApiOkResponse({ description: 'Chronology timeline', type: ChronologyTimelineDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Not allowed to read this matter' })
  @ApiNotFoundResponse({ description: 'Matter not found' })
  async timeline(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Query() query: Record<string, unknown>,
  ) {
    const actor = this.context.requireFirmActor();
    const parsed: ChronologyQuery = parseOrThrow(chronologyQuerySchema, query);
    return this.chronology.timeline(actor, matterId, parsed);
  }
}
