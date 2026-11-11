import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../access-control/access-control.module.js';
import { AuditModule } from '../../audit/audit.module.js';
import { SearchModule } from '../../search/search.module.js';
import { PlatformAiModule } from '../platform/platform-ai.module.js';
import { AgentService } from './agent.service.js';
import { MatterAgentTools } from './matter-agent.tools.js';

/**
 * Dep AI Agent — the agentic layer that runs Dep AI inside a matter.
 *
 * Provides:
 *  - AgentService: runs the Dep AI loop (evidence collection → completion → citation check).
 *  - MatterAgentTools: tool definitions exposed to the agent (retrieval_search,
 *    facts_search, facts_get, documents_list, documents_readPage, currentTime,
 *    decision_evaluate).
 *
 * Depends on:
 *  - PlatformAiModule (ModelGatewayService for completion + decision routes)
 *  - SearchModule (evidence retrieval for agent tools)
 *  - AccessControlModule (policy assertions)
 *  - AuditModule (run logging)
 *
 * Does NOT own threads/messages — that belongs to ConversationsModule.
 */
@Module({
  imports: [AccessControlModule, AuditModule, SearchModule, PlatformAiModule],
  providers: [AgentService, MatterAgentTools],
  exports: [AgentService, MatterAgentTools],
})
export class AgentModule {}
