import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../access-control/access-control.module.js';
import { AuditModule } from '../../audit/audit.module.js';
import { SearchModule } from '../../search/search.module.js';
import { AiRuntimeModule } from '../runtime/ai-runtime.module.js';
import { SystemOneModule } from '../system-one/system-one.module.js';
import { MatterAgentService } from './matter-agent.service.js';
import { MatterAgentTools } from './matter-agent.tools.js';

/**
 * Dep AI Agent — the agentic layer that runs Dep AI inside a matter.
 *
 * Provides:
 *  - MatterAgentService: runs the Dep AI loop (evidence collection → completion → citation check).
 *  - MatterAgentTools: tool definitions exposed to the agent (find-facts,
 *    get-fact, list-documents, read-document-page, get-current-time,
 *    evaluate-decision).
 *
 * Depends on:
 *  - AiRuntimeModule (operator model aliases and call accounting)
 *  - SystemOneModule (typed decisions for the evaluate-decision tool)
 *  - SearchModule (evidence retrieval for agent tools)
 *  - AccessControlModule (policy assertions)
 *  - AuditModule (run logging)
 *
 * Does NOT own threads/messages — that belongs to ConversationsModule.
 */
@Module({
  imports: [AccessControlModule, AuditModule, SearchModule, AiRuntimeModule, SystemOneModule],
  providers: [MatterAgentService, MatterAgentTools],
  exports: [MatterAgentService, MatterAgentTools],
})
export class MatterAgentModule {}
