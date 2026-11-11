import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { RealtimeController } from './realtime.controller.js';
import { RealtimeService } from './realtime.service.js';

/**
 * Realtime — live transcription sessions, lines, and alerts during hearings.
 *
 * Schema tables (owned here, defined in platform.ts):
 *  - realtimeSessions, realtimeLines, realtimeAlerts, realtimeAlertFacts
 *
 * Dependencies:
 *  - AccessControlModule (policy assertions)
 *  - AuditModule (change logging)
 *
 * This module does NOT own the transcription pipeline — that belongs to
 * the documents module. It only owns session lifecycle and alert review.
 */
@Module({
  imports: [AccessControlModule, AuditModule],
  controllers: [RealtimeController],
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
