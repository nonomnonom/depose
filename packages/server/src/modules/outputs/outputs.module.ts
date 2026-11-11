import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { OutputsController } from './outputs.controller.js';
import { OutputsService } from './outputs.service.js';

/**
 * Outputs — generated documents, summaries, and AI provider connections.
 *
 * Schema tables (owned here, defined in outputs-ai.ts):
 *  - outputs, outputVersions, outputSources, outputTemplates
 *  - aiProviderConnections (firm-level AI provider configs)
 *  - threads, messages, messageSources (AI conversation threads)
 *
 * Dependencies:
 *  - AccessControlModule (policy assertions)
 *  - AuditModule (change logging)
 *
 * This module does NOT own the Dep AI agent loop — that belongs to
 * MatterAgentModule. It only owns output document lifecycle and provider configs.
 */
@Module({
  imports: [AccessControlModule, AuditModule],
  controllers: [OutputsController],
  providers: [OutputsService],
  exports: [OutputsService],
})
export class OutputsModule {}
