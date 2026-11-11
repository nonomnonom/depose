import { Controller, Get, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSessionAuth } from '../../common/openapi/session-auth.decorator.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { DismissOnboardingResponseDto, OnboardingStatusDto } from './onboarding.response.js';
import { OnboardingService } from './onboarding.service.js';

@ApiTags('Onboarding')
@ApiSessionAuth()
@Controller('v1/onboarding')
export class OnboardingController {
  constructor(
    private readonly onboarding: OnboardingService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get onboarding status' })
  @ApiOkResponse({ description: 'Checklist state for the current user', type: OnboardingStatusDto })
  status() {
    return this.onboarding.status(this.context.requireFirmActor());
  }

  @Post('dismiss')
  @ApiOperation({
    summary: 'Dismiss the onboarding checklist',
    description: 'Idempotent for the current user; creates the progress row on first call.',
  })
  @ApiCreatedResponse({ description: 'Checklist dismissed', type: DismissOnboardingResponseDto })
  dismiss() {
    return this.onboarding.dismiss(this.context.requireFirmActor());
  }
}
