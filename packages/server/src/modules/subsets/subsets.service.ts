import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  documents,
  factSources,
  facts,
  issues,
  subsetDocuments,
  subsetIssues,
  subsets,
} from '../../infrastructure/database/schema/index.js';
import { PolicyService } from '../access-control/policy.service.js';
import { AuditService } from '../audit/audit.service.js';
import type {
  CreateSubsetInput,
  SetSubsetDocumentsInput,
  SubsetFactsQuery,
  SubsetFromSourcesInput,
  UpdateSubsetInput,
} from './subsets.dto.js';

@Injectable()
export class SubsetsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: FirmActor, matterId: string) {
    await this.policy.assertMatter(actor, 'subset.read', matterId);
    const rows = await this.db
      .select({
        subset: subsets,
        documentCount: sql<number>`(select count(*) from subset_documents sd where sd.subset_id = subsets.id)::int`,
        factCount: sql<number>`(
          select count(distinct fs.fact_id)
          from fact_sources fs
          join subset_documents sd on sd.document_id = fs.document_id
          where sd.subset_id = subsets.id
        )::int`,
      })
      .from(subsets)
      .where(and(eq(subsets.firmId, actor.firmId), eq(subsets.matterId, matterId)))
      .orderBy(desc(subsets.updatedAt));

