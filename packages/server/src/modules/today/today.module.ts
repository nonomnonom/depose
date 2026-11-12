import { Module } from '@nestjs/common';
import { TodayController } from './today.controller.js';
import { TodayService } from './today.service.js';

@Module({
  controllers: [TodayController],
  providers: [TodayService],
})
export class TodayModule {}
