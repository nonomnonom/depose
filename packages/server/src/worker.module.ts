import { Module } from '@nestjs/common';
import { AiModule as NestAiModule } from '@nestjs/ai';
import { AuditModule } from './modules/audit/audit.module.js';
import { AccessControlModule } from './modules/access-control/access-control.module.js';
import { CommonModule } from './common/common.module.js';
import { AppConfigModule } from './config/config.module.js';
import { aiRegistryOptions } from './config/ai-registry.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { RedisModule } from './infrastructure/redis/redis.module.js';
import { StorageModule } from './infrastructure/storage/storage.module.js';
import { WorkerProcessorsModule } from './modules/jobs/worker-processors.module.js';
import { AiRuntimeModule } from './modules/ai/runtime/ai-runtime.module.js';

/**
 * Worker process: database, Redis, storage, AI gateway, and every BullMQ
 * consumer — no HTTP controllers and no auth. Run it with
 * `node dist/worker.main.js` while API replicas set WORKER_ENABLED=false.
 */
@Module({
  imports: [
    NestAiModule.forRoot({ isGlobal: true, ...aiRegistryOptions() }),
    AppConfigModule,
    CommonModule,
    DatabaseModule,
    RedisModule,
    StorageModule,
    AuditModule,
    AccessControlModule,
    AiRuntimeModule,
    WorkerProcessorsModule,
  ],
})
export class WorkerModule {}
