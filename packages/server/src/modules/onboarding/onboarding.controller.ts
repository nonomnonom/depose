import { Body, Controller, Get, Post } from "@nestjs/common";
import { Session } from "@thallesp/nestjs-better-auth";
import type { AuthenticatedSession } from "../../common/session.js";
import { ZodBodyPipe } from "../../common/zod.pipe.js";
import {
  setupFirmSchema,
  type SetupFirmInput,
} from "./onboarding.dto.js";
import { OnboardingService } from "./onboarding.service.js";

@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get()
  getState(@Session() session: AuthenticatedSession) {
    return this.onboardingService.getState(session);
  }

  @Post("firm")
  setupFirm(
    @Session() session: AuthenticatedSession,
    @Body(new ZodBodyPipe(setupFirmSchema)) input: SetupFirmInput,
  ) {
    return this.onboardingService.setupFirm(session, input);
  }

  @Post("dismiss")
  dismiss(@Session() session: AuthenticatedSession) {
    return this.onboardingService.dismiss(session);
  }
}
