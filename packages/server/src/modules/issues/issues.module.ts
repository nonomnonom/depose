import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { IssuesController } from './issues.controller.js';
import { IssuesService } from './issues.service.js';

/**
 * Issues — track issues associated with facts in a matter.
 *
 * Schema tables (owned here, defined in intelligence.ts):
 *  - issues: issue records (name, description, status)
 *  - factIssues: many-to-many link between facts and issues
 *
 * Dependencies:
 *  - AccessControlModule (policy assertions)
 *  - AuditModule (change logging)
 */
@Module({
  imports: [AccessControlModule, AuditModule],
  controllers: [IssuesController],
  providers: [IssuesService],
  exports: [IssuesService],
})
export class IssuesModule {}
