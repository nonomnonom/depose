import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { Session } from "@thallesp/nestjs-better-auth";
import {
  getOrganizationId,
  getUserId,
  type AuthenticatedSession,
} from "../../common/session.js";
import { ZodBodyPipe } from "../../common/zod.pipe.js";
import {
  askQuestionSchema,
  type AskQuestionInput,
} from "./intelligence.dto.js";
import { IntelligenceService } from "./intelligence.service.js";

@Controller("matters/:matterId")
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  @Get("chronology")
  chronology(
    @Session() session: AuthenticatedSession,
    @Param("matterId") matterId: string,
  ) {
    return this.intelligenceService.chronology(
      getOrganizationId(session),
      matterId,
    );
  }

  @Post("contradictions")
  contradictions(
    @Session() session: AuthenticatedSession,
    @Param("matterId") matterId: string,
  ) {
    return this.intelligenceService.contradictions(
      getOrganizationId(session),
      matterId,
    );
  }

  @Post("ask")
  ask(
    @Session() session: AuthenticatedSession,
    @Param("matterId") matterId: string,
    @Body(new ZodBodyPipe(askQuestionSchema)) input: AskQuestionInput,
  ) {
    return this.intelligenceService.ask(
      getOrganizationId(session),
      matterId,
      getUserId(session),
      input.question,
      input.threadId,
    );
  }

  @Post("realtime-check")
  realtimeCheck(
    @Session() session: AuthenticatedSession,
    @Param("matterId") matterId: string,
    @Body(new ZodBodyPipe(askQuestionSchema)) input: AskQuestionInput,
  ) {
    return this.intelligenceService.realtimeCheck(
      getOrganizationId(session),
      matterId,
      getUserId(session),
      input.question,
      input.threadId,
    );
  }
}
