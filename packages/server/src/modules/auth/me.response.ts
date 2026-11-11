import { ApiProperty } from '@nestjs/swagger';
import { TenantDto } from '../../common/openapi/auth-policy.model.js';

export class MeUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty()
  name!: string;
}

export class MeFirmDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: ['id', 'en'] })
  primaryLanguage!: string;

  @ApiProperty()
  jurisdiction!: string;

  @ApiProperty()
  defaultTimezone!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  settings!: Record<string, unknown>;

  @ApiProperty({ enum: ['admin', 'lawyer', 'paralegal', 'viewer', 'guest'] })
  role!: string;

  @ApiProperty({ description: 'Firm membership id' })
  memberId!: string;
}

export class MeAuthDto {
  @ApiProperty()
  allowSelfSignup!: boolean;

  @ApiProperty()
  forceSso!: boolean;

  @ApiProperty()
  ssoEnabled!: boolean;

  @ApiProperty()
  requireEmailVerification!: boolean;
}

export class MeResponseDto {
  @ApiProperty({ type: MeUserDto })
  user!: MeUserDto;

  @ApiProperty({ type: MeFirmDto, nullable: true, description: 'Null until the user joins a firm' })
  firm!: MeFirmDto | null;

  @ApiProperty({ type: TenantDto, nullable: true })
  tenant!: TenantDto | null;

  @ApiProperty({ description: 'True when the user still has to create a firm' })
  setupRequired!: boolean;

  @ApiProperty({ type: MeAuthDto })
  auth!: MeAuthDto;
}

export class PermissionsResponseDto {
  @ApiProperty({
    type: [String],
    description: 'Canonical action identifiers allowed for the current firm role',
    example: ['firm.read', 'matter.read', 'matter.create'],
  })
  permissions!: string[];
}
