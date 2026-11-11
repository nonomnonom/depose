import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { MailModule } from '../../infrastructure/mail/mail.module.js';
import {
  InvitationsController,
  PublicInvitationsController,
} from './invitations.controller.js';
import { InvitationsService } from './invitations.service.js';
import { MembersController } from './members.controller.js';
import { MembersService } from './members.service.js';

@Module({
  imports: [AccessControlModule, AuditModule, MailModule],
  controllers: [MembersController, InvitationsController, PublicInvitationsController],
  providers: [MembersService, InvitationsService],
})
export class IdentityModule {}
