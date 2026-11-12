import { forwardRef, Module } from '@nestjs/common';
import { AccessControlModule } from '../../access-control/access-control.module.js';
import { AiRuntimeModule } from '../runtime/ai-runtime.module.js';
import { JobsModule } from '../../jobs/jobs.module.js';
import { VectorModule } from '../../vector/vector.module.js';
import { EmbeddingService } from './embedding.service.js';
import { EmbeddingProcessor } from './embedding.processor.js';
import { EmbeddingController } from './embedding.controller.js';

@Module({
  imports: [
    AccessControlModule,
    AiRuntimeModule,
    JobsModule,
    forwardRef(() => VectorModule),
  ],
  controllers: [EmbeddingController],
  providers: [EmbeddingService, EmbeddingProcessor],
  exports: [EmbeddingService],
})
export class AiEmbedingModule {}
