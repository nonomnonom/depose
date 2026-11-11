import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { ExtractionsModule } from '../ai/extractions/extractions.module.js';
import { SearchModule } from '../search/search.module.js';
import { VectorModule } from '../vector/vector.module.js';
import { FactsController } from './facts.controller.js';
import { FactsService } from './facts.service.js';

@Module({
  imports: [AccessControlModule, ExtractionsModule, SearchModule, VectorModule],
  controllers: [FactsController],
  providers: [FactsService],
})
export class FactsModule {}
