import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { ApiKeysController } from './api-keys.controller.js';
import { ApiKeysService } from './api-keys.service.js';

/**
 * API Keys — firm-level API key management for programmatic access.
 *
 * Schema tables (owned here, defined in platform.ts):
 *  - apiKeys (firm API keys with secretHash, prefix, scopes)
 *
 * Dependencies:
 *  - AccessControlModule (policy assertions, firm-level)
 *  - AuditModule (change logging)
 *
 * API key validation is done by the auth layer. This module only manages
 * CRUD for keys.
 */
@Module({
  imports: [AccessControlModule, AuditModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
