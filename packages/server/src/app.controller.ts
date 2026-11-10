import { Controller, Get } from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";

@Controller()
export class AppController {
  @Get()
  @AllowAnonymous()
  root(): string {
    return "Hello World!";
  }
}
