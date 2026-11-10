import { Controller, Get } from "@nestjs/common";
import { Public } from "@thallesp/nestjs-better-auth";
import { appConfig } from "../../config/app.config.js";

@Controller("public-config")
export class PublicConfigController {
  @Get()
  @Public()
  get() {
    const smtpConfigured = Boolean(appConfig.smtp);
    return {
      auth: {
        emailPasswordEnabled: !appConfig.auth.forceSso,
        ssoEnabled: appConfig.auth.ssoEnabled,
        forceSso: appConfig.auth.forceSso,
        allowSelfSignup: appConfig.auth.allowSelfSignup,
        requireEmailVerification: appConfig.auth.requireEmailVerification,
        passwordResetEnabled: smtpConfigured,
        smtpConfigured,
      },
    };
  }
}
