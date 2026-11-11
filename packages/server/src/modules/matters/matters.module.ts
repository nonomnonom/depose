import { Module } from '@nestjs/common';
import { FirmsModule } from '../firms/firms.module.js';
import { MattersController } from './matters.controller.js';
import { MattersService } from './matters.service.js';

@Module({
  imports: [FirmsModule],
  controllers: [MattersController],
  providers: [MattersService],
  exports: [MattersService],
})
export class MattersModule {}
