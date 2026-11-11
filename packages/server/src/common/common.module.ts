import { Global, Module } from '@nestjs/common';
import { RequestContextService } from './request-context.service.js';
import { RateLimitService } from './rate-limit.service.js';

@Global()
@Module({
  providers: [RequestContextService, RateLimitService],
  exports: [RequestContextService, RateLimitService],
})
export class CommonModule {}