    return {
      items: rows.map(({ subset, documentCount, factCount }) =>
        this.toDto(subset, documentCount, factCount),
      ),
    };
  }

  async get(actor: FirmActor, matterId: string, subsetId: string) {
    await this.policy.assertMatter(actor, 'subset.read', matterId);
    const row = await this.requireSubset(actor, matterId, subsetId);
    const docs = await this.db
      .select({ documentId: subsetDocuments.documentId })
      .from(subsetDocuments)
      .where(eq(subsetDocuments.subsetId, subsetId));
    const counts = await this.counts(actor, matterId, subsetId);
    const issueRows = await this.db
      .select({ issueId: subsetIssues.issueId })
      .from(subsetIssues)
      .where(eq(subsetIssues.subsetId, subsetId));
    return {
      subset: this.toDto(row, counts.documentCount, counts.factCount),
      documentIds: docs.map((doc) => doc.documentId),
      issueIds: issueRows.map((issue) => issue.issueId),
    };
  }

  async create(actor: FirmActor, matterId: string, input: CreateSubsetInput) {
    await this.policy.assertMatter(actor, 'subset.create', matterId);
    const documentIds = [...new Set(input.documentIds)];
    await this.assertDocuments(actor, matterId, documentIds);
    await this.assertIssues(actor, matterId, input.issueIds ?? []);

    const created = await this.db.transaction(async (tx) => {
      const [subset] = await tx
        .insert(subsets)
        .values({
          firmId: actor.firmId,
          matterId,
          name: input.name,
          description: input.description ?? null,
          applyMatterIssues: input.applyMatterIssues,
          createdBy: actor.userId,
        })
        .returning();

      await tx.insert(subsetDocuments).values(
        documentIds.map((documentId) => ({
          firmId: actor.firmId,
          matterId,
          subsetId: subset.id,
          documentId,
        })),
      );
      if (input.issueIds && input.issueIds.length > 0) {
        await tx.insert(subsetIssues).values(
          input.issueIds.map((issueId) => ({
            firmId: actor.firmId,
            matterId,
            subsetId: subset.id,
            issueId,
          })),
        );
      }
      return subset;
    });

    await this.audit.log({
      firmId: actor.firmId,
      action: 'subset.created',
      resourceType: 'subset',
      resourceId: created.id,
      actor,
      metadata: { matterId, documentIds },
    });

    return {
      subset: this.toDto(created, documentIds.length, 0),
      documentIds,
      issueIds: input.issueIds ?? [],
    };
  }

  async update(
    actor: FirmActor,
    matterId: string,
    subsetId: string,
    input: UpdateSubsetInput,
  ) {
    await this.policy.assertMatter(actor, 'subset.update', matterId);
    await this.requireSubset(actor, matterId, subsetId);
    if (input.issueIds) await this.assertIssues(actor, matterId, input.issueIds);
    const updated = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(subsets)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.applyMatterIssues !== undefined
            ? { applyMatterIssues: input.applyMatterIssues }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(subsets.id, subsetId))
        .returning();
      if (input.issueIds) {
        await tx.delete(subsetIssues).where(eq(subsetIssues.subsetId, subsetId));
        if (input.issueIds.length > 0) {
          await tx.insert(subsetIssues).values(
            input.issueIds.map((issueId) => ({
              firmId: actor.firmId,
              matterId,
              subsetId,
              issueId,
            })),
          );
        }
      }
      return row;
    });

    const counts = await this.counts(actor, matterId, subsetId);
    const issueRows = await this.db
      .select({ issueId: subsetIssues.issueId })
      .from(subsetIssues)
      .where(eq(subsetIssues.subsetId, subsetId));
    return {
      subset: this.toDto(updated, counts.documentCount, counts.factCount),
      issueIds: issueRows.map((issue) => issue.issueId),
    };
  }

  async setDocuments(
    actor: FirmActor,
    matterId: string,
    subsetId: string,
    input: SetSubsetDocumentsInput,
  ) {
    await this.policy.assertMatter(actor, 'subset.manage_documents', matterId);
    await this.requireSubset(actor, matterId, subsetId);
    const documentIds = [...new Set(input.documentIds)];
    await this.assertDocuments(actor, matterId, documentIds);

    await this.db.transaction(async (tx) => {
      await tx.delete(subsetDocuments).where(eq(subsetDocuments.subsetId, subsetId));
      await tx.insert(subsetDocuments).values(
        documentIds.map((documentId) => ({
          firmId: actor.firmId,
          matterId,
          subsetId,
          documentId,
        })),
      );
      await tx.update(subsets).set({ updatedAt: new Date() }).where(eq(subsets.id, subsetId));
    });

    const counts = await this.counts(actor, matterId, subsetId);
    return { documentIds, ...counts };
  }

  async fromSources(
    actor: FirmActor,
    matterId: string,
    input: SubsetFromSourcesInput,
  ) {
    await this.policy.assertMatter(actor, 'subset.create', matterId);
    const documentIds = new Set(input.documentIds ?? []);

    if (input.factIds && input.factIds.length > 0) {
      const rows = await this.db
        .select({ factId: facts.id, documentId: factSources.documentId })
        .from(facts)
        .leftJoin(factSources, eq(factSources.factId, facts.id))
        .where(
          and(
            eq(facts.firmId, actor.firmId),
            eq(facts.matterId, matterId),
            inArray(facts.id, input.factIds),
          ),
        );
      if (rows.length === 0) {
        throw DomainError.validation('None of those facts are in this matter');
      }
      for (const row of rows) if (row.documentId) documentIds.add(row.documentId);
    }

    if (documentIds.size === 0) {
      throw DomainError.validation('Those sources have no documents to scope');
    }

    return this.create(actor, matterId, {
      name: input.name,
      applyMatterIssues: input.applyMatterIssues,
      documentIds: [...documentIds],
    });
  }

  async facts(
    actor: FirmActor,
    matterId: string,
    subsetId: string,
    query: SubsetFactsQuery,
  ) {
    await this.policy.assertMatter(actor, 'subset.read', matterId);
    await this.requireSubset(actor, matterId, subsetId);
    const limit = query.limit ?? 40;

    const inSubset = sql`exists (
      select 1 from ${factSources}
      join ${subsetDocuments} on ${subsetDocuments.documentId} = ${factSources.documentId}
      where ${factSources.factId} = ${facts.id}
        and ${subsetDocuments.subsetId} = ${subsetId}
    )`;
    const noSources = sql`not exists (
      select 1 from ${factSources} where ${factSources.factId} = ${facts.id}
    )`;

    const conditions = [
      eq(facts.firmId, actor.firmId),
      eq(facts.matterId, matterId),
      isNull(facts.archivedAt),
      query.includeManual ? sql`(${inSubset} or ${noSources})` : inSubset,
    ];
    if (query.cursor) conditions.push(lt(facts.createdAt, new Date(query.cursor)));

    const rows = await this.db
      .select({
        fact: facts,
        sourceCount: sql<number>`(select count(*) from fact_sources fs where fs.fact_id = facts.id)::int`,
        subsetSourceCount: sql<number>`(
          select count(*) from fact_sources fs
          join subset_documents sd on sd.document_id = fs.document_id
          where fs.fact_id = facts.id
            and sd.subset_id = ${subsetId}
        )::int`,
      })
      .from(facts)
      .where(and(...conditions))
      /* Cursor is createdAt, so the sort must be too; ordering by dateStart made
       * the next page skip or repeat rows. */
      .orderBy(desc(facts.createdAt), desc(facts.id))
      .limit(limit + 1);

    const items = rows.slice(0, limit).map(({ fact, sourceCount, subsetSourceCount }) => ({
      id: fact.id,
      text: fact.text,
      dateStart: fact.dateStart,
      factType: fact.factType,
      status: fact.status,
      sourceCount,
      subsetSourceCount,
      mixedSources: sourceCount > subsetSourceCount,
      createdAt: fact.createdAt.toISOString(),
    }));

    return {
      items,
      nextCursor:
        rows.length > limit ? items.at(-1)?.createdAt ?? null : null,
    };
  }

  async remove(actor: FirmActor, matterId: string, subsetId: string) {
    await this.policy.assertMatter(actor, 'subset.delete', matterId);
    await this.requireSubset(actor, matterId, subsetId);
    await this.db.delete(subsets).where(eq(subsets.id, subsetId));
    await this.audit.log({
      firmId: actor.firmId,
      action: 'subset.deleted',
      resourceType: 'subset',
      resourceId: subsetId,
      actor,
      metadata: { matterId },
    });
    return { deleted: true };
  }

  private async requireSubset(actor: FirmActor, matterId: string, subsetId: string) {
    const [row] = await this.db
      .select()
      .from(subsets)
      .where(
        and(
          eq(subsets.id, subsetId),
          eq(subsets.firmId, actor.firmId),
          eq(subsets.matterId, matterId),
        ),
      )
      .limit(1);
    if (!row) throw DomainError.notFound('Subset not found');
    return row;
  }

  private async assertDocuments(actor: FirmActor, matterId: string, documentIds: string[]) {
    const rows = await this.db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          eq(documents.firmId, actor.firmId),
          eq(documents.matterId, matterId),
          isNull(documents.deletedAt),
          inArray(documents.id, documentIds),
        ),
      );
    if (rows.length !== documentIds.length) {
      throw DomainError.validation('Every document must belong to this matter');
    }
  }

  private async assertIssues(actor: FirmActor, matterId: string, issueIds: string[]) {
    if (issueIds.length === 0) return;
    const rows = await this.db
      .select({ id: issues.id })
      .from(issues)
      .where(
        and(
          eq(issues.firmId, actor.firmId),
          eq(issues.matterId, matterId),
          inArray(issues.id, issueIds),
        ),
      );
    if (rows.length !== issueIds.length) {
      throw DomainError.validation('Every issue must belong to this matter');
    }
  }

  private async counts(actor: FirmActor, matterId: string, subsetId: string) {
    const [row] = await this.db
      .select({
        documentCount: sql<number>`(select count(*) from subset_documents sd where sd.subset_id = ${subsetId})::int`,
        factCount: sql<number>`(
          select count(distinct fs.fact_id)
          from fact_sources fs
          join subset_documents sd on sd.document_id = fs.document_id
          where sd.subset_id = ${subsetId}
        )::int`,
      })
      .from(subsets)
      .where(and(eq(subsets.id, subsetId), eq(subsets.firmId, actor.firmId), eq(subsets.matterId, matterId)));
    return row ?? { documentCount: 0, factCount: 0 };
  }

  private toDto(
    row: typeof subsets.$inferSelect,
    documentCount: number,
    factCount: number,
  ) {
    return {
      id: row.id,
      matterId: row.matterId,
      name: row.name,
      description: row.description,
      applyMatterIssues: row.applyMatterIssues,
      documentCount,
      factCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
