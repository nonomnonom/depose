import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { Session } from "@thallesp/nestjs-better-auth";
import {
  getOrganizationId,
  getUserId,
  type AuthenticatedSession,
} from "../../common/session.js";
import { ZodBodyPipe } from "../../common/zod.pipe.js";
import {
  createMatterSchema,
  updateMatterSchema,
  type CreateMatterInput,
  type UpdateMatterInput,
} from "./matters.dto.js";
import { MattersService } from "./matters.service.js";

@Controller("matters")
export class MattersController {
  constructor(private readonly mattersService: MattersService) {}

  @Get()
  list(@Session() session: AuthenticatedSession) {
    return this.mattersService.list(getOrganizationId(session));
  }

  @Post()
  create(
    @Session() session: AuthenticatedSession,
    @Body(new ZodBodyPipe(createMatterSchema)) input: CreateMatterInput,
  ) {
    return this.mattersService.create(
      getOrganizationId(session),
      getUserId(session),
      input,
    );
  }

  @Get(":matterId")
  findOne(
    @Session() session: AuthenticatedSession,
    @Param("matterId") matterId: string,
  ) {
    return this.mattersService.findOne(getOrganizationId(session), matterId);
  }

  @Patch(":matterId")
  update(
    @Session() session: AuthenticatedSession,
    @Param("matterId") matterId: string,
    @Body(new ZodBodyPipe(updateMatterSchema)) input: UpdateMatterInput,
  ) {
    return this.mattersService.update(
      getOrganizationId(session),
      matterId,
      input,
    );
  }
}
