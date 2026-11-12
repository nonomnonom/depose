import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AllowNonMember } from '../../common/decorators/allow-non-member.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ErrorEnvelopeDto } from '../../common/openapi/error.model.js';
import { ApiSessionAuth } from '../../common/openapi/session-auth.decorator.js';
import { zodToOpenApiSchema } from '../../common/openapi/zod-schema.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { ZodBodyPipe } from '../../common/zod.pipe.js';
import { createInvitationSchema, type CreateInvitationInput } from './identity.dto.js';
import {
  AcceptInvitationResponseDto,
  InvitationListDto,
  PublicInvitationResponseDto,
} from './identity.response.js';
import { InvitationsService } from './invitations.service.js';

@ApiTags('Firm invitations')
@ApiSessionAuth()
@Controller('v1/firm/invitations')
export class InvitationsController {
  constructor(
    private readonly invitations: InvitationsService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List invitations sent by the current firm' })
  @ApiOkResponse({ description: 'Invitations', type: InvitationListDto })
  async list() {
    const actor = this.context.requireFirmActor();
    return { items: await this.invitations.list(actor) };
  }

  @Post()
  @ApiOperation({ summary: 'Invite someone to the firm' })
  @ApiBody({ schema: zodToOpenApiSchema(createInvitationSchema) })
  @ApiCreatedResponse({ description: 'Invitation sent', type: PublicInvitationResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid payload', type: ErrorEnvelopeDto })
  @ApiConflictResponse({ description: 'Already a member or already invited', type: ErrorEnvelopeDto })
  async create(@Body(new ZodBodyPipe(createInvitationSchema)) body: CreateInvitationInput) {
    const actor = this.context.requireFirmActor();
    return { invitation: await this.invitations.create(actor, body) };
  }

  @Post(':id/resend')
  @ApiOperation({ summary: 'Send the invitation again with a fresh link' })
  @ApiParam({ name: 'id', description: 'Invitation id' })
  @ApiOkResponse({ description: 'Invitation resent', type: PublicInvitationResponseDto })
  @ApiNotFoundResponse({ description: 'Invitation not found', type: ErrorEnvelopeDto })
  async resend(@Param('id') id: string) {
    const actor = this.context.requireFirmActor();
    return { invitation: await this.invitations.resend(actor, id) };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke a pending invitation' })
  @ApiParam({ name: 'id', description: 'Invitation id' })
  @ApiOkResponse({ description: 'Invitation revoked', schema: { type: 'object' } })
  @ApiNotFoundResponse({ description: 'Pending invitation not found', type: ErrorEnvelopeDto })
  async revoke(@Param('id') id: string) {
    const actor = this.context.requireFirmActor();
    return this.invitations.revoke(actor, id);
  }
}

@ApiTags('Invitations')
@Controller('v1/invitations')
export class PublicInvitationsController {
  constructor(
    private readonly invitations: InvitationsService,
    private readonly context: RequestContextService,
  ) {}

  @Public()
  @Get(':token')
  @ApiOperation({ summary: 'Look up an invitation by its link token' })
  @ApiParam({ name: 'token', description: 'Token from the invitation email' })
  @ApiOkResponse({ description: 'Invitation', type: PublicInvitationResponseDto })
  @ApiNotFoundResponse({ description: 'Invitation not found', type: ErrorEnvelopeDto })
  async get(@Param('token') token: string) {
    return { invitation: await this.invitations.getPublic(token) };
  }

  @AllowNonMember()
  @ApiSessionAuth()
  @Post(':token/accept')
  @ApiOperation({
    summary: 'Accept an invitation',
    description: 'The signed-in account email must match the invitation email.',
  })
  @ApiParam({ name: 'token', description: 'Token from the invitation email' })
  @ApiOkResponse({ description: 'Membership created', type: AcceptInvitationResponseDto })
  @ApiBadRequestResponse({ description: 'Invitation is no longer valid', type: ErrorEnvelopeDto })
  @ApiNotFoundResponse({ description: 'Invitation not found', type: ErrorEnvelopeDto })
  async accept(@Param('token') token: string) {
    const actor = this.context.requireActor();
    return this.invitations.accept(actor, token);
  }
}
