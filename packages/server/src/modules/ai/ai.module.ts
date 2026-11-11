import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { AgentService } from './agent.service.js';
import { MatterAgentTools } from './matter-agent.tools.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { ModelGatewayController } from './model-gateway.controller.js';
import { ModelGatewayService } from './model-gateway.service.js';

@Module({
  imports: [AccessControlModule, AuditModule],
  controllers: [AiController, ModelGatewayController],
  providers: [AiService, AgentService, MatterAgentTools, ModelGatewayService],
  exports: [ModelGatewayService],
})
export class AiModule {}
