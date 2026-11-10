import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { organization } from "better-auth/plugins";
import { sso } from "@better-auth/sso";
import { appConfig } from "../../config/app.config.js";
import { db } from "../../infrastructure/database/database.client.js";
import { type MailService } from "../../infrastructure/mail/send-mail.js";

export function createAuth(mailService: MailService): BetterAuthOptions {
  const options: BetterAuthOptions = {
    database: drizzleAdapter(db, {
      provider: "pg",
    }),
    baseURL: appConfig.auth.baseUrl,
    secret: appConfig.auth.secret,
    trustedOrigins: appConfig.auth.trustedOrigins,
    plugins: [
      organization(),
      ...(appConfig.auth.ssoEnabled ? [sso()] : []),
    ],
    emailAndPassword: {
      enabled: !appConfig.auth.forceSso,
      requireEmailVerification: appConfig.auth.requireEmailVerification,
      disableSignUp: !appConfig.auth.allowSelfSignup,
      ...(appConfig.mail.transport === "smtp"
        ? {
            sendResetPassword: async ({ user, url }) => {
              await mailService.sendTemplate(
                "reset-password",
                user.email,
                "Reset your Depose password",
                { name: user.name ?? "", url },
              );
            },
          }
        : {}),
    },
    ...(appConfig.mail.transport === "smtp"
      ? {
          emailVerification: {
            sendVerificationEmail: async ({ user, url }) => {
              await mailService.sendTemplate(
                "verify-email",
                user.email,
                "Verify your email for Depose",
                { name: user.name ?? "", url },
              );
            },
          },
        }
      : {}),
  };

  return options;
}

/** Legacy export kept for backward compatibility. */
export const auth = betterAuth<BetterAuthOptions>(
  createAuth({} as MailService),
);
