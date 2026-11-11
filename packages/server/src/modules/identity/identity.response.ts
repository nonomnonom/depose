import { ApiProperty } from '@nestjs/swagger';
import { firmRoleValues } from './identity.dto.js';

export class MemberDto {
  @ApiProperty({ description: 'Member row id' })
  id!: string;

  @ApiProperty({ description: 'User id' })
  userId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ enum: firmRoleValues })
  role!: string;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty({ format: 'date-time' })
  joinedAt!: string;
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

  @ApiProperty({ enum: ['pending', 'accepted', 'revoked', 'expired'] })
  status!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ description: 'Name of the member who sent the invitation' })
  inviterName!: string;
}

export class InvitationListDto {
  @ApiProperty({ type: [InvitationDto] })
  items!: InvitationDto[];
}

export class InvitationResponseDto {
  @ApiProperty({ type: InvitationDto })
  invitation!: InvitationDto;
}

export class PublicInvitationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty()
  firmName!: string;

  @ApiProperty()
  firmSlug!: string;

  @ApiProperty()
  inviterName!: string;

  @ApiProperty({ enum: firmRoleValues })
  role!: string;

  @ApiProperty({ enum: ['pending', 'accepted', 'revoked', 'expired'] })
  status!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;
}

export class PublicInvitationResponseDto {
  @ApiProperty({ type: PublicInvitationDto })
  invitation!: PublicInvitationDto;
}

export class AcceptInvitationResponseDto {
  @ApiProperty({ type: MemberDto })
  member!: MemberDto;

  @ApiProperty()
  firmSlug!: string;
}
