import { Controller, Get, Inject, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import type { Response } from 'express';
import { Public } from './common/decorators/public.decorator.js';
import type { Database } from './infrastructure/database/database.client.js';
import { DATABASE } from './infrastructure/database/database.module.js';
import { RedisService } from './infrastructure/redis/redis.service.js';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Public and unversioned. Returns ok while the process serves requests.',
  })
  @ApiOkResponse({
    description: 'Service is up',
    schema: {
      type: 'object',
      properties: { status: { type: 'string', example: 'ok' } },
      required: ['status'],
    },
  })
  health() {
    return { status: 'ok' };
  }

  @Public()
  @Get('health/ready')
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Checks Postgres and Redis. Returns 503 with per-dependency status while either is unavailable.',
  })
  @ApiOkResponse({
    description: 'Dependencies are reachable',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        checks: {
          type: 'object',
          properties: {
            database: { type: 'string', example: 'ok' },
            redis: { type: 'string', example: 'ok' },
          },
        },
      },
    },
  })
  async ready(@Res({ passthrough: true }) response: Response) {
    const [database, redis] = await Promise.all([
      this.db
        .execute(sql`select 1`)
        .then(() => 'ok' as const)
        .catch(() => 'unavailable' as const),
      this.redis.ping().then((ok) => (ok ? ('ok' as const) : ('unavailable' as const))),
    ]);

    const ready = database === 'ok' && redis === 'ok';
    response.status(ready ? 200 : 503);
    return { status: ready ? 'ok' : 'degraded', checks: { database, redis } };
  }
}
