import { ApiProperty } from '@nestjs/swagger';

export class FirmDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Better Auth organization id' })
  organizationId!: string;

  @ApiProperty({ example: 'Malkan & Partners' })
  name!: string;

  @ApiProperty({ example: 'malkan-partners' })
  slug!: string;

  @ApiProperty({ enum: ['id', 'en'], example: 'id' })
  primaryLanguage!: string;

  @ApiProperty({ example: 'ID' })
  jurisdiction!: string;

  @ApiProperty({ example: 'Asia/Jakarta' })
  defaultTimezone!: string;

  @ApiProperty({ description: 'User id of the firm owner' })
  ownerId!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  settings!: Record<string, unknown>;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class FirmResponseDto {
  @ApiProperty({ type: FirmDto })
  firm!: FirmDto;
}

export class FirmSetupResponseDto {
  @ApiProperty({ type: FirmDto })
  firm!: FirmDto;

  @ApiProperty({ example: 'malkan-partners.localhost' })
  primaryHost!: string;

  @ApiProperty({ example: 'https://malkan-partners.localhost' })
  loginUrl!: string;

  @ApiProperty({ description: 'Whether the current host was mapped for local development' })
  currentHostEnabled!: boolean;
}

export class FirmDomainDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'malkan-partners.localhost' })
  hostname!: string;

  @ApiProperty({ enum: ['subdomain', 'custom'] })
  domainType!: string;

  @ApiProperty()
  isPrimary!: boolean;

  @ApiProperty({ enum: ['pending', 'verifying', 'active', 'failed', 'disabled'] })
  status!: string;

  @ApiProperty({ enum: ['pending', 'issued', 'expired', 'failed', 'external'] })
  sslStatus!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastCheckedAt!: string | null;

  @ApiProperty({ type: String, nullable: true })
  lastError!: string | null;
}

export class FirmDomainsResponseDto {
  @ApiProperty({ type: [FirmDomainDto] })
  domains!: FirmDomainDto[];
}
