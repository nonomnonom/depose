import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';
import { VectorService } from './vector.service.js';

@Module({
  imports: [AccessControlModule],
  controllers: [SearchController],
  providers: [SearchService, VectorService],
  exports: [SearchService, VectorService],
})
export class SearchModule {}
