import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator.js';

@ApiTags('Health')
@Controller()
export class AppController {
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
}
