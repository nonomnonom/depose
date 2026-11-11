import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { EntitiesController } from './entities.controller.js';
import { EntitiesService } from './entities.service.js';

/**
 * Entities — people, organizations, places, roles referenced across facts.
 *
 * Schema tables (owned here):
 *  - entities, entityAliases, entityMentions, entityRelations, entityRelationSources
 *
 * Dependencies:
 *  - AccessControlModule (policy assertions)
 *  - AuditModule (change logging)
 *
 * This module does NOT depend on facts, search, or documents directly at the
 * module level. Entity mentions are captured by the extraction pipeline and
 * facts service, which import EntitiesService.
 */
@Module({
  imports: [AccessControlModule, AuditModule],
  controllers: [EntitiesController],
  providers: [EntitiesService],
  exports: [EntitiesService],
})
export class EntitiesModule {}
