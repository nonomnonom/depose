import { ApiProperty } from '@nestjs/swagger';

export class FirmSettingsResponseDto {
  @ApiProperty({ description: 'Effective firm settings' })
  settings!: Record<string, unknown>;
}
