import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '@nestjs/ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { z } from 'zod';
import { DomainError } from '../../../common/domain-error.js';
import { appConfig } from '../../../config/app.config.js';
import { ModelCallsService } from '../runtime/model-calls.service.js';
import { ExtractedFacts } from './extraction.schema.js';

export interface ExtractionModelResult {
  candidates: z.infer<typeof ExtractedFacts>['facts'];
  provider: string;
  model: string;
  degraded: boolean;
  usage: { inputTokens: number; outputTokens: number };
}

const INSTRUCTIONS = [
  'You extract facts from legal case documents.',
  '',
  'Rules:',
  '- Only extract facts explicitly stated in the supplied text. Never infer names, dates, amounts, or intent.',
  '- Each fact is one atomic statement: entity (who), action (what), object (to whom/what), date (when).',
  '- date must be ISO 8601. If only a relative date is given, keep wording in dateText and set date to null.',
  '- sourceQuote must be copied verbatim from the document.',
  '- confidence: 1 for a direct sentence; lower when combining clauses.',
  '- Ignore boilerplate, signatures, headers, footers, page numbers.',
  '- Do not deduplicate across documents; the pipeline does that.',
  '- Return an empty facts array if the text contains no material fact.',
].join('\n');

/**
 * Extractions API transport. The operator configures an OpenAI-compatible
 * extraction route; the call runs through `AiService.generateObject`, so
 * retries, timeouts, structured-output validation and usage come from the AI
 * SDK rather than a bespoke fetch loop.
 */
@Injectable()
export class ExtractionsClient {
  private readonly logger = new Logger(ExtractionsClient.name);

  constructor(
    private readonly ai: AiService,
    private readonly calls: ModelCallsService,
  ) {}

  async extract(firmId: string, text: string): Promise<ExtractionModelResult> {
    const config = appConfig.extraction;
    const baseURL = (
      config.baseUrl ??
      (config.provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : '')
    ).replace(/\/$/, '');
    if (!baseURL) {
      throw new DomainError(
        'EXTRACTION_NOT_CONFIGURED',
        503,
        'The operator has not configured EXTRACTION_BASE_URL for this instance',
      );
    }

    const model = createOpenAICompatible({
      name: 'extractions',
      baseURL,
      apiKey: config.apiKey ?? 'unused',
    })(config.model);
    const startedAt = Date.now();

    try {
      const result = await this.ai.generateObject({
        model,
        label: 'extract-facts',
        schema: ExtractedFacts,
        schemaName: 'ExtractedFacts',
        schemaDescription: 'Atomic facts extracted from one legal document',
        instructions: INSTRUCTIONS,
        prompt: `Document text:\n${text.slice(0, 120_000)}`,
        temperature: 0,
        maxOutputTokens: 4_000,
        budget: { maxTokens: 120_000 },
        timeout: `${appConfig.ai.timeoutMs}ms` as `${number}ms`,
      });

      await this.calls.record({
        firmId,
        routeKey: 'extraction.primary',
        capability: 'extraction',
        provider: config.provider,
        model: config.model,
        status: 'succeeded',
        latencyMs: Date.now() - startedAt,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        degraded: false,
      });

      return {
        candidates: result.object.facts,
        provider: config.provider,
        model: config.model,
        degraded: false,
        usage: {
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
        },
      };
    } catch (error) {
      await this.calls.record({
        firmId,
        routeKey: 'extraction.primary',
        capability: 'extraction',
        provider: config.provider,
        model: config.model,
        status: 'failed',
        latencyMs: Date.now() - startedAt,
        errorCode: 'EXTRACTION_UNAVAILABLE',
      });
      this.logger.warn(
        `Extraction call failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw new DomainError(
        'EXTRACTION_UNAVAILABLE',
        503,
        'The extraction route did not return valid facts',
      );
    }
  }
}
