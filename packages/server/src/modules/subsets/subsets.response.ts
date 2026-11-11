import { ApiProperty } from '@nestjs/swagger';

export class SubsetDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  matterId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty()
  applyMatterIssues!: boolean;

  @ApiProperty()
  documentCount!: number;

  @ApiProperty()
  factCount!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class SubsetListDto {
  @ApiProperty({ type: [SubsetDto] })
  items!: SubsetDto[];
}

export class SubsetDetailDto {
  @ApiProperty({ type: SubsetDto })
  subset!: SubsetDto;

  @ApiProperty({ type: [String], format: 'uuid' })
  documentIds!: string[];
}

export class SubsetResponseDto {
  @ApiProperty({ type: SubsetDetailDto })
  data!: SubsetDetailDto;
}

export class SubsetFactDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ type: String, nullable: true })
  dateStart!: string | null;

  @ApiProperty()
  factType!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  sourceCount!: number;

  @ApiProperty()
  subsetSourceCount!: number;

  @ApiProperty()
  mixedSources!: boolean;
}

export class SubsetFactListDto {
  @ApiProperty({ type: [SubsetFactDto] })
  items!: SubsetFactDto[];

  @ApiProperty({ type: String, nullable: true })
  nextCursor!: string | null;
}
