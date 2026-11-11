import { ApiProperty } from '@nestjs/swagger';
import { providerKindValues } from './model-gateway.dto.js';

export class AiProviderDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: providerKindValues })
  kind!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ type: String, nullable: true })
  baseUrl!: string | null;

  @ApiProperty({ example: '4f2a' })
  apiKeyLast4!: string;

  @ApiProperty({ type: [String] })
  models!: string[];

  @ApiProperty({ type: String, nullable: true })
  fallbackModelId!: string | null;

  @ApiProperty({ enum: ['active', 'invalid', 'disabled', 'untested'] })
  status!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastTestedAt!: string | null;

  @ApiProperty({ type: String, nullable: true })
  lastError!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class AiProviderListDto {
  @ApiProperty({ type: [AiProviderDto] })
  items!: AiProviderDto[];
}

export class AiProviderResponseDto {
  @ApiProperty({ type: AiProviderDto })
  provider!: AiProviderDto;
}

export class AiProviderTestDto {
  @ApiProperty()
  ok!: boolean;

  @ApiProperty({ type: [String] })
  models!: string[];

  @ApiProperty({ type: String, nullable: true })
  error!: string | null;
}
