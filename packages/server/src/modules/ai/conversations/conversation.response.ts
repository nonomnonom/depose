import { ApiProperty } from '@nestjs/swagger';

export class ConversationThreadDto {
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

export class ConversationThreadListDto {
  @ApiProperty({ type: [ConversationThreadDto] })
  items!: ConversationThreadDto[];
}

export class ConversationCitationDto {
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

export class ConversationToolCallDto {
  @ApiProperty({ example: 'search_facts' })
  name!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  arguments!: Record<string, unknown>;

  @ApiProperty()
  summary!: string;
}

export class ConversationMessageDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['user', 'assistant'] })
  role!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty({ type: [ConversationCitationDto] })
  citations!: ConversationCitationDto[];

  @ApiProperty({ type: [ConversationCitationDto] })
  sources!: ConversationCitationDto[];

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

  @ApiProperty({ type: [ConversationToolCallDto] })
  toolCalls!: ConversationToolCallDto[];

  @ApiProperty({ enum: ['ask', 'agent'] })
  mode!: string;

  @ApiProperty({ enum: ['model'] })
  engine!: string;

  @ApiProperty({ type: String, nullable: true })
  model!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class ConversationThreadDetailDto {
  @ApiProperty({ type: ConversationThreadDto })
  thread!: ConversationThreadDto;

  @ApiProperty({ type: [ConversationMessageDto] })
  messages!: ConversationMessageDto[];
}

export class ConversationMessageResponseDto {
  @ApiProperty({ type: ConversationMessageDto })
  userMessage!: ConversationMessageDto;

  @ApiProperty({ type: ConversationMessageDto })
  message!: ConversationMessageDto;

  @ApiProperty()
  answer!: string;

  @ApiProperty({ type: [ConversationCitationDto] })
  sources!: ConversationCitationDto[];

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

  @ApiProperty({ type: [ConversationToolCallDto] })
  toolCalls!: ConversationToolCallDto[];
}
