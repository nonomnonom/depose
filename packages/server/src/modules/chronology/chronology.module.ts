import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { ChronologyController } from './chronology.controller.js';
import { ChronologyService } from './chronology.service.js';

@Module({
  imports: [AccessControlModule],
  controllers: [ChronologyController],
  providers: [ChronologyService],
})
export class ChronologyModule {}
