import { ApiProperty } from '@nestjs/swagger';

export class AiThreadDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, nullable: true })
  title!: string | null;

  @ApiProperty({ format: 'uuid' })
  matterId!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class AiThreadListDto {
  @ApiProperty({ type: [AiThreadDto] })
  items!: AiThreadDto[];
}

export class AiCitationDto {
  @ApiProperty({ format: 'uuid' })
  sourceId!: string;

  @ApiProperty({ format: 'uuid' })
  factId!: string;

  @ApiProperty()
  factText!: string;

  @ApiProperty()
  factStatus!: string;

  @ApiProperty()
  manual!: boolean;

  @ApiProperty({ type: String, nullable: true })
  documentId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  documentName!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  pageNumber!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  sentenceStart!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  sentenceEnd!: number | null;

  @ApiProperty({ type: String, nullable: true })
  quote!: string | null;

  @ApiProperty({ type: String, nullable: true })
  quoteHash!: string | null;

  @ApiProperty()
  sourceKind!: string;

  @ApiProperty({ format: 'date-time' })
  capturedAt!: string;

  @ApiProperty()
  sourceDeleted!: boolean;
}

export class AiToolCallDto {
  @ApiProperty({ example: 'search_facts' })
  name!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  arguments!: Record<string, unknown>;

  @ApiProperty()
  summary!: string;
}

export class AiMessageDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['user', 'assistant'] })
  role!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty({ type: [AiCitationDto] })
  citations!: AiCitationDto[];

  @ApiProperty({ type: [AiCitationDto] })
  sources!: AiCitationDto[];

  @ApiProperty()
  answer!: string;

  @ApiProperty({ type: Number, nullable: true })
  evidenceScore!: number | null;

  @ApiProperty()
  insufficientEvidence!: boolean;

  @ApiProperty({ type: [String] })
  unverifiedCitations!: string[];

  @ApiProperty({ type: [String] })
  warnings!: string[];

  @ApiProperty({ type: [AiToolCallDto] })
  toolCalls!: AiToolCallDto[];

  @ApiProperty({ enum: ['ask', 'agent'] })
  mode!: string;

  @ApiProperty({ enum: ['model'] })
  engine!: string;

  @ApiProperty({ type: String, nullable: true })
  model!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class AiThreadDetailDto {
  @ApiProperty({ type: AiThreadDto })
  thread!: AiThreadDto;

  @ApiProperty({ type: [AiMessageDto] })
  messages!: AiMessageDto[];
}

export class AiMessageResponseDto {
  @ApiProperty({ type: AiMessageDto })
  userMessage!: AiMessageDto;

  @ApiProperty({ type: AiMessageDto })
  message!: AiMessageDto;

  @ApiProperty()
  answer!: string;

  @ApiProperty({ type: [AiCitationDto] })
  sources!: AiCitationDto[];

  @ApiProperty()
  evidenceScore!: number;

  @ApiProperty()
  insufficientEvidence!: boolean;

  @ApiProperty({ type: [String] })
  unverifiedCitations!: string[];

  @ApiProperty({ type: [String] })
  warnings!: string[];

  @ApiProperty({ enum: ['ask', 'agent'] })
  mode!: string;

  @ApiProperty({ type: String, nullable: true })
  model!: string | null;

  @ApiProperty({ type: [AiToolCallDto] })
  toolCalls!: AiToolCallDto[];
}
