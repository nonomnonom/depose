import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { MatterSettingsController } from './matter-settings.controller.js';
import { MatterSettingsService } from './matter-settings.service.js';
import { MattersController } from './matters.controller.js';
import { MattersService } from './matters.service.js';

@Module({
  imports: [AccessControlModule, AuditModule],
  controllers: [MattersController, MatterSettingsController],
  providers: [MattersService, MatterSettingsService],
  exports: [MattersService, MatterSettingsService],
})
export class MattersModule {}
