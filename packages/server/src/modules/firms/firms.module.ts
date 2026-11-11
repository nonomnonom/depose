import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { FirmsController } from './firms.controller.js';
import { FirmsService } from './firms.service.js';

@Module({
  imports: [AccessControlModule, AuthModule],
  controllers: [FirmsController],
  providers: [FirmsService],
  exports: [FirmsService],
})
export class FirmsModule {}
