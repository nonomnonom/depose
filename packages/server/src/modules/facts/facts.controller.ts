import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { Session } from "@thallesp/nestjs-better-auth";
import {
  getOrganizationId,
  type AuthenticatedSession,
} from "../../common/session.js";
import { ZodBodyPipe } from "../../common/zod.pipe.js";
import {
  createFactSchema,
  extractFactsSchema,
  type CreateFactInput,
  type ExtractFactsInput,
} from "./facts.dto.js";
import { FactsService } from "./facts.service.js";

@Controller("matters/:matterId/facts")
export class FactsController {
  constructor(private readonly factsService: FactsService) {}

  @Get()
  list(
    @Session() session: AuthenticatedSession,
    @Param("matterId") matterId: string,
  ) {
    return this.factsService.list(getOrganizationId(session), matterId);
  }

  @Post()
  create(
    @Session() session: AuthenticatedSession,
    @Param("matterId") matterId: string,
    @Body(new ZodBodyPipe(createFactSchema)) input: CreateFactInput,
  ) {
    return this.factsService.create(getOrganizationId(session), matterId, input);
  }

  @Post("extract")
  extract(
    @Session() session: AuthenticatedSession,
    @Param("matterId") matterId: string,
    @Body(new ZodBodyPipe(extractFactsSchema)) input: ExtractFactsInput,
  ) {
    return this.factsService.extract(
      getOrganizationId(session),
      matterId,
      input,
    );
  }
}
