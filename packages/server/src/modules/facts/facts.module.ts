import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { ExtractionModule } from '../extraction/extraction.module.js';
import { SearchModule } from '../search/search.module.js';
import { FactsController } from './facts.controller.js';
import { FactsService } from './facts.service.js';

@Module({
  imports: [AccessControlModule, ExtractionModule, SearchModule],
  controllers: [FactsController],
  providers: [FactsService],
})
export class FactsModule {}
