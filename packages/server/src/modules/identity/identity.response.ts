import { ApiProperty } from '@nestjs/swagger';
import { firmRoleValues } from './identity.dto.js';

export class MemberDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: firmRoleValues })
  role!: string;

  @ApiProperty({ format: 'date-time' })
  joinedAt!: string;

  @ApiProperty({ enum: ['invited', 'active'] })
  status!: string;
}

export class MemberListDto {
  @ApiProperty({ type: [MemberDto] })
  items!: MemberDto[];
}

export class MemberResponseDto {
  @ApiProperty({ type: MemberDto })
  member!: MemberDto;
}

export class InvitationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ enum: firmRoleValues })
  role!: string;

  @ApiProperty({ format: 'date-time' })
  createdInvitation!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;

  @ApiProperty({ enum: ['pending', 'accepted', 'revoked', 'expired'] })
  status!: string;
}

export class PublicInvitationDto extends InvitationDto {
  @ApiProperty()
  firmName!: string;

  @ApiProperty()
  inviterName!: string;
}

export class InvitationSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ enum: firmRoleValues })
  role!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;

  @ApiProperty({ enum: ['pending', 'accepted', 'revoked', 'expired'] })
  status!: string;

  @ApiProperty()
  inviterName!: string;
}

export class InvitationListDto {
  @ApiProperty({ type: [InvitationSummaryDto] })
  items!: InvitationSummaryDto[];
}

export class PublicInvitationResponseDto {
  @ApiProperty({ type: PublicInvitationDto })
  invitation!: PublicInvitationDto;

  @ApiProperty()
  status!: string;
}

export class AcceptInvitationResponseDto {
  @ApiProperty()
  member!: MemberDto;
}
