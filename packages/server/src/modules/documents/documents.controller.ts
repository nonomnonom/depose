import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { DomainError } from '../../common/domain-error.js';
import { ErrorEnvelopeDto } from '../../common/openapi/error.model.js';
import { ApiSessionAuth } from '../../common/openapi/session-auth.decorator.js';
import { RequestContextService } from '../../common/request-context.service.js';
import { parseOrThrow } from '../../common/zod.pipe.js';
import {
  documentStatusValues,
  listDocumentsQuerySchema,
  type ListDocumentsQuery,
} from './documents.dto.js';
import {
  DocumentListDto,
  DocumentPageDto,
  DocumentResponseDto,
} from './documents.response.js';
import { DocumentsService } from './documents.service.js';

@ApiTags('Documents')
@ApiSessionAuth()
@Controller('v1/matters/:matterId/documents')
export class DocumentsController {
  constructor(
    private readonly documents: DocumentsService,
    private readonly context: RequestContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List documents in a matter' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiQuery({ name: 'status', required: false, enum: documentStatusValues })
  @ApiQuery({ name: 'q', required: false, schema: { type: 'string' } })
  @ApiQuery({ name: 'cursor', required: false, schema: { type: 'string' } })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', maximum: 100 } })
  @ApiOkResponse({ description: 'Documents', type: DocumentListDto })
  async list(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Query() query: Record<string, unknown>,
  ) {
    const actor = this.context.requireFirmActor();
    const parsed: ListDocumentsQuery = parseOrThrow(listDocumentsQuerySchema, query);
    return this.documents.list(actor, matterId, parsed);
  }

  @Post()
  @ApiOperation({
    summary: 'Upload a document',
    description:
      'Send the raw file bytes. Set `fileName` in the query and the file MIME type in `Content-Type`. The document is queued for processing.',
  })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiQuery({ name: 'fileName', required: true, schema: { type: 'string' } })
  @ApiConsumes('application/octet-stream')
  @ApiBody({ schema: { type: 'string', format: 'binary' } })
  @ApiCreatedResponse({ description: 'Uploaded document', type: DocumentResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid or unsupported file', type: ErrorEnvelopeDto })
  async upload(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Query('fileName') fileName: string,
    @Req() request: Request,
  ) {
    const actor = this.context.requireFirmActor();
    if (!Buffer.isBuffer(request.body)) {
      throw DomainError.validation('Expected raw file bytes');
    }
    const contentType = request.headers['content-type'];
    return this.documents.upload(actor, matterId, {
      fileName: fileName ?? 'document',
      mimeType: Array.isArray(contentType) ? contentType[0] : contentType,
      data: request.body,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document metadata' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Document', type: DocumentResponseDto })
  @ApiNotFoundResponse({ description: 'Document not found', type: ErrorEnvelopeDto })
  async get(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const actor = this.context.requireFirmActor();
    return { document: await this.documents.get(actor, matterId, id) };
  }

  @Get(':id/pages/:pageNumber')
  @ApiOperation({ summary: 'Read one extracted page for the source viewer' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'pageNumber', schema: { type: 'integer', minimum: 1 } })
  @ApiOkResponse({ description: 'Page text', type: DocumentPageDto })
  @ApiNotFoundResponse({ description: 'Page not found', type: ErrorEnvelopeDto })
  async page(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('pageNumber', ParseIntPipe) pageNumber: number,
  ) {
    const actor = this.context.requireFirmActor();
    return this.documents.page(actor, matterId, id, pageNumber);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download the original file' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Original file' })
  @ApiNotFoundResponse({ description: 'Document not found', type: ErrorEnvelopeDto })
  async download(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const actor = this.context.requireFirmActor();
    const { document, data } = await this.documents.download(actor, matterId, id);
    response.setHeader('Content-Type', document.mimeType);
    response.setHeader('Content-Length', data.length);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
    );
    response.send(data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Document deleted', schema: { type: 'object' } })
  @ApiNotFoundResponse({ description: 'Document not found', type: ErrorEnvelopeDto })
  async remove(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const actor = this.context.requireFirmActor();
    return this.documents.remove(actor, matterId, id);
  }

  @Post(':id/reprocess')
  @ApiOperation({ summary: 'Queue the document for processing again' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Document', type: DocumentResponseDto })
  @ApiNotFoundResponse({ description: 'Document not found', type: ErrorEnvelopeDto })
  async reprocess(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const actor = this.context.requireFirmActor();
    return { document: await this.documents.reprocess(actor, matterId, id) };
  }
}
