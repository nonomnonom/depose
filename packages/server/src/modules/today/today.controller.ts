import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiSessionAuth } from '../../common/openapi/session-auth.decorator.js';
import { zodToOpenApiSchema } from '../../common/openapi/zod-schema.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { parseOrThrow, ZodBodyPipe } from '../../common/zod.pipe.js';
import {
  recordRecentSchema,
  todayOverviewSchema,
  todayQuerySchema,
  type RecordRecentInput,
  type TodayQuery,
} from './today.dto.js';
import { TodayService } from './today.service.js';

@ApiTags('Today')
@ApiSessionAuth()
@Controller('v1/today')
export class TodayController {
  constructor(
    private readonly today: TodayService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Home feed for the current scope',
    description:
      'Pass ?matterId= for the matter-scoped feed (PostHog Today inside a project); omit it for a firm-level overview.',
  })
  @ApiQuery({ name: 'matterId', required: false, schema: { type: 'string', format: 'uuid' } })
  @ApiOkResponse({ description: 'Today overview', schema: zodToOpenApiSchema(todayOverviewSchema) })
  async overview(@Query() query: Record<string, unknown>) {
    const actor = this.context.requireFirmActor();
    const parsed: TodayQuery = parseOrThrow(todayQuerySchema, query);
    return this.today.overview(actor, parsed);
  }

  @Post('recents')
  @ApiOperation({ summary: 'Record a recently viewed resource' })
  @ApiBody({ schema: zodToOpenApiSchema(recordRecentSchema) })
  @ApiOkResponse({ description: 'Recorded', schema: { type: 'object' } })
  async recordRecent(
    @Body(new ZodBodyPipe(recordRecentSchema)) body: RecordRecentInput,
  ): Promise<{ recorded: true }> {
    const actor = this.context.requireFirmActor();
    await this.today.recordRecent(actor, body);
    return { recorded: true };
  }
}
