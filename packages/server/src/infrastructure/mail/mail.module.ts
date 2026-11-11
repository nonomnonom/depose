import { Module } from '@nestjs/common';
import { MailService } from './send-mail.js';

@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailInfrastructureModule {}
