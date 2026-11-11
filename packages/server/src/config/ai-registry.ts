import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { AiModuleRootOptions } from '@nestjs/ai';
import { appConfig } from './app.config.js';

/**
 * Sentinel registry entry. @nestjs/ai requires at least one model, but every
 * Depose AI call passes the firm's BYOK LanguageModel explicitly. This endpoint
 * is never reachable and holds no key from the environment.
 */
export function aiRegistryOptions(): AiModuleRootOptions {
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
