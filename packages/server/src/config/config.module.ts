import { Global, Module } from '@nestjs/common';
import { appConfig, type AppConfig } from './app.config.js';

export const APP_CONFIG = Symbol('APP_CONFIG');

@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useValue: appConfig }],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}

export type { AppConfig };
