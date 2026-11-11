import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../access-control/access-control.module.js';
import { AuditModule } from '../../audit/audit.module.js';
import { AiRuntimeModule } from '../runtime/ai-runtime.module.js';
import { SystemOneController } from './system-one.controller.js';
import { SystemOneService } from './system-one.service.js';

/**
 * System One — typed decision queries for extraction verification and operator
 * decision workflows.
 *
 * Provides:
 *  - SystemOneService: wrapper around ModelGatewayService.decide() for typed
 *    decision questions (quote_supported, fact_exists, contradiction, confidence).
 *  - SystemOneController: HTTP POST /v1/matters/:matterId/system-one/decide.
 *
 * The decision endpoint path depends on the provider configured in
 * appConfig.decision (openrouter → /alpha/decisions, typesafe → /systemone,
 * other → /decisions).
 *
 * Dependencies:
 *  - AiRuntimeModule (ModelGatewayService for the actual HTTP call)
 *  - AccessControlModule + AuditModule
 *
 * Schema: does NOT store decision results directly — they are consumed by the
 * caller (extraction pipeline) and recorded as modelCalls in platform schema.
 */
@Module({
  imports: [AccessControlModule, AuditModule, AiRuntimeModule],
  controllers: [SystemOneController],
  providers: [SystemOneService],
  exports: [SystemOneService],
})
export class SystemOneModule {}
