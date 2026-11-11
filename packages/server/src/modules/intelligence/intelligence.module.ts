import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { InconsistenciesModule } from '../inconsistencies/inconsistencies.module.js';
import { VectorModule } from '../vector/vector.module.js';
import { PlatformAiModule } from '../ai/platform/platform-ai.module.js';
import { IntelligenceController } from './intelligence.controller.js';
import { IntelligenceService } from './intelligence.service.js';

/**
 * Intelligence — matter intelligence: chronology, contradictions, and
 * evidence-grounded Q&A over extracted facts and document chunks.
 *
 * Provides:
 *  - IntelligenceService: chronology timeline, contradiction detection,
 *    and ask/realtime-check Q&A over retrieved evidence.
 *  - IntelligenceController: HTTP endpoints under /v1/matters/:matterId.
 *
 * Schema tables (owned here, defined in intelligence.ts):
 *  - facts, factIssues, factRelevance, factSources, factVersions
 *  - events, eventFacts, eventEntities
 *
 * Dependencies:
 *  - VectorModule (semantic + keyword retrieval over document chunks)
 *  - AccessControlModule (policy assertions)
 *  - AuditModule (change logging)
 *
 * LLM analysis runs through ModelGatewayService (PlatformAiModule) with
 * AiService for schema-validated answers. Contradiction detection is delegated
 * to InconsistenciesModule, the owner of the `contradictions` table.
 */
@Module({
  imports: [
    AccessControlModule,
    AuditModule,
    VectorModule,
    InconsistenciesModule,
    PlatformAiModule,
  ],
  controllers: [IntelligenceController],
  providers: [IntelligenceService],
})
export class IntelligenceModule {}
