import { ApiProperty } from '@nestjs/swagger';

export class McpServerDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'court-records' })
  serverKey!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true, example: 'https://mcp.example.com/mcp' })
  url!: string | null;

  @ApiProperty({ enum: ['http', 'sse'] })
  transport!: string;

  @ApiProperty({ enum: ['disconnected', 'connected', 'error'] })
  status!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class McpServerListDto {
  @ApiProperty({ type: [McpServerDto] })
  items!: McpServerDto[];
}

export class McpServerResponseDto {
  @ApiProperty({ type: McpServerDto })
  server!: McpServerDto;
}

export class McpToolDto {
  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;
}

export class McpTestResponseDto {
  @ApiProperty()
  ok!: boolean;

  @ApiProperty({ type: [McpToolDto] })
  tools!: McpToolDto[];

  @ApiProperty({ type: String, nullable: true })
  error!: string | null;
}
