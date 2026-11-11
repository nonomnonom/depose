import { ApiProperty } from '@nestjs/swagger';
import { documentStatusValues } from './documents.dto.js';

export class DocumentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  matterId!: string;

  @ApiProperty({ example: 'share-purchase-agreement.pdf' })
  fileName!: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType!: string;

  @ApiProperty({ example: 248193 })
  sizeBytes!: number;

  @ApiProperty({ example: 'pdf' })
  type!: string;

  @ApiProperty({ enum: documentStatusValues, example: 'queued' })
  status!: string;

  @ApiProperty({ type: String, nullable: true })
  processingError!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  pageCount!: number | null;

  @ApiProperty()
  duplicate!: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  deletedAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class DocumentListDto {
  @ApiProperty({ type: [DocumentDto] })
  items!: DocumentDto[];

  @ApiProperty({ type: String, nullable: true })
  nextCursor!: string | null;
}

export class DocumentPageDto {
  @ApiProperty({ format: 'uuid' })
  documentId!: string;

  @ApiProperty()
  pageNumber!: number;

  @ApiProperty()
  text!: string;

  @ApiProperty()
  charCount!: number;

  @ApiProperty({ type: Number, nullable: true })
  ocrConfidence!: number | null;
}

export class DocumentResponseDto {
  @ApiProperty({ type: DocumentDto })
  document!: DocumentDto;
}
