import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { InconsistenciesController } from './inconsistencies.controller.js';
import { InconsistenciesService } from './inconsistencies.service.js';

/**
 * Inconsistencies — detect, review, and manage contradictions between facts.
 *
 * Schema table (owned here, defined in intelligence.ts):
 *  - contradictions: contradiction records with kind, severity, status, confidence
 *
 * Endpoints:
 *  - GET  /v1/matters/:matterId/inconsistencies          — list
 *  - GET  /v1/matters/:matterId/inconsistencies/summary  — summary stats
 *  - GET  /v1/matters/:matterId/inconsistencies/:id      — detail
 *  - POST /v1/matters/:matterId/inconsistencies/:id/review — review
 *  - PATCH /v1/matters/:matterId/inconsistencies/:id/severity — severity
 *  - GET  /v1/matters/:matterId/inconsistencies/kind/:kind  — filter by kind
 *
 * Dependencies:
 *  - AccessControlModule (policy assertions)
 *  - AuditModule (change logging)
 */
@Module({
  imports: [AccessControlModule, AuditModule],
  controllers: [InconsistenciesController],
  providers: [InconsistenciesService],
  exports: [InconsistenciesService],
})
export class InconsistenciesModule {}
