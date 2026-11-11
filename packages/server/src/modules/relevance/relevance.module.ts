import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { RelevanceController } from './relevance.controller.js';
import { RelevanceService } from './relevance.service.js';

/**
 * Relevance — assign and query relevance labels for facts.
 *
 * Schema table (owned here, defined in intelligence.ts):
 *  - fact_relevance: relevance assignments per fact per scope
 *
 * Uses upsert semantics: reassigning same fact+scopeType+scopeId updates label/reason.
 *
 * Dependencies:
 *  - AccessControlModule (policy assertions)
 *  - AuditModule (change logging)
 */
@Module({
  imports: [AccessControlModule, AuditModule],
  controllers: [RelevanceController],
  providers: [RelevanceService],
  exports: [RelevanceService],
})
export class RelevanceModule {}
