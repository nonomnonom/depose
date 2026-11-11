import { ApiProperty } from '@nestjs/swagger';

export class UserPreferencesResponseDto {
  @ApiProperty({ description: 'User preferences' })
  preferences!: Record<string, unknown>;
}
