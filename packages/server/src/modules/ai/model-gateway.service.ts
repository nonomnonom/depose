import { Inject, Injectable, Logger } from '@nestjs/common';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import { and, asc, eq } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import { appConfig } from '../../config/app.config.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  aiProviderConnections,
  modelCalls,
} from '../../infrastructure/database/schema/index.js';
import { AuditService } from '../audit/audit.service.js';
import { decryptSecret, encryptSecret } from './secret-box.js';

const DEFAULT_BASE_URL: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta',
  openrouter: 'https://openrouter.ai/api/v1',
};

export interface ResolvedModel {
  model: LanguageModel;
  connectionId: string;
  provider: string;
  modelId: string;
  routeKey: string;
}

export interface ExtractionModelResult {
  candidates: unknown[];
  provider: string;
  model: string;
  degraded: boolean;
  usage: { inputTokens: number; outputTokens: number };
}

export type DecisionQuestion =
  | { type: 'noul'; instructions: string; criteria?: Record<string, string> }
  | { type: 'choice'; instructions: string; options: string[] }
  | { type: 'score'; instructions: string; min?: number; max?: number }
  | { type: 'box'; instructions: string };

export interface DecisionAnswer {
  type: 'choice' | 'noul' | 'score' | 'box';
  choice?: string;
  noul?: number;
  score?: number;
  box?: number[];
  confidence: number;
  threshold: number;
}

export interface DecisionResult {
  answers: Record<string, DecisionAnswer>;
  model: string;
  provider: string;
  degraded: boolean;
  usage: { inputTokens: number; outputTokens: number; costUsd: number | null };
}

export interface ModelCallRecord {
  firmId: string;
  routeKey: string;
  capability: 'completion' | 'decision' | 'extraction' | 'ocr' | 'transcription';
  connectionId?: string | null;
  provider: string;
  model: string;
  status: 'succeeded' | 'failed';
  latencyMs?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsd?: string | null;
  degraded?: boolean;
  errorCode?: string | null;
  workflowRunId?: string | null;
  messageId?: string | null;
}

