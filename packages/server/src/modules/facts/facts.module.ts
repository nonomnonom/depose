import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { FactsController } from './facts.controller.js';
import { FactsService } from './facts.service.js';

@Module({
  imports: [AccessControlModule],
  controllers: [FactsController],
  providers: [FactsService],
})
export class FactsModule {}
