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
import { DocumentsModule } from './modules/documents/documents.module.js';
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
    NestAiModule.forRootAsync({
      isGlobal: true,
      useFactory: () => {
        const provider = createOpenAICompatible({
          name: 'depose',
          baseURL: appConfig.ai.baseUrl,
          apiKey: appConfig.ai.apiKey ?? 'not-configured',
        });
        return {
          models: { default: provider(appConfig.ai.model) },
          defaults: {
            timeout: '45s',
            retry: { attempts: 2 },
            maxSteps: 6,
          },
        };
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
    DocumentsModule,
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
