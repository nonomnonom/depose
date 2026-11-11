import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../access-control/access-control.module.js';
import { MatterAgentModule } from '../matter-agent/matter-agent.module.js';
import { AiRuntimeModule } from '../runtime/ai-runtime.module.js';
import { ConversationController } from './conversation.controller.js';
import { ConversationService } from './conversation.service.js';

/**
 * Conversations — Dep AI threads & messages (chat history inside a matter).
 *
 * Provides:
 *  - ConversationService: thread CRUD, sendMessage (triggers MatterAgentService), cancelRun, deleteThread.
 *  - ConversationController: HTTP endpoints under /v1/matters/:matterId/threads/*.
 *
 * Depends on:
 *  - MatterAgentModule (runs the Dep AI agent when a message arrives)
 *  - AiRuntimeModule (records completion calls for messages)
 *  - AccessControlModule (policy assertions)
 *
 * Does NOT own the agent loop or tool definitions — those belong to MatterAgentModule.
 * It only owns the conversation lifecycle.
 */
@Module({
  imports: [AccessControlModule, MatterAgentModule, AiRuntimeModule],
  controllers: [ConversationController],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationsModule {}
