import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AiModule as NestAiModule } from '@nestjs/ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { appConfig } from './config/app.config.js';
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
import { AiModule } from './modules/ai/ai.module.js';
import { JobsModule } from './modules/jobs/jobs.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { ExtractionModule } from './modules/extraction/extraction.module.js';
import { FactsModule } from './modules/facts/facts.module.js';
import { FirmsModule } from './modules/firms/firms.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { MattersModule } from './modules/matters/matters.module.js';
import { McpModule } from './modules/mcp/mcp.module.js';
import { DeposeMcpServerModule } from './modules/mcp-server/mcp-server.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { OnboardingModule } from './modules/onboarding/onboarding.module.js';
import { TenancyModule } from './modules/tenancy/tenancy.module.js';
import { TenantGuard } from './modules/tenancy/tenant.guard.js';
import { TenantMiddleware } from './modules/tenancy/tenant.middleware.js';

@Module({
  imports: [
    NestAiModule.forRoot({
      isGlobal: true,
      /*
       * Sentinel only: @nestjs/ai requires a registry entry, but every Dep AI
       * call passes the firm's BYOK LanguageModel from ModelGatewayService.
       * This endpoint is never reachable and holds no key from env.
       */
      models: {
        unconfigured: createOpenAICompatible({
          name: 'unconfigured',
          baseURL: 'http://127.0.0.1:1/v1',
          apiKey: 'unused',
        })('unconfigured'),
      },
      defaults: {
        timeout: `${appConfig.ai.timeoutMs}ms`,
        retry: { attempts: appConfig.ai.maxRetries },
        maxSteps: 10,
      },
    }),
    AppConfigModule,
    CommonModule,
    DatabaseModule,
    MailModule,
    StorageModule,
    AuditModule,
    AccessControlModule,
    TenancyModule,
    AuthModule,
    AiModule,
    JobsModule,
    DocumentsModule,
    ExtractionModule,
    FactsModule,
    FirmsModule,
    IdentityModule,
    MattersModule,
    McpModule,
    DeposeMcpServerModule,
    NotificationsModule,
    OnboardingModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: TenantGuard },
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
