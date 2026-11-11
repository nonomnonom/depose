import { ApiProperty } from '@nestjs/swagger';
import { matterStatusValues } from './matters.dto.js';

export class MatterDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  firmId!: string;

  @ApiProperty({ example: 'Acquisition of PT Nusantara' })
  name!: string;

  @ApiProperty({ type: String, nullable: true, example: 'M-2026-014' })
  matterNumber!: string | null;

  @ApiProperty({ example: 'corporate' })
  type!: string;

  @ApiProperty({ enum: matterStatusValues, example: 'active' })
  status!: string;

  @ApiProperty({ type: String, format: 'date', nullable: true, example: '2026-03-01' })
  openedDate!: string | null;

  @ApiProperty({ type: String, format: 'date', nullable: true, example: null })
  closedDate!: string | null;

  @ApiProperty({ type: String, nullable: true, example: null })
  description!: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'User id of the lead lawyer' })
  leadLawyerId!: string | null;

  @ApiProperty({ type: [String], example: ['corporate', 'priority'] })
  tags!: string[];

  @ApiProperty({ type: 'object', additionalProperties: true })
  settings!: Record<string, unknown>;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  deletedAt!: string | null;

  @ApiProperty({ description: 'User id of the creator' })
  createdBy!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class MatterResponseDto {
  @ApiProperty({ type: MatterDto })
  matter!: MatterDto;
}

export class MatterListDto {
  @ApiProperty({ type: [MatterDto] })
  items!: MatterDto[];

  @ApiProperty({ type: String, nullable: true, description: 'Opaque cursor for the next page' })
  nextCursor!: string | null;

  @ApiProperty()
  hasMore!: boolean;

  @ApiProperty({ type: [String], description: 'Non-fatal warnings from the query' })
  warnings!: string[];
}
