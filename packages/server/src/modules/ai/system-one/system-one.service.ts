import { Injectable, Logger } from '@nestjs/common';
import { createTypeSafeAi } from '@ai-sdk/typesafe-ai';import { experimental_decide, type Experimental_DecisionState, type JSONValue } from 'ai';
import { DomainError } from '../../../common/domain-error.js';
import { appConfig } from '../../../config/app.config.js';
import { ModelCallsService } from '../runtime/model-calls.service.js';
import type { DecisionAnswer, DecisionQuestion, DecisionResult } from './system-one.types.js';

/**
 * System One — the owner of typed decision execution.
 *
 * TypeSafe models run through the official AI SDK provider
 * (`@ai-sdk/typesafe-ai`) and `experimental_decide`, so retries, abort
 * signals, provider parsing and usage come from the AI SDK instead of
 * hand-written HTTP. OpenRouter's alpha Decisions route is not a chat or AI
 * SDK provider endpoint, so it stays behind a small typed transport here and
 * is not allowed to leak its wire format into callers.
 */
@Injectable()
export class SystemOneService {
  private readonly logger = new Logger(SystemOneService.name);

  constructor(private readonly calls: ModelCallsService) {}

  async decide(
    firmId: string,
    state: { text: string; context?: Record<string, unknown> },
    questions: Record<string, DecisionQuestion>,
  ): Promise<DecisionResult> {
    const config = appConfig.decision;
    const startedAt = Date.now();

    return config.provider === 'typesafe'
      ? this.decideTypeSafe(firmId, state, questions)
      : this.decideHttp(firmId, state, questions);
  }

