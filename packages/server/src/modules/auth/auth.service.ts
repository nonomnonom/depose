import { Injectable } from '@nestjs/common';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { sso } from '@better-auth/sso';
import { betterAuth } from 'better-auth';
import { organization } from 'better-auth/plugins';
import { toNodeHandler } from 'better-auth/node';
import { appConfig } from '../../config/app.config.js';
import { db } from '../../infrastructure/database/database.client.js';
import * as schema from '../../infrastructure/database/schema/index.js';
import { MailService } from '../../infrastructure/mail/mail.service.js';

export function createAuth(mail: MailService) {
  return betterAuth({
    appName: 'Depose',
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    baseURL: appConfig.auth.baseUrl,
    secret:
      appConfig.auth.secret ??
      (appConfig.isProduction
        ? undefined
        : 'depose-development-secret-change-me-please-32'),
    trustedOrigins: appConfig.auth.trustedOrigins,
    plugins: [organization(), ...(appConfig.auth.ssoEnabled ? [sso()] : [])],
    emailAndPassword: {
      enabled: !appConfig.auth.forceSso,
      requireEmailVerification: appConfig.auth.requireEmailVerification,
      disableSignUp: !appConfig.auth.allowSelfSignup,
      sendResetPassword: async ({ user, url }: { user: { email: string; name: string }; url: string }) => {
        await mail.sendTemplate('reset-password', user.email, {
          name: user.name,
          url,
        });
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }: { user: { email: string; name: string }; url: string }) => {
        await mail.sendTemplate('verify-email', user.email, {
          name: user.name,
          url,
        });
      },
    },
    advanced: {
      cookiePrefix: 'depose',
      useSecureCookies: appConfig.isProduction,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: appConfig.isProduction,
      },
    },
  });
}

export type DeposeAuth = ReturnType<typeof createAuth>;

@Injectable()
export class AuthService {
  readonly instance: DeposeAuth;

  constructor(mail: MailService) {
    this.instance = createAuth(mail);
  }

  get api(): DeposeAuth['api'] {
    return this.instance.api;
  }

  get nodeHandler() {
    return toNodeHandler(this.instance);
  }
}
