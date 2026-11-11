import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiSessionAuth } from '../../common/openapi/session-auth.decorator.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { SearchService } from './search.service.js';

@ApiTags('Search')
@ApiSessionAuth()
@Controller('v1/matters/:matterId/search')
export class SearchController {
  constructor(
    private readonly search: SearchService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Search facts and source passages',
    description:
      'Hybrid retrieval over confirmed facts and document chunks. Falls back to lexical search with a vector_unavailable warning when embeddings or Qdrant are off.',
  })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiQuery({ name: 'q', required: false, schema: { type: 'string', maxLength: 512 } })
  @ApiQuery({ name: 'subsetId', required: false, schema: { type: 'string', format: 'uuid' } })
  @ApiQuery({ name: 'includeUnsupported', required: false, schema: { type: 'boolean' } })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', maximum: 50 } })
  async searchMatter(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Query('q') q = '',
    @Query('subsetId') subsetId?: string,
    @Query('includeUnsupported') includeUnsupported?: string,
    @Query('limit') limit?: string,
  ) {
    return this.search.search(this.context.requireFirmActor(), matterId, {
      q,
      subsetId,
      includeUnsupported: includeUnsupported === 'true',
      limit: limit ? Number(limit) : undefined,
    });
  }
}
