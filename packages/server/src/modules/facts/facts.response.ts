import { ApiProperty } from '@nestjs/swagger';
import { factStatusValues } from './facts.dto.js';

export class FactSourceDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  documentId!: string;

  @ApiProperty()
  documentName!: string;

  @ApiProperty({ type: Number, nullable: true })
  pageNumber!: number | null;

  @ApiProperty()
  quote!: string;

  @ApiProperty()
  verification!: string;
}

export class FactDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  matterId!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ type: String, nullable: true })
  factType!: string | null;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  dateStart!: string | null;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  dateEnd!: string | null;

  @ApiProperty({ enum: factStatusValues })
  status!: string;

  @ApiProperty({ enum: ['extracted', 'manual', 'imported'] })
  origin!: string;

  @ApiProperty({ type: Number, nullable: true })
  confidence!: number | null;

  @ApiProperty()
  sourceCount!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class FactDetailDto extends FactDto {
  @ApiProperty({ type: [FactSourceDto] })
  sources!: FactSourceDto[];
}

export class FactListDto {
  @ApiProperty({ type: [FactDto] })
  items!: FactDto[];

  @ApiProperty({ type: String, nullable: true })
  nextCursor!: string | null;
}

export class FactResponseDto {
  @ApiProperty({ type: FactDto })
  fact!: FactDto;
}

export class FactDetailResponseDto {
  @ApiProperty({ type: FactDetailDto })
  fact!: FactDetailDto;
}
