import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
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
import { JobsService } from './jobs.service.js';

@ApiTags('Jobs')
@ApiSessionAuth()
@Controller('v1')
export class JobsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly context: RequestContextService,
  ) {}

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Read an async job in your firm' })
  @ApiParam({ name: 'jobId', format: 'uuid' })
  @ApiOkResponse({ description: 'Job state' })
  @ApiNotFoundResponse({ description: 'Job not found', type: ErrorEnvelopeDto })
  async get(@Param('jobId', ParseUUIDPipe) jobId: string) {
    const actor = this.context.requireFirmActor();
    return this.jobs.get(actor, jobId);
  }

  @Post('jobs/:jobId/cancel')
  @ApiOperation({ summary: 'Cancel a queued or running job' })
  @ApiParam({ name: 'jobId', format: 'uuid' })
  @ApiOkResponse({ description: 'Job state' })
  async cancel(@Param('jobId', ParseUUIDPipe) jobId: string) {
    const actor = this.context.requireFirmActor();
    return this.jobs.cancel(actor, jobId);
  }

  @Get('firm/jobs')
  @ApiOperation({ summary: 'List jobs in your firm' })
  @ApiQuery({ name: 'status', required: false, schema: { type: 'string' } })
  @ApiQuery({ name: 'type', required: false, schema: { type: 'string' } })
  @ApiQuery({ name: 'cursor', required: false, schema: { type: 'string' } })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', maximum: 100 } })
  @ApiOkResponse({ description: 'Jobs' })
  async list(@Query() query: Record<string, string>) {
    const actor = this.context.requireFirmActor();
    return this.jobs.list(actor, {
      status: query.status,
      type: query.type,
      cursor: query.cursor,
      limit: query.limit ? Math.min(Number(query.limit), 100) : undefined,
    });
  }
}
