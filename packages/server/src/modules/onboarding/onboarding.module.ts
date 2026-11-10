import { Module } from "@nestjs/common";
import { FirmsModule } from "../firms/firms.module.js";
import { OnboardingController } from "./onboarding.controller.js";
import { OnboardingService } from "./onboarding.service.js";

@Module({
  imports: [FirmsModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
