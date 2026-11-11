import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AuthService } from './auth.service.js';
import { MeController } from './me.controller.js';

@Module({
  imports: [AuditModule],
  providers: [AuthService],
  controllers: [MeController],
  exports: [AuthService],
})
export class AuthModule {}
