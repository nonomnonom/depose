import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { SubsetsController } from './subsets.controller.js';
import { SubsetsService } from './subsets.service.js';

@Module({
  imports: [AccessControlModule],
  controllers: [SubsetsController],
  providers: [SubsetsService],
})
export class SubsetsModule {}
