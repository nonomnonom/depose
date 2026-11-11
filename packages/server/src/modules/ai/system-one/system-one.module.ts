import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../access-control/access-control.module.js';
import { AuditModule } from '../../audit/audit.module.js';
import { PlatformAiModule } from '../platform/platform-ai.module.js';
import { SystemOneController } from './system-one.controller.js';
import { DecisionService } from './decision.service.js';

/**
 * System One — typed decision queries for extraction verification and operator
 * decision workflows.
 *
 * Provides:
 *  - DecisionService: wrapper around ModelGatewayService.decide() for typed
 *    decision questions (quote_supported, fact_exists, contradiction, confidence).
 *  - SystemOneController: HTTP POST /v1/matters/:matterId/system-one/decide.
 *
 * The decision endpoint path depends on the provider configured in
 * appConfig.decision (openrouter → /alpha/decisions, typesafe → /systemone,
 * other → /decisions).
 *
 * Dependencies:
 *  - PlatformAiModule (ModelGatewayService for the actual HTTP call)
 *  - AccessControlModule + AuditModule
 *
 * Schema: does NOT store decision results directly — they are consumed by the
 * caller (extraction pipeline) and recorded as modelCalls in platform schema.
 */
@Module({
  imports: [AccessControlModule, AuditModule, PlatformAiModule],
  controllers: [SystemOneController],
  providers: [DecisionService],
  exports: [DecisionService],
})
export class SystemOneModule {}
