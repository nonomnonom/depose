import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { FirmSettingsController } from './firm-settings.controller.js';
import { FirmSettingsService } from './firm-settings.service.js';
import { FirmsController } from './firms.controller.js';
import { FirmsService } from './firms.service.js';

@Module({
  imports: [AccessControlModule, AuditModule, AuthModule],
  controllers: [FirmsController, FirmSettingsController],
  providers: [FirmsService, FirmSettingsService],
  exports: [FirmsService, FirmSettingsService],
})
export class FirmsModule {}
