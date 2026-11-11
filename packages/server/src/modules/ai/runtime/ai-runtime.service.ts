import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../common/domain-error.js';
import { appConfig } from '../../../config/app.config.js';

export type CompletionRoute = 'fast' | 'balanced' | 'thorough';

/**
 * Operator-level AI runtime. Models are registered once in `AiModule` from
 * environment settings; firms no longer own provider connections or keys.
 */
@Injectable()
export class AiRuntimeService {
  get configured(): boolean {
    return Boolean(appConfig.ai.apiKey && appConfig.ai.model);
  }

  get provider(): string {
    return appConfig.ai.provider;
  }

  get model(): string {
    return appConfig.ai.model;
  }

  get timeoutMs(): number {
    return appConfig.ai.timeoutMs;
  }

  /** `@nestjs/ai` model alias for a route. Aliases are registered in ai-registry. */
  alias(route: CompletionRoute): CompletionRoute {
    return route;
  }

  assertConfigured(): void {
    if (!this.configured) {
      throw new DomainError(
        'AI_PROVIDER_NOT_CONFIGURED',
        503,
        'The operator has not configured the instance AI provider',
      );
    }
  }

  status() {
    return {
      configured: this.configured,
      provider: appConfig.ai.provider,
      models: {
        default: appConfig.ai.model,
        fast: appConfig.ai.fastModel ?? appConfig.ai.model,
        balanced: appConfig.ai.balancedModel ?? appConfig.ai.model,
        thorough: appConfig.ai.thoroughModel ?? appConfig.ai.model,
      },
    };
  }
}
