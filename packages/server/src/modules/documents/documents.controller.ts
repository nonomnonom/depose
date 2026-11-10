import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { Session } from "@thallesp/nestjs-better-auth";
import {
  getOrganizationId,
  getUserId,
  type AuthenticatedSession,
} from "../../common/session.js";
import { ZodBodyPipe } from "../../common/zod.pipe.js";
import {
  ingestDocumentSchema,
  type IngestDocumentInput,
} from "./documents.dto.js";
import { DocumentsService } from "./documents.service.js";

@Controller("matters/:matterId/documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  list(
    @Session() session: AuthenticatedSession,
    @Param("matterId") matterId: string,
  ) {
    return this.documentsService.list(getOrganizationId(session), matterId);
  }

  @Post()
  ingest(
    @Session() session: AuthenticatedSession,
    @Param("matterId") matterId: string,
    @Body(new ZodBodyPipe(ingestDocumentSchema)) input: IngestDocumentInput,
  ) {
    return this.documentsService.ingest(
      getOrganizationId(session),
      matterId,
      getUserId(session),
      input,
    );
  }
}
