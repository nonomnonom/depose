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
import { aiProviderConnections } from '../../infrastructure/database/schema/index.js';
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

  async completionModel(firmId: string, reference?: string): Promise<ResolvedModel> {
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
      .map((item) => ('id' in item ? item.id : item.name))
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
