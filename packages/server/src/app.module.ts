import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AiModule as NestAiModule } from '@nestjs/ai';
import { appConfig } from './config/app.config.js';
import { aiRegistryOptions } from './config/ai-registry.js';
import { AppController } from './app.controller.js';
import { CommonModule } from './common/common.module.js';
import { CsrfGuard } from './common/csrf.guard.js';
import { AllExceptionsFilter } from './common/exception.filter.js';
import { RequestIdMiddleware } from './common/request-id.middleware.js';
import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { MailModule } from './infrastructure/mail/mail.module.js';
import { StorageModule } from './infrastructure/storage/storage.module.js';
import { AccessControlModule } from './modules/access-control/access-control.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { SessionGuard } from './modules/auth/session.guard.js';
import { AiRuntimeModule } from './modules/ai/runtime/ai-runtime.module.js';
import { MatterAgentModule } from './modules/ai/matter-agent/matter-agent.module.js';
import { ConversationsModule } from './modules/ai/conversations/conversations.module.js';
import { JobsModule } from './modules/jobs/jobs.module.js';
import { WorkerProcessorsModule } from './modules/jobs/worker-processors.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { ExtractionsModule } from './modules/ai/extractions/extractions.module.js';
import { SystemOneModule } from './modules/ai/system-one/system-one.module.js';
import { FactsModule } from './modules/facts/facts.module.js';
import { FirmsModule } from './modules/firms/firms.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { MattersModule } from './modules/matters/matters.module.js';
import { McpRegistryModule } from './modules/mcp-registry/mcp-registry.module.js';
import { DeposeMcpServerModule } from './modules/mcp-server/mcp-server.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { ApiKeysModule } from './modules/api-keys/api-keys.module.js';
import { EntitiesModule } from './modules/entities/entities.module.js';
import { IssuesModule } from './modules/issues/issues.module.js';
import { RealtimeModule } from './modules/realtime/realtime.module.js';
import { RelevanceModule } from './modules/relevance/relevance.module.js';
import { SummaryThemeModule } from './modules/summary-theme/summary-theme.module.js';
import { TodayModule } from './modules/today/today.module.js';
import { OnboardingModule } from './modules/onboarding/onboarding.module.js';
import { OutputsModule } from './modules/outputs/outputs.module.js';
import { SearchModule } from './modules/search/search.module.js';
import { VectorModule } from './modules/vector/vector.module.js';
import { SubsetsModule } from './modules/subsets/subsets.module.js';
import { TenancyModule } from './modules/tenancy/tenancy.module.js';
import { UserPreferencesModule } from './modules/settings/user-preferences.module.js';
import { IntelligenceModule } from './modules/intelligence/intelligence.module.js';
import { ChronologyModule } from './modules/chronology/chronology.module.js';
import { WebhooksModule } from './modules/webhooks/webhooks.module.js';
import { TenantGuard } from './modules/tenancy/tenant.guard.js';
import { TenantMiddleware } from './modules/tenancy/tenant.middleware.js';
import { RedisModule } from './infrastructure/redis/redis.module.js';
import { RateLimitGuard } from './common/rate-limit.guard.js';

@Module({
  imports: [
    NestAiModule.forRoot({ isGlobal: true, ...aiRegistryOptions() }),
    AppConfigModule,
    CommonModule,
    DatabaseModule,
    RedisModule,
    MailModule,
    StorageModule,
    AuditModule,
    AccessControlModule,
    TenancyModule,
    AuthModule,
    AiRuntimeModule,
    MatterAgentModule,
    ConversationsModule,
    JobsModule,
    DocumentsModule,
    ExtractionsModule,
    SystemOneModule,
    FactsModule,
    FirmsModule,
    IdentityModule,
    MattersModule,
    McpRegistryModule,
    DeposeMcpServerModule,
    NotificationsModule,
    OnboardingModule,
    OutputsModule,
    SearchModule,
    VectorModule,
    SubsetsModule,
    UserPreferencesModule,
    IntelligenceModule,
    ChronologyModule,
    WebhooksModule,
    ApiKeysModule,
    EntitiesModule,
    IssuesModule,
    RealtimeModule,
    RelevanceModule,
    SummaryThemeModule,
    TodayModule,
    /* Consumers are opt-out so a single container still processes jobs by default. */
    ...(appConfig.worker.enabled ? [WorkerProcessorsModule] : []),
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware, TenantMiddleware)
      .forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
