import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '../../common/openapi/error.model.js';
import { ApiSessionAuth } from '../../common/openapi/session-auth.decorator.js';
import { zodToOpenApiSchema } from '../../common/openapi/zod-schema.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { ZodBodyPipe } from '../../common/zod.pipe.js';
import { updateMemberRoleSchema, type UpdateMemberRoleInput } from './identity.dto.js';
import { MemberListDto, MemberResponseDto } from './identity.response.js';
import { MembersService } from './members.service.js';

@ApiTags('Firm members')
@ApiSessionAuth()
@Controller('v1/firm/members')
export class MembersController {
  constructor(
    private readonly members: MembersService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List members of the current firm' })
  @ApiOkResponse({ description: 'Firm members', type: MemberListDto })
  async list() {
    const actor = this.context.requireFirmActor();
    return { items: await this.members.list(actor) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Change a member role' })
  @ApiParam({ name: 'id', description: 'Member id' })
  @ApiBody({ schema: zodToOpenApiSchema(updateMemberRoleSchema) })
  @ApiOkResponse({ description: 'Updated member', type: MemberResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid role', type: ErrorEnvelopeDto })
  @ApiNotFoundResponse({ description: 'Member not found', type: ErrorEnvelopeDto })
  @ApiConflictResponse({ description: 'Would leave the firm without an admin', type: ErrorEnvelopeDto })
  async updateRole(
    @Param('id') id: string,
    @Body(new ZodBodyPipe(updateMemberRoleSchema)) body: UpdateMemberRoleInput,
  ) {
    const actor = this.context.requireFirmActor();
    return { member: await this.members.updateRole(actor, id, body.role) };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a member from the firm' })
  @ApiParam({ name: 'id', description: 'Member id' })
  @ApiOkResponse({ description: 'Member removed', schema: { type: 'object' } })
  @ApiNotFoundResponse({ description: 'Member not found', type: ErrorEnvelopeDto })
  @ApiConflictResponse({ description: 'Cannot remove yourself or the last admin', type: ErrorEnvelopeDto })
  async remove(@Param('id') id: string) {
    const actor = this.context.requireFirmActor();
    return this.members.remove(actor, id);
  }
}
