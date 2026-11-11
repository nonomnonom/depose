import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { MattersController } from './matters.controller.js';
import { MattersService } from './matters.service.js';

@Module({
  imports: [AccessControlModule],
  controllers: [MattersController],
  providers: [MattersService],
  exports: [MattersService],
})
export class MattersModule {}
