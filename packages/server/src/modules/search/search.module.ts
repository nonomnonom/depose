import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { VectorModule } from '../vector/vector.module.js';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';

/**
 * Search — full-text and semantic search over matter evidence.
 *
 * Provides:
 *  - SearchService: keyword and hybrid search orchestration.
 *  - SearchController: HTTP search endpoints.
 *
 * Depends on:
 *  - VectorModule (semantic search via Qdrant)
 *  - AccessControlModule (policy assertions)
 *
 * VectorService is owned by VectorModule, not SearchModule. SearchModule
 * imports it as a dependency.
 */
@Module({
  imports: [AccessControlModule, VectorModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
