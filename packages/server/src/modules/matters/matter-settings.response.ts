import { ApiProperty } from '@nestjs/swagger';

export class MatterSettingsResponseDto {
  @ApiProperty({ description: 'Effective matter settings' })
  settings!: Record<string, unknown>;
}