@Injectable()
export class ModelGatewayService {
  private readonly logger = new Logger(ModelGatewayService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  async hasProvider(firmId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: aiProviderConnections.id })
      .from(aiProviderConnections)
      .where(
        and(
          eq(aiProviderConnections.firmId, firmId),
          eq(aiProviderConnections.status, 'active'),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  async list(actor: FirmActor) {
    const rows = await this.db
      .select({
        id: aiProviderConnections.id,
        kind: aiProviderConnections.kind,
        label: aiProviderConnections.label,
        baseUrl: aiProviderConnections.baseUrl,
        apiKeyLast4: aiProviderConnections.apiKeyLast4,
        models: aiProviderConnections.models,
        fallbackModelId: aiProviderConnections.fallbackModelId,
        status: aiProviderConnections.status,
        lastTestedAt: aiProviderConnections.lastTestedAt,
        lastError: aiProviderConnections.lastError,
        createdAt: aiProviderConnections.createdAt,
      })
      .from(aiProviderConnections)
      .where(eq(aiProviderConnections.firmId, actor.firmId))
      .orderBy(asc(aiProviderConnections.createdAt));
    return rows.map((row) => ({
      ...row,
      apiKeyLast4: row.apiKeyLast4.trim(),
      models: Array.isArray(row.models) ? (row.models as string[]) : [],
    }));
  }

  async create(
    actor: FirmActor,
    input: {
      kind: string;
      label: string;
      baseUrl?: string;
      apiKey?: string;
      models: string[];
      fallbackModelId?: string;
    },
  ) {
    const encryptionKey = appConfig.ai.encryptionKey;
    if (!encryptionKey) {
      throw new DomainError(
        'AI_PROVIDER_NOT_CONFIGURED',
        503,
        'AI_SECRET_ENCRYPTION_KEY is not configured',
      );
    }
    const apiKey = input.apiKey ?? '';
    const [created] = await this.db
      .insert(aiProviderConnections)
      .values({
        firmId: actor.firmId,
        kind: input.kind as typeof aiProviderConnections.$inferInsert.kind,
        label: input.label,
        baseUrl: input.baseUrl ?? DEFAULT_BASE_URL[input.kind] ?? null,
        apiKeyCiphertext: encryptSecret(apiKey, encryptionKey),
        apiKeyLast4: apiKey.slice(-4).padStart(4, '•'),
        models: input.models,
        fallbackModelId: input.fallbackModelId ?? null,
        status: 'untested',
        createdBy: actor.userId,
      })
      .returning();

    await this.audit.log({
      firmId: actor.firmId,
      action: 'firm.ai_provider.created',
      resourceType: 'ai_provider',
      resourceId: created.id,
      actor,
      metadata: { kind: input.kind, label: input.label, models: input.models },
    });

    return this.safe(created);
  }

  async update(
    actor: FirmActor,
    id: string,
    input: {
      label?: string;
      baseUrl?: string;
      apiKey?: string;
      models?: string[];
      fallbackModelId?: string | null;
    },
  ) {
    const [existing] = await this.db
      .select()
      .from(aiProviderConnections)
      .where(
        and(
          eq(aiProviderConnections.id, id),
          eq(aiProviderConnections.firmId, actor.firmId),
        ),
      )
      .limit(1);
    if (!existing) throw DomainError.notFound('Provider connection not found');

    let ciphertext = existing.apiKeyCiphertext;
    let last4 = existing.apiKeyLast4;
    if (input.apiKey) {
      const encryptionKey = appConfig.ai.encryptionKey;
      if (!encryptionKey) {
        throw new DomainError(
          'AI_PROVIDER_NOT_CONFIGURED',
          503,
          'AI_SECRET_ENCRYPTION_KEY is not configured',
        );
      }
      ciphertext = encryptSecret(input.apiKey, encryptionKey);
      last4 = input.apiKey.slice(-4).padStart(4, '•');
    }

    const [updated] = await this.db
      .update(aiProviderConnections)
      .set({
        ...(input.label ? { label: input.label } : {}),
        ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
        ...(input.models ? { models: input.models } : {}),
        ...(input.fallbackModelId !== undefined
          ? { fallbackModelId: input.fallbackModelId }
          : {}),
        apiKeyCiphertext: ciphertext,
        apiKeyLast4: last4,
        status: 'untested',
        updatedAt: new Date(),
      })
      .where(eq(aiProviderConnections.id, existing.id))
      .returning();

    await this.audit.log({
      firmId: actor.firmId,
      action: 'firm.ai_provider.updated',
      resourceType: 'ai_provider',
      resourceId: id,
      actor,
      metadata: { fields: Object.keys(input) },
    });

    return this.safe(updated);
  }

  async remove(actor: FirmActor, id: string) {
    const result = await this.db
      .delete(aiProviderConnections)
      .where(
        and(
          eq(aiProviderConnections.id, id),
          eq(aiProviderConnections.firmId, actor.firmId),
        ),
      )
      .returning({ id: aiProviderConnections.id });
    if (result.length === 0) throw DomainError.notFound('Provider connection not found');
    await this.audit.log({
      firmId: actor.firmId,
      action: 'firm.ai_provider.removed',
      resourceType: 'ai_provider',
      resourceId: id,
      actor,
    });
    return { deleted: true };
  }

  async test(actor: FirmActor, id: string) {
    const [connection] = await this.db
      .select()
      .from(aiProviderConnections)
      .where(
        and(
          eq(aiProviderConnections.id, id),
          eq(aiProviderConnections.firmId, actor.firmId),
        ),
      )
      .limit(1);
    if (!connection) throw DomainError.notFound('Provider connection not found');

    const secret = appConfig.ai.encryptionKey;
    if (!secret) {
      throw new DomainError(
        'AI_PROVIDER_NOT_CONFIGURED',
        503,
        'AI_SECRET_ENCRYPTION_KEY is not configured',
      );
    }
    const apiKey = decryptSecret(connection.apiKeyCiphertext, secret);
    const baseUrl = (connection.baseUrl ?? DEFAULT_BASE_URL[connection.kind] ?? '').replace(
      /\/$/,
      '',
    );

    let error: string | null = null;
    try {
      const models = await this.fetchModels(connection.kind, baseUrl, apiKey);
      if (models.length === 0) error = 'Provider returned no models';
      if (models.length > 0) {
        await this.db
          .update(aiProviderConnections)
          .set({
            models,
            status: 'active',
            lastTestedAt: new Date(),
            lastError: null,
            updatedAt: new Date(),
          })
          .where(eq(aiProviderConnections.id, connection.id));
        await this.audit.log({
          firmId: actor.firmId,
          action: 'firm.ai_provider.tested',
          resourceType: 'ai_provider',
          resourceId: id,
          actor,
          metadata: { ok: true, models: models.length },
        });
        return { ok: true, models, error: null };
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Connection failed';
    }

    await this.db
      .update(aiProviderConnections)
      .set({
        status: 'invalid',
        lastTestedAt: new Date(),
        lastError: error,
        updatedAt: new Date(),
      })
      .where(eq(aiProviderConnections.id, connection.id));
    await this.audit.log({
      firmId: actor.firmId,
      action: 'firm.ai_provider.tested',
      resourceType: 'ai_provider',
      resourceId: id,
      actor,
      metadata: { ok: false },
    });
    return { ok: false, models: [], error };
  }

  async recordCall(record: ModelCallRecord): Promise<void> {
    await this.db.insert(modelCalls).values({
      firmId: record.firmId,
      routeKey: record.routeKey,
      capability: record.capability,
      connectionId: record.connectionId ?? null,
      provider: record.provider,
      model: record.model,
      status: record.status,
      latencyMs: record.latencyMs ?? null,
      inputTokens: record.inputTokens ?? null,
      outputTokens: record.outputTokens ?? null,
      costUsd: record.costUsd ?? null,
      degraded: record.degraded ?? false,
      errorCode: record.errorCode ?? null,
      workflowRunId: record.workflowRunId ?? null,
      messageId: record.messageId ?? null,
    });
  }

  async catalogue(actor: FirmActor) {
    const connections = await this.db
      .select()
      .from(aiProviderConnections)
      .where(eq(aiProviderConnections.firmId, actor.firmId))
      .orderBy(asc(aiProviderConnections.createdAt));

    return {
      items: connections.flatMap((connection) => {
        const models = Array.isArray(connection.models)
          ? (connection.models as string[])
          : [];
        return models.map((model) => ({
          id: `${connection.id}/${model}`,
          connectionId: connection.id,
          displayName: model,
          provider: connection.kind,
          providerLabel: connection.label,
          capability: 'completion' as const,
          routeKey: 'completion.balanced',
          model,
          cost: null,
          costClass: null,
          latencyClass: null,
          contextWindow: null,
          available: connection.status === 'active',
          selectable: connection.status === 'active',
        }));
      }),
    };
  }

  private async recordDecisionFailure(
    firmId: string,
    config: typeof appConfig.decision,
    startedAt: number,
    errorCode: string,
  ) {
    await this.recordCall({
      firmId,
      routeKey: 'decision.primary',
      capability: 'decision',
      provider: config.provider,
      model: config.model,
      status: 'failed',
      latencyMs: Date.now() - startedAt,
      errorCode,
    });
  }

  async health(actor: FirmActor) {
    const connections = await this.db
      .select({
        id: aiProviderConnections.id,
        label: aiProviderConnections.label,
        kind: aiProviderConnections.kind,
        status: aiProviderConnections.status,
        lastTestedAt: aiProviderConnections.lastTestedAt,
        lastError: aiProviderConnections.lastError,
        models: aiProviderConnections.models,
      })
      .from(aiProviderConnections)
      .where(eq(aiProviderConnections.firmId, actor.firmId))
      .orderBy(asc(aiProviderConnections.createdAt));

    return {
      items: connections.map((connection) => ({
        routeKey: 'completion.balanced',
        capability: 'completion',
        provider: connection.kind,
        providerLabel: connection.label,
        model: Array.isArray(connection.models)
          ? ((connection.models as string[])[0] ?? null)
          : null,
        available: connection.status === 'active',
        status: connection.status,
        lastTestedAt: connection.lastTestedAt,
        lastError: connection.lastError,
      })),
    };
  }

  async decide(input: {
    firmId: string;
    state: { text: string; context?: Record<string, unknown> };
    questions: Record<string, DecisionQuestion>;
  }): Promise<DecisionResult> {
    const config = appConfig.decision;
    if (!config.baseUrl) {
      throw new DomainError(
        'DECISION_NOT_CONFIGURED',
        503,
        'The operator has not configured DECISION_BASE_URL for this instance',
      );
    }
    if (Object.keys(input.questions).length === 0) {
      throw DomainError.validation('Decision needs at least one typed question');
    }

    const path =
      config.provider === 'openrouter'
        ? '/alpha/decisions'
        : config.provider === 'typesafe'
          ? '/systemone'
          : '/decisions';
    const startedAt = Date.now();
    let response: Response;
    try {
      response = await fetch(`${config.baseUrl.replace(/\/$/, '')}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: config.model,
          state: input.state,
          questions: input.questions,
        }),
        signal: AbortSignal.timeout(appConfig.ai.timeoutMs),
      });
    } catch (error) {
      await this.recordDecisionFailure(input.firmId, config, startedAt, 'DECISION_UNAVAILABLE');
      throw new DomainError(
        'DECISION_UNAVAILABLE',
        503,
        `The decision route could not be reached: ${
          error instanceof Error ? error.message : 'network error'
        }`,
      );
    }

    if (!response.ok) {
      await this.recordDecisionFailure(input.firmId, config, startedAt, 'DECISION_UNAVAILABLE');
      throw new DomainError(
        'DECISION_UNAVAILABLE',
        503,
        `The decision route returned ${response.status}`,
      );
    }

    const payload = (await response.json().catch(() => null)) as {
      answers?: Record<string, Record<string, unknown>>;
      usage?: { inputTokens?: number; outputTokens?: number; input_tokens?: number; output_tokens?: number; costUsd?: number };
    } | null;
    const rawAnswers = payload?.answers;
    if (!rawAnswers || typeof rawAnswers !== 'object') {
      await this.recordDecisionFailure(input.firmId, config, startedAt, 'AI_OUTPUT_INVALID');
      throw new DomainError(
        'AI_OUTPUT_INVALID',
        502,
        'The decision model returned no typed answers',
      );
    }

    const answers: Record<string, DecisionAnswer> = {};
    for (const [key, question] of Object.entries(input.questions)) {
      const raw = rawAnswers[key] as Record<string, unknown> | undefined;
      if (!raw || raw.type !== question.type) {
        throw new DomainError(
          'AI_OUTPUT_INVALID',
          502,
          `Decision answer ${key} does not match the requested type`,
        );
      }
      const confidence = Number(raw.confidence ?? 0);
      const answer: DecisionAnswer = {
        type: question.type,
        confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0,
        threshold: config.threshold,
      };
      if (question.type === 'noul') {
        const noul = Number(raw.noul);
        if (!Number.isFinite(noul) || noul < 0 || noul > 1) {
          throw new DomainError('AI_OUTPUT_INVALID', 502, `Decision answer ${key} is not a probability`);
        }
        answer.noul = noul;
      } else if (question.type === 'choice') {
        const choice = String(raw.choice ?? '');
        if (!question.options.includes(choice)) {
          throw new DomainError('AI_OUTPUT_INVALID', 502, `Decision answer ${key} is not an allowed choice`);
        }
        answer.choice = choice;
      } else if (question.type === 'score') {
        const score = Number(raw.score);
        if (!Number.isFinite(score)) {
          throw new DomainError('AI_OUTPUT_INVALID', 502, `Decision answer ${key} is not a score`);
        }
        answer.score = score;
      } else if (question.type === 'box') {
        if (!Array.isArray(raw.box) || raw.box.some((value) => !Number.isFinite(Number(value)))) {
          throw new DomainError('AI_OUTPUT_INVALID', 502, `Decision answer ${key} is not a box`);
        }
        answer.box = (raw.box as unknown[]).map(Number);
      }
      answers[key] = answer;
    }

    await this.recordCall({
      firmId: input.firmId,
      routeKey: 'decision.primary',
      capability: 'decision',
      provider: config.provider,
      model: config.model,
      status: 'succeeded',
      latencyMs: Date.now() - startedAt,
      inputTokens: payload?.usage?.inputTokens ?? payload?.usage?.input_tokens ?? null,
      outputTokens: payload?.usage?.outputTokens ?? payload?.usage?.output_tokens ?? null,
      costUsd: payload?.usage?.costUsd !== undefined ? String(payload.usage.costUsd) : null,
      degraded: false,
    });

    return {
      answers,
      model: config.model,
      provider: config.provider,
      degraded: false,
      usage: {
        inputTokens: payload?.usage?.inputTokens ?? payload?.usage?.input_tokens ?? 0,
        outputTokens: payload?.usage?.outputTokens ?? payload?.usage?.output_tokens ?? 0,
        costUsd: payload?.usage?.costUsd ?? null,
      },
    };
  }

  async routeStatus() {
    return {
      decision: {
        routeKey: 'decision.primary',
        capability: 'decision',
        provider: appConfig.decision.provider,
        model: appConfig.decision.model,
        available: Boolean(appConfig.decision.baseUrl),
        threshold: appConfig.decision.threshold,
      },
      extraction: {
        routeKey: 'extraction.primary',
        capability: 'extraction',
        provider: appConfig.extraction.provider,
        model: appConfig.extraction.model,
        available: Boolean(appConfig.extraction.baseUrl),
        fallbackEnabled: appConfig.extraction.fallbackEnabled,
      },
    };
  }

  async completionModel(
    firmId: string,
    reference?: string,
    routeKey: 'completion.fast' | 'completion.balanced' | 'completion.thorough' = 'completion.balanced',
  ): Promise<ResolvedModel> {
    const connections = await this.db
      .select()
      .from(aiProviderConnections)
      .where(eq(aiProviderConnections.firmId, firmId))
      .orderBy(asc(aiProviderConnections.createdAt));

    let connection = connections.find(
      (row) => row.status === 'active' || row.status === 'untested',
    );
    let modelId: string | undefined;

    if (reference?.includes('/')) {
      const [connectionId, ...rest] = reference.split('/');
      connection = connections.find((row) => row.id === connectionId);
      modelId = rest.join('/');
    }

    if (!connection) {
      throw new DomainError(
        'AI_PROVIDER_NOT_CONFIGURED',
        503,
        'No active AI provider is configured for this firm',
      );
    }
    if (connection.status === 'invalid' || connection.status === 'disabled') {
      throw new DomainError(
        'AI_PROVIDER_UNAVAILABLE',
        503,
        'The selected AI provider is not available',
      );
    }

    const models = Array.isArray(connection.models)
      ? (connection.models as string[])
      : [];
    modelId = modelId ?? models[0] ?? connection.fallbackModelId ?? undefined;
    if (!modelId || !models.includes(modelId)) {
      throw new DomainError(
        'AI_MODEL_NOT_ALLOWED',
        400,
        'The model is not enabled on this provider connection',
      );
    }

    const secret = appConfig.ai.encryptionKey;
    if (!secret) {
      throw new DomainError(
        'AI_PROVIDER_NOT_CONFIGURED',
        503,
        'AI_SECRET_ENCRYPTION_KEY is not configured',
      );
    }
    const apiKey = decryptSecret(connection.apiKeyCiphertext, secret);
    const baseURL = (connection.baseUrl ?? DEFAULT_BASE_URL[connection.kind] ?? '').replace(
      /\/$/,
      '',
    );
    if (!baseURL) {
      throw new DomainError(
        'AI_PROVIDER_UNAVAILABLE',
        503,
        'Provider base URL is missing',
      );
    }

    const model = this.buildModel(connection.kind, baseURL, apiKey, modelId);
    return {
      model,
      connectionId: connection.id,
      provider: connection.kind,
      modelId,
      routeKey,
    };
  }

  async extractFacts(firmId: string, text: string): Promise<ExtractionModelResult> {
    const config = appConfig.extraction;
    const baseURL = (
      config.baseUrl ??
      (config.provider === 'openrouter' ? DEFAULT_BASE_URL.openrouter : '')
    ).replace(/\/$/, '');
    if (!baseURL) {
      throw new DomainError(
        'EXTRACTION_NOT_CONFIGURED',
        503,
        'The operator has not configured EXTRACTION_BASE_URL for this instance',
      );
    }

    const startedAt = Date.now();
    const prompt = [
      'You extract facts from legal case documents.',
      '',
      'Rules:',
      '- Only extract facts explicitly stated in the supplied text. Never infer names, dates, amounts, or intent.',
      '- Each fact is one atomic statement: entity (who), action (what), object (to whom/what), date (when).',
      '- date must be ISO 8601. If only a relative date is given, keep wording in text and set date to null.',
      '- sourceQuote must be copied verbatim from the document.',
      '- confidence: 1 for a direct sentence; lower when combining clauses.',
      '- Ignore boilerplate, signatures, headers, footers, page numbers.',
      '- Do not deduplicate across documents; the pipeline does that.',
      '- Return an empty array if the text contains no material fact.',
      '',
      'Return JSON of shape {"facts":[{text,factType,entity,action,object,date,dateText,datePrecision,sourceQuote,confidence}]}.',
      'factType is one of event, statement, admission, denial, intent, relationship, amount, location, other.',
      'date is ISO 8601 (YYYY-MM-DD) or null. datePrecision is day, month, year, or unknown.',
      '',
      `Document text:\n${text.slice(0, 120_000)}`,
    ].join('\n');

    const call = async (jsonMode: boolean) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
      return fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model,
          temperature: 0,
          messages: [{ role: 'user', content: prompt }],
          ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: AbortSignal.timeout(appConfig.ai.timeoutMs),
      });
    };

    let response = await call(true);
    if (response.status === 400) response = await call(false);
    if (!response.ok) {
      await this.recordCall({
        firmId,
        routeKey: 'extraction.primary',
        capability: 'extraction',
        provider: config.provider,
        model: config.model,
        status: 'failed',
        latencyMs: Date.now() - startedAt,
        errorCode: 'EXTRACTION_UNAVAILABLE',
      });
      throw new DomainError(
        'EXTRACTION_UNAVAILABLE',
        503,
        `The extraction route returned ${response.status}`,
      );
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const content = payload.choices?.[0]?.message?.content ?? '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripCodeFence(content));
    } catch {
      await this.recordCall({
        firmId,
        routeKey: 'extraction.primary',
        capability: 'extraction',
        provider: config.provider,
        model: config.model,
        status: 'failed',
        latencyMs: Date.now() - startedAt,
        errorCode: 'AI_OUTPUT_INVALID',
      });
      throw new DomainError('AI_OUTPUT_INVALID', 502, 'The extraction model returned invalid JSON');
    }

    const candidates = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { facts?: unknown[] }).facts)
        ? (parsed as { facts: unknown[] }).facts
        : null;
    if (!candidates) {
      throw new DomainError(
        'AI_OUTPUT_INVALID',
        502,
        'The extraction model did not return a facts array',
      );
    }

    await this.recordCall({
      firmId,
      routeKey: 'extraction.primary',
      capability: 'extraction',
      provider: config.provider,
      model: config.model,
      status: 'succeeded',
      latencyMs: Date.now() - startedAt,
      inputTokens: payload.usage?.prompt_tokens ?? null,
      outputTokens: payload.usage?.completion_tokens ?? null,
      degraded: false,
    });

    return {
      candidates,
      provider: config.provider,
      model: config.model,
      degraded: false,
      usage: {
        inputTokens: payload.usage?.prompt_tokens ?? 0,
        outputTokens: payload.usage?.completion_tokens ?? 0,
      },
    };
  }

  private buildModel(
    kind: string,
    baseURL: string,
    apiKey: string,
    modelId: string,
  ): LanguageModel {
    if (kind === 'anthropic') {
      return createAnthropic({ apiKey, baseURL })(modelId);
    }
    if (kind === 'google') {
      return createGoogleGenerativeAI({ apiKey, baseURL })(modelId);
    }
    return createOpenAICompatible({
      name: `depose-${kind}`,
      baseURL,
      apiKey,
      includeUsage: true,
    })(modelId);
  }

  private async fetchModels(kind: string, baseURL: string, apiKey: string): Promise<string[]> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    let url = `${baseURL}/models`;
    if (kind === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else if (kind === 'google') {
      url = `${baseURL}/models?key=${encodeURIComponent(apiKey)}`;
    } else {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Provider returned ${response.status}`);
    const payload = (await response.json()) as {
      data?: { id?: string }[];
      models?: { name?: string }[];
    };
    const ids = (payload.data ?? payload.models ?? [])
      .map((item) => (item as { id?: string }).id ?? (item as { name?: string }).name)
      .filter((id): id is string => typeof id === 'string')
      .map((id) => id.replace(/^models\//, ''));
    this.logger.debug(`Provider ${kind} exposes ${ids.length} models`);
    return ids;
  }

  private safe(row: typeof aiProviderConnections.$inferSelect) {
    return {
      id: row.id,
      kind: row.kind,
      label: row.label,
      baseUrl: row.baseUrl,
      apiKeyLast4: row.apiKeyLast4.trim(),
      models: Array.isArray(row.models) ? (row.models as string[]) : [],
      fallbackModelId: row.fallbackModelId,
      status: row.status,
      lastTestedAt: row.lastTestedAt,
      lastError: row.lastError,
      createdAt: row.createdAt,
    };
  }
}

function stripCodeFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
}
