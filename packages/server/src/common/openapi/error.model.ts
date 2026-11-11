import { ApiProperty } from '@nestjs/swagger';

/** Field-level validation issue returned inside the error envelope. */
export class ErrorDetailDto {
  @ApiProperty({ description: 'Dotted path of the offending field', example: 'name' })
  path!: string;

  @ApiProperty({ description: 'Human readable reason', example: 'Required' })
  message!: string;
}

/**
 * Every failure from the API uses this envelope (spec 30/31), including
 * framework-level errors and validation failures.
 */
export class ErrorEnvelopeDto {
  @ApiProperty({ description: 'HTTP status code', example: 400 })
  statusCode!: number;

  @ApiProperty({
    description: 'Machine readable code from the error registry (spec 31)',
    example: 'VALIDATION_ERROR',
  })
  code!: string;

  @ApiProperty({ description: 'Human readable message', example: 'Validation failed' })
  message!: string;

  @ApiProperty({ type: [ErrorDetailDto], description: 'Field-level details, empty when none' })
  details!: ErrorDetailDto[];

  @ApiProperty({
    description: 'Request id, also returned in the X-Request-Id response header',
    example: '6d0b2d8e-5d1e-4a2a-9f52-0f0f0f0f0f0f',
  })
  requestId!: string;
}
