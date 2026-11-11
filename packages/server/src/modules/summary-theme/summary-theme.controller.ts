import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse } from '@nestjs/swagger';
import { SummaryThemeService } from './summary-theme.service.js';
import { RequestContextService } from '../../common/request-context.service.js';

@ApiTags('Summary & Theme')
@Controller('v1/matters/:matterId/summary-theme')
export class SummaryThemeController {
  constructor(
    private readonly service: SummaryThemeService,
    private readonly context: RequestContextService,
  ) {}

  @Get('themes')
  @ApiOperation({ summary: 'List themes in a matter' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Themes list' })
  async listThemes(@Param('matterId', ParseUUIDPipe) matterId: string) {
    const actor = this.context.requireFirmActor();
    return this.service.listThemes(actor, matterId);
  }

  @Get('summaries')
  @ApiOperation({ summary: 'List summaries in a matter' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Summaries list' })
  async listSummaries(@Param('matterId', ParseUUIDPipe) matterId: string) {
    const actor = this.context.requireFirmActor();
    return this.service.listSummaries(actor, matterId);
  }
}
