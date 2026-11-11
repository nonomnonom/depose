import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';
import { factStatusValues } from '../facts/facts.dto.js';

export const chronologyQuerySchema = z
  .object({
    q: z.string().trim().max(200).optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    cursor: z.string().trim().max(500).optional(),
    hasDateStart: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  })
  .strict();

export type ChronologyQuery = z.infer<typeof chronologyQuerySchema>;

export class ChronologyRowDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  matterId!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ type: String, nullable: true })
  factType!: string | null;

  @ApiProperty({ type: String, format: 'date' })
  dateStart!: string;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  dateEnd!: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Original extracted date text for display' })
  dateText!: string | null;

  @ApiProperty({ enum: factStatusValues })
  status!: string;

  @ApiProperty({ enum: ['extracted', 'manual', 'imported'] })
  origin!: string;

  @ApiProperty()
  sourceCount!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class ChronologyTimelineDto {
  @ApiProperty({ type: [ChronologyRowDto] })
  items!: ChronologyRowDto[];

  @ApiProperty({ type: String, nullable: true, description: 'Opaque cursor for the next page' })
  nextCursor!: string | null;

  @ApiProperty({ description: 'Count of confirmed facts with no dateStart' })
  undatedCount!: number;
}
