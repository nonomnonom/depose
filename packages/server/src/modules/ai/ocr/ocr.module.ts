import { forwardRef, Module } from '@nestjs/common';
import { AiRuntimeModule } from '../runtime/ai-runtime.module.js';
import { JobsModule } from '../../jobs/jobs.module.js';
import { DocumentsModule } from '../../documents/documents.module.js';
import { OcrService } from './ocr.service.js';
import { OcrProcessor } from './ocr.processor.js';

@Module({
  imports: [AiRuntimeModule, JobsModule, forwardRef(() => DocumentsModule)],
  providers: [OcrService, OcrProcessor],
  exports: [OcrService],
})
export class OcrModule {}
