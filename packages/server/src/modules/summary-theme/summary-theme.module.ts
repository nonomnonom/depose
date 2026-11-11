import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { SummaryThemeController } from './summary-theme.controller.js';
import { SummaryThemeService } from './summary-theme.service.js';

/**
 * Summary & Theme — thematic analysis and matter summaries.
 *
 * Schema tables (owned here, defined in intelligence.ts):
 *  - themes, themeFacts
 *  - summaries, summaryFacts
 *
 * Dependencies:
 *  - AccessControlModule (policy assertions)
 *  - AuditModule (change logging)
 *
 * This module does NOT own the Dep AI generation pipeline — that belongs to
 * the agent/extraction modules. It only owns the storage and listing of
 * themes and summaries.
 */
@Module({
  imports: [AccessControlModule, AuditModule],
  controllers: [SummaryThemeController],
  providers: [SummaryThemeService],
  exports: [SummaryThemeService],
})
export class SummaryThemeModule {}
