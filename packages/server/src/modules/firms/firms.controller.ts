import { Body, Controller, Get, Patch } from "@nestjs/common";
import { Session } from "@thallesp/nestjs-better-auth";
import {
  getOrganizationId,
  type AuthenticatedSession,
} from "../../common/session.js";
import { ZodBodyPipe } from "../../common/zod.pipe.js";
import {
  updateFirmSchema,
  type UpdateFirmInput,
} from "./firms.dto.js";
import { FirmsService } from "./firms.service.js";

@Controller("firm")
export class FirmsController {
  constructor(private readonly firmsService: FirmsService) {}

  @Get()
  async get(@Session() session: AuthenticatedSession) {
    return (await this.firmsService.get(getOrganizationId(session))) ?? null;
  }

  @Patch()
  update(
    @Session() session: AuthenticatedSession,
    @Body(new ZodBodyPipe(updateFirmSchema)) input: UpdateFirmInput,
  ) {
    return this.firmsService.update(getOrganizationId(session), input);
  }
}
