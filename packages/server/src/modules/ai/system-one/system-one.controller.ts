import { Controller, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse, ApiBadRequestResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { DecisionService } from './decision.service.js';
import { RequestContextService } from '../../../common/request-context.service.js';
import { DecisionQuestion } from '../platform/model-gateway.service.js';

@ApiTags('System One (Decision)')
@Controller('v1/matters/:matterId/system-one')
export class SystemOneController {
  constructor(
    private readonly decision: DecisionService,
    private readonly context: RequestContextService,
  ) {}

  @Post('decide')
  @ApiOperation({ summary: 'Run a typed decision query against the matter' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Decision answers' })
  @ApiBadRequestResponse({ description: 'Invalid decision body' })
  @ApiForbiddenResponse({ description: 'Not authorized for this matter' })
  async decide(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body() body: { state: { text: string; context?: Record<string, unknown> }; questions: Record<string, DecisionQuestion> },
  ) {
    const actor = this.context.requireFirmActor();
    return this.decision.decide(actor, body.state, body.questions);
  }
}
