import { ApiProperty } from '@nestjs/swagger';

export class TenantDto {
  @ApiProperty({ example: 'malkan-partners.localhost' })
  hostname!: string;

  @ApiProperty({ type: String, enum: ['subdomain', 'custom'], nullable: true })
  domainType!: string | null;

  @ApiProperty()
  isPrimary!: boolean;

  @ApiProperty()
  isBootstrapHost!: boolean;
}
