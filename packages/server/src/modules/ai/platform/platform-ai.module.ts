import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../access-control/access-control.module.js';
import { AuditModule } from '../../audit/audit.module.js';
import { ModelGatewayController } from './model-gateway.controller.js';
import { ModelGatewayService } from './model-gateway.service.js';

/**
 * Platform AI — shared infrastructure for model routing, BYOK, and the model
 * catalogue. This is platform-owned: it does not belong to any single tenant
 * feature and must not import tenant modules.
 *
 * Provides:
 *  - ModelGatewayService: BYOK provider connections, completion/decision/
 *    extraction/transcription route resolution, model catalogue, health check,
 *    call recording (modelCalls), secret encryption via secret-box.
 *  - ModelGatewayController: HTTP endpoints for provider connection management.
 *
 * Consumed by: AgentModule, ConversationsModule, ExtractionModule, and any
 * module that needs a LanguageModel for a firm.
 */
@Module({
  imports: [AccessControlModule, AuditModule],
  controllers: [ModelGatewayController],
  providers: [ModelGatewayService],
  exports: [ModelGatewayService],
})
export class PlatformAiModule {}
