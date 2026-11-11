import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../access-control/access-control.module.js';
import { AgentModule } from '../agent/agent.module.js';
import { PlatformAiModule } from '../platform/platform-ai.module.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';

/**
 * Conversations — Dep AI threads & messages (chat history inside a matter).
 *
 * Provides:
 *  - AiService: thread CRUD, sendMessage (triggers AgentService), cancelRun, deleteThread.
 *  - AiController: HTTP endpoints under /v1/matters/:matterId/threads/*.
 *
 * Depends on:
 *  - AgentModule (runs the Dep AI agent when a message arrives)
 *  - PlatformAiModule (records completion calls for messages)
 *  - AccessControlModule (policy assertions)
 *
 * Does NOT own the agent loop or tool definitions — those belong to AgentModule.
 * It only owns the conversation lifecycle.
 */
@Module({
  imports: [AccessControlModule, AgentModule, PlatformAiModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class ConversationsModule {}
