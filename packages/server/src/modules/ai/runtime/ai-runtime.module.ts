import { Module } from '@nestjs/common';
import { AiRuntimeService } from './ai-runtime.service.js';
import { ModelCallsService } from './model-calls.service.js';

/**
 * AI runtime — operator-owned model configuration and call accounting.
 *
 * There is no firm-level BYOK here: `AiModule.forRoot()` registers the
 * instance's provider and model aliases from environment variables, and this
 * module exposes the alias contract plus the single writer for `model_calls`.
 */
@Module({
  providers: [AiRuntimeService, ModelCallsService],
  exports: [AiRuntimeService, ModelCallsService],
})
export class AiRuntimeModule {}
