import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Module } from '@nestjs/common';

const __dirname = dirname(fileURLToPath(import.meta.url));
import { FileTemplateEngine, MailModule as BaseMailModule } from '@nestjs/mail';
import { MastraModule } from '@mastra/nestjs';
import { appConfig } from './config/app.config.js';
import { AppConfigModule } from './config/config.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { FactsModule } from './modules/facts/facts.module.js';
import { FirmsModule } from './modules/firms/firms.module.js';
import { IntelligenceModule } from './modules/intelligence/intelligence.module.js';
import { MattersModule } from './modules/matters/matters.module.js';
import { OnboardingModule } from './modules/onboarding/onboarding.module.js';
import { PublicConfigModule } from './modules/public-config/public-config.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { mastra } from './infrastructure/mastra/index.js';
import { createMailTransport } from './infrastructure/mail/transport.js';
import { MailInfrastructureModule } from './infrastructure/mail/mail.module.js';
import { QueueModule } from './infrastructure/worker/queue.module.js';

@Module({
  imports: [
    AppConfigModule,

    // Mail infrastructure: SMTP or file transport + template engine
    BaseMailModule.forRootAsync({
      useFactory: () => ({
        transport: createMailTransport(),
        templateEngine: new FileTemplateEngine({
          dir: resolve(__dirname, 'infrastructure/mail/templates'),
          layout: 'layout',
        }),
      }),
    }),
    MailInfrastructureModule,

    AuthModule,
    FirmsModule,
    MattersModule,
    DocumentsModule,
    FactsModule,
    IntelligenceModule,
    OnboardingModule,
    PublicConfigModule,

    // Global queue module that provides IngestQueueService for enqueueing jobs
    QueueModule,

    // Keep last: MastraModule registers a catch-all controller.
    MastraModule.register({
      mastra,
      prefix: appConfig.mastra.prefix,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