  private async decideTypeSafe(
    firmId: string,
    state: { text: string; context?: Record<string, unknown> },
    questions: Record<string, DecisionQuestion>,
  ): Promise<DecisionResult> {
    const config = appConfig.decision;
    const startedAt = Date.now();
    const provider = createTypeSafeAi({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
    const mapped = Object.fromEntries(
      Object.entries(questions).map(([key, question]) => [key, toSdkQuestion(question) as never]),
    ) as Record<string, never>;

    const decisionState: Experimental_DecisionState = [
      { type: 'text', text: state.text },
      ...(state.context
        ? [{ type: 'json' as const, value: toJson(state.context) as JSONValue }]
        : []),
    ];

    try {
      const result = await experimental_decide({
        model: provider.decisionModel(config.model),
        state: decisionState,
        questions: mapped,
        maxRetries: appConfig.ai.maxRetries,
        abortSignal: AbortSignal.timeout(appConfig.ai.timeoutMs),
      });

      const answers: Record<string, DecisionAnswer> = {};
      for (const [key, question] of Object.entries(questions)) {
        const raw = result.answers[key] as Record<string, unknown> | undefined;
        answers[key] = fromSdkAnswer(question, raw, config.threshold);
      }

      await this.calls.record({
        firmId,
        routeKey: 'decision.primary',
        capability: 'decision',
        provider: 'typesafe',
        model: config.model,
        status: 'succeeded',
        latencyMs: Date.now() - startedAt,
        inputTokens: result.usage.inputTokens ?? null,
        outputTokens: result.usage.outputTokens ?? null,
        degraded: false,
      });

      return {
        answers,
        model: config.model,
        provider: 'typesafe',
        degraded: false,
        usage: {
          inputTokens: result.usage.inputTokens ?? 0,
          outputTokens: result.usage.outputTokens ?? 0,
          costUsd: null,
        },
      };
    } catch (error) {
      await this.recordFailure(firmId, startedAt, 'DECISION_UNAVAILABLE');
      this.logger.warn(
        `TypeSafe decision failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw new DomainError(
        'DECISION_UNAVAILABLE',
        503,
        `The decision route could not be reached: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private async decideHttp(
    firmId: string,
    state: { text: string; context?: Record<string, unknown> },
    questions: Record<string, DecisionQuestion>,
  ): Promise<DecisionResult> {
    const config = appConfig.decision;
    const startedAt = Date.now();
    const body = {
      text: state.text,
      context: state.context ?? undefined,
      questions: questions,
    };

    try {
      const response = await fetch(config.baseUrl ?? '', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(appConfig.ai.timeoutMs),
      });

      if (!response.ok) {
        await this.recordFailure(firmId, startedAt, 'DECISION_UNAVAILABLE');
        throw new DomainError(
          'DECISION_UNAVAILABLE',
          503,
          `The decision route returned ${response.status}: ${response.statusText}`,
        );
      }

      const rawAnswers = (await response.json()) as Record<string, unknown>;
      if (!rawAnswers || typeof rawAnswers !== 'object') {
        await this.recordFailure(firmId, startedAt, 'AI_OUTPUT_INVALID');
        throw new DomainError(
          'AI_OUTPUT_INVALID',
          502,
          'The decision route did not return a decision object',
        );
      }

      const answers: Record<string, DecisionAnswer> = {};
      for (const [key, question] of Object.entries(questions)) {
        const raw = rawAnswers[key] as Record<string, unknown> | undefined;
        answers[key] = fromSdkAnswer(question, raw, config.threshold);
      }

      const usage = (rawAnswers.usage as { inputTokens?: number; outputTokens?: number }) ?? {};
      await this.calls.record({
        firmId,
        routeKey: 'decision.primary',
        capability: 'decision',
        provider: config.provider,
        model: config.model,
        status: 'succeeded',
        latencyMs: Date.now() - startedAt,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        degraded: false,
      });

      return {
        answers,
        model: config.model,
        provider: config.provider,
        degraded: false,
        usage: {
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
          costUsd: null,
        },
      };
    } catch (error) {
      await this.recordFailure(firmId, startedAt, 'DECISION_UNAVAILABLE');
      throw new DomainError(
        'DECISION_UNAVAILABLE',
        503,
        `The decision route could not be reached: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private async recordFailure(firmId: string, startedAt: number, errorCode: string): Promise<void> {
    await this.calls.record({
      firmId,
      routeKey: 'decision.primary',
      capability: 'decision',
      provider: appConfig.decision.provider,
      model: appConfig.decision.model,
      status: 'failed',
      latencyMs: Date.now() - startedAt,
      errorCode,
    });
  }
}

function toSdkQuestion(question: DecisionQuestion): unknown {
  switch (question.type) {
    case 'noul':
      return {
        type: 'boolean' as const,
        instructions: question.instructions,
        criteria: question.criteria
          ? { true: question.criteria.true, false: question.criteria.false }
          : undefined,
      };
    case 'choice':
      return {
        type: 'choice' as const,
        instructions: question.instructions,
        options: question.options,
      };
    case 'score':
      return {
        type: 'score' as const,
        instructions: question.instructions,
        min: question.min ?? 0,
        max: question.max ?? 1,
        criteria: question.criteria,
      };
    case 'box':
      return { type: 'box' as const, instructions: question.instructions };
  }
}

function toJson(value: Record<string, unknown>): unknown {
  return JSON.parse(JSON.stringify(value));
}

function fromSdkAnswer(
  question: DecisionQuestion,
  raw: Record<string, unknown> | undefined,
  threshold: number,
): DecisionAnswer {
  if (!raw) {
    throw new DomainError('AI_OUTPUT_INVALID', 502, 'The decision model returned no answer');
  }
  if (raw.type === 'refusal') {
    throw new DomainError('AI_OUTPUT_INVALID', 502, 'The decision model refused to answer');
  }
  if (question.type === 'noul') {
    if (raw.type !== 'boolean') {
      throw new DomainError('AI_OUTPUT_INVALID', 502, 'The decision answer is not a Noul');
    }
    const probability = (raw.probability as number) ?? 0.5;
    return {
      type: 'noul',
      noul: probability,
      threshold,
      confidence: probability,
    };
  }
  if (question.type === 'choice') {
    if (raw.type !== 'choice' || !(raw.choice && question.options.includes(raw.choice as string))) {
      throw new DomainError('AI_OUTPUT_INVALID', 502, 'The decision answer is not an allowed choice');
    }
    return {
      type: 'choice',
      choice: raw.choice as string,
      confidence: highest(raw.probabilities as Record<string, number> | undefined),
      threshold,
    };
  }
  if (question.type === 'score') {
    if (raw.type !== 'score') {
      throw new DomainError('AI_OUTPUT_INVALID', 502, 'The decision answer is not a score');
    }
    const min = question.min ?? 0;
    const max = question.max ?? 1;
    const score = (raw.score as number) ?? 0;
    const criteriaLen = question.criteria?.length ?? 2;
    return {
      type: 'score',
      score:
        max === min
          ? min
          : min + (score / Math.max(1, criteriaLen - 1)) * (max - min),
      confidence: highest(raw.probabilities as Record<string, number> | undefined),
      threshold,
    };
  }
  if (raw.type !== 'box') {
    throw new DomainError('AI_OUTPUT_INVALID', 502, 'The decision answer is not a box');
  }
  const box = raw.box as { top: number; bottom: number; left: number; right: number };
  return {
    type: 'box',
    box: [box.top, box.bottom, box.left, box.right],
    confidence: 1,
    threshold,
  };
}

function highest(probabilities: Record<string, number> | undefined): number {
  const values = Object.values(probabilities ?? {});
  return values.length > 0 ? Math.max(...values) : 1;
}
