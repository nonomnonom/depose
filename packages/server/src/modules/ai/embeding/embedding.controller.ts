import { Controller, Get, Post, Body, Param, ParseUUIDPipe, Query, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse, ApiBadRequestResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { z } from 'zod';
import { RequestContextService } from '../../../common/request-context.service.js';
import { PolicyService } from '../../access-control/policy.service.js';
import { JobsService } from '../../jobs/jobs.service.js';
import { EmbeddingService } from './embedding.service.js';
import { listEmbeddingStatusQuerySchema, triggerReembedSchema } from './embedding.dto.js';
import { and, desc, eq, sql } from 'drizzle-orm';
import { documentChunks } from '../../../infrastructure/database/schema/index.js';
import type { Database } from '../../../infrastructure/database/database.client.js';
import { DATABASE } from '../../../infrastructure/database/database.module.js';

@ApiTags('Embedding')
@Controller('v1/matters/:matterId/embedding')
export class EmbeddingController {
  constructor(
    private readonly embedding: EmbeddingService,
    private readonly context: RequestContextService,
    private readonly policy: PolicyService,
    private readonly jobs: JobsService,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Embedding status for a matter' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Embedding status summary' })
  @ApiForbiddenResponse({ description: 'Not authorized for this matter' })
  async status(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Query() query: z.infer<typeof listEmbeddingStatusQuerySchema>,
  ) {
    const actor = this.context.requireFirmActor();
    await this.policy.assertMatter(actor, 'fact.read', matterId);

    const conditions = [eq(documentChunks.firmId, actor.firmId), eq(documentChunks.matterId, matterId)];
    if (query.status) conditions.push(eq(documentChunks.embeddingStatus, query.status));

    const limitCount = query.limit ?? 50;
    const rows = await this.db
      .select({
        total: sql<number>`count(*) over()`,
        chunkId: documentChunks.id,
        documentId: documentChunks.documentId,
        chunkIndex: documentChunks.chunkIndex,
        pageNumber: documentChunks.pageNumber,
        status: documentChunks.embeddingStatus,
        version: documentChunks.chunkVersion,
        createdAt: documentChunks.createdAt,
      })
      .from(documentChunks)
      .where(and(...conditions))
      .orderBy(desc(documentChunks.createdAt))
      .limit(limitCount + 1);

    const total = rows[0]?.total ?? 0;
    const hasMore = rows.length > limitCount;
    const items = rows.slice(0, limitCount).map((r) => ({
      chunkId: r.chunkId,
      documentId: r.documentId,
      chunkIndex: r.chunkIndex,
      pageNumber: r.pageNumber,
      status: r.status,
      version: r.version,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      matterId,
      total,
      pending: items.filter((i) => i.status === 'pending').length,
      indexed: items.filter((i) => i.status === 'indexed').length,
      failed: items.filter((i) => i.status === 'failed').length,
      items,
      nextCursor: hasMore ? items.at(-1)?.createdAt : null,
    };
  }

  @Post('reembed')
  @ApiOperation({ summary: 'Trigger re-embedding for a matter' })
  @ApiParam({ name: 'matterId', format: 'uuid' })
  @ApiOkResponse({ description: 'Re-embed enqueued' })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiForbiddenResponse({ description: 'Not authorized for this matter' })
  async reembed(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body() body: z.infer<typeof triggerReembedSchema>,
  ) {
    const actor = this.context.requireFirmActor();
    await this.policy.assertMatter(actor, 'document.reprocess', matterId);

    const version = body.chunkVersion;
    const conditions = [
      eq(documentChunks.firmId, actor.firmId),
      eq(documentChunks.matterId, matterId),
    ];
    if (version) conditions.push(eq(documentChunks.chunkVersion, version));

    await this.db
      .update(documentChunks)
      .set({
        embeddingStatus: 'pending',
        chunkVersion: version ?? sql`${documentChunks.chunkVersion} + 1`,
      })
      .where(and(...conditions));

    await this.jobs.enqueueEmbeddingJob(matterId, actor.firmId);

    return { matterId, reembedded: true };
  }
}
