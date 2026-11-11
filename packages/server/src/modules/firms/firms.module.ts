import { Module } from '@nestjs/common';
import { FirmsController } from './firms.controller.js';
import { FirmsService } from './firms.service.js';

@Module({
  controllers: [FirmsController],
  providers: [FirmsService],
  exports: [FirmsService],
})
export class FirmsModule {}
