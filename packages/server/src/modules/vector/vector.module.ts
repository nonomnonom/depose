import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { VectorService } from './vector.service.js';

/**
 * Vector — embedding index and semantic search via Qdrant.
 *
 * Owns:
 *  - VectorService: Qdrant collection management, document/chunk/fact
 *    embedding indexing, semantic search with filtering.
 *
 * This is platform infrastructure: it does not depend on any tenant module.
 * Tenant modules (SearchModule, ExtractionModule, FactsModule, DocumentsModule)
 * import VectorModule to index and search vectors.
 *
 * Configured via appConfig.retrieval (qdrantUrl, qdrantApiKey,
 * embeddingBaseUrl, embeddingModel, embeddingDimension, collectionPrefix).
 */
@Module({
  imports: [DatabaseModule],
  providers: [VectorService],
  exports: [VectorService],
})
export class VectorModule {}
