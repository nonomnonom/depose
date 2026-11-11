import { ApiProperty } from '@nestjs/swagger';

export class OnboardingStepsDto {
  @ApiProperty()
  firmConfigured!: boolean;

  @ApiProperty()
  firstMatter!: boolean;
}

export class OnboardingStatusDto {
  @ApiProperty({ description: 'True after the user dismisses the checklist' })
  dismissed!: boolean;

  @ApiProperty({ type: OnboardingStepsDto })
  steps!: OnboardingStepsDto;
}

export class DismissOnboardingResponseDto {
  @ApiProperty({ example: true })
  dismissed!: boolean;
}
