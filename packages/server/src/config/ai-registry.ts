import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import type { AiModuleRootOptions } from '@nestjs/ai';
import { appConfig } from './app.config.js';

/**
 * Registers the instance AI models with `@nestjs/ai`.
 *
 * The operator configures one AI SDK provider through AI_PROVIDER / AI_API_KEY
 * / AI_BASE_URL / AI_MODEL, and optionally per-route model ids. Calls address
 * `default`, `fast`, `balanced`, or `thorough`; no firm can register a provider
 * or key.
 */
export function aiRegistryOptions(): AiModuleRootOptions {
  const { provider, baseUrl, apiKey, model } = appConfig.ai;

  if (!apiKey || !model) {
    /* AiModule requires at least one model; every real call checks configured. */
    return {
      models: {
        unconfigured: createOpenAICompatible({
          name: 'unconfigured',
          baseURL: 'http://127.0.0.1:1/v1',
          apiKey: 'unused',
        })('unconfigured'),
      },
      defaults: {
        timeout: `${appConfig.ai.timeoutMs}ms` as `${number}ms`,
        retry: { attempts: appConfig.ai.maxRetries },
        maxSteps: 10,
      },
    };
  }

  const build = (modelId: string): LanguageModel => {
    switch (provider) {
      case 'openai':
        return createOpenAI({ apiKey, baseURL: baseUrl })(modelId);
      case 'anthropic':
        return createAnthropic({ apiKey, baseURL: baseUrl })(modelId);
      case 'google':
        return createGoogleGenerativeAI({ apiKey, baseURL: baseUrl })(modelId);
      case 'openrouter':
        return createOpenAICompatible({
          name: 'openrouter',
          baseURL: baseUrl ?? 'https://openrouter.ai/api/v1',
          apiKey,
        })(modelId);
      case 'openai-compatible':
        if (!baseUrl) {
          throw new Error('AI_BASE_URL is required when AI_PROVIDER=openai-compatible');
        }
        return createOpenAICompatible({
          name: 'openai-compatible',
          baseURL: baseUrl,
          apiKey,
        })(modelId);
    }
  };

  return {
    models: {
      default: build(model),
      fast: build(appConfig.ai.fastModel ?? model),
      balanced: build(appConfig.ai.balancedModel ?? model),
      thorough: build(appConfig.ai.thoroughModel ?? model),
    },
    defaults: {
      timeout: `${appConfig.ai.timeoutMs}ms` as `${number}ms`,
      retry: { attempts: appConfig.ai.maxRetries },
      maxSteps: 10,
    },
  };
}
