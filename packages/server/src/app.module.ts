import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { CommonModule } from './common/common.module.js';
import { CsrfGuard } from './common/csrf.guard.js';
import { AllExceptionsFilter } from './common/exception.filter.js';
import { RequestIdMiddleware } from './common/request-id.middleware.js';
import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { MailModule } from './infrastructure/mail/mail.module.js';
import { AccessControlModule } from './modules/access-control/access-control.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { SessionGuard } from './modules/auth/session.guard.js';
import { FirmsModule } from './modules/firms/firms.module.js';
import { MattersModule } from './modules/matters/matters.module.js';
import { OnboardingModule } from './modules/onboarding/onboarding.module.js';
import { TenancyModule } from './modules/tenancy/tenancy.module.js';
import { TenantGuard } from './modules/tenancy/tenant.guard.js';
import { TenantMiddleware } from './modules/tenancy/tenant.middleware.js';

@Module({
  imports: [
    AppConfigModule,
    CommonModule,
    DatabaseModule,
    MailModule,
    AuditModule,
    AccessControlModule,
    TenancyModule,
    AuthModule,
    FirmsModule,
    MattersModule,
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
