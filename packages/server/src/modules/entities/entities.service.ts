import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  entities,
  entityAliases,
  entityMentions,
  entityRelations,
} from '../../infrastructure/database/schema/index.js';
import { PolicyService } from '../access-control/policy.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class EntitiesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: FirmActor, matterId: string) {
    await this.policy.assertMatter(actor, 'matter.read', matterId);
    const rows = await this.db
      .select()
      .from(entities)
      .where(
        and(
          eq(entities.firmId, actor.firmId),
          eq(entities.matterId, matterId),
        ),
      )
      .orderBy(desc(entities.createdAt));
    return { items: rows.map((r) => this.entityDto(r)) };
  }

  async get(actor: FirmActor, matterId: string, entityId: string) {
    await this.policy.assertMatter(actor, 'matter.read', matterId);
    const row = await this.db
      .select()
      .from(entities)
      .where(
        and(
          eq(entities.id, entityId),
          eq(entities.firmId, actor.firmId),
          eq(entities.matterId, matterId),
        ),
      )
      .limit(1);
    if (!row.length) throw DomainError.notFound('Entity not found');
    return { entity: this.entityDto(row[0]) };
  }

  async create(actor: FirmActor, matterId: string, input: {
    canonicalName: string;
    normalizedName: string;
    type: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.policy.assertMatter(actor, 'matter.update', matterId);
    const [entity] = await this.db
      .insert(entities)
      .values({
        firmId: actor.firmId,
        matterId,
        canonicalName: input.canonicalName.trim(),
        normalizedName: input.normalizedName.trim(),
        type: input.type.trim(),
        description: input.description?.trim() ?? null,
        metadata: input.metadata ?? {},
        createdBy: actor.userId,
      })
      .returning();
    await this.audit.log({
      firmId: actor.firmId,
      action: 'entity.created',
      resourceType: 'entity',
      resourceId: entity.id,
      actor,
      metadata: { matterId, canonicalName: entity.canonicalName, type: entity.type },
    });
    return { entity: this.entityDto(entity) };
  }

  async addAlias(actor: FirmActor, matterId: string, entityId: string, alias: string) {
    await this.policy.assertMatter(actor, 'matter.update', matterId);
    const [a] = await this.db
      .insert(entityAliases)
      .values({
        firmId: actor.firmId,
        matterId,
        entityId,
        alias: alias.trim(),
        normalizedAlias: alias.trim().toLowerCase(),
      })
      .returning();
    await this.audit.log({
      firmId: actor.firmId,
      action: 'entity.alias.added',
      resourceType: 'entity_alias',
      resourceId: a.id,
      actor,
      metadata: { matterId, entityId, alias: a.alias },
    });
    return { alias: this.aliasDto(a) };
  }

  async listMentions(actor: FirmActor, matterId: string, entityId: string) {
    await this.policy.assertMatter(actor, 'matter.read', matterId);
    const rows = await this.db
      .select()
      .from(entityMentions)
      .where(
        and(
          eq(entityMentions.firmId, actor.firmId),
          eq(entityMentions.matterId, matterId),
          eq(entityMentions.entityId, entityId),
        ),
      )
      .orderBy(desc(entityMentions.createdAt));
    return { items: rows.map((r) => this.mentionDto(r)) };
  }

  async listRelations(actor: FirmActor, matterId: string, entityId: string) {
    await this.policy.assertMatter(actor, 'matter.read', matterId);
    const rows = await this.db
      .select()
      .from(entityRelations)
      .where(
        and(
          eq(entityRelations.firmId, actor.firmId),
          eq(entityRelations.matterId, matterId),
          sql`${entityRelations.fromEntityId} = ${entityId} OR ${entityRelations.toEntityId} = ${entityId}`,
        ),
      )
      .orderBy(desc(entityRelations.createdAt));
    return { items: rows.map((r) => this.relationDto(r)) };
  }

  private entityDto(row: typeof entities.$inferSelect) {
    return {
      id: row.id,
      matterId: row.matterId,
      canonicalName: row.canonicalName,
      normalizedName: row.normalizedName,
      type: row.type,
      description: row.description,
      status: row.status,
      mergedIntoId: row.mergedIntoId,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private aliasDto(row: typeof entityAliases.$inferSelect) {
    return {
      id: row.id,
      entityId: row.entityId,
      alias: row.alias,
      normalizedAlias: row.normalizedAlias,
      source: row.source,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private mentionDto(row: typeof entityMentions.$inferSelect) {
    return {
      id: row.id,
      entityId: row.entityId,
      factId: row.factId,
      documentId: row.documentId,
      pageNumber: row.pageNumber,
      sentenceIndex: row.sentenceIndex,
      surfaceForm: row.surfaceForm,
      roleInSentence: row.roleInSentence,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private relationDto(row: typeof entityRelations.$inferSelect) {
    return {
      id: row.id,
      fromEntityId: row.fromEntityId,
      toEntityId: row.toEntityId,
      relationType: row.relationType,
      description: row.description,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
