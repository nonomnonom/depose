import { Module } from "@nestjs/common";
import { AuthModule as BetterAuthModule } from "@thallesp/nestjs-better-auth";
import { createAuth } from "./auth.config.js";
import { MailService } from "../../infrastructure/mail/send-mail.js";

@Module({
  imports: [
    BetterAuthModule.forRootAsync({
      inject: [MailService],
      useFactory: (mailService: MailService) => ({
        auth: createAuth(mailService),
      }),
    }),
  ],
})
export class AuthModule {}
