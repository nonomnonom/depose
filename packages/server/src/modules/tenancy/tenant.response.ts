import { ApiProperty } from '@nestjs/swagger';

export class TenantFirmDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  aiEnabled!: boolean;
}

export class TenantAuthDto {
  @ApiProperty()
  allowSelfSignup!: boolean;

  @ApiProperty()
  requireAdminApproval!: boolean;

  @ApiProperty()
  ssoEnabled!: boolean;

  @ApiProperty()
  forceSso!: boolean;

  @ApiProperty()
  requireEmailVerification!: boolean;

  @ApiProperty({ description: 'True when SMTP is configured and mail can be delivered' })
  mailConfigured!: boolean;

  @ApiProperty({ description: 'True when the Depose MCP server token and firm are configured' })
  mcpServerEnabled!: boolean;
}

export class TenantResponseDto {
  @ApiProperty({ example: 'malkan-partners.localhost' })
  hostname!: string;

  @ApiProperty({
    type: TenantFirmDto,
    nullable: true,
    description: 'Null on an unmapped or bootstrap host',
  })
  firm!: TenantFirmDto | null;

  @ApiProperty({ type: String, enum: ['subdomain', 'custom'], nullable: true })
  domainType!: string | null;

  @ApiProperty()
  isPrimary!: boolean;

  @ApiProperty()
  isBootstrapHost!: boolean;

  @ApiProperty({ description: 'True when this host still has to create the first firm' })
  requiresSetup!: boolean;

  @ApiProperty({ type: TenantAuthDto })
  auth!: TenantAuthDto;
}
