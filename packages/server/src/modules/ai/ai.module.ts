import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { AgentService } from './agent.service.js';
import { MatterAgentTools } from './matter-agent.tools.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';

@Module({
  imports: [AccessControlModule],
  controllers: [AiController],
  providers: [AiService, AgentService, MatterAgentTools],
})
export class AiModule {}
