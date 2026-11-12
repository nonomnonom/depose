import { Body, Controller, Get, Param, Post, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse } from '@nestjs/swagger';
import { ZodBodyPipe } from '../../common/zod.pipe.js';
import {
  askQuestionSchema,
  type AskQuestionInput,
} from './intelligence.dto.js';
import { IntelligenceService } from './intelligence.service.js';
import { FactsService } from '../facts/facts.service.js';
import { RelevanceService } from '../relevance/relevance.service.js';
import { SummaryThemeService } from '../summary-theme/summary-theme.service.js';
import { RequestContextService } from '../../common/request-context.service.js';

@ApiTags('Intelligence')
@Controller('v1/matters/:matterId/intelligence')
export class IntelligenceController {
  constructor(
    private readonly intelligenceService: IntelligenceService,
    private readonly facts: FactsService,
    private readonly relevance: RelevanceService,
    private readonly summary: SummaryThemeService,
    private readonly context: RequestContextService,
  ) {}

  @Get('chronology')
  @ApiOperation({ summary: 'Matter chronology timeline' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Chronology events' })
  async chronology(
    @Param('matterId', ParseUUIDPipe) matterId: string,
  ) {
    const actor = this.context.requireFirmActor();
    return this.intelligenceService.chronology(actor, matterId);
  }

  @Post('analysis/run')
  @ApiOperation({ summary: 'Run clustering, relevance, inconsistencies, and summary generation' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  async analyze(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body() body: { subsetId?: string },
  ) {
    const actor = this.context.requireFirmActor();
    const clustered = await this.facts.cluster(actor, matterId);
    const relevance = await this.relevance.classify(actor, matterId);
    const inconsistencies = await this.intelligenceService.contradictions(actor, matterId);
    const generated = await this.summary.generate(actor, matterId, body?.subsetId);
    return { clustered, relevance, inconsistencies, ...generated };
  }

  @Post('contradictions')
  @ApiOperation({ summary: 'Detect contradictions among matter facts' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Contradiction pairs' })
  async contradictions(
    @Param('matterId', ParseUUIDPipe) matterId: string,
  ) {
    const actor = this.context.requireFirmActor();
    return this.intelligenceService.contradictions(actor, matterId);
  }

  @Post('ask')
  @ApiOperation({ summary: 'Ask a question over matter evidence' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Evidence-grounded answer' })
  async ask(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body(new ZodBodyPipe(askQuestionSchema)) input: AskQuestionInput,
  ) {
    const actor = this.context.requireFirmActor();
    return this.intelligenceService.ask(
      actor,
      matterId,
      input.question,
      input.threadId,
    );
  }

  @Post('realtime-check')
  @ApiOperation({ summary: 'Real-time evidence check during hearing' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Real-time check answer' })
  async realtimeCheck(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body(new ZodBodyPipe(askQuestionSchema)) input: AskQuestionInput,
  ) {
    const actor = this.context.requireFirmActor();
    return this.intelligenceService.realtimeCheck(
      actor,
      matterId,
      input.question,
      input.threadId,
    );
  }
}
